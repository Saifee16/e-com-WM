import { describe, expect, it } from 'vitest';
import { classifyLegacyPhone } from './migrate-phone-categories.js';

describe('legacy phone classification', () => {
  it('uses normalized structured phone metadata and recognizes Android-based operating systems', () => {
    expect(classifyLegacyPhone({ os: ' iOS 18 ' })).toBe('iphone');
    expect(classifyLegacyPhone({ platform: 'ANDROID 15' })).toBe('android');
    expect(classifyLegacyPhone({ os: 'MagicOS 9.0 based on Android 15' })).toBe('android');
    expect(classifyLegacyPhone({ operatingSystem: 'MagicOS 10 based on Android 16' })).toBe('android');
    expect(classifyLegacyPhone({ phoneType: 'iPhone' })).toBe('iphone');
  });

  it('does not guess from marketing text or missing structured data', () => {
    expect(classifyLegacyPhone({ os: 'Windows Mobile' })).toBeNull();
    expect(classifyLegacyPhone({})).toBeNull();
    expect(classifyLegacyPhone({ description: 'Android-like marketing copy' })).toBeNull();
  });
});
