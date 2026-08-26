import { describe, expect, it } from 'vitest';
import { getSeoLandingPage, isSeoLandingEligible } from './landing-pages';

describe('SEO landing-page policy', () => {
  it('defines canonical category and brand routes', () => {
    expect(getSeoLandingPage('/phones/iphone')).toMatchObject({ kind: 'category', category: 'iphone' });
    expect(getSeoLandingPage('/phones/samsung')).toMatchObject({ kind: 'brand', brand: 'samsung' });
    expect(getSeoLandingPage('/phones/xiaomi')).toMatchObject({ kind: 'brand', brand: 'xiaomi-mi' });
    expect(getSeoLandingPage('/phones/google-pixel')).toMatchObject({ kind: 'brand', brand: 'google' });
  });

  it('keeps price landings indexable only when inventory and brand thresholds are met', () => {
    const page = getSeoLandingPage('/phones/under-30000')!;
    expect(isSeoLandingEligible(page, 5, 3)).toBe(true);
    expect(isSeoLandingEligible(page, 4, 3)).toBe(false);
    expect(isSeoLandingEligible(page, 5, 2)).toBe(false);
  });
});