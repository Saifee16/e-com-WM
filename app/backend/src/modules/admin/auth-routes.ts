import type { FastifyPluginAsync } from 'fastify';
import argon2 from 'argon2';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { fail, ok } from '../../utils/responses.js';
import { clearAuthSession, issueAccessToken, issueAuthSession } from '../auth/cookies.js';
import { exchangeGoogleUser, getGoogleAuthUrl } from '../auth/google.js';
import { exchangeFacebookUser, getFacebookAuthUrl } from '../auth/facebook.js';
import { authenticateAdmin, toSafeUser } from '../auth/session.js';
import { revokeAllUserRefreshTokens, revokeRefreshFamily, rotateRefreshToken } from '../auth/refresh.js';
import { env } from '../../config/env.js';
import {
  loginAbuseStore,
  normalizeLoginIdentifier,
  type LoginAbuseDecision,
} from '../auth/login-abuse.js';

const loginSchema = z.object({
  email: z.string().trim().email().transform(normalizeLoginIdentifier),
  password: z.string().min(1),
});

const strongPasswordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .max(200)
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: strongPasswordSchema,
});

const googleCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(32),
});
const emptyBodySchema = z.undefined();

const failThrottledLogin = (reply: Parameters<typeof fail>[0], decision: LoginAbuseDecision) => {
  if (decision.retryAfterSeconds > 0) {
    reply.header('Retry-After', String(decision.retryAfterSeconds));
  }
  return fail(reply, 429, {
    code: 'LOGIN_TEMPORARILY_THROTTLED',
    message: 'Too many login attempts. Try again later.',
  });
};

export const adminAuthRoutes: FastifyPluginAsync = async (app) => {
  app.post('/login', {
    config: {
      rateLimit: {
        max: env.RATE_LIMIT_LOGIN_MAX,
        timeWindow: `${env.RATE_LIMIT_LOGIN_WINDOW_SECONDS} seconds`,
      },
    },
  }, async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const throttle = await loginAbuseStore.check('admin', body.email);
    if (throttle.blocked) return failThrottledLogin(reply, throttle);

    const user = await prisma.user.findFirst({
      where: {
        email: body.email,
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    if (!user || !(await argon2.verify(user.passwordHash, body.password))) {
      const failure = await loginAbuseStore.recordFailure('admin', body.email);
      if (failure.blocked) return failThrottledLogin(reply, failure);

      return fail(reply, 401, {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await loginAbuseStore.clear('admin', body.email);

    return reply.send(await issueAuthSession(user, request, reply, 'admin'));
  });

  app.get('/google/start', async (_request, reply) => {
    const authUrl = getGoogleAuthUrl(reply, 'admin');
    if (!authUrl) return;

    return ok(reply, { authUrl });
  });

  app.post('/google/callback', async (request, reply) => {
    const body = googleCallbackSchema.parse(request.body);
    const googleUser = await exchangeGoogleUser(body.code, body.state, request, reply, 'admin');
    if (!googleUser) return;

    const user = await prisma.user.findFirst({
      where: {
        email: googleUser.email,
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    if (!user) {
      return fail(reply, 403, {
        code: 'ADMIN_REQUIRED',
        message: 'Google admin login is only available for existing admin users',
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return reply.send(await issueAuthSession(user, request, reply, 'admin'));
  });

  app.get('/facebook/start', async (_request, reply) => {
    const authUrl = getFacebookAuthUrl(reply, 'admin');
    if (!authUrl) return;
    return ok(reply, { authUrl });
  });

  app.post('/facebook/callback', async (request, reply) => {
    const body = googleCallbackSchema.parse(request.body);
    const facebookUser = await exchangeFacebookUser(body.code, body.state, request, reply, 'admin');
    if (!facebookUser) return;

    const user = await prisma.user.findFirst({
      where: {
        email: facebookUser.email,
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        status: 'ACTIVE',
        deletedAt: null,
      },
    });
    if (!user) {
      return fail(reply, 403, {
        code: 'ADMIN_REQUIRED',
        message: 'Facebook admin login is only available for existing admin users',
      });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return reply.send(await issueAuthSession(user, request, reply, 'admin'));
  });

  app.post('/refresh', async (request, reply) => {
    emptyBodySchema.parse(request.body);
    const user = await rotateRefreshToken(request, reply, 'admin');
    if (!user) {
      clearAuthSession(reply, 'admin');
      return fail(reply, 401, { code: 'INVALID_REFRESH_TOKEN', message: 'Session expired' });
    }
    issueAccessToken(user, reply, 'admin');
    return ok(reply, toSafeUser(user));
  });

  await app.register(async (protectedApp) => {
    protectedApp.addHook('preHandler', authenticateAdmin);

    protectedApp.get('/profile', async (request, reply) => {
      return ok(reply, toSafeUser(request.authUser!));
    });

    protectedApp.get('/me', async (request, reply) => {
      return ok(reply, toSafeUser(request.authUser!));
    });

    protectedApp.put('/password', async (request, reply) => {
      const body = passwordChangeSchema.parse(request.body);
      const currentUser = request.authUser!;
      if (!(await argon2.verify(currentUser.passwordHash, body.currentPassword))) {
        return fail(reply, 400, {
          code: 'INVALID_CURRENT_PASSWORD',
          message: 'Current password is incorrect',
        });
      }

      const updated = await prisma.user.update({
        where: { id: currentUser.id },
        data: { passwordHash: await argon2.hash(body.newPassword), mustChangePassword: false },
      });
      await revokeAllUserRefreshTokens(currentUser.id, 'ADMIN_PASSWORD_CHANGE');
      await prisma.auditLog.create({
        data: {
          actorUserId: currentUser.id,
          action: 'UPDATE',
          entityType: 'AdminAccountPassword',
          entityId: currentUser.id,
          after: { accountId: currentUser.id, passwordChanged: true, mustChangePassword: false },
        },
      });
      return ok(reply, toSafeUser(updated));
    });
  });

  app.post('/logout', async (request, reply) => {
    await revokeRefreshFamily(request, 'admin');
    clearAuthSession(reply, 'admin');
    return ok(reply, { loggedOut: true });
  });
};
