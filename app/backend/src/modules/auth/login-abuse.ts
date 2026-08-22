import { createHmac } from 'node:crypto';
import { Redis } from 'ioredis';
import { env } from '../../config/env.js';

export type LoginRealm = 'customer' | 'admin';

export interface LoginAbusePolicy {
  failureWindowSeconds: number;
  cooldownThreshold: number;
  escalationThreshold: number;
  cooldownSeconds: number;
  escalatedCooldownSeconds: number;
}

export const LOGIN_ABUSE_POLICY: LoginAbusePolicy = Object.freeze({
  failureWindowSeconds: 15 * 60,
  cooldownThreshold: 5,
  escalationThreshold: 10,
  cooldownSeconds: 30,
  escalatedCooldownSeconds: 5 * 60,
});

export interface LoginAbuseDecision {
  blocked: boolean;
  retryAfterSeconds: number;
  failureCount: number;
  redisUnavailable: boolean;
}

export interface LoginAbuseRedis {
  eval(script: string, numberOfKeys: number, ...args: string[]): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
  readonly status?: string;
  connect?: () => Promise<unknown>;
  quit?: () => Promise<unknown>;
}

const LOGIN_ABUSE_PREFIX = 'auth:login-abuse:v1';

const CHECK_SCRIPT = `
local blockedTtl = redis.call('PTTL', KEYS[1])
return {blockedTtl}
`;

const RECORD_FAILURE_SCRIPT = `
local blockedTtl = redis.call('PTTL', KEYS[2])
if blockedTtl > 0 then
  return {1, blockedTtl, 0, 0}
end

local failureCount = redis.call('INCR', KEYS[1])
if failureCount == 1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
end

local cooldownSeconds = 0
if failureCount >= tonumber(ARGV[3]) then
  cooldownSeconds = tonumber(ARGV[5])
elseif failureCount >= tonumber(ARGV[2]) then
  cooldownSeconds = tonumber(ARGV[4])
end

if cooldownSeconds > 0 then
  redis.call('SET', KEYS[2], '1', 'EX', cooldownSeconds)
end

return {0, cooldownSeconds * 1000, failureCount, cooldownSeconds}
`;

const toNumber = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const unavailableDecision = (): LoginAbuseDecision => ({
  blocked: false,
  retryAfterSeconds: 0,
  failureCount: 0,
  redisUnavailable: true,
});

const decisionFromRecord = (result: unknown): LoginAbuseDecision => {
  if (!Array.isArray(result)) return unavailableDecision();

  const retryAfterSeconds = Math.max(0, Math.ceil(toNumber(result[1]) / 1000));
  return {
    blocked: toNumber(result[0]) === 1 || retryAfterSeconds > 0,
    retryAfterSeconds,
    failureCount: Math.max(0, toNumber(result[2])),
    redisUnavailable: false,
  };
};

export const normalizeLoginIdentifier = (identifier: string) => identifier.trim().toLowerCase();

export const getLoginAbuseKey = (realm: LoginRealm, identifier: string, secret: string) => {
  const normalized = normalizeLoginIdentifier(identifier);
  const digest = createHmac('sha256', secret)
    .update(`${realm}\u0000${normalized}`)
    .digest('hex');
  return `${LOGIN_ABUSE_PREFIX}:${realm}:${digest}`;
};

export const createLoginAbuseStore = (
  redis: LoginAbuseRedis,
  secret: string,
  policy: LoginAbusePolicy = LOGIN_ABUSE_POLICY,
) => {
  const run = async (operation: (client: LoginAbuseRedis) => Promise<unknown>) => {
    try {
      if (redis.status === 'wait' && redis.connect) await redis.connect();
      return await operation(redis);
    } catch {
      return null;
    }
  };

  const keysFor = (realm: LoginRealm, identifier: string) => {
    const baseKey = getLoginAbuseKey(realm, identifier, secret);
    return {
      failures: `${baseKey}:failures`,
      cooldown: `${baseKey}:cooldown`,
    };
  };

  return {
    async check(realm: LoginRealm, identifier: string): Promise<LoginAbuseDecision> {
      const keys = keysFor(realm, identifier);
      const result = await run((client) => client.eval(CHECK_SCRIPT, 1, keys.cooldown));
      if (result === null) return unavailableDecision();

      const ttlMilliseconds = Array.isArray(result) ? toNumber(result[0]) : 0;
      return {
        blocked: ttlMilliseconds > 0,
        retryAfterSeconds: Math.max(0, Math.ceil(ttlMilliseconds / 1000)),
        failureCount: 0,
        redisUnavailable: false,
      };
    },

    async recordFailure(realm: LoginRealm, identifier: string): Promise<LoginAbuseDecision> {
      const keys = keysFor(realm, identifier);
      const result = await run((client) => client.eval(
        RECORD_FAILURE_SCRIPT,
        2,
        keys.failures,
        keys.cooldown,
        String(policy.failureWindowSeconds),
        String(policy.cooldownThreshold),
        String(policy.escalationThreshold),
        String(policy.cooldownSeconds),
        String(policy.escalatedCooldownSeconds),
      ));
      if (result === null) return unavailableDecision();
      return decisionFromRecord(result);
    },

    async clear(realm: LoginRealm, identifier: string): Promise<void> {
      const keys = keysFor(realm, identifier);
      await run((client) => client.del(keys.failures, keys.cooldown));
    },

    async close(): Promise<void> {
      if (redis.quit && redis.status !== 'end') await redis.quit().catch(() => undefined);
    },
  };
};

const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  connectTimeout: 500,
  retryStrategy: () => null,
});

// Fail-open is deliberate: the existing Fastify IP/global limits remain active
// if Redis is unavailable, while this listener prevents an unhandled ioredis error.
redis.on('error', () => undefined);

export const loginAbuseStore = createLoginAbuseStore(redis, env.JWT_REFRESH_SECRET);
