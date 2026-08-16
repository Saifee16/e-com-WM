import { describe, expect, it } from 'vitest';
import type { Category } from '../types';
import { flattenCategories, getCategorySpecificationFields } from './category-catalog';

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
      expect.arrayContaining(['display', 'processor', 'ram', 'camera', 'battery', 'os', 'network', 'pta']),
    );
    expect(getCategorySpecificationFields('wireless-earbuds').map((field) => field.key)).not.toContain('processor');
    expect(getCategorySpecificationFields('wireless-earbuds').map((field) => field.key)).toEqual(
      expect.arrayContaining(['batteryLife', 'bluetooth', 'anc', 'microphone', 'charging', 'waterResistance']),
    );
  });
});
