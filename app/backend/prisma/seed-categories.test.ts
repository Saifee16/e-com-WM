import { describe, expect, it } from 'vitest';
import { CATEGORY_HIERARCHY, type CategorySeedClient, seedCategories } from './seed-categories.js';

type FakeCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
};

const createFakeClient = (initialCategories: FakeCategory[] = []) => {
  const categories = new Map(initialCategories.map((category) => [category.slug, { ...category }]));
  const upsertCalls: Array<{ slug: string; parentId: string | null }> = [];
  let nextId = initialCategories.length + 1;

  const client: CategorySeedClient = {
    category: {
      upsert: async ({ where, update, create }) => {
        const existing = categories.get(where.slug);
        if (existing) {
          Object.assign(existing, update);
          upsertCalls.push({ slug: where.slug, parentId: update.parentId });
          return existing;
        }

        const created = { id: `category-${nextId++}`, ...create };
        categories.set(created.slug, created);
        upsertCalls.push({ slug: where.slug, parentId: create.parentId });
        return created;
      },
    },
  };

  return { client, categories, upsertCalls };
};

describe('category-only production seed', () => {
  it('creates the approved hierarchy without touching legacy categories or other domains', async () => {
    const smartphones = { id: 'smartphones-id', name: 'Smartphones', slug: 'smartphones', parentId: null, sortOrder: 0 };
    const tablets = { id: 'tablets-id', name: 'Tablets', slug: 'tablets', parentId: null, sortOrder: 0 };
    const { client, categories, upsertCalls } = createFakeClient([smartphones, tablets]);
    const fixtureProducts = { smartphones: Array.from({ length: 14 }, (_, index) => ({ id: `phone-${index}`, categoryId: smartphones.id })), tablets: [{ id: 'tablet-0', categoryId: tablets.id }] };
    const fixtureOtherDomains = { users: ['user-1'], brands: ['brand-1'], promos: ['promo-1'] };

    await seedCategories(client);

    expect(categories.size).toBe(2 + CATEGORY_HIERARCHY.length);
    expect(categories.get('smartphones')).toEqual(smartphones);
    expect(categories.get('tablets')).toEqual(tablets);
    expect(fixtureProducts.smartphones.every((product) => product.categoryId === smartphones.id)).toBe(true);
    expect(fixtureProducts.tablets[0]?.categoryId).toBe(tablets.id);
    expect(fixtureOtherDomains).toEqual({ users: ['user-1'], brands: ['brand-1'], promos: ['promo-1'] });
    expect(upsertCalls.map((call) => call.slug)).toEqual(CATEGORY_HIERARCHY.map((definition) => definition.slug));
  });

  it('reuses IDs, repairs intended parents, and is stable on a second run', async () => {
    const existingAudio = { id: 'audio-existing-id', name: 'Old Audio', slug: 'audio', parentId: null, sortOrder: 99 };
    const { client, categories, upsertCalls } = createFakeClient([existingAudio]);

    await seedCategories(client);
    const firstSnapshot = [...categories.values()].map((category) => ({ ...category }));
    await seedCategories(client);
    const secondSnapshot = [...categories.values()].map((category) => ({ ...category }));

    expect(categories.get('audio')).toMatchObject({ id: existingAudio.id, name: 'Audio', parentId: categories.get('gadgets')?.id, sortOrder: 1 });
    expect(secondSnapshot).toEqual(firstSnapshot);
    expect(categories.size).toBe(1 + CATEGORY_HIERARCHY.length - 1);
    expect(upsertCalls).toHaveLength(CATEGORY_HIERARCHY.length * 2);
  });
});
