import { describe, expect, it } from 'vitest';
import type { ProductVariant } from '../types';
import { getVariantAvailableStock, getVariantOptionGroups, resolveVariantSelection, variantMatchesOptions } from './variant-selection';

const variants: ProductVariant[] = [
  { id: '128-black', sku: '128-BLK', title: '128GB / Black', storage: '128GB', color: 'Black', options: {}, price: 250_000, countInStock: 4, availableCountInStock: 4, isActive: true, images: [], image: '' },
  { id: '128-blue', sku: '128-BLU', title: '128GB / Blue', storage: '128GB', color: 'Blue', options: {}, price: 255_000, countInStock: 2, availableCountInStock: 2, isActive: true, images: [], image: '' },
  { id: '256-black', sku: '256-BLK', title: '256GB / Black', storage: '256GB', color: 'Black', options: {}, price: 280_000, countInStock: 4, availableCountInStock: 4, isActive: true, images: [], image: '' },
  { id: '256-gold', sku: '256-GLD', title: '256GB / Gold', storage: '256GB', color: 'Gold', options: {}, price: 289_999, countInStock: 0, availableCountInStock: 0, isActive: true, images: [], image: '' },
  { id: '512-black', sku: '512-BLK', title: '512GB / Black', storage: '512GB', color: 'Black', options: { Finish: 'Matte' }, price: 330_000, countInStock: 1, availableCountInStock: 1, isActive: true, images: [], image: '' },
];

describe('dependent variant selection', () => {
  it('shows only dimensions represented by active combinations', () => {
    expect(getVariantOptionGroups(variants)).toEqual({
      Storage: ['128GB', '256GB', '512GB'],
      Color: ['Black', 'Blue', 'Gold'],
      Finish: ['Matte'],
    });
  });

  it('resolves exact price and stock and clears an invalid dependent color', () => {
    const storage = resolveVariantSelection(variants, {}, 'Storage', '256GB');
    expect(variants.some((variant) => variantMatchesOptions(variant, { ...storage.options, Color: 'Blue' }))).toBe(false);
    const gold = resolveVariantSelection(variants, storage.options, 'Color', 'Gold');
    expect(gold.variant).toMatchObject({ id: '256-gold', price: 289_999 });
    expect(getVariantAvailableStock(gold.variant!)).toBe(0);

    const switched = resolveVariantSelection(variants, gold.options, 'Storage', '128GB');
    expect(switched.options).toEqual({ Storage: '128GB' });
    expect(switched.variant).toBeUndefined();
  });

  it('orders Storage then RAM then Color when one ROM has multiple RAM options', () => {
    const phoneVariants: ProductVariant[] = [
      { id: '128-4-black', sku: '128-4-BLK', title: '128GB / 4GB / Black', storage: '128GB', color: 'Black', options: { RAM: '4GB' }, price: 100, countInStock: 2, availableCountInStock: 2, isActive: true, images: [], image: '' },
      { id: '128-6-blue', sku: '128-6-BLU', title: '128GB / 6GB / Blue', storage: '128GB', color: 'Blue', options: { RAM: '6GB' }, price: 110, countInStock: 1, availableCountInStock: 1, isActive: true, images: [], image: '' },
      { id: '256-8-black', sku: '256-8-BLK', title: '256GB / 8GB / Black', storage: '256GB', color: 'Black', options: { RAM: '8GB' }, price: 120, countInStock: 3, availableCountInStock: 3, isActive: true, images: [], image: '' },
    ];
    expect(Object.keys(getVariantOptionGroups(phoneVariants))).toEqual(['Storage', 'RAM', 'Color']);
    const storage = resolveVariantSelection(phoneVariants, {}, 'Storage', '128GB');
    const ram = resolveVariantSelection(phoneVariants, storage.options, 'RAM', '6GB');
    expect(ram.matchingVariants).toHaveLength(1);
    expect(ram.variant).toMatchObject({ id: '128-6-blue' });
    expect(phoneVariants.some((item) => variantMatchesOptions(item, { ...ram.options, Color: 'Black' }))).toBe(false);
    const color = resolveVariantSelection(phoneVariants, ram.options, 'Color', 'Blue');
    expect(color.variant).toMatchObject({ id: '128-6-blue', price: 110, countInStock: 1 });
  });
});
