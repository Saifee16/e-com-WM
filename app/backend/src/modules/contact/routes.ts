import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { ok } from '../../utils/responses.js';

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email().transform((value) => value.toLowerCase()),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
});

export const contactRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', async (request, reply) => {
    const body = contactSchema.parse(request.body);
    const message = await prisma.contactMessage.create({
      data: body,
    });

    return ok(reply.status(201), {
      id: message.id,
      status: message.status,
      createdAt: message.createdAt.toISOString(),
    });
  });
};

