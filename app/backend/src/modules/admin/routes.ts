import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { ok } from '../../utils/responses.js';
import { requireAdminUser } from '../auth/session.js';

const mapContactMessage = (message: {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  reviewedAt: Date | null;
  createdAt: Date;
}) => ({
  id: message.id,
  name: message.name,
  email: message.email,
  subject: message.subject,
  message: message.message,
  status: message.status,
  reviewedAt: message.reviewedAt?.toISOString(),
  createdAt: message.createdAt.toISOString(),
});

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.get('/dashboard', async (request, reply) => {
    const admin = await requireAdminUser(request, reply);
    if (!admin) return;

    const [products, orders, users, contacts, revenue] = await Promise.all([
      prisma.product.count({ where: { status: { not: 'ARCHIVED' } } }),
      prisma.order.count(),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.contactMessage.count({ where: { status: 'NEW' } }),
      prisma.order.aggregate({ _sum: { totalAmount: true } }),
    ]);

    return ok(reply, {
      products,
      orders,
      users,
      newContactMessages: contacts,
      revenue: revenue._sum.totalAmount ?? 0,
    });
  });

  app.get('/contact-messages', async (request, reply) => {
    const admin = await requireAdminUser(request, reply);
    if (!admin) return;

    const query = z
      .object({
        status: z.enum(['NEW', 'REVIEWED', 'ARCHIVED']).optional(),
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
    const admin = await requireAdminUser(request, reply);
    if (!admin) return;

    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({ status: z.enum(['NEW', 'REVIEWED', 'ARCHIVED']) }).parse(request.body);
    const message = await prisma.contactMessage.update({
      where: { id: params.id },
      data: {
        status: body.status,
        reviewedAt: body.status === 'REVIEWED' ? new Date() : null,
      },
    });

    return ok(reply, mapContactMessage(message));
  });

  app.get('/sales-report', async (request, reply) => {
    const admin = await requireAdminUser(request, reply);
    if (!admin) return;

    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { orderNumber: true, totalAmount: true, createdAt: true, status: true },
    });

    return ok(reply, orders);
  });

  app.get('/top-products', async (request, reply) => {
    const admin = await requireAdminUser(request, reply);
    if (!admin) return;

    const products = await prisma.product.findMany({
      where: { status: 'ACTIVE' },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, isFeatured: true },
    });

    return ok(reply, products);
  });

  app.get('/top-customers', async (request, reply) => {
    const admin = await requireAdminUser(request, reply);
    if (!admin) return;

    const customers = await prisma.user.findMany({
      where: { role: 'CUSTOMER', deletedAt: null },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    return ok(reply, customers);
  });
};

