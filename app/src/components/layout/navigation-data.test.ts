import { describe, expect, it } from 'vitest';
import type { Category, Product } from '../../types';
import {
  getActiveCategoryDescendants,
  getCategoryHref,
  getFeaturedProduct,
  getGadgetGroups,
  getNavigationBrands,
  hasProductDiscount,
} from './navigation-data';

const category = (overrides: Partial<Category>): Category => ({
  id: overrides.id ?? overrides.slug ?? 'category',
  name: overrides.name ?? 'Category',
  slug: overrides.slug ?? 'category',
  productCount: overrides.productCount ?? 1,
  ...overrides,
});

const product = (overrides: Partial<Product>): Product => ({
  _id: overrides._id ?? 'product',
  name: overrides.name ?? 'Product',
  brand: overrides.brand ?? 'Brand',
  description: '',
  price: overrides.price ?? 100,
  images: [],
  category: overrides.category ?? 'phones',
  specifications: {},
  condition: 'new',
  ptaApproved: true,
  countInStock: 1,
  rating: null,
  numReviews: 0,
  reviews: [],
  isFeatured: false,
  tags: [],
  ...overrides,
});

describe('navigation data helpers', () => {
  it('builds existing category and filter destinations', () => {
    expect(getCategoryHref(category({ slug: 'wireless-earbuds', parentSlug: 'gadgets' }), 'gadgets'))
      .toBe('/gadgets/wireless-earbuds');
    expect(getCategoryHref(category({ slug: 'cases-covers', parentSlug: 'mobile-accessories' }), 'gadgets'))
      .toBe('/products?category=cases-covers');
  });

  it('keeps only active, non-empty category descendants', () => {
    const root = category({ slug: 'gadgets', productCount: 0, children: [
      category({ slug: 'active', productCount: 2 }),
      category({ slug: 'empty', productCount: 0 }),
      category({ slug: 'inactive', productCount: 2, isActive: false }),
    ] });

    expect(getActiveCategoryDescendants(root).map((item) => item.slug)).toEqual(['active']);
  });

  it('returns dynamic brands and omits inactive catalogue products', () => {
    expect(getNavigationBrands([
      product({ brand: 'Samsung' }),
      product({ brand: 'Apple' }),
      product({ brand: 'Samsung', status: 'ARCHIVED' }),
    ])).toEqual(['Apple', 'Samsung']);
  });

  it('only returns a genuine featured product and detects real discounts', () => {
    const featured = product({ isFeatured: true, originalPrice: 120 });
    expect(getFeaturedProduct([product({ isFeatured: false }), featured])).toBe(featured);
    expect(getFeaturedProduct([product({ isFeatured: true, status: 'ARCHIVED' })])).toBeUndefined();
    expect(hasProductDiscount(featured)).toBe(true);
    expect(hasProductDiscount(product({ originalPrice: 100 }))).toBe(false);
  });

  it('groups only the live gadget categories into supported menu groups', () => {
    const groups = getGadgetGroups([
      category({ slug: 'wireless-earbuds', name: 'Wireless Earbuds' }),
      category({ slug: 'chargers', name: 'Chargers' }),
      category({ slug: 'screen-protectors', name: 'Screen Protectors' }),
    ]);

    expect(groups.map((group) => group.label)).toEqual(['Audio', 'Power & Charging', 'Mobile Accessories']);
  });
});
