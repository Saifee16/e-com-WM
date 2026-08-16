import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { prisma } from './db/prisma.js';

describe('product variants', () => {
  let app: FastifyInstance;
  const scope = `variants-${randomUUID()}`;
  const guestId = `guest-${scope}`;
  let productId = '';
  let blackVariantId = '';
  let goldVariantId = '';

  beforeAll(async () => {
    app = await buildApp();
    const brand = await prisma.brand.create({ data: { name: `Brand ${scope}`, slug: `brand-${scope}` } });
    const category = await prisma.category.create({ data: { name: `Category ${scope}`, slug: `category-${scope}` } });
    const product = await prisma.product.create({
      data: {
        name: `Phone ${scope}`,
        slug: `phone-${scope}`,
        description: 'A product with independently purchasable variants.',
        status: 'ACTIVE',
        brandId: brand.id,
        categoryId: category.id,
        images: { create: { url: 'https://example.com/common.jpg', isPrimary: true } },
        variants: {
          create: [
            { sku: `PHONE-BLACK-${scope}`, title: '128GB / Black', storage: '128GB', color: 'Black', priceAmount: 100_000, compareAtPriceAmount: 110_000, stockQuantity: 2, condition: 'new', isActive: true },
            { sku: `PHONE-GOLD-${scope}`, title: '256GB / Gold', storage: '256GB', color: 'Gold', options: { Finish: 'Matte' }, priceAmount: 120_000, stockQuantity: 1, condition: 'new', isActive: true },
            { sku: `PHONE-UNAVAILABLE-${scope}`, title: '512GB / Gold', storage: '512GB', color: 'Gold', priceAmount: 130_000, stockQuantity: 0, condition: 'new', isActive: false },
          ],
        },
      },
      include: { variants: true },
    });
    productId = product.id;
    blackVariantId = product.variants.find((variant) => variant.color === 'Black')!.id;
    goldVariantId = product.variants.find((variant) => variant.color === 'Gold' && variant.isActive)!.id;
    await prisma.cart.create({ data: { guestId } });
  }, 30_000);

  afterAll(async () => {
    await prisma.cart.deleteMany({ where: { guestId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.brand.deleteMany({ where: { slug: `brand-${scope}` } });
    await prisma.category.deleteMany({ where: { slug: `category-${scope}` } });
    await app.close();
  });

  it('returns usable active variants and a sensible listing price', async () => {
    const response = await app.inject({ method: 'GET', url: `/api/products/${productId}` });
    expect(response.statusCode).toBe(200);
    const product = response.json().data;
    expect(product.price).toBe(100_000);
    expect(product.variants).toEqual([
      expect.objectContaining({ id: blackVariantId, storage: '128GB', color: 'Black', price: 100_000, countInStock: 2 }),
      expect.objectContaining({ id: goldVariantId, options: { Finish: 'Matte' }, price: 120_000, countInStock: 1 }),
    ]);
  });

  it('keeps two selected variants of one product as distinct cart lines', async () => {
    const headers = { 'x-guest-id': guestId };
    for (const variantId of [blackVariantId, goldVariantId]) {
      const response = await app.inject({ method: 'POST', url: '/api/cart/add', headers, payload: { productId, variantId, quantity: 1 } });
      expect(response.statusCode).toBe(200);
    }

    const cart = await app.inject({ method: 'GET', url: '/api/cart', headers });
    expect(cart.statusCode).toBe(200);
    expect(cart.json().data.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ variantId: blackVariantId, sku: `PHONE-BLACK-${scope}`, specs: '128GB / Black' }),
      expect.objectContaining({ variantId: goldVariantId, sku: `PHONE-GOLD-${scope}`, specs: '256GB / Gold / Matte' }),
    ]));
  });

  it('does not silently resolve a multi-variant product to its first variant', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/cart/add', headers: { 'x-guest-id': guestId }, payload: { productId, quantity: 1 } });
    expect(response.statusCode).toBe(404);
    const items = await prisma.cartItem.findMany({ where: { cart: { guestId } } });
    expect(items).toHaveLength(2);
  });
});
