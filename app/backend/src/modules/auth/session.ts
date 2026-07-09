import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../db/prisma.js';
import { fail } from '../../utils/responses.js';
import { verifyAccessToken } from './tokens.js';

export const GUEST_CART_COOKIE = 'guestCartId';

export const getBearerToken = (request: FastifyRequest) => {
  const cookieToken = request.cookies.accessToken;
  if (cookieToken) {
    return cookieToken;
  }

  const header = request.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length);
};

export const getGuestId = (request: FastifyRequest) => {
  const cookieGuestId = request.cookies[GUEST_CART_COOKIE];
  if (cookieGuestId?.trim()) {
    return cookieGuestId.trim();
  }

  const header = request.headers['x-guest-id'];
  const guestId = Array.isArray(header) ? header[0] : header;
  return guestId?.trim() || null;
};

export const getAuthenticatedUser = async (request: FastifyRequest) => {
  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  const payload = verifyAccessToken(token);

  if (!payload) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      id: payload.sub,
      status: 'ACTIVE',
      deletedAt: null,
    },
  });
};

export const requireAuthenticatedUser = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    fail(reply, 401, {
      code: 'UNAUTHENTICATED',
      message: 'Authentication required',
    });
    return null;
  }

  return user;
};

export const requireAdminUser = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = await requireAuthenticatedUser(request, reply);

  if (!user) {
    return null;
  }

  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    fail(reply, 403, {
      code: 'ADMIN_REQUIRED',
      message: 'Admin access required',
    });
    return null;
  }

  return user;
};

export const toSafeUser = (user: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  createdAt?: Date;
}) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone ?? undefined,
  isAdmin: user.role === 'ADMIN' || user.role === 'SUPER_ADMIN',
  role: user.role,
  createdAt: user.createdAt?.toISOString(),
});
