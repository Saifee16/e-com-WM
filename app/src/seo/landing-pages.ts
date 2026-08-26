export type SeoLandingPage = {
  path: string;
  slug: string;
  kind: 'category' | 'brand' | 'price';
  title: string;
  h1: string;
  description: string;
  intro: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  minProducts?: number;
  minBrands?: number;
};

export const SEO_LANDING_PAGES: readonly SeoLandingPage[] = [
  {
    path: '/phones/iphone',
    slug: 'iphone',
    kind: 'category',
    category: 'iphone',
    title: 'iPhone Price in Pakistan | Wahab Mobiles',
    h1: 'iPhone Price in Pakistan',
    description: 'Shop the current iPhone range from Wahab Mobiles with live prices, PTA status and stock details.',
    intro: 'Compare the iPhone models currently available from Wahab Mobiles, with live variant prices and PTA information.',
  },
  {
    path: '/phones/android',
    slug: 'android',
    kind: 'category',
    category: 'android',
    title: 'Android Phones Price in Pakistan | Wahab Mobiles',
    h1: 'Android Phones Price in Pakistan',
    description: 'Browse Android phones from Wahab Mobiles with live prices, specifications, PTA status and stock details.',
    intro: 'Browse the current Android phone catalogue by model, brand, price and live availability.',
  },
  ...([
    ['samsung', 'Samsung', 'Samsung Mobiles Price in Pakistan'],
    ['xiaomi', 'Xiaomi Mi', 'Xiaomi Mobiles Price in Pakistan'],
    ['realme', 'Realme', 'Realme Mobiles Price in Pakistan'],
    ['honor', 'Honor', 'Honor Mobiles Price in Pakistan'],
    ['tecno', 'Tecno', 'Tecno Mobiles Price in Pakistan'],
  ] as const).map(([slug, brand, title]) => ({
    path: `/phones/${slug}`,
    slug,
    kind: 'brand' as const,
    brand: brand === 'Xiaomi Mi' ? 'xiaomi-mi' : slug,
    category: 'phones',
    title: `${title} | Wahab Mobiles`,
    h1: `${brand} Mobiles Price in Pakistan`,
    description: `Shop current ${brand} phones from Wahab Mobiles with live prices, specifications and availability.`,
    intro: `See the ${brand} phones currently listed in the live Wahab Mobiles catalogue.`,
  })),
  {
    path: '/phones/google-pixel',
    slug: 'google-pixel',
    kind: 'brand',
    brand: 'google',
    category: 'phones',
    title: 'Google Pixel Phones Price in Pakistan | Wahab Mobiles',
    h1: 'Google Pixel Phones in Pakistan',
    description: 'Browse current Google Pixel phones, prices and available variants in Pakistan, with PTA status shown on each Wahab Mobiles product.',
    intro: 'See the Google Pixel phones currently listed in the live Wahab Mobiles catalogue, including variant availability and product-specific PTA status.',
  },
  ...([
    [30000, 'under-30000', 'Under Rs. 30,000 Phones in Pakistan'],
    [50000, 'under-50000', 'Under Rs. 50,000 Phones in Pakistan'],
    [100000, 'under-100000', 'Under Rs. 100,000 Phones in Pakistan'],
  ] as const).map(([maxPrice, slug, label]) => ({
    path: `/phones/${slug}`,
    slug,
    kind: 'price' as const,
    category: 'phones',
    maxPrice: maxPrice as number,
    minProducts: 5,
    minBrands: 3,
    title: `${label} | Wahab Mobiles`,
    h1: label,
    description: `Compare phones available under Rs. ${Number(maxPrice).toLocaleString('en-PK')} from the live Wahab Mobiles catalogue.`,
    intro: `Browse sellable phones within this budget, using current catalogue prices and availability.`,
  })),
];

export const getSeoLandingPage = (pathname: string) =>
  SEO_LANDING_PAGES.find((page) => page.path === pathname);

export const isSeoLandingEligible = (
  page: SeoLandingPage,
  productCount: number,
  brandCount: number,
) => page.kind !== 'price'
  || (productCount >= (page.minProducts ?? 0) && brandCount >= (page.minBrands ?? 0));

