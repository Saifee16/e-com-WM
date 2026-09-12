import type { FastifyPluginAsync } from 'fastify';
import { Redis } from 'ioredis';
import { env } from '../../config/env.js';
import { prisma } from '../../db/prisma.js';
import { ok } from '../../utils/responses.js';

interface RedisHealthClient {
  readonly status: string;
  connect(): Promise<unknown>;
  ping(): Promise<unknown>;
  disconnect(): void;
}

const createRedisClient = (): RedisHealthClient => {
  const redis = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 500,
    retryStrategy: () => null,
  });
  redis.on('error', () => undefined);
  return redis;
};

const REDIS_HEALTH_TIMEOUT_MS = 2_000;

export const createHealthRoutes = (
  redisFactory: () => RedisHealthClient = createRedisClient,
  timeoutMs = REDIS_HEALTH_TIMEOUT_MS,
): FastifyPluginAsync => async (app) => {
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

  app.get('/health/redis', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    let redis: RedisHealthClient | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
      const client = redisFactory();
      redis = client;
      const ping = async () => {
        if (client.status === 'wait') await client.connect();
        await client.ping();
      };
      const deadline = new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error('Redis health check timed out')), timeoutMs);
        timeout.unref();
      });
      await Promise.race([ping(), deadline]);
      return reply.status(200).send({ status: 'ok', redis: 'reachable' });
    } catch {
      request.log.warn('Redis health check failed');
      return reply.status(503).send({ status: 'error', redis: 'unreachable' });
    } finally {
      if (timeout) clearTimeout(timeout);
      redis?.disconnect();
    }
  });
};

export const healthRoutes = createHealthRoutes();
