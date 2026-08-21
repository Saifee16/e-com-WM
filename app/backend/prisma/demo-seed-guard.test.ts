import { describe, expect, it } from 'vitest';
import { assertDemoSeedAllowed } from './demo-seed-guard.js';

describe('general demo seed guard', () => {
  it('refuses production before fixture writes can begin', () => {
    expect(() => assertDemoSeedAllowed('production')).toThrow(
      'The general demo seed is disabled in production. Use the category-only operational seed instead.',
    );
  });

  it.each(['development', 'test', undefined])('allows local/disposable seeding for NODE_ENV=%s', (nodeEnv) => {
    expect(() => assertDemoSeedAllowed(nodeEnv)).not.toThrow();
  });
});
