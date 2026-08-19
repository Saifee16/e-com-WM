import { describe, expect, it } from 'vitest';
import { aggregateCategoryProductCounts, type CategoryCountNode } from './category-tree.js';

const node = (productCount: number, children: CategoryCountNode[] = []): CategoryCountNode => ({
  productCount,
  children,
});

describe('aggregateCategoryProductCounts', () => {
  it('reports the sum of active products in a parent with 3 and 12 child products', () => {
    const iphone = node(3);
    const android = node(12);
    const phones = node(0, [iphone, android]);

    aggregateCategoryProductCounts([phones]);

    expect(phones.productCount).toBe(15);
    expect(iphone.productCount).toBe(3);
    expect(android.productCount).toBe(12);
  });

  it('keeps direct root products and child products counted exactly once', () => {
    const child = node(3);
    const root = node(1, [child]);

    aggregateCategoryProductCounts([root]);

    expect(root.productCount).toBe(4);
    expect(child.productCount).toBe(3);
  });

  it('preserves active-only semantics for inactive or discarded products', () => {
    const child = node(3);
    const discardedChild = node(0);
    const root = node(1, [child, discardedChild]);

    aggregateCategoryProductCounts([root]);

    expect(root.productCount).toBe(4);
    expect(child.productCount).toBe(3);
    expect(discardedChild.productCount).toBe(0);
  });
});
