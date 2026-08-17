import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { OutgoingHttpHeaders } from 'node:http';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';
import { prisma } from './db/prisma.js';

const testRunId = () => `test-${randomUUID()}`;

const checkoutPayload = (email = 'guest@example.com') => ({
  shippingInfo: {
    firstName: 'Test',
    lastName: 'Customer',
    email,
    phone: '+923001234567',
    address: '123 Test Street',
    city: 'Lahore',
    state: 'Punjab',
    zipCode: '54000',
    country: 'Pakistan',
  },
  paymentMethod: 'cod',
  shippingMethod: 'standard',
});

const cookieHeader = (response: { headers: OutgoingHttpHeaders }) => {
  const setCookie = response.headers['set-cookie'];
  const values = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  return values.map((value) => String(value).split(';', 1)[0]).join('; ');
};

const csrfTokenFromCookies = (cookies: string) => {
  const token = cookies.split('; ').find((value) => value.startsWith('csrfToken='))?.slice('csrfToken='.length);
  if (!token) throw new Error('Test guest session did not receive a CSRF token');
  return decodeURIComponent(token);
};

const makeCatalogItem = async (scope: string, stockQuantity = 10) => {
  const brand = await prisma.brand.create({
    data: {
      name: `Brand ${scope}`,
      slug: `brand-${scope}`,
    },
  });
  const category = await prisma.category.create({
    data: {
      name: `Category ${scope}`,
      slug: `category-${scope}`,
    },
  });
  const product = await prisma.product.create({
    data: {
      name: `Product ${scope}`,
      slug: `product-${scope}`,
      description: 'Integration test product',
      status: 'ACTIVE',
      brandId: brand.id,
      categoryId: category.id,
      variants: {
        create: {
          sku: `SKU-${scope}`,
          title: 'Default',
          priceAmount: 50_000,
          stockQuantity,
          reservedQuantity: 0,
          isActive: true,
        },
      },
      images: {
        create: {
          url: 'https://example.com/test-product.jpg',
          altText: 'Test product',
          isPrimary: true,
        },
      },
    },
    include: {
      variants: true,
    },
  });

  const variant = product.variants[0];
  if (!variant) {
    throw new Error('Test fixture failed to create a product variant');
  }

  return { brand, category, product, variant };
};

const cleanupScope = async (scope: string) => {
  await prisma.auditLog.deleteMany({ where: { entityId: { contains: scope } } });
  await prisma.inventoryMovement.deleteMany({
    where: {
      OR: [
        { reason: 'Checkout' },
        { variant: { sku: { contains: scope } } },
      ],
    },
  });
  await prisma.order.deleteMany({
    where: {
      OR: [
        { guestEmail: { contains: scope } },
        { orderNumber: { contains: scope } },
        { items: { some: { skuSnapshot: { contains: scope } } } },
      ],
    },
  });
  await prisma.cart.deleteMany({
    where: {
      OR: [
        { guestId: { contains: scope } },
        { items: { some: { variant: { sku: { contains: scope } } } } },
      ],
    },
  });
  await prisma.product.deleteMany({ where: { slug: { contains: scope } } });
  await prisma.brand.deleteMany({ where: { slug: { contains: scope } } });
  await prisma.category.deleteMany({ where: { slug: { contains: scope } } });
};

