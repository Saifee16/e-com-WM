import type { FastifyPluginAsync } from 'fastify';
import argon2 from 'argon2';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { fail, ok } from '../../utils/responses.js';
import { requireChangedAdminPassword, authenticateSuperAdmin } from '../auth/session.js';
import { revokeAllUserRefreshTokens } from '../auth/refresh.js';
import { env } from '../../config/env.js';

const mapContactMessage = (message: {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  userId: string | null;
  statusUpdatedAt: Date;
  resolvedAt: Date | null;
  createdAt: Date;
}) => ({
  id: message.id,
  name: message.name,
  email: message.email,
  subject: message.subject,
  message: message.message,
  status: message.status,
  customerId: message.userId ?? undefined,
  isGuest: message.userId === null,
  statusUpdatedAt: message.statusUpdatedAt.toISOString(),
  resolvedAt: message.resolvedAt?.toISOString(),
  createdAt: message.createdAt.toISOString(),
});

const mapAdminUser = (user: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  createdAt: Date;
  _count: { orders: number };
}) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone ?? undefined,
  role: user.role,
  status: user.status,
  createdAt: user.createdAt.toISOString(),
  orders: user._count.orders,
});

const mapManagedAdmin = (user: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  createdAt: Date;
  lastLoginAt: Date | null;
  mustChangePassword: boolean;
}) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone ?? undefined,
  role: user.role,
  status: user.status,
  createdAt: user.createdAt.toISOString(),
  lastLoginAt: user.lastLoginAt?.toISOString(),
  mustChangePassword: user.mustChangePassword,
});

const adminUserUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  email: z.string().email().transform((value) => value.toLowerCase()).optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  role: z.enum(['CUSTOMER', 'ADMIN', 'SUPER_ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'BLOCKED']).optional(),
}).refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required' });

const strongPasswordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .max(200)
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

const managedAdminCreateSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().email().transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(40).nullable().optional(),
  role: z.enum(['ADMIN', 'SUPER_ADMIN']).default('ADMIN'),
  password: strongPasswordSchema,
  requirePasswordChange: z.boolean().default(false),
});

const managedAdminUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  email: z.string().email().transform((value) => value.toLowerCase()).optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  role: z.enum(['ADMIN', 'SUPER_ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'BLOCKED']).optional(),
}).refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required' });

const managedAdminPasswordSchema = z.object({
  password: strongPasswordSchema,
  requirePasswordChange: z.boolean().default(false),
});

const accountManagementQuerySchema = z.object({ search: z.string().trim().max(200).optional() });

const finalActiveSuperAdminError = (reply: Parameters<typeof fail>[0]) =>
  fail(reply, 409, {
    code: 'FINAL_SUPER_ADMIN_REQUIRED',
    message: 'The last active Super Admin cannot be demoted or suspended',
  });

