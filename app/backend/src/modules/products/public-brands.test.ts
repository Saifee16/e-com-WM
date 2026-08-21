import { describe, expect, it } from 'vitest';
import { mapPublicBrands, type PublicBrandRecord } from './public-brands.js';

const brand = (overrides: Partial<PublicBrandRecord>): PublicBrandRecord => ({
  id: overrides.id ?? overrides.slug ?? 'brand',
  name: overrides.name ?? 'Brand',
  slug: overrides.slug ?? 'brand',
  logoUrl: overrides.logoUrl ?? null,
  _count: overrides._count ?? { products: 1 },
});

describe('mapPublicBrands', () => {
  it('excludes empty or placeholder brands while preserving legitimate active brands', () => {
    expect(mapPublicBrands([
      brand({ name: 'Other', slug: 'other', _count: { products: 0 } }),
      brand({ name: 'Samsung', slug: 'samsung', _count: { products: 3 } }),
      brand({ name: 'Apple', slug: 'apple', _count: { products: 1 } }),
      brand({ name: 'Empty Brand', slug: 'empty-brand', _count: { products: 0 } }),
    ])).toEqual([
      { id: 'samsung', name: 'Samsung', slug: 'samsung', logoUrl: null, productCount: 3 },
      { id: 'apple', name: 'Apple', slug: 'apple', logoUrl: null, productCount: 1 },
    ]);
  });
});
