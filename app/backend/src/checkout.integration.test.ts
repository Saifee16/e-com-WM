import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
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

  it('rejects checkout when a cart product is archived before the transaction commits', async () => {
    const scope = testRunId();
    scopes.push(scope);
    const guestId = `guest-${scope}`;
    const { product, variant } = await makeCatalogItem(scope, 5);
    const cart = await prisma.cart.create({
      data: {
        guestId,
        items: {
          create: {
            variantId: variant.id,
            quantity: 1,
          },
        },
      },
    });

    await prisma.product.update({
      where: { id: product.id },
      data: { status: 'ARCHIVED' },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/orders',
      headers: { 'x-guest-id': guestId },
      payload: checkoutPayload(`guest-${scope}@example.com`),
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      success: false,
      error: {
        code: 'PRODUCT_NOT_AVAILABLE',
      },
    });

    await expect(prisma.order.count({ where: { guestEmail: `guest-${scope}@example.com` } })).resolves.toBe(0);
    await expect(prisma.cartItem.count({ where: { cartId: cart.id } })).resolves.toBe(1);
    await expect(prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).resolves.toMatchObject({
      stockQuantity: 5,
    });
  }, 30000);

  it('uses the HttpOnly guestCartId cookie for guest checkout without X-Guest-Id', async () => {
    const scope = testRunId();
    scopes.push(scope);
    const guestId = `guest-${scope}`;
    const { variant } = await makeCatalogItem(scope, 4);
    await prisma.cart.create({
      data: {
        guestId,
        items: {
          create: {
            variantId: variant.id,
            quantity: 2,
          },
        },
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/orders',
      headers: {
        cookie: `guestCartId=${guestId}`,
      },
      payload: checkoutPayload(`guest-${scope}@example.com`),
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        guestEmail: `guest-${scope}@example.com`,
        items: [
          {
            quantity: 2,
          },
        ],
      },
    });

    await expect(prisma.cartItem.count({ where: { cart: { guestId } } })).resolves.toBe(0);
    await expect(prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).resolves.toMatchObject({
      stockQuantity: 2,
    });
  }, 30000);
});
