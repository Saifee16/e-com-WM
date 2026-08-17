import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
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
  let convertedProductId = '';
  const adminEmail = `variant-admin-${scope}@example.com`;
  const adminPassword = `Admin123!${scope.slice(-8)}`;

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
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await argon2.hash(adminPassword),
        firstName: 'Variant',
        lastName: 'Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
  }, 30_000);

  afterAll(async () => {
    await prisma.cart.deleteMany({ where: { guestId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    if (convertedProductId) await prisma.product.deleteMany({ where: { id: convertedProductId } });
    await prisma.user.deleteMany({ where: { email: adminEmail } });
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

  it('rejects inactive variants and variants belonging to another product', async () => {
    const inactive = await prisma.productVariant.findFirstOrThrow({ where: { productId, isActive: false } });
    const inactiveResponse = await app.inject({
      method: 'POST',
      url: '/api/cart/add',
      headers: { 'x-guest-id': guestId },
      payload: { productId, variantId: inactive.id, quantity: 1 },
    });
    expect(inactiveResponse.statusCode).toBe(404);

    const source = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    const otherProduct = await prisma.product.create({
      data: {
        name: `Other ${scope}`,
        slug: `other-${scope}`,
        description: 'Separate product for variant ownership validation',
        status: 'ACTIVE',
        brandId: source.brandId,
        categoryId: source.categoryId,
        variants: {
          create: { sku: `OTHER-${scope}`, title: 'Default', priceAmount: 1, stockQuantity: 1, isActive: true },
        },
      },
      include: { variants: true },
    });
    const foreignResponse = await app.inject({
      method: 'POST',
      url: '/api/cart/add',
      headers: { 'x-guest-id': guestId },
      payload: { productId, variantId: otherProduct.variants[0]!.id, quantity: 1 },
    });
    expect(foreignResponse.statusCode).toBe(404);
    await prisma.product.delete({ where: { id: otherProduct.id } });
  });

  it('converts an existing single variant without hiding the product from the catalogue', async () => {
    const source = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    const brand = await prisma.brand.findUniqueOrThrow({ where: { id: source.brandId } });
    const single = await prisma.product.create({
      data: {
        name: `Convertible ${scope}`,
        slug: `convertible-${scope}`,
        description: 'Existing single-variant product',
        status: 'ACTIVE',
        brandId: source.brandId,
        categoryId: source.categoryId,
        variants: {
          create: {
            sku: `CONVERTIBLE-DEFAULT-${scope}`,
            title: '256GB / Black',
            storage: '256GB',
            color: 'Black',
            priceAmount: 100_000,
            stockQuantity: 4,
            isActive: true,
          },
        },
      },
      include: { variants: true },
    });
    convertedProductId = single.id;
    const existingVariant = single.variants[0]!;
    const login = await app.inject({
      method: 'POST',
      url: '/api/admin/auth/login',
      payload: { email: adminEmail, password: adminPassword },
    });
    expect(login.statusCode).toBe(200);
    const cookies = (Array.isArray(login.headers['set-cookie']) ? login.headers['set-cookie'] : [login.headers['set-cookie']])
      .map((cookie) => String(cookie ?? '').split(';')[0])
      .filter((cookie): cookie is string => Boolean(cookie));
    const csrfCookie = cookies.find((cookie) => cookie.startsWith('csrfToken='));
    expect(csrfCookie).toBeDefined();
    const update = await app.inject({
      method: 'PUT',
      url: `/api/admin/products/${single.id}`,
      headers: {
        cookie: cookies.join('; '),
        'x-csrf-token': csrfCookie!.slice('csrfToken='.length),
      },
      payload: {
        variants: [
          {
            id: existingVariant.id,
            sku: existingVariant.sku,
            title: '256GB / Black',
            storage: '256GB',
            color: 'Black',
            price: 100_000,
            countInStock: 4,
            isActive: true,
          },
          {
            storage: '128GB',
            color: 'Blue',
            price: 90_000,
            countInStock: 2,
            isActive: true,
          },
        ],
      },
    });
    expect(update.statusCode).toBe(200);

    const detail = await app.inject({ method: 'GET', url: `/api/products/${single.id}` });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().data.variants).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: existingVariant.id, storage: '256GB', color: 'Black', isActive: true }),
      expect.objectContaining({ storage: '128GB', color: 'Blue', isActive: true }),
    ]));
    const listing = await app.inject({ method: 'GET', url: `/api/products?brand=${brand.slug}` });
    expect(listing.statusCode).toBe(200);
    expect(listing.json().data.items.some((item: { id: string }) => item.id === single.id)).toBe(true);
  });

  it('edits one submitted variant without changing omitted variants or their images', async () => {
    await prisma.productImage.create({
      data: { productId, variantId: goldVariantId, url: `https://example.com/gold-${scope}.jpg` },
    });
    const blackBefore = await prisma.productVariant.findUniqueOrThrow({ where: { id: blackVariantId } });
    const goldBefore = await prisma.productVariant.findUniqueOrThrow({ where: { id: goldVariantId }, include: { images: true } });
    const login = await app.inject({ method: 'POST', url: '/api/admin/auth/login', payload: { email: adminEmail, password: adminPassword } });
    const cookies = (Array.isArray(login.headers['set-cookie']) ? login.headers['set-cookie'] : [login.headers['set-cookie']])
      .map((cookie) => String(cookie ?? '').split(';')[0]).filter((cookie): cookie is string => Boolean(cookie));
    const csrfCookie = cookies.find((cookie) => cookie.startsWith('csrfToken='));
    const response = await app.inject({
      method: 'PUT', url: `/api/admin/products/${productId}`,
      headers: { cookie: cookies.join('; '), 'x-csrf-token': csrfCookie!.slice('csrfToken='.length) },
      payload: { variants: [{ id: blackVariantId, sku: blackBefore.sku, title: blackBefore.title, storage: blackBefore.storage!, color: blackBefore.color!, condition: 'new', price: 101_000, originalPrice: 110_000, countInStock: 2, isActive: true }] },
    });
    expect(response.statusCode).toBe(200);
    const goldAfter = await prisma.productVariant.findUniqueOrThrow({ where: { id: goldVariantId }, include: { images: true } });
    expect(goldAfter).toMatchObject({ sku: goldBefore.sku, priceAmount: goldBefore.priceAmount, stockQuantity: goldBefore.stockQuantity, isActive: goldBefore.isActive, options: goldBefore.options });
    expect(goldAfter.images.map((image) => image.url)).toEqual(goldBefore.images.map((image) => image.url));
  });

  it('discards and restores a product without deleting its images', async () => {
    const source = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    const discardable = await prisma.product.create({
      data: {
        name: `Discardable ${scope}`, slug: `discardable-${scope}`, description: 'Keep every related record on discard.', status: 'ACTIVE', brandId: source.brandId, categoryId: source.categoryId,
        variants: { create: { sku: `DISCARD-${scope}`, title: 'Default', priceAmount: 1, stockQuantity: 1 } },
        images: { create: { url: `https://example.com/common-${scope}.jpg` } },
      },
      include: { variants: true },
    });
    await prisma.productImage.create({ data: { productId: discardable.id, variantId: discardable.variants[0]!.id, url: `https://example.com/variant-${scope}.jpg` } });
    const login = await app.inject({ method: 'POST', url: '/api/admin/auth/login', payload: { email: adminEmail, password: adminPassword } });
    const cookies = (Array.isArray(login.headers['set-cookie']) ? login.headers['set-cookie'] : [login.headers['set-cookie']]).map((cookie) => String(cookie ?? '').split(';')[0]).filter((cookie): cookie is string => Boolean(cookie));
    const csrfCookie = cookies.find((cookie) => cookie.startsWith('csrfToken='));
    const discarded = await app.inject({ method: 'DELETE', url: `/api/admin/products/${discardable.id}`, headers: { cookie: cookies.join('; '), 'x-csrf-token': csrfCookie!.slice('csrfToken='.length) } });
    expect(discarded.statusCode).toBe(200);
    expect(await prisma.product.findUniqueOrThrow({ where: { id: discardable.id }, include: { images: true, variants: true } })).toMatchObject({ status: 'DISCARDED', images: expect.arrayContaining([expect.objectContaining({ url: `https://example.com/common-${scope}.jpg` })]), variants: [expect.objectContaining({ sku: `DISCARD-${scope}` })] });
    const restored = await app.inject({ method: 'PUT', url: `/api/admin/products/${discardable.id}`, headers: { cookie: cookies.join('; '), 'x-csrf-token': csrfCookie!.slice('csrfToken='.length) }, payload: { status: 'DRAFT' } });
    expect(restored.statusCode).toBe(200);
    await prisma.product.delete({ where: { id: discardable.id } });
  });
});
