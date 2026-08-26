import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  categoryFindMany: vi.fn(),
  productFindMany: vi.fn(),
}));

vi.mock('../../db/prisma.js', () => ({
  prisma: {
    category: { findMany: mocks.categoryFindMany },
    product: { findMany: mocks.productFindMany },
  },
}));

import { seoRoutes } from './routes.js';

type RouteHandler = (request: Record<string, unknown>, reply: Record<string, unknown>) => Promise<unknown>;

const registerRoute = async () => {
  let handler: RouteHandler | undefined;
  const app = {
    get: vi.fn((_path: string, routeHandler: RouteHandler) => {
      handler = routeHandler;
    }),
  };
  await seoRoutes(app as never, {});
  return handler!;
};

const phone = (slug: string, brandSlug: string, priceAmount: number, categorySlug = 'android') => ({
  slug,
  status: 'ACTIVE',
  updatedAt: new Date('2026-08-17T00:00:00.000Z'),
  brand: { slug: brandSlug },
  category: { slug: categorySlug },
  variants: [{ priceAmount }],
});

describe('seo sitemap route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.categoryFindMany.mockResolvedValue([
      { id: 'phones', parentId: null, slug: 'phones', isActive: true, _count: { products: 5 } },
      { id: 'iphone', parentId: 'phones', slug: 'iphone', isActive: true, _count: { products: 1 } },
      { id: 'android', parentId: 'phones', slug: 'android', isActive: true, _count: { products: 4 } },
      { id: 'tablets', parentId: null, slug: 'tablets', isActive: true, _count: { products: 1 } },
      { id: 'gadgets', parentId: null, slug: 'gadgets', isActive: true, _count: { products: 1 } },
      { id: 'inactive', parentId: null, slug: 'inactive', isActive: false, _count: { products: 1 } },
    ]);
    mocks.productFindMany.mockResolvedValue([
      phone('active-samsung', 'samsung', 20000),
      phone('active-google-pixel', 'google', 90000),
      phone('active-xiaomi', 'xiaomi-mi', 22000),
      phone('active-honor', 'honor', 24000),
      phone('active-tecno', 'tecno', 26000),
      phone('active-realme', 'realme', 28000),
      phone('active-iphone', 'apple', 100000, 'iphone'),
      { slug: 'draft-phone', status: 'DRAFT', updatedAt: new Date('2026-08-17T00:00:00.000Z') },
      { slug: 'archived-phone', status: 'ARCHIVED', updatedAt: new Date('2026-08-17T00:00:00.000Z') },
    ]);
  });

  it('includes approved phone URLs and excludes empty/non-phone category URLs', async () => {
    const handler = await registerRoute();
    const reply: Record<string, unknown> = {};
    reply.type = vi.fn(() => reply);
    reply.header = vi.fn(() => reply);
    reply.send = vi.fn((payload) => payload);

    await handler({}, reply);
    const xml = (reply.send as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;

    expect(mocks.categoryFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: true } }));
    expect(mocks.productFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'ACTIVE' } }));
    expect(xml).toContain('https://wahabmobiles.com/phones');
    expect(xml).toContain('https://wahabmobiles.com/phones/iphone');
    expect(xml).toContain('https://wahabmobiles.com/phones/android');
    expect(xml).toContain('https://wahabmobiles.com/phones/samsung');
    expect(xml).toContain('https://wahabmobiles.com/phones/google-pixel');
    expect(xml).toContain('https://wahabmobiles.com/hyderabad');
    expect(xml).toContain('https://wahabmobiles.com/phones/under-30000');
    expect(xml).not.toContain('https://wahabmobiles.com/tablets');
    expect(xml).not.toContain('https://wahabmobiles.com/gadgets');
    expect(xml).toContain('https://wahabmobiles.com/products/active-samsung');
    expect(xml).not.toContain('draft-phone');
    expect(xml).not.toContain('archived-phone');
    expect(xml).not.toContain('/inactive');
    expect(xml).not.toContain('/admin');
    expect(xml).not.toContain('/account');
    expect(reply.type).toHaveBeenCalledWith('application/xml; charset=utf-8');
  });
  it('omits a price landing when its current inventory falls below the configured threshold', async () => {
    mocks.productFindMany.mockResolvedValue([
      phone('low-samsung', 'samsung', 20_000),
      phone('low-xiaomi', 'xiaomi-mi', 22_000),
      phone('low-realme', 'realme', 24_000),
      phone('low-honor', 'honor', 26_000),
    ]);

    const handler = await registerRoute();
    const reply: Record<string, unknown> = {};
    reply.type = vi.fn(() => reply);
    reply.header = vi.fn(() => reply);
    reply.send = vi.fn((payload) => payload);

    await handler({}, reply);
    const xml = (reply.send as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;

    expect(xml).not.toContain('https://wahabmobiles.com/phones/under-30000');
  });
});