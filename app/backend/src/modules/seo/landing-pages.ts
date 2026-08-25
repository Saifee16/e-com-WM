export type SeoLandingPageRule = {
  path: string;
  slug: string;
  kind: 'category' | 'brand' | 'price';
  category?: string;
  brand?: string;
  maxPrice?: number;
  minProducts?: number;
  minBrands?: number;
};

export const SEO_LANDING_PAGE_RULES: readonly SeoLandingPageRule[] = [
  { path: '/phones/iphone', slug: 'iphone', kind: 'category', category: 'iphone' },
  { path: '/phones/android', slug: 'android', kind: 'category', category: 'android' },
  { path: '/phones/samsung', slug: 'samsung', kind: 'brand', category: 'phones', brand: 'samsung' },
  { path: '/phones/xiaomi', slug: 'xiaomi', kind: 'brand', category: 'phones', brand: 'xiaomi-mi' },
  { path: '/phones/realme', slug: 'realme', kind: 'brand', category: 'phones', brand: 'realme' },
  { path: '/phones/honor', slug: 'honor', kind: 'brand', category: 'phones', brand: 'honor' },
  { path: '/phones/tecno', slug: 'tecno', kind: 'brand', category: 'phones', brand: 'tecno' },
  { path: '/phones/under-30000', slug: 'under-30000', kind: 'price', category: 'phones', maxPrice: 30_000, minProducts: 5, minBrands: 3 },
  { path: '/phones/under-50000', slug: 'under-50000', kind: 'price', category: 'phones', maxPrice: 50_000, minProducts: 5, minBrands: 3 },
  { path: '/phones/under-100000', slug: 'under-100000', kind: 'price', category: 'phones', maxPrice: 100_000, minProducts: 5, minBrands: 3 },
];

export const getSeoLandingPageRule = (slug: string) =>
  SEO_LANDING_PAGE_RULES.find((page) => page.slug === slug);

export const isSeoLandingEligible = (
  page: SeoLandingPageRule,
  productCount: number,
  brandCount: number,
) => page.kind !== 'price'
  || (productCount >= (page.minProducts ?? 0) && brandCount >= (page.minBrands ?? 0));

