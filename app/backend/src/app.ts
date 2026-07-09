import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { authRoutes } from './modules/auth/routes.js';
import { healthRoutes } from './modules/health/routes.js';
import { adminRoutes } from './modules/admin/routes.js';
import { cartRoutes } from './modules/cart/routes.js';
import { contactRoutes } from './modules/contact/routes.js';
import { orderRoutes } from './modules/orders/routes.js';
import { productRoutes } from './modules/products/routes.js';
import { requestIdPlugin } from './plugins/request-id.js';
import { fail } from './utils/responses.js';

export const buildApp = async () => {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'debug' : 'info',
    },
  });

  await app.register(requestIdPlugin);
  await app.register(helmet);
  await app.register(cookie);
  await app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
  });
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_GLOBAL_MAX,
    timeWindow: `${env.RATE_LIMIT_GLOBAL_WINDOW_SECONDS} seconds`,
  });
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'E-Commerce API',
        version: '1.0.0',
      },
    },
  });
  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(productRoutes, { prefix: '/api/products' });
  await app.register(cartRoutes, { prefix: '/api/cart' });
  await app.register(orderRoutes, { prefix: '/api/orders' });
  await app.register(adminRoutes, { prefix: '/api/admin' });
  await app.register(contactRoutes, { prefix: '/api/contact' });

  app.setErrorHandler((error: unknown, _request, reply) => {
    if (error instanceof ZodError) {
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

    return fail(reply, statusCode, {
      code: statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR',
      message,
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    return fail(reply, 404, {
      code: 'NOT_FOUND',
      message: 'Route not found',
    });
  });

  return app;
};
