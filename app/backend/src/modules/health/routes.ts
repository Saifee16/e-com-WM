import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../db/prisma.js';
import { ok } from '../../utils/responses.js';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async (_request, reply) => {
    return ok(reply, {
      service: 'ecommerce-backend',
      status: 'ok',
      version: process.env.npm_package_version ?? '0.0.0',
    });
  });

  app.get('/health/db', async (_request, reply) => {
    await prisma.$queryRaw`SELECT 1`;
    return ok(reply, {
      database: 'postgresql',
      status: 'ok',
    });
  });
};
