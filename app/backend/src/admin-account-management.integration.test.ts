import argon2 from 'argon2';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { prisma } from './db/prisma.js';

const scope = `admin-account-${Date.now()}`;
const superEmail = `owner-${scope}@example.com`;
const adminEmail = `operator-${scope}@example.com`;
const customerEmail = `customer-${scope}@example.com`;
const managedEmail = `orders-${scope}@wahabmobiles.com`;
const superPassword = 'OwnerStrong123!';
const adminPassword = 'AdminStrong123!';
const customerPassword = 'CustomerStrong123!';
const managedPassword = 'ManagedStrong123!';

const cookieValue = (setCookie: string | string[] | number | undefined, name: string) => {
  const headers = Array.isArray(setCookie) ? setCookie : setCookie === undefined ? [] : [String(setCookie)];
  const match = headers.map((header) => header.split(';')[0]).find((value) => value?.startsWith(`${name}=`) ?? false);
  expect(match).toBeDefined();
  return match!;
};

describe('Super Admin account management', () => {
  let app: FastifyInstance;
  let superUserId: string;
  let adminUserId: string;
  let customerUserId: string;
  let managedUserId: string;

  beforeAll(async () => {
    app = await buildApp();
    const [superUser, adminUser, customerUser] = await Promise.all([
      prisma.user.create({ data: { email: superEmail, passwordHash: await argon2.hash(superPassword), firstName: 'Owner', lastName: 'Test', role: 'SUPER_ADMIN' } }),
      prisma.user.create({ data: { email: adminEmail, passwordHash: await argon2.hash(adminPassword), firstName: 'Operator', lastName: 'Test', role: 'ADMIN' } }),
      prisma.user.create({ data: { email: customerEmail, passwordHash: await argon2.hash(customerPassword), firstName: 'Customer', lastName: 'Test', role: 'CUSTOMER' } }),
    ]);
    superUserId = superUser.id;
    adminUserId = adminUser.id;
    customerUserId = customerUser.id;
  }, 60_000);

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { userId: { in: [superUserId, adminUserId, customerUserId, managedUserId].filter(Boolean) } } });
    await prisma.auditLog.deleteMany({ where: { entityId: { in: [superUserId, adminUserId, customerUserId, managedUserId].filter(Boolean) } } });
    await prisma.user.deleteMany({ where: { id: { in: [superUserId, adminUserId, customerUserId, managedUserId].filter(Boolean) } } });
    await app.close();
  });

  it('enforces Super Admin-only account management and never returns passwords', async () => {
    const unauthenticated = await app.inject({ method: 'GET', url: '/api/admin/account-management' });
    expect(unauthenticated.statusCode).toBe(401);

    const adminLogin = await app.inject({ method: 'POST', url: '/api/admin/auth/login', payload: { email: adminEmail, password: adminPassword } });
    const adminCookie = cookieValue(adminLogin.headers['set-cookie'], 'adminAccessToken');
    const adminCsrf = cookieValue(adminLogin.headers['set-cookie'], 'csrfToken');
    const adminForbidden = await app.inject({ method: 'GET', url: '/api/admin/account-management', headers: { cookie: adminCookie } });
    expect(adminForbidden.statusCode).toBe(403);
    const resetForbidden = await app.inject({
      method: 'POST',
      url: `/api/admin/account-management/${adminUserId}/password`,
      headers: { cookie: `${adminCookie}; ${adminCsrf}`, 'x-csrf-token': adminCsrf.slice('csrfToken='.length) },
      payload: { password: 'ResetStrong123!', requirePasswordChange: false },
    });
    expect(resetForbidden.statusCode).toBe(403);

    const customerLogin = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: customerEmail, password: customerPassword } });
    const customerCookie = cookieValue(customerLogin.headers['set-cookie'], 'accessToken');
    const customerForbidden = await app.inject({ method: 'GET', url: '/api/admin/account-management', headers: { cookie: customerCookie } });
    expect(customerForbidden.statusCode).toBe(403);

    const superLogin = await app.inject({ method: 'POST', url: '/api/admin/auth/login', payload: { email: superEmail, password: superPassword } });
    const superCookie = cookieValue(superLogin.headers['set-cookie'], 'adminAccessToken');
    const superCsrf = cookieValue(superLogin.headers['set-cookie'], 'csrfToken');
    const headers = { cookie: `${superCookie}; ${superCsrf}`, 'x-csrf-token': superCsrf.slice('csrfToken='.length) };

    const created = await app.inject({
      method: 'POST',
      url: '/api/admin/account-management',
      headers,
      payload: { firstName: 'Orders', lastName: 'Desk', email: managedEmail, role: 'ADMIN', password: managedPassword, requirePasswordChange: true },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().data).not.toHaveProperty('password');
    expect(created.json().data).not.toHaveProperty('passwordHash');
    expect(created.json().data).toMatchObject({ email: managedEmail, role: 'ADMIN', mustChangePassword: true });
    managedUserId = created.json().data.id;

    const accounts = await app.inject({ method: 'GET', url: '/api/admin/account-management', headers: { cookie: superCookie } });
    expect(accounts.statusCode).toBe(200);
    expect(accounts.json().data.some((account: { email: string }) => account.email === managedEmail)).toBe(true);

    const oldLogin = await app.inject({ method: 'POST', url: '/api/admin/auth/login', payload: { email: managedEmail, password: managedPassword } });
    expect(oldLogin.statusCode).toBe(200);
    expect(oldLogin.json().data).toMatchObject({ mustChangePassword: true });
    const managedCookie = cookieValue(oldLogin.headers['set-cookie'], 'adminAccessToken');
    const managedCsrf = cookieValue(oldLogin.headers['set-cookie'], 'csrfToken');
    const forcedRoute = await app.inject({ method: 'GET', url: '/api/admin/products/categories', headers: { cookie: managedCookie } });
    expect(forcedRoute.statusCode).toBe(403);
    expect(forcedRoute.json().error.code).toBe('PASSWORD_CHANGE_REQUIRED');
    const changedByManagedUser = await app.inject({
      method: 'PUT',
      url: '/api/admin/auth/password',
      headers: { cookie: `${managedCookie}; ${managedCsrf}`, 'x-csrf-token': managedCsrf.slice('csrfToken='.length) },
      payload: { currentPassword: managedPassword, newPassword: 'ManagedChanged123!' },
    });
    expect(changedByManagedUser.statusCode).toBe(200);
    expect(changedByManagedUser.json().data).toMatchObject({ mustChangePassword: false });

    const reset = await app.inject({
      method: 'POST',
      url: `/api/admin/account-management/${managedUserId}/password`,
      headers,
      payload: { password: 'ReplacedStrong123!', requirePasswordChange: false },
    });
    expect(reset.statusCode).toBe(200);
    expect(reset.json().data).not.toHaveProperty('passwordHash');
    expect((await app.inject({ method: 'POST', url: '/api/admin/auth/login', payload: { email: managedEmail, password: managedPassword } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/api/admin/auth/login', payload: { email: managedEmail, password: 'ReplacedStrong123!' } })).statusCode).toBe(200);

    const suspended = await app.inject({ method: 'PATCH', url: `/api/admin/account-management/${managedUserId}`, headers, payload: { status: 'BLOCKED' } });
    expect(suspended.statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/api/admin/auth/login', payload: { email: managedEmail, password: 'ReplacedStrong123!' } })).statusCode).toBe(401);

    const finalSuperAdmin = await app.inject({ method: 'PATCH', url: `/api/admin/account-management/${superUserId}`, headers, payload: { status: 'BLOCKED' } });
    expect(finalSuperAdmin.statusCode).toBe(409);
    expect(finalSuperAdmin.json().error.code).toBe('FINAL_SUPER_ADMIN_REQUIRED');
  }, 60_000);
});
