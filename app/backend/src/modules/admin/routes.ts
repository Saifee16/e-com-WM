import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { fail, ok } from '../../utils/responses.js';
import { authenticateAdmin } from '../auth/session.js';

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

const adminUserUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  email: z.string().email().transform((value) => value.toLowerCase()).optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  role: z.enum(['CUSTOMER', 'ADMIN', 'SUPER_ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'BLOCKED']).optional(),
}).refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required' });

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticateAdmin);

  app.get('/users', async (request, reply) => {
    const query = z.object({ search: z.string().trim().max(200).optional() }).parse(request.query);
    const users = await prisma.user.findMany({
      where: {
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

    const isSelf = existing.id === request.authUser!.id;
    if (isSelf && (body.role !== undefined || body.status !== undefined)) {
      return fail(reply, 403, { code: 'SELF_PRIVILEGE_CHANGE_FORBIDDEN', message: 'Use a different administrator to change your role or account status' });
    }
    if (existing.role === 'SUPER_ADMIN' && request.authUser!.role !== 'SUPER_ADMIN' && (body.role !== undefined || body.status !== undefined)) {
      return fail(reply, 403, { code: 'SUPER_ADMIN_PROTECTED', message: 'Only a super administrator may change this account access' });
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
