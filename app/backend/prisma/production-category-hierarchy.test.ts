import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migratePhoneCategoriesInTransaction } from './migrate-phone-categories.js';
import { CATEGORY_HIERARCHY, seedCategories } from './seed-categories.js';

const prisma = new PrismaClient();
const scope = `category-sql-${randomUUID()}`;
const fixtureBrandSlug = `fixture-brand-${scope}`;
const fixtureCategorySlugs = {
  smartphones: `smartphones-${scope}`,
  tablets: `tablets-${scope}`,
  legacy: 'smartphones',
};
const phoneFixtureSlugs = [
  `fixture-iphone-${scope}`,
  `fixture-android-${scope}`,
  `fixture-magicos-${scope}`,
  `fixture-discarded-${scope}`,
];
const targetSlugs = CATEGORY_HIERARCHY.map(({ slug }) => slug);
const sql = readFileSync(new URL('./production-category-hierarchy.sql', import.meta.url), 'utf8');

type CategoryShape = {
  slug: string;
  name: string;
  parentSlug: string | null;
  sortOrder: number;
  isActive: boolean;
};

const entityCounts = async () => ({
  users: await prisma.user.count(),
  products: await prisma.product.count(),
  brands: await prisma.brand.count(),
  promos: await prisma.promoCode.count(),
  reviews: await prisma.review.count(),
  orders: await prisma.order.count(),
  carts: await prisma.cart.count(),
});

const productAssignments = async () => prisma.product.findMany({
  where: { slug: { contains: scope } },
  select: { slug: true, categoryId: true },
  orderBy: { slug: 'asc' },
});

const productCategorySlugs = async () => prisma.product.findMany({
  where: { slug: { contains: scope } },
  select: { slug: true, status: true, category: { select: { slug: true } } },
  orderBy: { slug: 'asc' },
});

const productSnapshots = async () => prisma.product.findMany({
  where: { slug: { contains: scope } },
  select: {
    id: true,
    slug: true,
    status: true,
    specifications: true,
    variants: { select: { id: true, sku: true, stockQuantity: true, priceAmount: true } },
  },
  orderBy: { slug: 'asc' },
});

const categoryShapes = async (slugs: string[]) => {
  const rows = await prisma.category.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, name: true, sortOrder: true, isActive: true, parent: { select: { slug: true } } },
    orderBy: { slug: 'asc' },
  });
  return rows.map(({ parent, ...row }): CategoryShape => ({ ...row, parentSlug: parent?.slug ?? null }));
};

const categoryIdentity = async (slugs: string[]) => prisma.category.findMany({
  where: { slug: { in: slugs } },
  select: { slug: true, id: true, parentId: true },
  orderBy: { slug: 'asc' },
});

const runExactSqlFile = () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required to run the category SQL fixture');

  const database = new URL(databaseUrl);
  const postgresUser = process.env.POSTGRES_USER ?? decodeURIComponent(database.username);
  const postgresDatabase = process.env.POSTGRES_DB ?? database.pathname.replace(/^\/+/, '');
  const composeFile = fileURLToPath(new URL('../../docker-compose.yml', import.meta.url));
  const composeEnvFile = fileURLToPath(new URL('../../.env', import.meta.url));
  const postgresService = process.env.TEST_POSTGRES_SERVICE ?? 'postgres';

  if (!postgresUser || !postgresDatabase) {
    throw new Error('POSTGRES_USER/POSTGRES_DB or DATABASE_URL must identify the disposable PostgreSQL database');
  }

  const composeArgs = [
    'compose',
    ...(existsSync(composeEnvFile) ? ['--env-file', composeEnvFile] : []),
    '-f',
    composeFile,
    'exec',
    '-T',
    postgresService,
    'psql',
    '-v',
    'ON_ERROR_STOP=1',
    '-U',
    postgresUser,
    '-d',
    postgresDatabase,
  ];
  const result = spawnSync(
    'docker',
    composeArgs,
    { input: sql, encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(`Exact SQL file failed: ${result.stderr || result.stdout}`);
  }
};

const removeTargetCategories = async () => {
  await prisma.category.updateMany({ where: { slug: { in: targetSlugs } }, data: { parentId: null } });
  await prisma.category.deleteMany({ where: { slug: { in: targetSlugs } } });
};

