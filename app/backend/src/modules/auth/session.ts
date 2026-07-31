import type { User } from '@prisma/client';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../db/prisma.js';
import { fail } from '../../utils/responses.js';
import { verifyAccessToken, type AuthRealm } from './tokens.js';

export const GUEST_CART_COOKIE = 'guestCartId';
export const CUSTOMER_ACCESS_COOKIE = 'accessToken';
export const ADMIN_ACCESS_COOKIE = 'adminAccessToken';
export const CUSTOMER_COOKIE_PATH = '/api';
export const ADMIN_COOKIE_PATH = '/api/admin';

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: User;
  }
}

const getAccessToken = (request: FastifyRequest, realm: AuthRealm) => {
  const cookieName = realm === 'admin' ? ADMIN_ACCESS_COOKIE : CUSTOMER_ACCESS_COOKIE;
  const cookieToken = request.cookies[cookieName];
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

const getUserForRealm = async (request: FastifyRequest, realm: AuthRealm) => {
  const token = getAccessToken(request, realm);

  if (!token) {
    return null;
  }

  const payload = verifyAccessToken(token, realm);

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

export const getAuthenticatedUser = (request: FastifyRequest) => getUserForRealm(request, 'customer');

export const getAdminAuthenticatedUser = (request: FastifyRequest) => getUserForRealm(request, 'admin');

export const authenticateCustomer = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return fail(reply, 401, {
      code: 'UNAUTHENTICATED',
      message: 'Authentication required',
    });
  }

  if (user.role !== 'CUSTOMER') {
    return fail(reply, 403, {
      code: 'CUSTOMER_REQUIRED',
      message: 'Customer access required',
    });
  }

  request.authUser = user;
};

export const authenticateAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = await getAdminAuthenticatedUser(request);

  if (!user) {
    const customer = await getAuthenticatedUser(request);
    if (customer) {
      return fail(reply, 403, {
        code: 'ADMIN_REQUIRED',
        message: 'Admin access required',
      });
    }

    return fail(reply, 401, {
      code: 'UNAUTHENTICATED',
      message: 'Authentication required',
    });
  }

  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return fail(reply, 403, {
      code: 'ADMIN_REQUIRED',
      message: 'Admin access required',
    });
  }

  request.authUser = user;
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
