import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { createHealthRoutes } from './routes.js';

const buildRedis = (ping: () => Promise<string>) => ({
  status: 'wait' as const,
  connect: vi.fn().mockResolvedValue(undefined),
  ping: vi.fn(ping),
  disconnect: vi.fn(),
});

describe('Redis health route', () => {
  it('returns an uncached success after exactly one Redis PING and disconnects', async () => {
    const redis = buildRedis(async () => 'PONG');
    const app = Fastify();
    await app.register(createHealthRoutes(() => redis), { prefix: '/api' });

    try {
      const response = await app.inject({ method: 'GET', url: '/api/health/redis' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ok', redis: 'reachable' });
      expect(response.headers['cache-control']).toBe('no-store');
      expect(redis.connect).toHaveBeenCalledOnce();
      expect(redis.ping).toHaveBeenCalledOnce();
      expect(redis.disconnect).toHaveBeenCalledOnce();
    } finally {
      await app.close();
    }
  });

  it('returns a sanitized uncached failure and disconnects when Redis PING fails', async () => {
    const redis = buildRedis(async () => {
      throw new Error('sensitive Redis failure detail');
    });
    const app = Fastify();
    await app.register(createHealthRoutes(() => redis), { prefix: '/api' });

    try {
      const response = await app.inject({ method: 'GET', url: '/api/health/redis' });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({ status: 'error', redis: 'unreachable' });
      expect(response.body).not.toContain('sensitive');
      expect(response.headers['cache-control']).toBe('no-store');
      expect(redis.ping).toHaveBeenCalledOnce();
      expect(redis.disconnect).toHaveBeenCalledOnce();
    } finally {
      await app.close();
    }
  });

  it('sanitizes a synchronous Redis client creation failure', async () => {
    const app = Fastify();
    await app.register(createHealthRoutes(() => {
      throw new Error('sensitive Redis factory detail');
    }), { prefix: '/api' });

    try {
      const response = await app.inject({ method: 'GET', url: '/api/health/redis' });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({ status: 'error', redis: 'unreachable' });
      expect(response.body).not.toContain('sensitive');
      expect(response.headers['cache-control']).toBe('no-store');
    } finally {
      await app.close();
    }
  });

  it('returns an uncached failure when Redis PING exceeds the health deadline', async () => {
    const redis = buildRedis(() => new Promise((resolve) => {
      setTimeout(() => resolve('PONG'), 50);
    }));
    const app = Fastify();
    await app.register(createHealthRoutes(() => redis, 5), { prefix: '/api' });

    try {
      const response = await app.inject({ method: 'GET', url: '/api/health/redis' });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({ status: 'error', redis: 'unreachable' });
      expect(response.headers['cache-control']).toBe('no-store');
      expect(redis.ping).toHaveBeenCalledOnce();
      expect(redis.disconnect).toHaveBeenCalledOnce();
    } finally {
      await app.close();
    }
  });
});
