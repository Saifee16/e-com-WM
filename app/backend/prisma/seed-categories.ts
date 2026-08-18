import { PrismaClient } from '@prisma/client';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export interface CategorySeedDefinition {
  name: string;
  slug: string;
  parentSlug?: string;
  sortOrder: number;
}

export const CATEGORY_HIERARCHY: readonly CategorySeedDefinition[] = [
  { name: 'Phones', slug: 'phones', sortOrder: 1 },
  { name: 'iPhone', slug: 'iphone', parentSlug: 'phones', sortOrder: 1 },
  { name: 'Android Phones', slug: 'android', parentSlug: 'phones', sortOrder: 2 },
  { name: 'Smart Watches', slug: 'smart-watches', sortOrder: 2 },
  { name: 'Gadgets', slug: 'gadgets', sortOrder: 3 },
  { name: 'Audio', slug: 'audio', parentSlug: 'gadgets', sortOrder: 1 },
  { name: 'Wireless Earbuds/TWS', slug: 'wireless-earbuds', parentSlug: 'audio', sortOrder: 1 },
  { name: 'Headphones', slug: 'headphones', parentSlug: 'audio', sortOrder: 2 },
  { name: 'Wired Earphones/Handsfree', slug: 'wired-earphones', parentSlug: 'audio', sortOrder: 3 },
  { name: 'Neckbands', slug: 'neckbands', parentSlug: 'audio', sortOrder: 4 },
  { name: 'Speakers', slug: 'speakers', parentSlug: 'audio', sortOrder: 5 },
  { name: 'Power & Charging', slug: 'power-charging', parentSlug: 'gadgets', sortOrder: 2 },
  { name: 'Chargers', slug: 'chargers', parentSlug: 'power-charging', sortOrder: 1 },
  { name: 'Wireless Chargers', slug: 'wireless-chargers', parentSlug: 'power-charging', sortOrder: 2 },
  { name: 'Power Banks', slug: 'power-banks', parentSlug: 'power-charging', sortOrder: 3 },
  { name: 'Charging Cables', slug: 'charging-cables', parentSlug: 'power-charging', sortOrder: 4 },
  { name: 'Mobile Accessories', slug: 'mobile-accessories', parentSlug: 'gadgets', sortOrder: 3 },
  { name: 'Cases & Covers', slug: 'cases-covers', parentSlug: 'mobile-accessories', sortOrder: 1 },
  { name: 'Screen Protectors', slug: 'screen-protectors', parentSlug: 'mobile-accessories', sortOrder: 2 },
  { name: 'Phone Holders & Stands', slug: 'phone-holders-stands', parentSlug: 'mobile-accessories', sortOrder: 3 },
  { name: 'Car Accessories', slug: 'car-accessories', parentSlug: 'mobile-accessories', sortOrder: 4 },
];

type CategorySeedRecord = { id: string; slug: string };

export interface CategorySeedClient {
  category: {
    upsert(args: {
      where: { slug: string };
      update: { name: string; parentId: string | null; sortOrder: number };
      create: { name: string; slug: string; parentId: string | null; sortOrder: number };
    }): Promise<CategorySeedRecord>;
  };
}

export const seedCategories = async (transaction: CategorySeedClient) => {
  const categoriesBySlug = new Map<string, CategorySeedRecord>();

  for (const definition of CATEGORY_HIERARCHY) {
    const parentId = definition.parentSlug ? categoriesBySlug.get(definition.parentSlug)?.id : null;
    if (definition.parentSlug && !parentId) {
      throw new Error(`Category parent must be seeded first: ${definition.parentSlug}`);
    }

    const category = await transaction.category.upsert({
      where: { slug: definition.slug },
      update: {
        name: definition.name,
        parentId: parentId ?? null,
        sortOrder: definition.sortOrder,
      },
      create: {
        name: definition.name,
        slug: definition.slug,
        parentId: parentId ?? null,
        sortOrder: definition.sortOrder,
      },
    });
    categoriesBySlug.set(definition.slug, category);
  }

  return categoriesBySlug;
};

const run = async () => {
  const prisma = new PrismaClient();
  try {
    await prisma.$transaction((transaction) => seedCategories(transaction));
  } finally {
    await prisma.$disconnect();
  }
};

const invokedFile = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedFile === import.meta.url) {
  run().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
