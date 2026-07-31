import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import argon2 from 'argon2';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { fail, ok } from '../../utils/responses.js';
import { clearAuthSession, issueAuthSession } from './cookies.js';
import { exchangeGoogleUser, getGoogleAuthUrl } from './google.js';
import { authenticateCustomer, toSafeUser } from './session.js';

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

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/login', async (request, reply) => {
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

    return reply.send(issueAuthSession(user, reply, 'customer'));
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

    return reply.status(201).send(issueAuthSession(user, reply, 'customer'));
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

    return reply.send(issueAuthSession(user, reply, 'customer'));
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

      await prisma.user.update({
        where: { id: request.authUser!.id },
        data: {
          passwordHash: await argon2.hash(body.newPassword),
        },
      });

      return ok(reply, { changed: true });
    });
  });

  app.post('/logout', async (_request, reply) => {
    clearAuthSession(reply, 'customer');
    return ok(reply, { loggedOut: true });
  });
};