const creationPolicyError = (reply: Parameters<typeof fail>[0], role: 'ADMIN' | 'SUPER_ADMIN') =>
  role === 'SUPER_ADMIN' && !env.ALLOW_SUPER_ADMIN_CREATION
    ? fail(reply, 403, {
        code: 'SUPER_ADMIN_CREATION_DISABLED',
        message: 'Creating or promoting another Super Admin requires explicit policy approval',
      })
    : null;

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireChangedAdminPassword);

  app.get('/users', async (request, reply) => {
    const query = z.object({ search: z.string().trim().max(200).optional() }).parse(request.query);
      const users = await prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
        deletedAt: null,
        ...(query.search
          ? {
              OR: [
                { firstName: { contains: query.search, mode: 'insensitive' } },
                { lastName: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: 'desc' },
      take: 250,
    });
    return ok(reply, users.map(mapAdminUser));
  });

  app.patch('/users/:id', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = adminUserUpdateSchema.parse(request.body);
    const existing = await prisma.user.findFirst({ where: { id: params.id, deletedAt: null } });
    if (!existing) return fail(reply, 404, { code: 'USER_NOT_FOUND', message: 'User not found' });

    if (existing.role !== 'CUSTOMER' || body.role !== undefined || body.status !== undefined) {
      return fail(reply, 403, {
        code: 'SUPER_ADMIN_REQUIRED',
        message: 'Administrator accounts can only be managed by a Super Admin',
      });
    }

    if (body.email && body.email !== existing.email) {
      const emailInUse = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
      if (emailInUse) return fail(reply, 409, { code: 'EMAIL_ALREADY_REGISTERED', message: 'Email is already registered' });
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
        ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
      },
      include: { _count: { select: { orders: true } } },
    });
    await prisma.auditLog.create({
      data: {
        actorUserId: request.authUser!.id,
        action: body.role !== undefined ? 'ROLE_CHANGE' : body.status !== undefined ? 'STATUS_CHANGE' : 'UPDATE',
        entityType: 'User',
        entityId: updated.id,
        before: { firstName: existing.firstName, lastName: existing.lastName, email: existing.email, phone: existing.phone, role: existing.role, status: existing.status },
        after: mapAdminUser(updated),
      },
    });
    return ok(reply, mapAdminUser(updated));
  });

  await app.register(async (superAdminApp) => {
    superAdminApp.addHook('preHandler', authenticateSuperAdmin);

    superAdminApp.get('/account-management', async (request, reply) => {
      const query = accountManagementQuerySchema.parse(request.query);
      const accounts = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          deletedAt: null,
          ...(query.search
            ? {
                OR: [
                  { firstName: { contains: query.search, mode: 'insensitive' } },
                  { lastName: { contains: query.search, mode: 'insensitive' } },
                  { email: { contains: query.search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 250,
      });

      return ok(reply, accounts.map(mapManagedAdmin));
    });

    superAdminApp.post('/account-management', async (request, reply) => {
      const body = managedAdminCreateSchema.parse(request.body);
      const policyError = creationPolicyError(reply, body.role);
      if (policyError) return policyError;

      const existing = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
      if (existing) return fail(reply, 409, { code: 'EMAIL_ALREADY_REGISTERED', message: 'Email is already registered' });

      const passwordHash = await argon2.hash(body.password);
      const created = await prisma.user.create({
        data: {
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          ...(body.phone ? { phone: body.phone } : {}),
          passwordHash,
          role: body.role,
          status: 'ACTIVE',
          mustChangePassword: body.requirePasswordChange,
        },
      });
      const safeAccount = mapManagedAdmin(created);
      await prisma.auditLog.create({
        data: {
          actorUserId: request.authUser!.id,
          action: 'CREATE',
          entityType: 'AdminAccount',
          entityId: created.id,
          after: safeAccount,
        },
      });

      return ok(reply.status(201), safeAccount);
    });

    superAdminApp.patch('/account-management/:id', async (request, reply) => {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = managedAdminUpdateSchema.parse(request.body);
      const existing = await prisma.user.findFirst({
        where: { id: params.id, role: { in: ['ADMIN', 'SUPER_ADMIN'] }, deletedAt: null },
      });
      if (!existing) return fail(reply, 404, { code: 'ADMIN_ACCOUNT_NOT_FOUND', message: 'Admin account not found' });

      const isSelf = existing.id === request.authUser!.id;
      const policyError = body.role ? creationPolicyError(reply, body.role) : null;
      if (policyError && body.role !== existing.role) return policyError;

      const removesLastActiveSuperAdmin =
        existing.role === 'SUPER_ADMIN'
        && existing.status === 'ACTIVE'
        && ((body.role !== undefined && body.role !== 'SUPER_ADMIN')
          || (body.status !== undefined && body.status !== 'ACTIVE'));
      if (removesLastActiveSuperAdmin) {
        const activeSuperAdmins = await prisma.user.count({
          where: { role: 'SUPER_ADMIN', status: 'ACTIVE', deletedAt: null },
        });
        if (activeSuperAdmins <= 1) return finalActiveSuperAdminError(reply);
      }

      if (isSelf && (body.role !== undefined || body.status !== undefined)) {
        return fail(reply, 403, {
          code: 'SELF_PRIVILEGE_CHANGE_FORBIDDEN',
          message: 'Use a different Super Admin to change your role or account status',
        });
      }

      if (body.email && body.email !== existing.email) {
        const emailInUse = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
        if (emailInUse) return fail(reply, 409, { code: 'EMAIL_ALREADY_REGISTERED', message: 'Email is already registered' });
      }

      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
          ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
          ...(body.email !== undefined ? { email: body.email } : {}),
          ...(body.phone !== undefined ? { phone: body.phone } : {}),
          ...(body.role !== undefined ? { role: body.role } : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
        },
      });
      if (body.status === 'BLOCKED' || body.role === 'ADMIN' && existing.role === 'SUPER_ADMIN') {
        await revokeAllUserRefreshTokens(existing.id, body.status === 'BLOCKED' ? 'ACCOUNT_SUSPENDED' : 'ROLE_CHANGED');
      }
      const safeAccount = mapManagedAdmin(updated);
      await prisma.auditLog.create({
        data: {
          actorUserId: request.authUser!.id,
          action: body.role !== undefined ? 'ROLE_CHANGE' : body.status !== undefined ? 'STATUS_CHANGE' : 'UPDATE',
          entityType: 'AdminAccount',
          entityId: updated.id,
          before: mapManagedAdmin(existing),
          after: safeAccount,
        },
      });
      return ok(reply, safeAccount);
    });

    superAdminApp.post('/account-management/:id/password', async (request, reply) => {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = managedAdminPasswordSchema.parse(request.body);
      const existing = await prisma.user.findFirst({
        where: { id: params.id, role: { in: ['ADMIN', 'SUPER_ADMIN'] }, deletedAt: null },
      });
      if (!existing) return fail(reply, 404, { code: 'ADMIN_ACCOUNT_NOT_FOUND', message: 'Admin account not found' });

      const passwordHash = await argon2.hash(body.password);
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash, mustChangePassword: body.requirePasswordChange },
      });
      await revokeAllUserRefreshTokens(existing.id, 'ADMIN_PASSWORD_RESET');
      const safeAccount = mapManagedAdmin(updated);
      await prisma.auditLog.create({
        data: {
          actorUserId: request.authUser!.id,
          action: 'UPDATE',
          entityType: 'AdminAccountPassword',
          entityId: updated.id,
          after: { accountId: updated.id, passwordReset: true, requirePasswordChange: updated.mustChangePassword },
        },
      });
      return ok(reply, safeAccount);
    });

    superAdminApp.post('/account-management/:id/revoke-sessions', async (request, reply) => {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const target = await prisma.user.findFirst({
        where: { id: params.id, role: { in: ['ADMIN', 'SUPER_ADMIN'] }, deletedAt: null },
        select: { id: true },
      });
      if (!target) return fail(reply, 404, { code: 'ADMIN_ACCOUNT_NOT_FOUND', message: 'Admin account not found' });

      await revokeAllUserRefreshTokens(target.id, 'ADMIN_SESSIONS_REVOKED');
      await prisma.auditLog.create({
        data: {
          actorUserId: request.authUser!.id,
          action: 'LOGOUT',
          entityType: 'AdminAccount',
          entityId: target.id,
          after: { accountId: target.id, sessionsRevoked: true },
        },
      });
      return ok(reply, { sessionsRevoked: true });
    });
  });

  app.get('/dashboard', async (_request, reply) => {
    const [products, orders, users, contacts, revenue, recentOrders, topProductGroups, recentContacts] = await Promise.all([
      prisma.product.count({ where: { status: { not: 'ARCHIVED' } } }),
      prisma.order.count(),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.contactMessage.count({ where: { status: 'OPEN' } }),
      prisma.order.aggregate({ _sum: { totalAmount: true } }),
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          status: true,
          createdAt: true,
          guestEmail: true,
          shippingAddressSnapshot: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            status: {
              notIn: ['CANCELLED', 'REFUNDED'],
            },
          },
        },
        _sum: {
          quantity: true,
          lineTotalAmount: true,
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: 4,
      }),
      prisma.contactMessage.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);
    const topProductRows = await prisma.product.findMany({
      where: {
        id: {
          in: topProductGroups.map((group) => group.productId),
        },
      },
      select: {
        id: true,
        name: true,
      },
    });
    const productNames = new Map(topProductRows.map((product) => [product.id, product.name]));

    return ok(reply, {
      products,
      orders,
      users,
      newContactMessages: contacts,
      revenue: revenue._sum.totalAmount ?? 0,
      recentOrders: recentOrders.map((order) => {
        const shippingAddress =
          typeof order.shippingAddressSnapshot === 'object' &&
          order.shippingAddressSnapshot !== null &&
          !Array.isArray(order.shippingAddressSnapshot)
            ? order.shippingAddressSnapshot
            : {};
        const shippingName = shippingAddress.fullName;

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          customer:
            order.user
              ? `${order.user.firstName} ${order.user.lastName}`.trim()
              : typeof shippingName === 'string'
                ? shippingName
                : order.guestEmail ?? 'Guest customer',
          email: order.user?.email ?? order.guestEmail,
          total: order.totalAmount,
          status: order.status.toLowerCase(),
          createdAt: order.createdAt.toISOString(),
        };
      }),
      topProducts: topProductGroups.map((group) => ({
        id: group.productId,
        name: productNames.get(group.productId) ?? 'Deleted product',
        sales: group._sum.quantity ?? 0,
        revenue: group._sum.lineTotalAmount ?? 0,
      })),
      recentContacts: recentContacts.map(mapContactMessage),
    });
  });

  app.get('/contact-messages', async (request, reply) => {
    const query = z
      .object({
        status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']).optional(),
      })
      .parse(request.query);
    const messages = await prisma.contactMessage.findMany({
      where: query.status ? { status: query.status } : {},
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return ok(reply, messages.map(mapContactMessage));
  });

  app.patch('/contact-messages/:id', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({ status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']) }).parse(request.body);
    const now = new Date();
    const existing = await prisma.contactMessage.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!existing) return fail(reply, 404, { code: 'CONTACT_MESSAGE_NOT_FOUND', message: 'Contact message not found' });
    const message = await prisma.contactMessage.update({
      where: { id: params.id },
      data: {
        status: body.status,
        statusUpdatedAt: now,
        resolvedAt: body.status === 'RESOLVED' ? now : null,
      },
    });

    return ok(reply, mapContactMessage(message));
  });

  app.get('/sales-report', async (_request, reply) => {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { orderNumber: true, totalAmount: true, createdAt: true, status: true },
    });

    return ok(reply, orders);
  });

  app.get('/top-products', async (_request, reply) => {
    const products = await prisma.product.findMany({
      where: { status: 'ACTIVE' },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, isFeatured: true },
    });

    return ok(reply, products);
  });

  app.get('/top-customers', async (_request, reply) => {
    const customers = await prisma.user.findMany({
      where: { role: 'CUSTOMER', deletedAt: null },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    return ok(reply, customers);
  });
};
