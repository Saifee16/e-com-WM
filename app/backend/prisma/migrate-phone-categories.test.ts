import { describe, expect, it } from 'vitest';
import { classifyLegacyPhone } from './migrate-phone-categories.js';

describe('legacy phone classification', () => {
  it('uses exact structured phone metadata and does not guess from marketing text', () => {
    expect(classifyLegacyPhone({ os: 'iOS 18' })).toBe('iphone');
    expect(classifyLegacyPhone({ platform: 'Android 15' })).toBe('android');
    expect(classifyLegacyPhone({ phoneType: 'iPhone' })).toBe('iphone');
    expect(classifyLegacyPhone({ os: 'Windows Mobile' })).toBeNull();
    expect(classifyLegacyPhone({})).toBeNull();
    expect(classifyLegacyPhone({ description: 'Android-like marketing copy' })).toBeNull();
  });
});
