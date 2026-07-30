import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import argon2 from 'argon2';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { env } from '../../config/env.js';
import { fail, ok } from '../../utils/responses.js';
import { createAccessToken } from './tokens.js';
import { getAuthenticatedUser, toSafeUser } from './session.js';

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
  mode: z.enum(['customer', 'admin']).default('customer'),
});

const googleUserSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  email_verified: z.boolean().optional(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  name: z.string().optional(),
});

const missingGoogleOAuthConfig = () => {
  const missing = [];

  if (!env.GOOGLE_CLIENT_ID) missing.push('GOOGLE_CLIENT_ID');
  if (!env.GOOGLE_CLIENT_SECRET) missing.push('GOOGLE_CLIENT_SECRET');
  if (!env.GOOGLE_REDIRECT_URI) missing.push('GOOGLE_REDIRECT_URI');

  return missing;
};

const googleOAuthNotConfigured = (reply: FastifyReply, missing: string[]) =>
  fail(reply, 503, {
    code: 'GOOGLE_OAUTH_NOT_CONFIGURED',
    message: 'Google OAuth is not configured. Add the missing Google OAuth environment variables to backend/.env.',
    details: { missing },
  });

const issueLoginResponse = async (user: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  createdAt?: Date;
}, reply: FastifyReply) => {
  const token = createAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  reply.setCookie('accessToken', token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: '/',
    maxAge: env.ACCESS_TOKEN_TTL_SECONDS,
    ...(env.COOKIE_DOMAIN !== 'localhost' ? { domain: env.COOKIE_DOMAIN } : {}),
  });

  return {
    success: true,
    data: toSafeUser(user),
  };
};

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = await prisma.user.findFirst({
      where: {
        email: body.email,
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

    return reply.send(await issueLoginResponse(user, reply));
  });

  app.post('/admin/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = await prisma.user.findFirst({
      where: {
        email: body.email,
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

    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return fail(reply, 403, {
        code: 'ADMIN_REQUIRED',
        message: 'Admin access required',
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return reply.send(await issueLoginResponse(user, reply));
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

    return reply.status(201).send({
      ...(await issueLoginResponse(user, reply)),
    });
  });

  app.get('/google/start', async (request, reply) => {
    const query = z
      .object({
        mode: z.enum(['customer', 'admin']).default('customer'),
      })
      .parse(request.query);

    const missingConfig = missingGoogleOAuthConfig();
    if (missingConfig.length > 0) {
      return googleOAuthNotConfigured(reply, missingConfig);
    }

    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      redirect_uri: env.GOOGLE_REDIRECT_URI!,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
      state: query.mode,
    });

    return ok(reply, {
      authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    });
  });

  app.post('/google/callback', async (request, reply) => {
    const body = googleCallbackSchema.parse(request.body);

    const missingConfig = missingGoogleOAuthConfig();
    if (missingConfig.length > 0) {
      return googleOAuthNotConfigured(reply, missingConfig);
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: body.code,
        client_id: env.GOOGLE_CLIENT_ID!,
        client_secret: env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: env.GOOGLE_REDIRECT_URI!,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      return fail(reply, 401, {
        code: 'GOOGLE_OAUTH_EXCHANGE_FAILED',
        message: 'Google OAuth code exchange failed',
      });
    }

    const tokenJson = z.object({ access_token: z.string() }).parse(await tokenResponse.json());
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });

    if (!userResponse.ok) {
      return fail(reply, 401, {
        code: 'GOOGLE_PROFILE_FAILED',
        message: 'Unable to load Google profile',
      });
    }

    const googleUser = googleUserSchema.parse(await userResponse.json());

    if (googleUser.email_verified === false) {
      return fail(reply, 401, {
        code: 'GOOGLE_EMAIL_NOT_VERIFIED',
        message: 'Google email must be verified',
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (body.mode === 'admin' && (!existingUser || (existingUser.role !== 'ADMIN' && existingUser.role !== 'SUPER_ADMIN'))) {
      return fail(reply, 403, {
        code: 'ADMIN_REQUIRED',
        message: 'Google admin login is only available for existing admin users',
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

    return reply.send(await issueLoginResponse(user, reply));
  });

  app.get('/profile', async (request, reply) => {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return fail(reply, 401, {
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      });
    }

    return ok(reply, toSafeUser(user));
  });

  app.get('/me', async (request, reply) => {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return fail(reply, 401, {
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      });
    }

    return ok(reply, toSafeUser(user));
  });

  app.put('/profile', async (request, reply) => {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return fail(reply, 401, {
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      });
    }

    const body = profileUpdateSchema.parse(request.body);
    const data = {
      ...(body.firstName ? { firstName: body.firstName } : {}),
      ...(body.lastName ? { lastName: body.lastName } : {}),
      ...(body.phone ? { phone: body.phone } : {}),
    };
    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
    });

    return ok(reply, toSafeUser(updated));
  });

  app.put('/password', async (request, reply) => {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return fail(reply, 401, {
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      });
    }

    const body = passwordChangeSchema.parse(request.body);

    if (!(await argon2.verify(user.passwordHash, body.currentPassword))) {
      return fail(reply, 400, {
        code: 'INVALID_CURRENT_PASSWORD',
        message: 'Current password is incorrect',
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await argon2.hash(body.newPassword),
      },
    });

    return ok(reply, { changed: true });
  });

  app.post('/logout', async (_request, reply) => {
    reply.clearCookie('accessToken', {
      path: '/',
      ...(env.COOKIE_DOMAIN !== 'localhost' ? { domain: env.COOKIE_DOMAIN } : {}),
    });
    return ok(reply, { loggedOut: true });
  });
};
