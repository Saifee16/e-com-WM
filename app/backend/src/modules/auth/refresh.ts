import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { SessionRealm, User } from '@prisma/client';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../../config/env.js';
import { prisma } from '../../db/prisma.js';
import type { AuthRealm } from './tokens.js';

export const CUSTOMER_REFRESH_COOKIE = 'refreshToken';
export const ADMIN_REFRESH_COOKIE = 'adminRefreshToken';

const realmValue = (realm: AuthRealm): SessionRealm => (realm === 'admin' ? 'ADMIN' : 'CUSTOMER');
const refreshCookie = (realm: AuthRealm) => ({
  name: realm === 'admin' ? ADMIN_REFRESH_COOKIE : CUSTOMER_REFRESH_COOKIE,
  path: realm === 'admin' ? '/api/admin/auth' : '/api/auth',
});

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
const newToken = () => randomBytes(48).toString('base64url');
const expiresAt = () => new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

const setRefreshCookie = (reply: FastifyReply, realm: AuthRealm, token: string) => {
  const cookie = refreshCookie(realm);
  reply.setCookie(cookie.name, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: cookie.path,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
    ...(env.COOKIE_DOMAIN !== 'localhost' ? { domain: env.COOKIE_DOMAIN } : {}),
  });
};

export const clearRefreshCookie = (reply: FastifyReply, realm: AuthRealm) => {
  const cookie = refreshCookie(realm);
  reply.clearCookie(cookie.name, {
    path: cookie.path,
    ...(env.COOKIE_DOMAIN !== 'localhost' ? { domain: env.COOKIE_DOMAIN } : {}),
  });
};

export const issueRefreshToken = async (
  user: Pick<User, 'id'>,
  request: FastifyRequest,
  reply: FastifyReply,
  realm: AuthRealm,
) => {
  const rawToken = newToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: tokenHash(rawToken),
      familyId: randomUUID(),
      realm: realmValue(realm),
      expiresAt: expiresAt(),
      createdByIp: request.ip,
      ...(request.headers['user-agent'] ? { userAgent: request.headers['user-agent'] } : {}),
    },
  });
  setRefreshCookie(reply, realm, rawToken);
};

export const rotateRefreshToken = async (
  request: FastifyRequest,
  reply: FastifyReply,
  realm: AuthRealm,
): Promise<User | null> => {
  const cookie = refreshCookie(realm);
  const rawToken = request.cookies[cookie.name];
  if (!rawToken) return null;

  const hash = tokenHash(rawToken);
  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.refreshToken.findUnique({ where: { tokenHash: hash }, include: { user: true } });
    if (!current || current.realm !== realmValue(realm)) return null;

    if (current.revokedAt || current.replacedByTokenId) {
      await tx.refreshToken.updateMany({
        where: { familyId: current.familyId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'REPLAY_DETECTED' },
      });
      return null;
    }
    if (current.expiresAt <= new Date() || current.user.status !== 'ACTIVE' || current.user.deletedAt) return null;
    if (realm === 'customer' ? current.user.role !== 'CUSTOMER' : !['ADMIN', 'SUPER_ADMIN'].includes(current.user.role)) {
      return null;
    }

    const replacementRaw = newToken();
    const replacement = await tx.refreshToken.create({
      data: {
        userId: current.userId,
        tokenHash: tokenHash(replacementRaw),
        familyId: current.familyId,
        realm: current.realm,
        expiresAt: expiresAt(),
        createdByIp: request.ip,
        ...(request.headers['user-agent'] ? { userAgent: request.headers['user-agent'] } : {}),
      },
    });
    await tx.refreshToken.update({
      where: { id: current.id },
      data: { revokedAt: new Date(), revokedReason: 'ROTATED', replacedByTokenId: replacement.id },
    });
    return { user: current.user, replacementRaw };
  }, { isolationLevel: 'Serializable' }).catch((error: unknown) => {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034') return null;
    throw error;
  });

  if (!result) return null;
  setRefreshCookie(reply, realm, result.replacementRaw);
  return result.user;
};

export const revokeRefreshFamily = async (request: FastifyRequest, realm: AuthRealm, reason = 'LOGOUT') => {
  const rawToken = request.cookies[refreshCookie(realm).name];
  if (!rawToken) return;
  const current = await prisma.refreshToken.findUnique({ where: { tokenHash: tokenHash(rawToken) } });
  if (!current || current.realm !== realmValue(realm)) return;
  await prisma.refreshToken.updateMany({
    where: { familyId: current.familyId, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
};

export const revokeAllUserRefreshTokens = (userId: string, reason: string) =>
  prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
