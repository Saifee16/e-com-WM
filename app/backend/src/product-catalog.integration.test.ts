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

interface CatalogItem {
  id: string;
  name: string;
  price: number;
  condition: string;
  specifications: {
    storage?: string;
  };
}

interface CatalogPage {
  items: CatalogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}

const parseSuccess = <T>(response: InjectResponse) => {
  expect(response.statusCode).toBe(200);
  const body = response.json() as ApiSuccess<T>;
  expect(body.success).toBe(true);
  return body.data;
};

describe('product catalogue pagination and filters', () => {
  let app: FastifyInstance;
  const scope = `catalog-pagination-${randomUUID()}`;
  const brandSlug = `brand-${scope}`;
  const categorySlug = `category-${scope}`;

  beforeAll(async () => {
    app = await buildApp();
    const brand = await prisma.brand.create({
      data: {
        name: `Pagination Brand ${scope}`,
        slug: brandSlug,
      },
    });
    const category = await prisma.category.create({
      data: {
        name: `Pagination Category ${scope}`,
        slug: categorySlug,
      },
    });

    await Promise.all(
      Array.from({ length: 23 }, (_, index) => {
        const number = index + 1;
        const condition = (['new', 'refurbished', 'used'] as const)[index % 3]!;

        return prisma.product.create({
          data: {
            name: `Pagination Product ${String(number).padStart(2, '0')} ${scope}`,
            slug: `pagination-product-${String(number).padStart(2, '0')}-${scope}`,
            description: `Pagination fixture ${number}`,
            status: 'ACTIVE',
            createdAt: new Date(Date.UTC(2026, 0, number)),
            brandId: brand.id,
            categoryId: category.id,
            variants: {
              create: {
                sku: `PAGINATION-${String(number).padStart(2, '0')}-${scope}`,
                title: `${index % 2 === 0 ? '128GB' : '256GB'} / Test`,
                storage: index % 2 === 0 ? '128GB' : '256GB',
                condition,
                priceAmount: number * 10_000,
                stockQuantity: 10,
                isActive: true,
              },
            },
          },
        });
      }),
    );
  }, 60_000);

  afterAll(async () => {
    await prisma.product.deleteMany({
      where: {
        brand: {
          slug: brandSlug,
        },
      },
    });
    await prisma.brand.deleteMany({ where: { slug: brandSlug } });
    await prisma.category.deleteMany({ where: { slug: categorySlug } });
    await app.close();
  });

  it('uses page 1 and a default page size of 20', async () => {
    const page = parseSuccess<CatalogPage>(
      await app.inject({
        method: 'GET',
        url: `/api/products?brand=${brandSlug}`,
      }),
    );

    expect(page.items).toHaveLength(20);
    expect(page.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 23,
      totalPages: 2,
      hasPreviousPage: false,
      hasNextPage: true,
    });
  });

  it('returns the requested page and globally sorts before slicing', async () => {
    const firstPage = parseSuccess<CatalogPage>(
      await app.inject({
        method: 'GET',
        url: `/api/products?brand=${brandSlug}&sort=price-low&page=1&limit=5`,
      }),
    );
    const secondPage = parseSuccess<CatalogPage>(
      await app.inject({
        method: 'GET',
        url: `/api/products?brand=${brandSlug}&sort=price-low&page=2&limit=5`,
      }),
    );

    expect(firstPage.items.map((product) => product.price)).toEqual([
      10_000,
      20_000,
      30_000,
      40_000,
      50_000,
    ]);
    expect(secondPage.items.map((product) => product.price)).toEqual([
      60_000,
      70_000,
      80_000,
      90_000,
      100_000,
    ]);
    expect(secondPage.pagination.hasPreviousPage).toBe(true);
  });

  it('applies price, storage, and condition filters on the server', async () => {
    const page = parseSuccess<CatalogPage>(
      await app.inject({
        method: 'GET',
        url:
          `/api/products?brand=${brandSlug}` +
          '&minPrice=50000&maxPrice=100000&storage=256GB&condition=refurbished',
      }),
    );

    expect(page.pagination.total).toBe(1);
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      price: 80_000,
      condition: 'refurbished',
      specifications: {
        storage: '256GB',
      },
    });
  });

  it('returns an empty page beyond the final page without corrupting metadata', async () => {
    const page = parseSuccess<CatalogPage>(
      await app.inject({
        method: 'GET',
        url: `/api/products?brand=${brandSlug}&page=4&limit=10`,
      }),
    );

    expect(page.items).toEqual([]);
    expect(page.pagination).toMatchObject({
      page: 4,
      limit: 10,
      total: 23,
      totalPages: 3,
      hasPreviousPage: true,
      hasNextPage: false,
    });
  });
});
