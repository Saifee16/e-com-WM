import type { FastifyPluginAsync } from 'fastify';
import argon2 from 'argon2';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { fail, ok } from '../../utils/responses.js';
import { clearAuthSession, issueAccessToken, issueAuthSession } from '../auth/cookies.js';
import { exchangeGoogleUser, getGoogleAuthUrl } from '../auth/google.js';
import { exchangeFacebookUser, getFacebookAuthUrl } from '../auth/facebook.js';
import { authenticateAdmin, toSafeUser } from '../auth/session.js';
import { revokeRefreshFamily, rotateRefreshToken } from '../auth/refresh.js';
import { env } from '../../config/env.js';

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

const googleCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(32),
});
const emptyBodySchema = z.undefined();

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
  });

  app.post('/logout', async (request, reply) => {
    await revokeRefreshFamily(request, 'admin');
    clearAuthSession(reply, 'admin');
    return ok(reply, { loggedOut: true });
  });
};
