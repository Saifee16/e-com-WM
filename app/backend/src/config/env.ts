import 'dotenv/config';
import { z } from 'zod';

const stringBoolean = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((value) => value === true || value === 'true');

const emptyStringToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const optionalString = z.preprocess(emptyStringToUndefined, z.string().optional());
const optionalTrimmedString = z.preprocess(emptyStringToUndefined, z.string().trim().optional());
const optionalUrl = z.preprocess(emptyStringToUndefined, z.string().url().optional());

const isRedisUrl = (value: string) => {
  try {
    const url = new URL(value);
    return (url.protocol === 'redis:' || url.protocol === 'rediss:') && url.hostname.length > 0;
  } catch {
    return false;
  }
};

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_URL: z.string().url().default('http://localhost:4000'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().trim().min(1).refine(isRedisUrl, {
    message: 'must be a redis:// or rediss:// URL with a hostname',
  }).default('redis://localhost:6379'),
  JWT_ACCESS_SECRET: z.string().min(24),
  JWT_REFRESH_SECRET: z.string().min(24),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  PASSWORD_RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  COOKIE_DOMAIN: optionalTrimmedString,
  COOKIE_SECURE: stringBoolean.default(false),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().positive().default(300),
  RATE_LIMIT_GLOBAL_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_LOGIN_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  PASSWORD_RESET_IP_MAX: z.coerce.number().int().positive().default(5),
  PASSWORD_RESET_IP_WINDOW_SECONDS: z.coerce.number().int().positive().default(900),
  PASSWORD_RESET_ACCOUNT_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(300),
  PUBLIC_FORM_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  PUBLIC_FORM_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(900),
  EMAIL_FROM: z.string().email().default('no-reply@example.com'),
  RESEND_API_KEY: optionalString,
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  GOOGLE_REDIRECT_URI: optionalUrl,
  FACEBOOK_APP_ID: optionalString,
  FACEBOOK_APP_SECRET: optionalString,
  FACEBOOK_REDIRECT_URI: optionalUrl,
  FACEBOOK_GRAPH_API_VERSION: z.preprocess(
    emptyStringToUndefined,
    z.string().regex(/^v\d+\.\d+$/).optional(),
  ),
}).superRefine((value, context) => {
  if (value.RATE_LIMIT_LOGIN_MAX >= value.RATE_LIMIT_GLOBAL_MAX) {
    context.addIssue({ code: 'custom', path: ['RATE_LIMIT_LOGIN_MAX'], message: 'RATE_LIMIT_LOGIN_MAX must be lower than RATE_LIMIT_GLOBAL_MAX' });
  }
  if (value.PASSWORD_RESET_IP_MAX >= value.RATE_LIMIT_GLOBAL_MAX) {
    context.addIssue({ code: 'custom', path: ['PASSWORD_RESET_IP_MAX'], message: 'PASSWORD_RESET_IP_MAX must be lower than RATE_LIMIT_GLOBAL_MAX' });
  }
  if (value.PUBLIC_FORM_RATE_LIMIT_MAX >= value.RATE_LIMIT_GLOBAL_MAX) {
    context.addIssue({ code: 'custom', path: ['PUBLIC_FORM_RATE_LIMIT_MAX'], message: 'PUBLIC_FORM_RATE_LIMIT_MAX must be lower than RATE_LIMIT_GLOBAL_MAX' });
  }
  if (value.NODE_ENV === 'production' && !value.COOKIE_SECURE) {
    context.addIssue({ code: 'custom', path: ['COOKIE_SECURE'], message: 'COOKIE_SECURE must be true in production' });
  }
  if (value.COOKIE_SAME_SITE === 'none' && !value.COOKIE_SECURE) {
    context.addIssue({ code: 'custom', path: ['COOKIE_SECURE'], message: 'COOKIE_SECURE must be true when COOKIE_SAME_SITE is none' });
  }
  const frontendUrl = new URL(value.FRONTEND_URL);
  const apiUrl = new URL(value.API_BASE_URL);
  const localHttpFrontend =
    frontendUrl.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '::1'].includes(frontendUrl.hostname);
  if (value.NODE_ENV === 'production' && frontendUrl.protocol !== 'https:' && !localHttpFrontend) {
    context.addIssue({ code: 'custom', path: ['FRONTEND_URL'], message: 'FRONTEND_URL must use HTTPS in production' });
  }
  const localHttpApi = apiUrl.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(apiUrl.hostname);
  if (value.NODE_ENV === 'production' && apiUrl.protocol !== 'https:' && !localHttpApi) {
    context.addIssue({ code: 'custom', path: ['API_BASE_URL'], message: 'API_BASE_URL must use HTTPS in production' });
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  throw new Error(`Invalid backend environment: ${details}`);
}

export const env = parsed.data;
