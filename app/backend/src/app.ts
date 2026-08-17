import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { authRoutes } from './modules/auth/routes.js';
import { healthRoutes } from './modules/health/routes.js';
import { adminAuthRoutes } from './modules/admin/auth-routes.js';
import { adminRoutes } from './modules/admin/routes.js';
import { cartRoutes } from './modules/cart/routes.js';
import { contactRoutes } from './modules/contact/routes.js';
import { addressRoutes, wishlistRoutes } from './modules/customer-routes.js';
import { seoRoutes } from './modules/seo/routes.js';
import { googleReviewsRoutes } from './modules/business/google-reviews.js';
import { adminOrderRoutes, orderRoutes } from './modules/orders/routes.js';
import { adminProductRoutes, productRoutes } from './modules/products/routes.js';
import { requestIdPlugin } from './plugins/request-id.js';
import { csrfPreHandler } from './plugins/csrf.js';
import { fail } from './utils/responses.js';

export const buildApp = async (options: { trustProxy?: number; uploadDirectory?: string } = {}) => {
  const trustProxy = options.trustProxy ?? env.TRUST_PROXY_HOPS;
  const uploadDirectory = options.uploadDirectory ?? path.resolve(process.cwd(), 'uploads');
  const app = Fastify({
    ...(trustProxy > 0 ? { trustProxy } : {}),
    logger: {
      level: env.NODE_ENV === 'development' ? 'debug' : 'info',
    },
  });

  await app.register(requestIdPlugin);
  await app.register(helmet);
  // The same high-entropy server secret is used to authenticate the opaque
  // guest-cart identifier. The browser cannot forge a cart cookie it did not
  // receive from this backend.
  await app.register(cookie, { secret: env.JWT_REFRESH_SECRET });
  await app.register(multipart, {
    limits: {
      files: 5,
      fileSize: 5 * 1024 * 1024,
      parts: 5,
    },
  });
  await mkdir(uploadDirectory, { recursive: true });
  await app.register(fastifyStatic, {
    root: uploadDirectory,
    prefix: '/api/uploads/',
    decorateReply: false,
    setHeaders: (reply) => {
      reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });

  const allowedOrigins = new Set([
    env.FRONTEND_URL,
    ...(env.NODE_ENV === 'production' ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173']),
  ]);

  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Idempotency-Key',
      'X-CSRF-Token',
      ...(env.NODE_ENV === 'production' ? [] : ['X-Guest-Id']),
    ],
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 204,
  });
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_GLOBAL_MAX,
    timeWindow: `${env.RATE_LIMIT_GLOBAL_WINDOW_SECONDS} seconds`,
  });
  app.addHook('preHandler', csrfPreHandler);
  if (env.NODE_ENV !== 'production') {
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'E-Commerce API',
          version: '1.0.0',
        },
      },
    });
    await app.register(swaggerUi, { routePrefix: '/docs' });
  }

  app.setErrorHandler((error: unknown, request, reply) => {
    if (
      error instanceof ZodError ||
      (typeof error === 'object' && error !== null && 'issues' in error && Array.isArray(error.issues))
    ) {
      return fail(reply, 400, {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.issues,
      });
    }

    const statusCode =
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof error.statusCode === 'number' &&
      error.statusCode >= 400
        ? error.statusCode
        : 500;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const message = env.NODE_ENV === 'production' && statusCode >= 500 ? 'Internal server error' : errorMessage;

    if (statusCode >= 500) {
      request.log.error({ err: error }, 'unhandled request error');
    }

    return fail(reply, statusCode, {
      code: statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR',
      message,
    });
  });

  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(productRoutes, { prefix: '/api/products' });
  await app.register(googleReviewsRoutes, { prefix: '/api/business' });
  await app.register(cartRoutes, { prefix: '/api/cart' });
  await app.register(orderRoutes, { prefix: '/api/orders' });
  await app.register(adminAuthRoutes, { prefix: '/api/admin/auth' });
  await app.register(adminRoutes, { prefix: '/api/admin' });
  await app.register(adminProductRoutes, { prefix: '/api/admin/products', uploadDirectory });
  await app.register(adminOrderRoutes, { prefix: '/api/admin/orders' });
  await app.register(contactRoutes, { prefix: '/api/contact' });
  await app.register(wishlistRoutes, { prefix: '/api/wishlist' });
  await app.register(addressRoutes, { prefix: '/api/addresses' });
  await app.register(seoRoutes, { prefix: '/api/seo' });

  app.setNotFoundHandler((_request, reply) => {
    return fail(reply, 404, {
      code: 'NOT_FOUND',
      message: 'Route not found',
    });
  });

  return app;
};
