import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migratePhoneCategoriesInTransaction } from './migrate-phone-categories.js';

const prisma = new PrismaClient();
const scope = `phone-category-migration-${randomUUID()}`;

describe('phone category migration against disposable PostgreSQL', () => {
  let brandId: string;
  let productIds: string[];
  let legacyCategoryId: string;

  beforeAll(async () => {
    const existingTargetCategories = await prisma.category.count({ where: { slug: { in: ['phones', 'iphone', 'android', 'smartphones'] } } });
    if (existingTargetCategories > 0) throw new Error('Run this migration test against a fresh disposable database');

    const brand = await prisma.brand.create({ data: { name: `Migration Fixture ${scope}`, slug: scope } });
    brandId = brand.id;
    const legacy = await prisma.category.create({ data: { name: 'Smartphones', slug: 'smartphones' } });
    legacyCategoryId = legacy.id;

    const products = await Promise.all([
      prisma.product.create({
        data: {
          name: `iPhone fixture ${scope}`,
          slug: `iphone-${scope}`,
          description: 'Structured iPhone migration fixture',
          status: 'ACTIVE',
          brandId,
          categoryId: legacyCategoryId,
          specifications: { os: 'iOS 18' },
          variants: { create: { sku: `SKU-IOS-${scope}`, title: 'Black', priceAmount: 100, stockQuantity: 7 } },
        },
      }),
      prisma.product.create({
        data: {
          name: `Android fixture ${scope}`,
          slug: `android-${scope}`,
          description: 'Structured Android migration fixture',
          status: 'ACTIVE',
          brandId,
          categoryId: legacyCategoryId,
          specifications: { platform: 'Android 15' },
          variants: { create: { sku: `SKU-ANDROID-${scope}`, title: 'Blue', priceAmount: 200, stockQuantity: 9 } },
        },
      }),
      prisma.product.create({
        data: {
          name: `MagicOS fixture ${scope}`,
          slug: `magicos-${scope}`,
          description: 'Structured Android-based MagicOS migration fixture',
          status: 'ACTIVE',
          brandId,
          categoryId: legacyCategoryId,
          specifications: { os: 'MagicOS 9.0 based on Android 15' },
          variants: { create: { sku: `SKU-MAGICOS-${scope}`, title: 'Green', priceAmount: 300, stockQuantity: 11 } },
        },
      }),
      prisma.product.create({
        data: {
          name: `Discarded unclassified fixture ${scope}`,
          slug: `discarded-unclassified-${scope}`,
          description: 'Discarded test residue without a structured phone subtype',
          status: 'DISCARDED',
          brandId,
          categoryId: legacyCategoryId,
          specifications: { display: '6.5-inch' },
          variants: { create: { sku: `SKU-DISCARDED-${scope}`, title: 'Default', priceAmount: 400, stockQuantity: 11 } },
        },
      }),
    ]);
    productIds = products.map((product) => product.id);
  }, 30_000);

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { id: { in: productIds ?? [] } } });
    await prisma.brand.deleteMany({ where: { id: brandId } });
    await prisma.category.updateMany({ where: { slug: { in: ['iphone', 'android'] } }, data: { parentId: null } });
    await prisma.category.deleteMany({ where: { slug: { in: ['phones', 'iphone', 'android'] } } });
    await prisma.category.deleteMany({ where: { id: legacyCategoryId } });
    await prisma.$disconnect();
  });

  it('preserves products and variants, classifies deterministically, and is idempotent', async () => {
    const before = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, slug: true, categoryId: true, variants: { select: { id: true, stockQuantity: true, sku: true } } },
      orderBy: { slug: 'asc' },
    });

    const first = await prisma.$transaction((transaction) => migratePhoneCategoriesInTransaction(transaction));
    const after = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, slug: true, category: { select: { slug: true } }, variants: { select: { id: true, stockQuantity: true, sku: true } } },
      orderBy: { slug: 'asc' },
    });

    expect(first).toMatchObject({ legacyCategoryFound: true, legacyProductsFound: 4, migratedToIPhone: 1, migratedToAndroid: 2, migratedToPhones: 1, productCountBefore: first.productCountAfter });
    expect(first.unclassifiedPhones).toEqual([]);
    expect(first.discardedUnclassifiedPhones).toEqual([{ id: expect.any(String), slug: `discarded-unclassified-${scope}`, name: `Discarded unclassified fixture ${scope}` }]);
    expect(after.map((product) => product.id)).toEqual(before.map((product) => product.id));
    expect(after.map((product) => product.category.slug)).toEqual(['android', 'phones', 'iphone', 'android']);
    expect(after.flatMap((product) => product.variants)).toEqual(before.flatMap((product) => product.variants));
    expect(after.find((product) => product.slug === `discarded-unclassified-${scope}`)).toMatchObject({ category: { slug: 'phones' } });
    expect(await prisma.product.findUnique({ where: { slug: `discarded-unclassified-${scope}` }, select: { status: true } })).toEqual({ status: 'DISCARDED' });
    expect(await prisma.category.findUnique({ where: { id: legacyCategoryId }, select: { isActive: true } })).toEqual({ isActive: false });

    const second = await prisma.$transaction((transaction) => migratePhoneCategoriesInTransaction(transaction));
    expect(second).toMatchObject({ legacyProductsFound: 0, migratedToIPhone: 0, migratedToAndroid: 0, migratedToPhones: 0, unclassifiedPhones: [], discardedUnclassifiedPhones: [], productCountBefore: first.productCountAfter, productCountAfter: first.productCountAfter });
  }, 60_000);
});
