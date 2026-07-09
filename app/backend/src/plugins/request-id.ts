import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'node:crypto';

export const requestIdPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (request, reply) => {
    const requestId = request.headers['x-request-id'];
    const value = Array.isArray(requestId) ? requestId[0] : requestId;
    const id = value || randomUUID();

    request.id = id;
    reply.header('x-request-id', id);
  });
};
