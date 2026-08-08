import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { env } from '../../config/env.js';
import { ok } from '../../utils/responses.js';
import { authenticateCustomer, getAuthenticatedUser } from '../auth/session.js';

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email().transform((value) => value.toLowerCase()),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
});

export const contactRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', {
    config: {
      rateLimit: {
        max: env.PUBLIC_FORM_RATE_LIMIT_MAX,
        timeWindow: `${env.PUBLIC_FORM_RATE_LIMIT_WINDOW_SECONDS} seconds`,
      },
    },
  }, async (request, reply) => {
    const body = contactSchema.parse(request.body);
    const user = await getAuthenticatedUser(request);
    const message = await prisma.contactMessage.create({
      data: { ...body, ...(user ? { userId: user.id } : {}) },
    });

    return ok(reply.status(201), {
      id: message.id,
      status: message.status,
      createdAt: message.createdAt.toISOString(),
    });
  });

  app.get('/mine', { preHandler: authenticateCustomer }, async (request, reply) => {
    const messages = await prisma.contactMessage.findMany({
      where: { userId: request.authUser!.id },
      orderBy: { createdAt: 'desc' },
    });
    return ok(reply, messages.map((message) => ({
      id: message.id,
      name: message.name,
      email: message.email,
      subject: message.subject,
      message: message.message,
      status: message.status,
      statusUpdatedAt: message.statusUpdatedAt.toISOString(),
      resolvedAt: message.resolvedAt?.toISOString(),
      createdAt: message.createdAt.toISOString(),
    })));
  });
};
