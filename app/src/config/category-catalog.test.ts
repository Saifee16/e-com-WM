import { describe, expect, it } from 'vitest';
import type { Category } from '../types';
import { flattenCategories, getCategorySpecificationFields, isPhoneCategory } from './category-catalog';

describe('category catalogue configuration', () => {
  it('flattens a real parent/child hierarchy without duplicating nodes', () => {
    const categories: Category[] = [
      {
        id: 'gadgets', name: 'Gadgets', slug: 'gadgets', productCount: 0,
        children: [{ id: 'earbuds', name: 'Wireless Earbuds', slug: 'wireless-earbuds', parentSlug: 'gadgets', productCount: 2 }],
      },
    ];
    expect(flattenCategories(categories).map((category) => category.slug)).toEqual(['gadgets', 'wireless-earbuds']);
  });

  it('uses only the specification fields configured for the selected category', () => {
    expect(getCategorySpecificationFields('phones').map((field) => field.key)).toEqual(
      expect.arrayContaining(['display', 'processor', 'battery', 'rearCamera', 'frontCamera', 'os', 'network', 'fingerprint', 'launchYear']),
    );
    expect(getCategorySpecificationFields('phones').map((field) => field.key)).not.toEqual(
      expect.arrayContaining(['ram', 'storage', 'color']),
    );
    expect(getCategorySpecificationFields('wireless-earbuds').map((field) => field.key)).not.toContain('processor');
    expect(getCategorySpecificationFields('wireless-earbuds').map((field) => field.key)).toEqual(
      expect.arrayContaining(['batteryLife', 'bluetooth', 'anc', 'microphone', 'charging', 'waterResistance']),
    );
  });

  it('recognizes legacy phone slugs and descendants of Phones', () => {
    expect(isPhoneCategory('smartphones')).toBe(true);
    expect(isPhoneCategory('iphone')).toBe(true);
    expect(isPhoneCategory('android')).toBe(true);
    expect(isPhoneCategory('galaxy', [{ id: 'phones', name: 'Phones', slug: 'phones', productCount: 0, children: [{ id: 'galaxy', name: 'Galaxy', slug: 'galaxy', parentSlug: 'phones', productCount: 0 }] }])).toBe(true);
    expect(isPhoneCategory('gadgets')).toBe(false);
  });
});
