import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';

const baseEnv = {
  NODE_ENV: 'development',
  API_BASE_URL: 'http://localhost:4000',
  FRONTEND_URL: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/ecommerce',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  COOKIE_SECURE: 'false',
};

describe('backend environment image storage validation', () => {
  it('accepts a complete Cloudinary configuration', () => {
    const parsed = parseEnv({
      ...baseEnv,
      NODE_ENV: 'production',
      API_BASE_URL: 'https://api.example.com',
      FRONTEND_URL: 'https://www.example.com',
      COOKIE_SECURE: 'true',
      PRODUCT_IMAGE_STORAGE: 'cloudinary',
      CLOUDINARY_CLOUD_NAME: 'demo-cloud',
      CLOUDINARY_API_KEY: 'demo-key',
      CLOUDINARY_API_SECRET: 'demo-secret',
    });

    expect(parsed.PRODUCT_IMAGE_STORAGE).toBe('cloudinary');
  });

  it('rejects an incomplete effective Cloudinary configuration without exposing values', () => {
    const secret = 'do-not-print-this-secret';

    expect(() => parseEnv({
      ...baseEnv,
      PRODUCT_IMAGE_STORAGE: 'cloudinary',
      CLOUDINARY_CLOUD_NAME: 'demo-cloud',
      CLOUDINARY_API_KEY: 'demo-key',
      CLOUDINARY_API_SECRET: undefined,
    })).toThrowError(/CLOUDINARY_API_SECRET/);

    try {
      parseEnv({ ...baseEnv, PRODUCT_IMAGE_STORAGE: 'cloudinary', CLOUDINARY_API_SECRET: secret });
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });

  it('keeps local development storage valid without Cloudinary credentials', () => {
    const parsed = parseEnv({ ...baseEnv, PRODUCT_IMAGE_STORAGE: 'local' });

    expect(parsed.PRODUCT_IMAGE_STORAGE).toBe('local');
  });

  it('validates the production default as Cloudinary when no provider is specified', () => {
    expect(() => parseEnv({
      ...baseEnv,
      NODE_ENV: 'production',
      API_BASE_URL: 'https://api.example.com',
      FRONTEND_URL: 'https://www.example.com',
      COOKIE_SECURE: 'true',
    })).toThrow(/CLOUDINARY_CLOUD_NAME/);
  });
});
