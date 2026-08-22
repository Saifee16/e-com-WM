import { describe, expect, it, vi } from 'vitest';
import {
  createLoginAbuseStore,
  getLoginAbuseKey,
  LOGIN_ABUSE_POLICY,
  type LoginAbuseRedis,
} from './login-abuse.js';

interface Entry {
  value: string;
  expiresAt: number | null;
}

class FakeRedis implements LoginAbuseRedis {
  private readonly entries = new Map<string, Entry>();
  private now = 0;

  async eval(_script: string, numberOfKeys: number, ...args: string[]) {
    const keys = args.slice(0, numberOfKeys);
    const argumentsForScript = args.slice(numberOfKeys);
    this.expireEntries();

    const blockedTtl = this.ttl(keys[numberOfKeys === 1 ? 0 : 1]!);
    if (numberOfKeys === 1) return [blockedTtl];
    if (blockedTtl > 0) return [1, blockedTtl, 0, 0];

    const failuresKey = keys[0]!;
    const current = Number(this.entries.get(failuresKey)?.value ?? '0') + 1;
    const failureWindowSeconds = Number(argumentsForScript[0]);
    if (current === 1) {
      this.entries.set(failuresKey, {
        value: String(current),
        expiresAt: this.now + failureWindowSeconds * 1000,
      });
    } else {
      this.entries.get(failuresKey)!.value = String(current);
    }

    const cooldownThreshold = Number(argumentsForScript[1]);
    const escalationThreshold = Number(argumentsForScript[2]);
    const cooldownSeconds = current >= escalationThreshold
      ? Number(argumentsForScript[4])
      : current >= cooldownThreshold
        ? Number(argumentsForScript[3])
        : 0;
    if (cooldownSeconds > 0) {
      this.entries.set(keys[1]!, {
        value: '1',
        expiresAt: this.now + cooldownSeconds * 1000,
      });
    }

    return [0, cooldownSeconds * 1000, current, cooldownSeconds];
  }

  async del(...keys: string[]) {
    for (const key of keys) this.entries.delete(key);
    return keys.length;
  }

  advance(milliseconds: number) {
    this.now += milliseconds;
    this.expireEntries();
  }

  private ttl(key: string) {
    const entry = this.entries.get(key);
    if (!entry) return -2;
    if (entry.expiresAt === null) return -1;
    return Math.max(0, entry.expiresAt - this.now);
  }

  private expireEntries() {
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt !== null && entry.expiresAt <= this.now) this.entries.delete(key);
    }
  }
}

describe('login abuse protection', () => {
  it('throttles one account across rotating IPs and equivalent identifier variants', async () => {
    const store = createLoginAbuseStore(new FakeRedis(), 'test-secret');
    const attempts = [
      { ip: '198.51.100.10', email: 'Victim@example.com' },
      { ip: '203.0.113.20', email: ' victim@example.com ' },
      { ip: '192.0.2.30', email: 'VICTIM@EXAMPLE.COM' },
      { ip: '198.51.100.40', email: 'victim@example.com' },
      { ip: '203.0.113.50', email: ' Victim@Example.Com ' },
    ];

    for (const [index, attempt] of attempts.entries()) {
      const decision = await store.recordFailure('customer', attempt.email);
      expect(decision.blocked).toBe(index === LOGIN_ABUSE_POLICY.cooldownThreshold - 1);
      expect(attempt.ip).toBeTruthy();
    }

    await expect(store.check('customer', 'victim@example.com')).resolves.toMatchObject({
      blocked: true,
      redisUnavailable: false,
    });
    await expect(store.check('admin', 'victim@example.com')).resolves.toMatchObject({
      blocked: false,
      redisUnavailable: false,
    });
  });

  it('protects unknown identifiers, clears on successful authentication, and expires', async () => {
    const redis = new FakeRedis();
    const store = createLoginAbuseStore(redis, 'test-secret', {
      ...LOGIN_ABUSE_POLICY,
      failureWindowSeconds: 60,
      cooldownSeconds: 2,
      escalatedCooldownSeconds: 4,
    });

    for (let attempt = 0; attempt < LOGIN_ABUSE_POLICY.cooldownThreshold; attempt += 1) {
      await store.recordFailure('customer', 'unknown@example.com');
    }
    await expect(store.check('customer', 'unknown@example.com')).resolves.toMatchObject({ blocked: true });

    await store.clear('customer', 'unknown@example.com');
    await expect(store.check('customer', 'unknown@example.com')).resolves.toMatchObject({ blocked: false });

    for (let attempt = 0; attempt < LOGIN_ABUSE_POLICY.cooldownThreshold; attempt += 1) {
      await store.recordFailure('customer', 'unknown@example.com');
    }
    redis.advance(2_000);
    await expect(store.check('customer', 'unknown@example.com')).resolves.toMatchObject({ blocked: false });
    redis.advance(60_000);
    await expect(store.check('customer', 'unknown@example.com')).resolves.toMatchObject({ blocked: false });
  });

  it('uses realm-separated HMAC keys without placing the identifier in Redis', () => {
    const identifier = 'customer@example.com';
    const customerKey = getLoginAbuseKey('customer', identifier, 'test-secret');
    const adminKey = getLoginAbuseKey('admin', identifier, 'test-secret');

    expect(customerKey).not.toContain(identifier);
    expect(adminKey).not.toBe(customerKey);
    expect(customerKey).toMatch(/^auth:login-abuse:v1:customer:[0-9a-f]{64}$/);
  });

  it('fails open without throwing when Redis is unavailable', async () => {
    const failingRedis: LoginAbuseRedis = {
      eval: vi.fn(async () => {
        throw new Error('connection refused');
      }),
      del: vi.fn(async () => {
        throw new Error('connection refused');
      }),
    };
    const store = createLoginAbuseStore(failingRedis, 'test-secret');

    await expect(store.check('customer', 'customer@example.com')).resolves.toMatchObject({
      blocked: false,
      redisUnavailable: true,
    });
    await expect(store.recordFailure('customer', 'customer@example.com')).resolves.toMatchObject({
      blocked: false,
      redisUnavailable: true,
    });
    await expect(store.clear('customer', 'customer@example.com')).resolves.toBeUndefined();
  });
});
