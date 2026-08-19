import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../../config/env.js';
import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_COOKIE_PATH,
  CUSTOMER_ACCESS_COOKIE,
  CUSTOMER_COOKIE_PATH,
  toSafeUser,
} from './session.js';
import { createAccessToken, type AuthRealm } from './tokens.js';
import { clearRefreshCookie, issueRefreshToken } from './refresh.js';
import { CSRF_COOKIE, issueCsrfToken } from '../../plugins/csrf.js';

interface SessionUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  createdAt?: Date;
  status?: string;
  lastLoginAt?: Date | null;
  mustChangePassword?: boolean;
}

const cookieSettings = (realm: AuthRealm) => ({
  name: realm === 'admin' ? ADMIN_ACCESS_COOKIE : CUSTOMER_ACCESS_COOKIE,
  path: realm === 'admin' ? ADMIN_COOKIE_PATH : CUSTOMER_COOKIE_PATH,
});

export const issueAccessToken = (user: SessionUser, reply: FastifyReply, realm: AuthRealm) => {
  const token = createAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    aud: realm,
  });
  const cookie = cookieSettings(realm);

  reply.setCookie(cookie.name, token, {
    httpOnly: true,
    // Production must terminate HTTPS and set COOKIE_SECURE=true.
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: cookie.path,
    maxAge: env.ACCESS_TOKEN_TTL_SECONDS,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  });

};

export const issueAuthSession = async (
  user: SessionUser,
  request: FastifyRequest,
  reply: FastifyReply,
  realm: AuthRealm,
) => {
  issueAccessToken(user, reply, realm);
  if (!request.cookies[CSRF_COOKIE]) issueCsrfToken(reply);
  await issueRefreshToken(user, request, reply, realm);
  return {
    success: true,
    data: toSafeUser(user),
  };
};

export const clearAuthSession = (reply: FastifyReply, realm: AuthRealm) => {
  const cookie = cookieSettings(realm);

  reply.clearCookie(cookie.name, {
    path: cookie.path,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  });
  clearRefreshCookie(reply, realm);
};
