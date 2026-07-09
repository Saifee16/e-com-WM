import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { env } from '../../config/env.js';

interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  exp: number;
}

const base64UrlEncode = (value: string) => Buffer.from(value).toString('base64url');

const sign = (payload: string) => {
  return createHmac('sha256', env.JWT_ACCESS_SECRET).update(payload).digest('base64url');
};

const accessTokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  role: z.string(),
  exp: z.number().int().positive(),
});

export const createAccessToken = (payload: Omit<AccessTokenPayload, 'exp'>) => {
  const expiresAt = Math.floor(Date.now() / 1000) + env.ACCESS_TOKEN_TTL_SECONDS;
  const encodedPayload = base64UrlEncode(JSON.stringify({ ...payload, exp: expiresAt }));
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
};

export const verifyAccessToken = (token: string): AccessTokenPayload | null => {
  try {
    const [encodedPayload, signature, extra] = token.split('.');

    if (!encodedPayload || !signature || extra) {
      return null;
    }

    const expectedSignature = sign(encodedPayload);
    const provided = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);

    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return null;
    }

    const parsed = accessTokenPayloadSchema.parse(JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')));

    if (parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};
