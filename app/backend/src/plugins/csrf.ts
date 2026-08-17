import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';
import { fail } from '../utils/responses.js';

export const CSRF_COOKIE = 'csrfToken';
export const CSRF_HEADER = 'x-csrf-token';

// A guest cart is also an authenticated, server-issued principal. Protect
// unsafe requests made with it just as we protect customer/admin cookies.
const authenticatedCookieNames = ['accessToken', 'adminAccessToken', 'refreshToken', 'adminRefreshToken', 'guestCartId'];
const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const cookieOptions = {
  httpOnly: false,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAME_SITE,
  path: '/api',
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
} as const;

const matches = (cookieToken: string, headerToken: string) => {
  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);
  return cookieBuffer.length === headerBuffer.length && timingSafeEqual(cookieBuffer, headerBuffer);
};

export const issueCsrfToken = (reply: FastifyReply) => {
  const token = randomBytes(32).toString('base64url');
  reply.setCookie(CSRF_COOKIE, token, cookieOptions);
  return token;
};

export const csrfPreHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!unsafeMethods.has(request.method) || !authenticatedCookieNames.some((name) => request.cookies[name])) {
    return;
  }

  const cookieToken = request.cookies[CSRF_COOKIE];
  const header = request.headers[CSRF_HEADER];
  const headerToken = Array.isArray(header) ? header[0] : header;

  if (!cookieToken || !headerToken || !matches(cookieToken, headerToken)) {
    return fail(reply, 403, {
      code: 'CSRF_TOKEN_INVALID',
      message: 'A valid CSRF token is required for this request',
    });
  }
};
