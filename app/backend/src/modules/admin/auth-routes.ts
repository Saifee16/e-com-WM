import type { FastifyPluginAsync } from 'fastify';
import argon2 from 'argon2';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { fail, ok } from '../../utils/responses.js';
import { clearAuthSession, issueAuthSession } from '../auth/cookies.js';
import { exchangeGoogleUser, getGoogleAuthUrl } from '../auth/google.js';
import { authenticateAdmin, toSafeUser } from '../auth/session.js';

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

const googleCallbackSchema = z.object({
  code: z.string().min(1),
});

export const adminAuthRoutes: FastifyPluginAsync = async (app) => {
  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = await prisma.user.findFirst({
      where: {
        email: body.email,
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

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

    return reply.send(issueAuthSession(user, reply, 'admin'));
  });

  app.get('/google/start', async (_request, reply) => {
    const authUrl = getGoogleAuthUrl(reply, 'admin');
    if (!authUrl) return;

    return ok(reply, { authUrl });
  });

  app.post('/google/callback', async (request, reply) => {
    const body = googleCallbackSchema.parse(request.body);
    const googleUser = await exchangeGoogleUser(body.code, reply);
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

    return reply.send(issueAuthSession(user, reply, 'admin'));
  });

  await app.register(async (protectedApp) => {
    protectedApp.addHook('preHandler', authenticateAdmin);

    protectedApp.get('/profile', async (request, reply) => {
      return ok(reply, toSafeUser(request.authUser!));
    });

    protectedApp.get('/me', async (request, reply) => {
      return ok(reply, toSafeUser(request.authUser!));
    });
  });

  app.post('/logout', async (_request, reply) => {
    clearAuthSession(reply, 'admin');
    return ok(reply, { loggedOut: true });
  });
};
