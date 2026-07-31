import argon2 from 'argon2';
import type { User } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const prismaMocks = vi.hoisted(() => ({
  userFindFirst: vi.fn(),
  userFindUnique: vi.fn(),
  userCreate: vi.fn(),
  userUpdate: vi.fn(),
}));

vi.mock('./db/prisma.js', () => ({
  prisma: {
    user: {
      findFirst: prismaMocks.userFindFirst,
      findUnique: prismaMocks.userFindUnique,
      create: prismaMocks.userCreate,
      update: prismaMocks.userUpdate,
    },
  },
}));

import { buildApp } from './app.js';

const customerId = '11111111-1111-4111-8111-111111111111';
const adminId = '22222222-2222-4222-8222-222222222222';

const extractCookie = (setCookieHeader: string | string[] | number | undefined, name: string) => {
  const headers = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader !== undefined
      ? [String(setCookieHeader)]
      : [];
  const cookie = headers
    .map((header) => header.split(';')[0])
    .find((value) => value?.startsWith(`${name}=`));

  expect(cookie).toBeDefined();
  return cookie!;
};

describe('customer and admin auth realms', () => {
  let app: FastifyInstance;
  let customer: User;
  let admin: User;

  beforeAll(async () => {
    const now = new Date();
    customer = {
      id: customerId,
      email: 'customer@example.com',
      passwordHash: await argon2.hash('Customer123!'),
      firstName: 'Test',
      lastName: 'Customer',
      phone: null,
      role: 'CUSTOMER',
      status: 'ACTIVE',
      emailVerifiedAt: null,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    admin = {
      ...customer,
      id: adminId,
      email: 'admin@example.com',
      passwordHash: await argon2.hash('Admin123!'),
      firstName: 'Test',
      lastName: 'Admin',
      role: 'ADMIN',
    };

    prismaMocks.userFindFirst.mockImplementation(async (args: { where: Record<string, unknown> }) => {
      const where = args.where;

      if (where.id === customerId) return customer;
      if (where.id === adminId) return admin;

      if (where.role === 'CUSTOMER') {
        return where.email === customer.email ? customer : null;
      }

      if (typeof where.role === 'object' && where.role !== null && 'in' in where.role) {
        return where.email === admin.email ? admin : null;
      }

      return null;
    });
    prismaMocks.userUpdate.mockImplementation(async (args: { where: { id: string } }) =>
      args.where.id === adminId ? admin : customer,
    );

    app = await buildApp();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns 401 for an admin endpoint without either session', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/dashboard',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: 'UNAUTHENTICATED' },
    });
  });

  it('rejects admin accounts at the customer login with 403', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: admin.email,
        password: 'Admin123!',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: 'ADMIN_LOGIN_REQUIRED' },
    });
  });

  it('scopes the admin login query to admin roles and rejects customer credentials', async () => {
    prismaMocks.userFindFirst.mockClear();
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/auth/login',
      payload: {
        email: customer.email,
        password: 'Customer123!',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: 'INVALID_CREDENTIALS' },
    });
    expect(prismaMocks.userFindFirst).toHaveBeenCalledWith({
      where: {
        email: customer.email,
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        status: 'ACTIVE',
        deletedAt: null,
      },
    });
  });

  it('returns 403 when a customer session is used on an admin endpoint', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: customer.email,
        password: 'Customer123!',
      },
    });
    const customerCookie = extractCookie(login.headers['set-cookie'], 'accessToken');
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/dashboard',
      headers: { cookie: customerCookie },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: 'ADMIN_REQUIRED' },
    });
  });

  it('keeps customer and admin sessions valid in the same cookie jar', async () => {
    const customerLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: customer.email,
        password: 'Customer123!',
      },
    });
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/admin/auth/login',
      payload: {
        email: admin.email,
        password: 'Admin123!',
      },
    });
    const customerCookie = extractCookie(customerLogin.headers['set-cookie'], 'accessToken');
    const adminCookie = extractCookie(adminLogin.headers['set-cookie'], 'adminAccessToken');
    const cookieJar = `${customerCookie}; ${adminCookie}`;

    expect(String(customerLogin.headers['set-cookie'])).toContain('Path=/api');
    expect(String(adminLogin.headers['set-cookie'])).toContain('Path=/api/admin');

    const customerProfile = await app.inject({
      method: 'GET',
      url: '/api/auth/profile',
      headers: { cookie: cookieJar },
    });
    const adminProfile = await app.inject({
      method: 'GET',
      url: '/api/admin/auth/profile',
      headers: { cookie: cookieJar },
    });

    expect(customerProfile.statusCode).toBe(200);
    expect(customerProfile.json()).toMatchObject({
      success: true,
      data: { email: customer.email, role: 'CUSTOMER' },
    });
    expect(adminProfile.statusCode).toBe(200);
    expect(adminProfile.json()).toMatchObject({
      success: true,
      data: { email: admin.email, role: 'ADMIN' },
    });
  });
});
