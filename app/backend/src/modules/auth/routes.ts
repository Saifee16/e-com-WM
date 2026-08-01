import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import argon2 from 'argon2';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { env } from '../../config/env.js';
import { fail, ok } from '../../utils/responses.js';
import { clearAuthSession, issueAccessToken, issueAuthSession } from './cookies.js';
import { exchangeGoogleUser, getGoogleAuthUrl } from './google.js';
import { authenticateCustomer, toSafeUser } from './session.js';
import { sendPasswordResetEmail } from './mailer.js';
import { revokeRefreshFamily, rotateRefreshToken } from './refresh.js';
import { issueCsrfToken } from '../../plugins/csrf.js';

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(200),
  phone: z.string().trim().max(40).optional(),
});

const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().max(40).optional(),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
});

const googleCallbackSchema = z.object({
  code: z.string().min(1),
});

const passwordResetRequestSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
});

const passwordResetConsumeSchema = z.object({
  token: z.string().min(20),
  newPassword: z.string().min(8).max(200),
});
const emptyBodySchema = z.undefined();

const hashOpaqueToken = (token: string) => createHash('sha256').update(token).digest('hex');

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.get('/csrf', async (_request, reply) => {
    return ok(reply, { csrfToken: issueCsrfToken(reply) });
  });

  app.post('/login', {
    config: {
      rateLimit: {
        max: env.RATE_LIMIT_LOGIN_MAX,
        timeWindow: `${env.RATE_LIMIT_LOGIN_WINDOW_SECONDS} seconds`,
      },
    },
  }, async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = await prisma.user.findFirst({
      where: {
        email: body.email,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    if (!user) {
      const adminAccount = await prisma.user.findFirst({
        where: {
          email: body.email,
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: { id: true },
      });

      if (adminAccount) {
        return fail(reply, 403, {
          code: 'ADMIN_LOGIN_REQUIRED',
          message: 'Administrator accounts must use the admin login',
        });
      }
    }

    if (!user || !(await argon2.verify(user.passwordHash, body.password))) {
      return fail(reply, 401, {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return reply.send(await issueAuthSession(user, request, reply, 'customer'));
  });

  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const existing = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existing) {
      return fail(reply, 409, {
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'Email is already registered',
      });
    }

    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash: await argon2.hash(body.password),
        firstName: body.firstName,
        lastName: body.lastName,
        role: 'CUSTOMER',
        ...(body.phone ? { phone: body.phone } : {}),
      },
    });

    return reply.status(201).send(await issueAuthSession(user, request, reply, 'customer'));
  });

  app.get('/google/start', async (_request, reply) => {
    const authUrl = getGoogleAuthUrl(reply, 'customer');
    if (!authUrl) return;

    return ok(reply, { authUrl });
  });

  app.post('/google/callback', async (request, reply) => {
    const body = googleCallbackSchema.parse(request.body);
    const googleUser = await exchangeGoogleUser(body.code, reply);
    if (!googleUser) return;

    const existingUser = await prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (existingUser && existingUser.role !== 'CUSTOMER') {
      return fail(reply, 403, {
        code: 'ADMIN_LOGIN_REQUIRED',
        message: 'Administrator accounts must use the admin login',
      });
    }

    const displayName = googleUser.name ?? googleUser.email.split('@')[0] ?? 'Google User';
    const fallbackLastName = displayName.split(' ').slice(1).join(' ') || 'User';
    const user =
      existingUser ??
      (await prisma.user.create({
        data: {
          email: googleUser.email,
          passwordHash: await argon2.hash(`google:${randomUUID()}`),
          firstName: googleUser.given_name ?? displayName.split(' ')[0] ?? 'Google',
          lastName: googleUser.family_name ?? fallbackLastName,
          role: 'CUSTOMER',
          emailVerifiedAt: new Date(),
        },
      }));

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return reply.send(await issueAuthSession(user, request, reply, 'customer'));
  });

  app.post('/refresh', async (request, reply) => {
    emptyBodySchema.parse(request.body);
    const user = await rotateRefreshToken(request, reply, 'customer');
    if (!user) {
      clearAuthSession(reply, 'customer');
      return fail(reply, 401, { code: 'INVALID_REFRESH_TOKEN', message: 'Session expired' });
    }
    issueAccessToken(user, reply, 'customer');
    return ok(reply, toSafeUser(user));
  });

  app.post('/password-reset/request', async (request, reply) => {
    const body = passwordResetRequestSchema.parse(request.body);
    const user = await prisma.user.findFirst({
      where: { email: body.email, role: 'CUSTOMER', status: 'ACTIVE', deletedAt: null },
    });

    if (user) {
      const rawToken = randomBytes(32).toString('base64url');
      await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({ where: { userId: user.id, consumedAt: null } }),
        prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: hashOpaqueToken(rawToken),
            expiresAt: new Date(Date.now() + env.PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000),
            requestedByIp: request.ip,
          },
        }),
      ]);
      const resetUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(rawToken)}`;
      try {
        await sendPasswordResetEmail(user.email, resetUrl, (details, message) => request.log.info(details, message));
      } catch (error) {
        request.log.error({ error, userId: user.id }, 'failed to send password reset email');
      }
    }

    return ok(reply, { requested: true, message: 'If the account exists, reset instructions have been sent.' });
  });

  app.post('/password-reset/consume', async (request, reply) => {
    const body = passwordResetConsumeSchema.parse(request.body);
    const hash = hashOpaqueToken(body.token);
    const changed = await prisma.$transaction(async (tx) => {
      const token = await tx.passwordResetToken.findUnique({ where: { tokenHash: hash } });
      if (!token || token.consumedAt || token.expiresAt <= new Date()) return false;
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: token.id, consumedAt: null, expiresAt: { gt: new Date() } },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) return false;
      await tx.user.update({ where: { id: token.userId }, data: { passwordHash: await argon2.hash(body.newPassword) } });
      await tx.refreshToken.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'PASSWORD_RESET' },
      });
      return true;
    });

    if (!changed) {
      return fail(reply, 400, { code: 'INVALID_RESET_TOKEN', message: 'Reset link is invalid or expired' });
    }
    clearAuthSession(reply, 'customer');
    return ok(reply, { changed: true });
  });

  await app.register(async (protectedApp) => {
    protectedApp.addHook('preHandler', authenticateCustomer);

    protectedApp.get('/profile', async (request, reply) => {
      return ok(reply, toSafeUser(request.authUser!));
    });

    protectedApp.get('/me', async (request, reply) => {
      return ok(reply, toSafeUser(request.authUser!));
    });

    protectedApp.put('/profile', async (request, reply) => {
      const body = profileUpdateSchema.parse(request.body);
      const data = {
        ...(body.firstName ? { firstName: body.firstName } : {}),
        ...(body.lastName ? { lastName: body.lastName } : {}),
        ...(body.phone ? { phone: body.phone } : {}),
      };
      const updated = await prisma.user.update({
        where: { id: request.authUser!.id },
        data,
      });

      return ok(reply, toSafeUser(updated));
    });

    protectedApp.put('/password', async (request, reply) => {
      const body = passwordChangeSchema.parse(request.body);

      if (!(await argon2.verify(request.authUser!.passwordHash, body.currentPassword))) {
        return fail(reply, 400, {
          code: 'INVALID_CURRENT_PASSWORD',
          message: 'Current password is incorrect',
        });
      }

      const passwordHash = await argon2.hash(body.newPassword);
      await prisma.$transaction([
        prisma.user.update({ where: { id: request.authUser!.id }, data: { passwordHash } }),
        prisma.refreshToken.updateMany({
          where: { userId: request.authUser!.id, revokedAt: null },
          data: { revokedAt: new Date(), revokedReason: 'PASSWORD_CHANGE' },
        }),
      ]);
      clearAuthSession(reply, 'customer');
      return ok(reply, { changed: true, reauthenticationRequired: true });
    });
  });

  app.post('/logout', async (request, reply) => {
    await revokeRefreshFamily(request, 'customer');
    clearAuthSession(reply, 'customer');
    return ok(reply, { loggedOut: true });
  });
};
