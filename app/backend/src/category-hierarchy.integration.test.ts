import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Response as InjectResponse } from 'light-my-request';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { prisma } from './db/prisma.js';

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface CategoryNode {
  slug: string;
  parentSlug: string | null;
  children: CategoryNode[];
}

const parseSuccess = <T>(response: InjectResponse) => {
  expect(response.statusCode).toBe(200);
  return (response.json() as ApiSuccess<T>).data;
};

describe('hierarchical product catalogue', () => {
  let app: FastifyInstance;
  const scope = `category-hierarchy-${randomUUID()}`;
  const brandSlug = `category-brand-${scope}`;
  const phoneSlug = `phones-${scope}`;
  const gadgetSlug = `gadgets-${scope}`;
  const earbudsSlug = `wireless-earbuds-${scope}`;
  const deepEarbudsSlug = `earbuds-cases-${scope}`;
  const inactiveSlug = `inactive-gadgets-${scope}`;

  beforeAll(async () => {
    app = await buildApp();
    const brand = await prisma.brand.create({ data: { name: `Category Test Brand ${scope}`, slug: brandSlug } });
    const canonicalPhones = await prisma.category.create({ data: { name: 'Phones', slug: 'phones' } });
    const legacySmartphones = await prisma.category.create({ data: { name: 'Smartphones', slug: 'smartphones' } });
    const phoneChild = await prisma.category.create({ data: { name: `Phone Child ${scope}`, slug: `phone-child-${scope}`, parentId: canonicalPhones.id } });
    await prisma.category.create({ data: { name: `Phone Grandchild ${scope}`, slug: `phone-grandchild-${scope}`, parentId: phoneChild.id } });
    const phones = await prisma.category.create({ data: { name: `Phones ${scope}`, slug: phoneSlug } });
    const gadgets = await prisma.category.create({ data: { name: `Gadgets ${scope}`, slug: gadgetSlug } });
    const earbuds = await prisma.category.create({ data: { name: `Wireless Earbuds ${scope}`, slug: earbudsSlug, parentId: gadgets.id } });
    const deepEarbuds = await prisma.category.create({ data: { name: `Earbuds Cases ${scope}`, slug: deepEarbudsSlug, parentId: earbuds.id } });
    await prisma.category.create({ data: { name: `Inactive Gadgets ${scope}`, slug: inactiveSlug, parentId: gadgets.id, isActive: false } });

    await prisma.product.create({
      data: {
        name: `Legacy Smartphone ${scope}`,
        slug: `legacy-smartphone-${scope}`,
        description: 'Legacy phone category fixture',
        status: 'ACTIVE',
        brandId: brand.id,
        categoryId: legacySmartphones.id,
        variants: { create: { sku: `LEGACY-PHONE-${scope}`, title: 'Default', priceAmount: 90_000, stockQuantity: 2 } },
      },
    });

    await prisma.product.create({
      data: {
        name: `Phone ${scope}`,
        slug: `phone-${scope}`,
        description: 'Phone category fixture',
        status: 'ACTIVE',
        brandId: brand.id,
        categoryId: phones.id,
        ptaApproved: true,
        specifications: { display: '6.7-inch AMOLED', pta: 'Approved' },
        variants: {
          create: [
            { sku: `PHONE-128-${scope}`, title: '128GB / Black', storage: '128GB', color: 'Black', priceAmount: 100_000, compareAtPriceAmount: 120_000, stockQuantity: 2 },
            { sku: `PHONE-256-${scope}`, title: '256GB / Black', storage: '256GB', color: 'Black', priceAmount: 120_000, stockQuantity: 2 },
          ],
        },
      },
    });
    await prisma.product.create({
      data: {
        name: `Earbuds ${scope}`,
        slug: `earbuds-${scope}`,
        description: 'Earbuds category fixture',
        status: 'ACTIVE',
        brandId: brand.id,
        categoryId: earbuds.id,
        ptaApproved: false,
        specifications: { batteryLife: '30 hours', bluetooth: '5.3', anc: 'Supported' },
        variants: { create: { sku: `EARBUDS-${scope}`, title: 'Black', color: 'Black', priceAmount: 20_000, stockQuantity: 3 } },
      },
    });
    await prisma.product.create({
      data: {
        name: `Deep Earbuds ${scope}`,
        slug: `deep-earbuds-${scope}`,
        description: 'Nested earbuds category fixture',
        status: 'ACTIVE',
        brandId: brand.id,
        categoryId: deepEarbuds.id,
        ptaApproved: false,
        variants: { create: { sku: `DEEP-EARBUDS-${scope}`, title: 'Black', priceAmount: 8_000, stockQuantity: 3 } },
      },
    });
  }, 60_000);

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { slug: { contains: scope } } });
    await prisma.brand.deleteMany({ where: { slug: brandSlug } });
    await prisma.category.updateMany({ where: { slug: { contains: scope }, parentId: { not: null } }, data: { parentId: null } });
    await prisma.category.deleteMany({ where: { slug: { contains: scope } } });
    await prisma.category.updateMany({ where: { slug: { in: ['smartphones', 'phones'] }, parentId: { not: null } }, data: { parentId: null } });
    await prisma.category.deleteMany({ where: { slug: { in: ['smartphones', 'phones'] } } });
    await app.close();
  });

  it('returns an active parent/child hierarchy and omits inactive nodes', async () => {
    const categories = parseSuccess<CategoryNode[]>(await app.inject({ method: 'GET', url: '/api/products/categories' }));
    const gadgets = categories.find((category) => category.slug === gadgetSlug);
    expect(gadgets?.children.map((category) => category.slug)).toEqual([earbudsSlug]);
    expect(categories.flatMap((category) => [category.slug, ...category.children.map((child) => child.slug)])).not.toContain(inactiveSlug);
  });

  it('includes direct and nested descendants without duplicate products', async () => {
    const parent = parseSuccess<{ items: Array<{ id: string; name: string }>; pagination: { total: number } }>(
      await app.inject({ method: 'GET', url: `/api/products?category=${gadgetSlug}` }),
    );
    const child = parseSuccess<{ items: Array<{ id: string; name: string }>; pagination: { total: number } }>(
      await app.inject({ method: 'GET', url: `/api/products?category=${earbudsSlug}` }),
    );
    const deepChild = parseSuccess<{ items: Array<{ id: string; name: string }>; pagination: { total: number } }>(
      await app.inject({ method: 'GET', url: `/api/products?category=${deepEarbudsSlug}` }),
    );
    expect(parent.pagination.total).toBe(2);
    expect(new Set(parent.items.map((item) => item.id)).size).toBe(parent.items.length);
    expect(child.pagination.total).toBe(2);
    expect(child.items[0]?.name).toContain('Earbuds');
    expect(deepChild.pagination.total).toBe(1);
    expect(deepChild.items[0]?.name).toContain('Deep Earbuds');
  });

  it('keeps legacy smartphone products visible through the canonical phones route', async () => {
    const canonical = parseSuccess<{ items: Array<{ id: string }>; pagination: { total: number } }>(
      await app.inject({ method: 'GET', url: `/api/products?category=phones&brand=${brandSlug}` }),
    );
    const legacy = parseSuccess<{ items: Array<{ id: string }>; pagination: { total: number } }>(
      await app.inject({ method: 'GET', url: `/api/products?category=smartphones&brand=${brandSlug}` }),
    );
    expect(canonical.pagination.total).toBe(1);
    expect(legacy.pagination.total).toBe(1);
    expect(canonical.items[0]?.id).toBe(legacy.items[0]?.id);
  });

  it('keeps a multi-variant product singular while filtering relevant active variants and serializing specs', async () => {
    const phone = parseSuccess<{ items: Array<{ name: string; specifications: Record<string, string>; variants: unknown[] }>; pagination: { total: number } }>(
      await app.inject({ method: 'GET', url: `/api/products?category=${phoneSlug}&storage=256GB` }),
    );
    expect(phone.pagination.total).toBe(1);
    expect(phone.items).toHaveLength(1);
    expect(phone.items[0]).toMatchObject({
      name: expect.stringContaining('Phone'),
      specifications: { display: '6.7-inch AMOLED', storage: '256GB', pta: 'Approved' },
    });
    expect(phone.items[0]?.variants).toHaveLength(2);
  });

  it('supports accurate PTA and discounted catalogue filters', async () => {
    const discounted = parseSuccess<{ items: Array<{ name: string }>; pagination: { total: number } }>(
      await app.inject({ method: 'GET', url: `/api/products?category=${phoneSlug}&discounted=true` }),
    );
    const approved = parseSuccess<{ items: Array<{ name: string }>; pagination: { total: number } }>(
      await app.inject({ method: 'GET', url: `/api/products?category=${phoneSlug}&ptaApproved=true` }),
    );
    const unapproved = parseSuccess<{ items: Array<{ name: string }>; pagination: { total: number } }>(
      await app.inject({ method: 'GET', url: `/api/products?category=${gadgetSlug}&ptaApproved=true` }),
    );

    expect(discounted.pagination.total).toBe(1);
    expect(discounted.items[0]?.name).toContain('Phone');
    expect(approved.pagination.total).toBe(1);
    expect(unapproved.pagination.total).toBe(0);
  });

  it('stops exposing products after a category is deactivated', async () => {
    await prisma.category.update({ where: { slug: earbudsSlug }, data: { isActive: false } });
    const categories = parseSuccess<CategoryNode[]>(await app.inject({ method: 'GET', url: '/api/products/categories' }));
    const gadgets = categories.find((category) => category.slug === gadgetSlug);
    expect(gadgets?.children).toEqual([]);
    const products = parseSuccess<{ pagination: { total: number } }>(await app.inject({ method: 'GET', url: `/api/products?category=${gadgetSlug}` }));
    expect(products.pagination.total).toBe(0);
  });
});
