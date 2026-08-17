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

describe('seo sitemap route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.categoryFindMany.mockResolvedValue([
      { id: 'gadgets', parentId: null, slug: 'gadgets', isActive: true, _count: { products: 0 } },
      { id: 'earbuds', parentId: 'gadgets', slug: 'wireless-earbuds', isActive: true, _count: { products: 1 } },
      { id: 'inactive', parentId: null, slug: 'inactive', isActive: false, _count: { products: 1 } },
    ]);
    mocks.productFindMany.mockResolvedValue([
      { slug: 'active-phone', status: 'ACTIVE', updatedAt: new Date('2026-08-17T00:00:00.000Z') },
      { slug: 'draft-phone', status: 'DRAFT', updatedAt: new Date('2026-08-17T00:00:00.000Z') },
      { slug: 'archived-phone', status: 'ARCHIVED', updatedAt: new Date('2026-08-17T00:00:00.000Z') },
    ]);
  });

  it('includes active catalogue URLs and excludes inactive, draft, and private URLs', async () => {
    const handler = await registerRoute();
    const reply: Record<string, unknown> = {};
    reply.type = vi.fn(() => reply);
    reply.header = vi.fn(() => reply);
    reply.send = vi.fn((payload) => payload);

    await handler({}, reply);
    const xml = (reply.send as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;

    expect(mocks.categoryFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: true } }));
    expect(mocks.productFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'ACTIVE' } }));
    expect(xml).toContain('https://wahabmobiles.com/gadgets');
    expect(xml).toContain('https://wahabmobiles.com/gadgets/wireless-earbuds');
    expect(xml).toContain('https://wahabmobiles.com/products/active-phone');
    expect(xml).not.toContain('draft-phone');
    expect(xml).not.toContain('archived-phone');
    expect(xml).not.toContain('/inactive');
    expect(xml).not.toContain('/admin');
    expect(xml).not.toContain('/account');
    expect(reply.type).toHaveBeenCalledWith('application/xml; charset=utf-8');
  });
});
