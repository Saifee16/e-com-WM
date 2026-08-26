import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../db/prisma.js';
import { SEO_LANDING_PAGE_RULES, isSeoLandingEligible } from './landing-pages.js';

const SITE_URL = 'https://wahabmobiles.com';

const staticPaths = [
  '/',
  '/products',
  '/about',
  '/services',
  '/support',
  '/returns',
  '/privacy',
  '/terms',
  '/data-deletion',
  '/hyderabad',
];

const publicPhoneCategoryPaths = new Set(['/phones', '/phones/iphone', '/phones/android']);

export interface SitemapCategoryRow {
  id: string;
  parentId: string | null;
  slug: string;
  isActive: boolean;
  productCount: number;
}

export interface SitemapProductRow {
  slug: string;
  status: string;
  updatedAt: Date;
  brandSlug?: string;
  categorySlug?: string;
  prices?: number[];
}

const escapeXml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const encodePathSegment = (value: string) => encodeURIComponent(value);

const getRootCategory = (
  category: SitemapCategoryRow,
  byId: ReadonlyMap<string, SitemapCategoryRow>,
) => {
  let current = category;
  const seen = new Set<string>();

  while (current.parentId) {
    if (seen.has(current.id)) return undefined;
    seen.add(current.id);
    const parent = byId.get(current.parentId);
    if (!parent) return undefined;
    current = parent;
  }

  return current;
};

const hasActiveProducts = (
  categoryId: string,
  childrenByParent: ReadonlyMap<string, SitemapCategoryRow[]>,
  byId: ReadonlyMap<string, SitemapCategoryRow>,
  seen = new Set<string>(),
): boolean => {
  if (seen.has(categoryId)) return false;
  const category = byId.get(categoryId);
  if (!category || !category.isActive) return false;
  if (category.productCount > 0) return true;

  const nextSeen = new Set(seen).add(categoryId);
  return (childrenByParent.get(categoryId) ?? []).some((child) =>
    hasActiveProducts(child.id, childrenByParent, byId, nextSeen),
  );
};

export const getPublicCategorySitemapPath = (
  category: SitemapCategoryRow,
  categories: readonly SitemapCategoryRow[],
) => {
  if (!category.isActive) return undefined;
  const byId = new Map(categories.filter((item) => item.isActive).map((item) => [item.id, item]));
  const childrenByParent = new Map<string, SitemapCategoryRow[]>();
  for (const item of byId.values()) {
    if (!item.parentId) continue;
    childrenByParent.set(item.parentId, [...(childrenByParent.get(item.parentId) ?? []), item]);
  }

  if (!hasActiveProducts(category.id, childrenByParent, byId)) return undefined;
  const root = getRootCategory(category, byId);
  if (!root) return undefined;
  if (root.id === category.id) return '/' + encodePathSegment(root.slug);
  if (root.id === category.parentId) {
    return '/' + encodePathSegment(root.slug) + '/' + encodePathSegment(category.slug);
  }
  return undefined;
};

const getCategoryPaths = (categories: readonly SitemapCategoryRow[]) =>
  [...new Set(
    categories
      .map((category) => getPublicCategorySitemapPath(category, categories))
      .filter((path): path is string => Boolean(path))
      .filter((path) => publicPhoneCategoryPaths.has(path)),
  )];

const getLandingPaths = (products: readonly SitemapProductRow[]) => {
  const phoneProducts = products.filter((product) =>
    ['phones', 'iphone', 'android'].includes(product.categorySlug ?? ''),
  );

  return SEO_LANDING_PAGE_RULES
    .filter((page) => page.kind !== 'category')
    .filter((page) => {
      const matches = page.kind === 'brand'
        ? phoneProducts.filter((product) => product.brandSlug === page.brand)
        : phoneProducts.filter((product) => product.prices?.some((price) => price <= (page.maxPrice ?? 0)));
      const brands = new Set(matches.map((product) => product.brandSlug).filter(Boolean));
      return isSeoLandingEligible(page, matches.length, brands.size);
    })
    .map((page) => page.path);
};

export const buildSitemapXml = ({
  categories,
  products,
}: {
  categories: readonly SitemapCategoryRow[];
  products: readonly SitemapProductRow[];
}) => {
  const urls: Array<{ path: string; lastmod?: string }> = [
    ...staticPaths.map((path) => ({ path })),
    ...getCategoryPaths(categories).map((path) => ({ path })),
    ...getLandingPaths(products).map((path) => ({ path })),
    ...products
      .filter((product) => product.status === 'ACTIVE' && product.slug.trim())
      .map((product) => ({
        path: '/products/' + encodePathSegment(product.slug),
        lastmod: product.updatedAt.toISOString(),
      })),
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(({ path, lastmod }) => [
      '<url>',
      '<loc>' + escapeXml(SITE_URL + path) + '</loc>',
      ...(lastmod ? ['<lastmod>' + escapeXml(lastmod) + '</lastmod>'] : []),
      '</url>',
    ].join('')),
    '</urlset>',
  ].join('');
};

export const seoRoutes: FastifyPluginAsync = async (app) => {
  app.get('/sitemap.xml', async (_request, reply) => {
    const [categories, products] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true },
        select: {
          id: true,
          parentId: true,
          slug: true,
          isActive: true,
          _count: { select: { products: { where: { status: 'ACTIVE' } } } },
        },
      }),
      prisma.product.findMany({
        where: { status: 'ACTIVE' },
        select: {
          slug: true,
          status: true,
          updatedAt: true,
          brand: { select: { slug: true } },
          category: { select: { slug: true } },
          variants: {
            where: { isActive: true },
            select: { priceAmount: true },
          },
        },
      }),
    ]);

    return reply
      .type('application/xml; charset=utf-8')
      .header('Cache-Control', 'public, max-age=300, s-maxage=3600')
      .send(buildSitemapXml({
        categories: categories.map((category) => ({
          id: category.id,
          parentId: category.parentId,
          slug: category.slug,
          isActive: category.isActive,
          productCount: category._count.products,
        })),
        products: products.map((product) => ({
          slug: product.slug,
          status: product.status,
          updatedAt: product.updatedAt,
          brandSlug: product.brand?.slug,
          categorySlug: product.category?.slug,
          prices: (product.variants ?? []).map((variant) => variant.priceAmount),
        })),
      }));
  });
};
