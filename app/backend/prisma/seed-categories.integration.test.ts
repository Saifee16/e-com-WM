import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CATEGORY_HIERARCHY, seedCategories } from './seed-categories.js';

const prisma = new PrismaClient();
const scope = `category-seed-${randomUUID()}`;
const fixtureBrandSlug = `fixture-brand-${scope}`;
const fixtureCategorySlugs = {
  smartphones: `smartphones-${scope}`,
  tablets: `tablets-${scope}`,
};

const countRows = async () => ({
  users: await prisma.user.count(),
  products: await prisma.product.count(),
  brands: await prisma.brand.count(),
  promos: await prisma.promoCode.count(),
  reviews: await prisma.review.count(),
  orders: await prisma.order.count(),
  carts: await prisma.cart.count(),
});

describe('category-only seed against disposable PostgreSQL', () => {
  let smartphoneCategoryId: string;
  let tabletCategoryId: string;

  beforeAll(async () => {
    const brand = await prisma.brand.create({ data: { name: `Fixture Brand ${scope}`, slug: fixtureBrandSlug } });
    const smartphones = await prisma.category.create({ data: { name: 'Smartphones', slug: fixtureCategorySlugs.smartphones } });
    const tablets = await prisma.category.create({ data: { name: 'Tablets', slug: fixtureCategorySlugs.tablets } });
    smartphoneCategoryId = smartphones.id;
    tabletCategoryId = tablets.id;

    await prisma.product.createMany({
      data: Array.from({ length: 14 }, (_, index) => ({
        name: `Fixture Smartphone ${index}`,
        slug: `fixture-smartphone-${scope}-${index}`,
        description: 'Disposable category seed fixture',
        status: 'ACTIVE' as const,
        brandId: brand.id,
        categoryId: smartphones.id,
      })),
    });
    await prisma.product.create({
      data: {
        name: 'Fixture Tablet',
        slug: `fixture-tablet-${scope}`,
        description: 'Disposable category seed fixture',
        status: 'ACTIVE',
        brandId: brand.id,
        categoryId: tablets.id,
      },
    });

    const fixtures = await prisma.product.findMany({ where: { slug: { contains: scope } }, select: { id: true } });
    await prisma.productVariant.createMany({
      data: fixtures.map((product, index) => ({
        productId: product.id,
        sku: `FIXTURE-${scope}-${index}`,
        title: 'Default',
        priceAmount: 1_000,
        stockQuantity: 1,
      })),
    });
  }, 30_000);

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { slug: { contains: scope } } });
    await prisma.brand.deleteMany({ where: { slug: fixtureBrandSlug } });
    await prisma.category.deleteMany({ where: { slug: { in: Object.values(fixtureCategorySlugs) } } });
    await prisma.category.updateMany({
      where: { slug: { in: CATEGORY_HIERARCHY.map((definition) => definition.slug) }, parentId: { not: null } },
      data: { parentId: null },
    });
    await prisma.category.deleteMany({ where: { slug: { in: CATEGORY_HIERARCHY.map((definition) => definition.slug) } } });
    await prisma.$disconnect();
  });

  it('preserves 14 Smartphones and 1 Tablets assignment while creating a stable hierarchy', async () => {
    const beforeProducts = await prisma.product.findMany({
      where: { slug: { contains: scope } },
      select: { slug: true, categoryId: true },
      orderBy: { slug: 'asc' },
    });
    const beforeCounts = await countRows();

    await prisma.$transaction((transaction) => seedCategories(transaction));
    const firstCategories = await prisma.category.findMany({
      where: { slug: { in: CATEGORY_HIERARCHY.map((definition) => definition.slug) } },
      select: { id: true, slug: true, parentId: true, name: true },
      orderBy: { slug: 'asc' },
    });
    const afterFirstProducts = await prisma.product.findMany({
      where: { slug: { contains: scope } },
      select: { slug: true, categoryId: true },
      orderBy: { slug: 'asc' },
    });
    const afterFirstCounts = await countRows();

    await prisma.$transaction((transaction) => seedCategories(transaction));
    const secondCategories = await prisma.category.findMany({
      where: { slug: { in: CATEGORY_HIERARCHY.map((definition) => definition.slug) } },
      select: { id: true, slug: true, parentId: true, name: true },
      orderBy: { slug: 'asc' },
    });
    const afterSecondProducts = await prisma.product.findMany({
      where: { slug: { contains: scope } },
      select: { slug: true, categoryId: true },
      orderBy: { slug: 'asc' },
    });
    const afterSecondCounts = await countRows();
    const firstBySlug = new Map(firstCategories.map((category) => [category.slug, category]));

    expect(beforeProducts).toHaveLength(15);
    expect(beforeProducts.filter((product) => product.categoryId === smartphoneCategoryId)).toHaveLength(14);
    expect(beforeProducts.filter((product) => product.categoryId === tabletCategoryId)).toHaveLength(1);
    expect(afterFirstProducts).toEqual(beforeProducts);
    expect(afterSecondProducts).toEqual(beforeProducts);
    expect(firstCategories).toHaveLength(CATEGORY_HIERARCHY.length);
    expect(secondCategories).toEqual(firstCategories);
    expect(afterFirstCounts).toEqual(beforeCounts);
    expect(afterSecondCounts).toEqual(beforeCounts);
    expect(firstBySlug.get('phones')?.name).toBe('Phones');
    expect(firstBySlug.get('iphone')?.parentId).toBe(firstBySlug.get('phones')?.id);
    expect(firstBySlug.get('android')?.parentId).toBe(firstBySlug.get('phones')?.id);
    expect(firstBySlug.get('audio')?.parentId).toBe(firstBySlug.get('gadgets')?.id);
  }, 30_000);
});