describe('checkout transaction routes', () => {
  let app: FastifyInstance;
  const scopes: string[] = [];

  beforeEach(async () => {
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
    for (const scope of scopes.splice(0)) {
      await cleanupScope(scope);
    }
  });

  it('serializes concurrent cart additions so quantity never exceeds available stock', async () => {
    const scope = testRunId();
    scopes.push(scope);
    const guestId = `guest-${scope}`;
    const { product, variant } = await makeCatalogItem(scope, 3);

    await prisma.cart.create({ data: { guestId } });

    const responses = await Promise.all(
      Array.from({ length: 6 }, () =>
        app.inject({
          method: 'POST',
          url: '/api/cart/add',
          headers: { 'x-guest-id': guestId },
          payload: {
            productId: product.id,
            quantity: 1,
          },
        }),
      ),
    );

    const statusCodes = responses.map((response) => response.statusCode);
    expect(statusCodes.filter((statusCode) => statusCode === 200)).toHaveLength(3);
    expect(statusCodes.filter((statusCode) => statusCode === 409)).toHaveLength(3);

    const cartItem = await prisma.cartItem.findFirstOrThrow({
      where: {
        cart: { guestId },
        variantId: variant.id,
      },
    });
    expect(cartItem.quantity).toBe(3);
  }, 30000);

  it('places a secure guest COD order with server-calculated totals and the exact variant', async () => {
    const scope = testRunId();
    scopes.push(scope);
    const { variant } = await makeCatalogItem(scope, 5);
    const addResponse = await app.inject({
      method: 'POST',
      url: '/api/cart/add',
      payload: { variantId: variant.id, quantity: 2 },
    });
    expect(addResponse.statusCode).toBe(200);
    const cookies = cookieHeader(addResponse);

    expect((await app.inject({
      method: 'GET',
      url: '/api/cart',
      headers: { cookie: cookies },
    })).json()).toMatchObject({
      success: true,
      data: {
        totals: {
          subtotal: 100_000,
          shipping: 0,
          tax: 0,
          discount: 0,
          total: 100_000,
        },
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/orders',
      headers: {
        cookie: cookies,
        'x-csrf-token': csrfTokenFromCookies(cookies),
        'idempotency-key': randomUUID(),
      },
      payload: {
        ...checkoutPayload(`guest-${scope}@example.com`),
        subtotal: 1,
        tax: 999_999,
        total: 1,
        items: [{ variantId: randomUUID(), price: 1, quantity: 99 }],
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        guestEmail: `guest-${scope}@example.com`,
        subtotal: 100_000,
        tax: 0,
        shippingCost: 0,
        total: 100_000,
        items: [{ variantId: variant.id, quantity: 2, price: 50_000 }],
      },
    });

    const order = await prisma.order.findFirstOrThrow({ where: { guestEmail: `guest-${scope}@example.com` } });
    expect(order.userId).toBeNull();
    expect(order.guestId).toBeTruthy();
    expect(order.taxAmount).toBe(0);
    expect(order.totalAmount).toBe(order.subtotalAmount + order.shippingAmount - order.discountAmount);
    await expect(prisma.cartItem.count({ where: { cart: { guestId: order.guestId! } } })).resolves.toBe(0);
    await expect(prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).resolves.toMatchObject({
      stockQuantity: 3,
    });
  }, 30000);

  it('replays a guest idempotency key without a second order or stock decrement', async () => {
    const scope = testRunId();
    scopes.push(scope);
    const { variant } = await makeCatalogItem(scope, 2);
    const addResponse = await app.inject({
      method: 'POST',
      url: '/api/cart/add',
      payload: { variantId: variant.id, quantity: 1 },
    });
    const cookies = cookieHeader(addResponse);
    const idempotencyKey = randomUUID();
    const headers = {
      cookie: cookies,
      'x-csrf-token': csrfTokenFromCookies(cookies),
      'idempotency-key': idempotencyKey,
    };

    const first = await app.inject({
      method: 'POST',
      url: '/api/orders',
      headers,
      payload: checkoutPayload(`guest-${scope}@example.com`),
    });
    const replay = await app.inject({
      method: 'POST',
      url: '/api/orders',
      headers,
      payload: checkoutPayload(`guest-${scope}@example.com`),
    });

    expect(first.statusCode).toBe(201);
    expect(replay.statusCode).toBe(200);
    expect(replay.json().data.id).toBe(first.json().data.id);
    await expect(prisma.order.count({ where: { guestEmail: `guest-${scope}@example.com` } })).resolves.toBe(1);
    await expect(prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).resolves.toMatchObject({ stockQuantity: 1 });
  }, 30000);

  it('requires CSRF for a guest checkout and does not let a supplied guest ID select another cart', async () => {
    const scope = testRunId();
    scopes.push(scope);
    const first = await makeCatalogItem(`${scope}-first`, 2);
    const second = await makeCatalogItem(`${scope}-second`, 2);
    const firstSession = await app.inject({
      method: 'POST', url: '/api/cart/add', payload: { variantId: first.variant.id, quantity: 1 },
    });
    const secondSession = await app.inject({
      method: 'POST', url: '/api/cart/add', payload: { variantId: second.variant.id, quantity: 1 },
    });
    const firstCookies = cookieHeader(firstSession);
    const secondCookies = cookieHeader(secondSession);

    const csrfRejected = await app.inject({
      method: 'POST',
      url: '/api/orders',
      headers: { cookie: firstCookies, 'idempotency-key': randomUUID() },
      payload: checkoutPayload(`csrf-${scope}@example.com`),
    });
    expect(csrfRejected.statusCode).toBe(403);
    expect(csrfRejected.json()).toMatchObject({ error: { code: 'CSRF_TOKEN_INVALID' } });

    const response = await app.inject({
      method: 'POST',
      url: '/api/orders',
      headers: {
        cookie: secondCookies,
        'x-csrf-token': csrfTokenFromCookies(secondCookies),
        'x-guest-id': 'attacker-controlled-guest-id',
        'idempotency-key': randomUUID(),
      },
      payload: checkoutPayload(`second-${scope}@example.com`),
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().data.items).toMatchObject([{ variantId: second.variant.id }]);
    await expect(prisma.cartItem.count({ where: { variantId: first.variant.id } })).resolves.toBe(1);
  }, 30000);

  it('keeps customer and admin order APIs protected for guests', async () => {
    await expect(app.inject({ method: 'GET', url: '/api/orders/my-orders' })).resolves.toMatchObject({ statusCode: 401 });
    await expect(app.inject({ method: 'GET', url: '/api/admin/orders' })).resolves.toMatchObject({ statusCode: 401 });
  }, 30000);
});
