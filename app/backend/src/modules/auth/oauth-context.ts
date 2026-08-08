import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { fail } from '../../utils/responses.js';
import type { AuthRealm } from './tokens.js';

type OAuthProvider = 'google' | 'facebook';

const contextSchema = z.object({
  state: z.string().min(32),
  codeVerifier: z.string().min(43).optional(),
});

const cookieSettings = (provider: OAuthProvider, realm: AuthRealm) => ({
  name: `${provider}${realm === 'admin' ? 'Admin' : 'Customer'}OAuthContext`,
  path: realm === 'admin'
    ? `/api/admin/auth/${provider}/callback`
    : `/api/auth/${provider}/callback`,
});

const matches = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

export const issueOAuthContext = (
  reply: FastifyReply,
  provider: OAuthProvider,
  realm: AuthRealm,
  withPkce = false,
) => {
  const state = `${provider}:${realm}:${randomBytes(32).toString('base64url')}`;
  const context = {
    state,
    ...(withPkce ? { codeVerifier: randomBytes(48).toString('base64url') } : {}),
  };
  const cookie = cookieSettings(provider, realm);

  reply.setCookie(cookie.name, Buffer.from(JSON.stringify(context)).toString('base64url'), {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: cookie.path,
    signed: true,
    maxAge: 10 * 60,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  });

  return context;
};

export const consumeOAuthContext = (
  request: FastifyRequest,
  reply: FastifyReply,
  provider: OAuthProvider,
  realm: AuthRealm,
  returnedState: string,
) => {
  const cookie = cookieSettings(provider, realm);
  const rawCookie = request.cookies[cookie.name];

  reply.clearCookie(cookie.name, {
    path: cookie.path,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  });

  if (!rawCookie) {
    fail(reply, 400, {
      code: 'OAUTH_STATE_INVALID',
      message: 'OAuth session is missing or expired. Please start the sign-in again.',
    });
    return null;
  }

  const unsigned = request.unsignCookie(rawCookie);
  if (!unsigned.valid || !unsigned.value) {
    fail(reply, 400, { code: 'OAUTH_STATE_INVALID', message: 'OAuth session is invalid.' });
    return null;
  }

  try {
    const parsed = contextSchema.parse(
      JSON.parse(Buffer.from(unsigned.value, 'base64url').toString('utf8')),
    );
    if (!matches(parsed.state, returnedState)) {
      fail(reply, 400, { code: 'OAUTH_STATE_INVALID', message: 'OAuth state validation failed.' });
      return null;
    }
    return parsed;
  } catch {
    fail(reply, 400, { code: 'OAUTH_STATE_INVALID', message: 'OAuth session is invalid.' });
    return null;
  }
};