describe('production category SQL equivalence and idempotency', () => {
  let existingCategoryIds: Array<{ slug: string; id: string; parentId: string | null }>;
  let beforeCounts: Awaited<ReturnType<typeof entityCounts>>;
  let beforeAssignments: Awaited<ReturnType<typeof productAssignments>>;
  let legacyCategoryId: string;

  beforeAll(async () => {
    const brand = await prisma.brand.create({ data: { name: `Fixture Brand ${scope}`, slug: fixtureBrandSlug } });
    await prisma.category.create({ data: { name: 'Smartphones', slug: fixtureCategorySlugs.smartphones } });
    const tablets = await prisma.category.create({ data: { name: 'Tablets', slug: fixtureCategorySlugs.tablets } });
    const legacy = await prisma.category.create({ data: { name: 'Smartphones', slug: fixtureCategorySlugs.legacy } });
    legacyCategoryId = legacy.id;

    await prisma.product.createMany({
      data: [
        {
          name: 'Fixture iPhone',
          slug: `fixture-iphone-${scope}`,
          description: 'Disposable category SQL fixture',
          status: 'ACTIVE' as const,
          brandId: brand.id,
          categoryId: legacy.id,
          specifications: { os: 'iOS 18' },
        },
        {
          name: 'Fixture Android',
          slug: `fixture-android-${scope}`,
          description: 'Disposable category SQL fixture',
          status: 'ACTIVE' as const,
          brandId: brand.id,
          categoryId: legacy.id,
          specifications: { platform: 'ANDROID 15' },
        },
        {
          name: 'Fixture MagicOS Android',
          slug: `fixture-magicos-${scope}`,
          description: 'Disposable category SQL fixture',
          status: 'ACTIVE' as const,
          brandId: brand.id,
          categoryId: legacy.id,
          specifications: { os: 'MagicOS 9.0 based on Android 15' },
        },
        {
          name: 'Fixture Discarded Unclassified',
          slug: `fixture-discarded-${scope}`,
          description: 'Discarded category SQL fixture',
          status: 'DISCARDED' as const,
          brandId: brand.id,
          categoryId: legacy.id,
          specifications: { display: '6.5-inch' },
        },
      ],
    });
    await prisma.product.create({
      data: {
        name: 'Fixture Tablet',
        slug: `fixture-tablet-${scope}`,
        description: 'Disposable category SQL fixture',
        status: 'ACTIVE',
        brandId: brand.id,
        categoryId: tablets.id,
      },
    });

    const products = await prisma.product.findMany({ where: { slug: { contains: scope } }, select: { id: true } });
    await prisma.productVariant.createMany({
      data: products.map((product, index) => ({
        productId: product.id,
        sku: `FIXTURE-SQL-${scope}-${index}`,
        title: 'Default',
        priceAmount: 1_000,
        stockQuantity: 1,
      })),
    });

    existingCategoryIds = await categoryIdentity(Object.values(fixtureCategorySlugs));
    beforeCounts = await entityCounts();
    beforeAssignments = await productAssignments();
  }, 30_000);

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { slug: { contains: scope } } });
    await prisma.brand.deleteMany({ where: { slug: fixtureBrandSlug } });
    await removeTargetCategories();
    await prisma.category.deleteMany({ where: { slug: { in: Object.values(fixtureCategorySlugs) } } });
    await prisma.$disconnect();
  });

  it('matches the Prisma utility, preserves fixtures, and is idempotent', async () => {
    await prisma.$transaction((transaction) => seedCategories(transaction));
    const seededShapes = await categoryShapes(targetSlugs);
    const afterPrismaAssignments = await productAssignments();
    const afterPrismaCounts = await entityCounts();
    const afterPrismaExistingIds = await categoryIdentity(Object.values(fixtureCategorySlugs));

    expect(seededShapes).toHaveLength(CATEGORY_HIERARCHY.length);
    expect(afterPrismaAssignments).toEqual(beforeAssignments);
    expect(afterPrismaCounts).toEqual(beforeCounts);
    expect(afterPrismaExistingIds).toEqual(existingCategoryIds);

    const prismaReport = await prisma.$transaction((transaction) => migratePhoneCategoriesInTransaction(transaction));
    const prismaShapes = await categoryShapes(targetSlugs);
    const prismaAssignments = await productCategorySlugs();
    const prismaSnapshots = await productSnapshots();
    expect(prismaReport).toMatchObject({ legacyProductsFound: 4, migratedToIPhone: 1, migratedToAndroid: 2, migratedToPhones: 1, unclassifiedPhones: [] });
    expect(prismaReport.discardedUnclassifiedPhones).toHaveLength(1);
    expect(prismaSnapshots).toEqual(expect.arrayContaining([
      expect.objectContaining({ slug: `fixture-discarded-${scope}`, status: 'DISCARDED' }),
    ]));

    await prisma.product.updateMany({ where: { slug: { in: phoneFixtureSlugs } }, data: { categoryId: legacyCategoryId } });
    await prisma.category.update({ where: { id: legacyCategoryId }, data: { isActive: true } });
    await removeTargetCategories();
    expect(await categoryShapes(targetSlugs)).toEqual([]);

    runExactSqlFile();
    const sqlShapes = await categoryShapes(targetSlugs);
    const sqlFirstIdentity = await categoryIdentity(targetSlugs);
    const afterSqlAssignments = await productCategorySlugs();
    const afterSqlSnapshots = await productSnapshots();
    const afterSqlCounts = await entityCounts();
    const afterSqlExistingIds = await categoryIdentity(Object.values(fixtureCategorySlugs));

    expect(sqlShapes).toEqual(prismaShapes);
    expect(afterSqlAssignments).toEqual(prismaAssignments);
    expect(afterSqlSnapshots).toEqual(prismaSnapshots);
    expect(afterSqlCounts).toEqual(beforeCounts);
    expect(afterSqlExistingIds).toEqual(existingCategoryIds);

    runExactSqlFile();
    const sqlSecondIdentity = await categoryIdentity(targetSlugs);
    const sqlSecondShapes = await categoryShapes(targetSlugs);

    expect(sqlSecondIdentity).toEqual(sqlFirstIdentity);
    expect(sqlSecondShapes).toEqual(sqlShapes);
    expect(await productCategorySlugs()).toEqual(prismaAssignments);
    expect(await productSnapshots()).toEqual(prismaSnapshots);
    expect(await entityCounts()).toEqual(beforeCounts);
  }, 60_000);
});
