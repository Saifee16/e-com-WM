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

interface SearchPage {
  items: Array<{ id: string; name: string; brand: string; category: string }>;
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

describe('server-authoritative product search', () => {
  let app: FastifyInstance;
  const scope = `search-${randomUUID()}`;
  const samsungBrandSlug = `search-samsung-${scope}`;
  const honorBrandSlug = `search-honor-${scope}`;
  const phonesCategorySlug = `search-phones-${scope}`;
  const iphoneCategorySlug = `search-iphone-${scope}`;
  const androidCategorySlug = `search-android-${scope}`;
  let samsungBrandId: string;
  let honorBrandId: string;
  let phonesCategoryId: string;
  let iphoneCategoryId: string;
  let androidCategoryId: string;

  beforeAll(async () => {
    app = await buildApp();
    const [samsungBrand, honorBrand, phonesCategory] = await Promise.all([
      prisma.brand.create({ data: { name: `Samsung ${scope}`, slug: samsungBrandSlug } }),
      prisma.brand.create({ data: { name: `Honor ${scope}`, slug: honorBrandSlug } }),
      prisma.category.create({ data: { name: `Phones ${scope}`, slug: phonesCategorySlug } }),
    ]);
    const [iphoneCategory, androidCategory] = await Promise.all([
      prisma.category.create({ data: { name: `iPhone ${scope}`, slug: iphoneCategorySlug, parentId: phonesCategory.id } }),
      prisma.category.create({ data: { name: `Android Phones ${scope}`, slug: androidCategorySlug, parentId: phonesCategory.id } }),
    ]);

    samsungBrandId = samsungBrand.id;
    honorBrandId = honorBrand.id;
    phonesCategoryId = phonesCategory.id;
    iphoneCategoryId = iphoneCategory.id;
    androidCategoryId = androidCategory.id;

    await Promise.all(Array.from({ length: 110 }, (_, index) => {
      const number = index + 1;
      const isSamsung = index % 2 === 0;
      const isIphone = index % 10 === 0;
      const brandName = isSamsung ? 'Samsung' : 'Honor';
      const modelName = isSamsung ? 'Galaxy S' : 'Magic';
      const categoryId = isIphone ? iphoneCategoryId : androidCategoryId;
      return prisma.product.create({
        data: {
          name: `Search Loop ${String(number).padStart(3, '0')} ${brandName} ${modelName} ${scope}`,
          slug: `search-loop-${String(number).padStart(3, '0')}-${scope}`,
          description: `Search fixture for pagination and ${brandName} matching`,
          shortDescription: `Search fixture ${number}`,
          status: 'ACTIVE',
          createdAt: new Date(Date.UTC(2026, 0, 1 + index)),
          brandId: isSamsung ? samsungBrandId : honorBrandId,
          categoryId,
          specifications: { ram: `${8 + (index % 3)}GB`, network: '5G' },
          variants: {
            create: index === 0
              ? [
                  { sku: `SEARCH-${scope}-001-256`, title: '256GB Black', storage: '256GB', color: 'Black', condition: 'new', priceAmount: 250_000, stockQuantity: 4, isActive: true },
                  { sku: `SEARCH-${scope}-001-128`, title: '128GB Blue', storage: '128GB', color: 'Blue', condition: 'new', priceAmount: 220_000, stockQuantity: 3, isActive: true },
                ]
              : { sku: `SEARCH-${scope}-${String(number).padStart(3, '0')}`, title: `${index % 2 === 0 ? '128GB' : '256GB'} / New`, storage: index % 2 === 0 ? '128GB' : '256GB', condition: 'new', priceAmount: 100_000 + index, stockQuantity: 5, isActive: true },
          },
        },
      });
    }));

    await Promise.all((['DRAFT', 'ARCHIVED', 'DISCARDED'] as const).map((status) => prisma.product.create({
      data: {
        name: `Hidden Search ${status} ${scope}`,
        slug: `hidden-search-${status.toLowerCase()}-${scope}`,
        description: 'Lifecycle exclusion fixture',
        status,
        brandId: samsungBrandId,
        categoryId: androidCategoryId,
        variants: { create: { sku: `HIDDEN-${status}-${scope}`, title: 'Hidden', priceAmount: 1, stockQuantity: 1, isActive: true } },
      },
    })));
  }, 120_000);

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { brandId: { in: [samsungBrandId, honorBrandId] } } });
    await prisma.category.deleteMany({ where: { id: { in: [iphoneCategoryId, androidCategoryId, phonesCategoryId] } } });
    await prisma.brand.deleteMany({ where: { id: { in: [samsungBrandId, honorBrandId] } } });
    await app.close();
  });

  it('matches exact, partial, case-insensitive, brand, variant, and specification terms', async () => {
    const exact = parseSuccess<SearchPage>(await app.inject({ method: 'GET', url: `/api/products?q=Search%20Loop%20001%20${scope}` }));
    expect(exact.pagination.total).toBe(1);

    const brand = parseSuccess<SearchPage>(await app.inject({ method: 'GET', url: `/api/products?q=sAmSuNg` }));
    expect(brand.pagination.total).toBe(55);
    expect(brand.items.every((item) => item.brand.includes('Samsung'))).toBe(true);

    const variant = parseSuccess<SearchPage>(await app.inject({ method: 'GET', url: '/api/products?q=256GB' }));
    expect(variant.pagination.total).toBe(56);

    const specification = parseSuccess<SearchPage>(await app.inject({ method: 'GET', url: '/api/products?q=5G' }));
    expect(specification.pagination.total).toBe(110);
  });

  it('includes descendants for category search and composes q with category and brand filters', async () => {
    const parent = parseSuccess<SearchPage>(await app.inject({ method: 'GET', url: `/api/products?q=Search%20Loop&category=${phonesCategorySlug}` }));
    expect(parent.pagination.total).toBe(110);
    expect(new Set(parent.items.map((item) => item.id)).size).toBe(parent.items.length);

    const child = parseSuccess<SearchPage>(await app.inject({ method: 'GET', url: `/api/products?q=Search%20Loop&category=${iphoneCategorySlug}` }));
    expect(child.pagination.total).toBe(11);
    expect(child.items.every((item) => item.category === iphoneCategorySlug)).toBe(true);

    const combined = parseSuccess<SearchPage>(await app.inject({ method: 'GET', url: `/api/products?q=Samsung&category=${androidCategorySlug}&brand=${samsungBrandSlug}` }));
    expect(combined.pagination.total).toBe(44);
  });

  it('paginates more than 100 matching products without duplicate variant rows', async () => {
    const firstPage = parseSuccess<SearchPage>(await app.inject({ method: 'GET', url: `/api/products?q=Search%20Loop&limit=25&page=1` }));
    const fifthPage = parseSuccess<SearchPage>(await app.inject({ method: 'GET', url: `/api/products?q=Search%20Loop&limit=25&page=5` }));
    expect(firstPage.items).toHaveLength(25);
    expect(firstPage.pagination).toMatchObject({ total: 110, totalPages: 5, hasNextPage: true });
    expect(fifthPage.items).toHaveLength(10);
    expect(fifthPage.pagination).toMatchObject({ page: 5, total: 110, hasPreviousPage: true, hasNextPage: false });
    expect(new Set([...firstPage.items, ...fifthPage.items].map((item) => item.id)).size).toBe(35);
  });

  it('excludes non-public lifecycle states', async () => {
    const hidden = parseSuccess<SearchPage>(await app.inject({ method: 'GET', url: `/api/products?q=Hidden%20Search%20${scope}` }));
    expect(hidden.items).toEqual([]);
    expect(hidden.pagination.total).toBe(0);

    const adminStatusAttempt = parseSuccess<SearchPage>(await app.inject({ method: 'GET', url: `/api/products?q=Hidden&status=DRAFT` }));
    expect(adminStatusAttempt.pagination.total).toBe(0);
  });

  it('validates pagination and query length while safely handling hostile and special input', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/products?page=0' })).statusCode).toBe(400);
    expect((await app.inject({ method: 'GET', url: '/api/products?limit=101' })).statusCode).toBe(400);
    expect((await app.inject({ method: 'GET', url: `/api/products?q=${'x'.repeat(201)}` })).statusCode).toBe(400);

    const injection = await app.inject({ method: 'GET', url: `/api/products?q=${encodeURIComponent("' OR 1=1 --")}` });
    expect(injection.statusCode).toBe(200);
    expect(injection.json().success).toBe(true);

    const script = await app.inject({ method: 'GET', url: `/api/products?q=${encodeURIComponent('<script>alert(1)</script>')}` });
    expect(script.statusCode).toBe(200);
    expect(script.json().success).toBe(true);

    const whitespace = parseSuccess<SearchPage>(await app.inject({ method: 'GET', url: '/api/products?q=%20%20' }));
    expect(whitespace.pagination.total).toBeGreaterThanOrEqual(110);
  });
});
