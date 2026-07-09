import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

describe('health routes', () => {
  it('returns API health status', async () => {
    const app = await buildApp();
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        success: true,
        data: {
          service: 'ecommerce-backend',
          status: 'ok',
        },
      });
    } finally {
      await app.close();
    }
  }, 30000);
});
