import { Prisma, PrismaClient } from '@prisma/client';
import { CATEGORY_HIERARCHY, seedCategories } from './seed-categories.js';

export type UnclassifiedPhone = {
  id: string;
  slug: string;
  name: string;
};

export type PhoneCategoryMigrationReport = {
  legacyCategoryFound: boolean;
  legacyCategoryDeactivated: boolean;
  legacyProductsFound: number;
  migratedToIPhone: number;
  migratedToAndroid: number;
  migratedToPhones: number;
  unclassifiedPhones: UnclassifiedPhone[];
  discardedUnclassifiedPhones: UnclassifiedPhone[];
  productCountBefore: number;
  productCountAfter: number;
};

type PhoneCategoryTransaction = Prisma.TransactionClient;

const normalizeStructuredPhoneType = (value: string) => value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();

const structuredPhoneType = (specifications: unknown) => {
  if (!specifications || typeof specifications !== 'object' || Array.isArray(specifications)) return null;
  const values = specifications as Record<string, unknown>;
  for (const key of ['phoneType', 'deviceType', 'platform', 'operatingSystem', 'os']) {
    if (typeof values[key] === 'string' && values[key].trim()) return normalizeStructuredPhoneType(values[key]);
  }
  return null;
};

export const classifyLegacyPhone = (specifications: unknown): 'iphone' | 'android' | null => {
  const value = structuredPhoneType(specifications);
  if (!value) return null;

  if (/\b(?:iphone|ios)\b/u.test(value)) return 'iphone';
  if (/\bandroid\b/u.test(value)) return 'android';
  return null;
};

export const migratePhoneCategoriesInTransaction = async (
  transaction: PhoneCategoryTransaction,
): Promise<PhoneCategoryMigrationReport> => {
  const productCountBefore = await transaction.product.count();

  // This is the category-only production hierarchy procedure. It deliberately
  // does not call the general demo seed or create products/variants.
  await seedCategories(transaction);
  await transaction.category.updateMany({
    where: { slug: { in: CATEGORY_HIERARCHY.map(({ slug }) => slug) } },
    data: { isActive: true },
  });

  const [phones, iphone, android, legacy] = await Promise.all([
    transaction.category.findUniqueOrThrow({ where: { slug: 'phones' }, select: { id: true } }),
    transaction.category.findUniqueOrThrow({ where: { slug: 'iphone' }, select: { id: true } }),
    transaction.category.findUniqueOrThrow({ where: { slug: 'android' }, select: { id: true } }),
    transaction.category.findUnique({ where: { slug: 'smartphones' }, select: { id: true, isActive: true } }),
  ]);

  const legacyProducts = legacy
    ? await transaction.product.findMany({
        where: { categoryId: legacy.id },
        select: { id: true, slug: true, name: true, specifications: true, status: true },
        orderBy: { slug: 'asc' },
      })
    : [];

  const iphoneProducts = legacyProducts.filter((product) => classifyLegacyPhone(product.specifications) === 'iphone');
  const androidProducts = legacyProducts.filter((product) => classifyLegacyPhone(product.specifications) === 'android');
  const classifiedIds = new Set([...iphoneProducts, ...androidProducts].map((product) => product.id));
  const unclassifiedProducts = legacyProducts.filter((product) => !classifiedIds.has(product.id));
  const unclassifiedPhones = unclassifiedProducts
    .filter((product) => product.status !== 'DISCARDED')
    .map(({ id, slug, name }) => ({ id, slug, name }));
  const discardedUnclassifiedPhones = unclassifiedProducts
    .filter((product) => product.status === 'DISCARDED')
    .map(({ id, slug, name }) => ({ id, slug, name }));

  if (iphoneProducts.length) {
    await transaction.product.updateMany({
      where: { id: { in: iphoneProducts.map((product) => product.id) } },
      data: { categoryId: iphone.id },
    });
  }
  if (androidProducts.length) {
    await transaction.product.updateMany({
      where: { id: { in: androidProducts.map((product) => product.id) } },
      data: { categoryId: android.id },
    });
  }
  if (unclassifiedProducts.length) {
    await transaction.product.updateMany({
      where: { id: { in: unclassifiedProducts.map((product) => product.id) } },
      data: { categoryId: phones.id },
    });
  }

  if (legacy) {
    await transaction.category.update({ where: { id: legacy.id }, data: { isActive: false } });
  }

  return {
    legacyCategoryFound: Boolean(legacy),
    legacyCategoryDeactivated: Boolean(legacy),
    legacyProductsFound: legacyProducts.length,
    migratedToIPhone: iphoneProducts.length,
    migratedToAndroid: androidProducts.length,
    migratedToPhones: unclassifiedProducts.length,
    unclassifiedPhones,
    discardedUnclassifiedPhones,
    productCountBefore,
    productCountAfter: await transaction.product.count(),
  };
};

export const migratePhoneCategories = async (client = new PrismaClient()) => {
  try {
    return await client.$transaction((transaction) => migratePhoneCategoriesInTransaction(transaction));
  } finally {
    if (client instanceof PrismaClient) await client.$disconnect();
  }
};

if (process.argv[1]?.endsWith('migrate-phone-categories.ts')) {
  migratePhoneCategories()
    .then((report) => console.log(JSON.stringify(report, null, 2)))
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
