import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Response as InjectResponse } from 'light-my-request';
import argon2 from 'argon2';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { prisma } from './db/prisma.js';

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

interface UserResponse {
  id: string;
  email: string;
  role: string;
  isAdmin: boolean;
}

interface ProductResponse {
  id: string;
  _id: string;
  name: string;
  slug: string;
  brandSlug: string;
  category: string;
  price: number;
  countInStock: number;
  status: string;
}

interface ProductPageResponse {
  items: ProductResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}

interface DashboardResponse {
  products: number;
  orders: number;
  users: number;
  newContactMessages: number;
  revenue: number;
  recentOrders: Array<{ id: string; orderNumber: string }>;
  topProducts: Array<{ id: string; name: string; sales: number; revenue: number }>;
}

interface CartResponse {
  items: Array<{
    product: string;
    quantity: number;
  }>;
  totals: {
    subtotal: number;
    itemCount: number;
    total: number;
  };
}

interface OrderResponse {
  id: string;
  guestEmail?: string;
  status: string;
  total: number;
  items: Array<{
    product: string;
    quantity: number;
  }>;
}

interface ContactCreateResponse {
  id: string;
  status: string;
}

const parseSuccess = <T>(response: InjectResponse, statusCode = 200) => {
  expect(response.statusCode).toBe(statusCode);
  const body = response.json() as ApiSuccess<T>;
  expect(body.success).toBe(true);
  return body.data;
};

const expectError = (response: InjectResponse, statusCode: number, code: string) => {
  expect(response.statusCode).toBe(statusCode);
  const body = response.json() as ApiFailure;
  expect(body.success).toBe(false);
  expect(body.error.code).toBe(code);
  return body.error;
};

const extractCookieHeader = (setCookieHeader: string | string[] | number | undefined) => {
  const headers = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader !== undefined
      ? [String(setCookieHeader)]
      : [];
  const cookies = headers.map((header) => header.split(';')[0]).filter(Boolean);

  expect(cookies.length).toBeGreaterThan(0);
  return cookies.join('; ');
};

const csrfHeaders = (cookie: string) => {
  const csrfCookie = cookie.split('; ').find((part) => part.startsWith('csrfToken='));
  expect(csrfCookie).toBeDefined();
  return { cookie, 'x-csrf-token': csrfCookie!.slice('csrfToken='.length) };
};

const checkoutPayload = (email: string) => ({
  shippingInfo: {
    firstName: 'Smoke',
    lastName: 'Buyer',
    email,
    phone: '+923001234567',
    address: '10 Test Avenue',
    city: 'Lahore',
    state: 'Punjab',
    zipCode: '54000',
    country: 'Pakistan',
  },
  paymentMethod: 'cod',
  shippingMethod: 'standard',
});

const cleanupScope = async (scope: string) => {
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { actor: { email: { contains: scope } } },
        { after: { path: ['slug'], string_contains: scope } },
        { before: { path: ['slug'], string_contains: scope } },
      ],
    },
  });
  await prisma.inventoryMovement.deleteMany({
    where: {
      variant: {
        sku: {
          contains: scope,
        },
      },
    },
  });
  await prisma.order.deleteMany({
    where: {
      OR: [
        { guestEmail: { contains: scope } },
        { user: { email: { contains: scope } } },
        { items: { some: { skuSnapshot: { contains: scope } } } },
      ],
    },
  });
  await prisma.cart.deleteMany({
    where: {
      OR: [
        { guestId: { contains: scope } },
        { user: { email: { contains: scope } } },
        { items: { some: { variant: { sku: { contains: scope } } } } },
      ],
    },
  });
  await prisma.promoCode.deleteMany({ where: { code: { contains: scope.toUpperCase() } } });
  await prisma.product.deleteMany({ where: { slug: { contains: scope } } });
  await prisma.brand.deleteMany({ where: { slug: { contains: scope } } });
  await prisma.category.deleteMany({ where: { slug: { contains: scope } } });
  await prisma.contactMessage.deleteMany({
    where: {
      OR: [{ email: { contains: scope } }, { subject: { contains: scope } }],
    },
  });
  await prisma.user.deleteMany({ where: { email: { contains: scope } } });
};

describe('endpoint smoke suite', () => {
  let app: FastifyInstance;
  const scope = `endpoint-smoke-${randomUUID()}`;
  const adminEmail = `admin-${scope}@example.com`;
  const customerEmail = `customer-${scope}@example.com`;
  const adminPassword = `Admin123!${scope.slice(-8)}`;
  const customerPassword = `Customer123!${scope.slice(-8)}`;
  const changedCustomerPassword = `Customer456!${scope.slice(-8)}`;
  const guestId = `guest-${scope}`;
  const mergeGuestId = `merge-${scope}`;
  const promoCode = scope.toUpperCase();

  beforeAll(async () => {
    app = await buildApp();
    await cleanupScope(scope);
  });

  afterAll(async () => {
    await app.close();
    await cleanupScope(scope);
  });

  it('exercises public, auth, cart, checkout, admin CRUD, contact, RBAC, and CORS routes', async () => {
    const brand = await prisma.brand.create({
      data: {
        name: `Smoke Brand ${scope}`,
        slug: `brand-${scope}`,
      },
    });
    const category = await prisma.category.create({
      data: {
        name: `Smoke Category ${scope}`,
        slug: `category-${scope}`,
      },
    });
    const catalogProduct = await prisma.product.create({
      data: {
        name: `Smoke Phone ${scope}`,
        slug: `smoke-phone-${scope}`,
        description: 'Endpoint smoke test product',
        status: 'ACTIVE',
        isFeatured: true,
        brandId: brand.id,
        categoryId: category.id,
        variants: {
          create: {
            sku: `SKU-${scope}`,
            title: '128GB / Black',
            storage: '128GB',
            color: 'Black',
            priceAmount: 100_000,
            stockQuantity: 10,
            reservedQuantity: 0,
            isActive: true,
          },
        },
        images: {
          create: {
            url: 'https://example.com/smoke-phone.jpg',
            altText: `Smoke Phone ${scope}`,
            isPrimary: true,
          },
        },
      },
      include: {
        variants: true,
      },
    });
    const catalogVariant = catalogProduct.variants[0];

    if (!catalogVariant) {
      throw new Error('Smoke fixture failed to create a product variant');
    }

    await prisma.user.createMany({
      data: [
        {
          email: adminEmail,
          passwordHash: await argon2.hash(adminPassword),
          firstName: 'Smoke',
          lastName: 'Admin',
          role: 'ADMIN',
          status: 'ACTIVE',
        },
        {
          email: customerEmail,
          passwordHash: await argon2.hash(customerPassword),
          firstName: 'Smoke',
          lastName: 'Customer',
          role: 'CUSTOMER',
          status: 'ACTIVE',
        },
      ],
    });
    await prisma.promoCode.create({
      data: {
        code: promoCode,
        type: 'PERCENTAGE',
        valuePercent: 10,
        maxDiscountAmount: 5_000,
        isActive: true,
      },
    });

    parseSuccess<{ service: string; status: string }>(
      await app.inject({
        method: 'GET',
        url: '/api/health',
      }),
    );

    expectError(
      await app.inject({
        method: 'GET',
        url: '/api/auth/profile',
      }),
      401,
      'UNAUTHENTICATED',
    );

    const googleStartResponse = await app.inject({
      method: 'GET',
      url: '/api/auth/google/start?mode=customer',
    });
    expect([200, 503]).toContain(googleStartResponse.statusCode);
    if (googleStartResponse.statusCode === 503) {
      expectError(googleStartResponse, 503, 'GOOGLE_OAUTH_NOT_CONFIGURED');
    } else {
      const googleStart = parseSuccess<{ authUrl: string }>(googleStartResponse);
      expect(googleStart.authUrl).toContain('accounts.google.com');
    }

    const customerLoginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: customerEmail,
        password: customerPassword,
      },
    });
    const customer = parseSuccess<UserResponse>(customerLoginResponse);
    expect(customer.email).toBe(customerEmail);
    expect(customer.isAdmin).toBe(false);
    const customerCookie = extractCookieHeader(customerLoginResponse.headers['set-cookie']);
    expect(String(customerLoginResponse.headers['set-cookie'])).toContain('accessToken=');
    expect(String(customerLoginResponse.headers['set-cookie'])).toContain('Path=/api');

    expectError(
      await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: adminEmail,
          password: adminPassword,
        },
      }),
      401,
      'INVALID_CREDENTIALS',
    );

    const adminLoginResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/auth/login',
      payload: {
        email: adminEmail,
        password: adminPassword,
      },
    });
    const admin = parseSuccess<UserResponse>(adminLoginResponse);
    expect(admin.isAdmin).toBe(true);
    const adminCookie = extractCookieHeader(adminLoginResponse.headers['set-cookie']);
    expect(String(adminLoginResponse.headers['set-cookie'])).toContain('adminAccessToken=');
    expect(String(adminLoginResponse.headers['set-cookie'])).toContain('Path=/api/admin');
    const coexistingCookies = `${customerCookie}; ${adminCookie}`;

    const coexistingCustomer = parseSuccess<UserResponse>(
      await app.inject({
        method: 'GET',
        url: '/api/auth/profile',
        headers: { cookie: coexistingCookies },
      }),
    );
    expect(coexistingCustomer.email).toBe(customerEmail);

    const coexistingAdmin = parseSuccess<UserResponse>(
      await app.inject({
        method: 'GET',
        url: '/api/admin/auth/profile',
        headers: { cookie: coexistingCookies },
      }),
    );
    expect(coexistingAdmin.email).toBe(adminEmail);

    parseSuccess<UserResponse>(
      await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { cookie: customerCookie },
      }),
    );
    parseSuccess<UserResponse>(
      await app.inject({
        method: 'PUT',
        url: '/api/auth/profile',
        headers: csrfHeaders(customerCookie),
        payload: { phone: '+923009990000' },
      }),
    );
    parseSuccess<{ changed: boolean }>(
      await app.inject({
        method: 'PUT',
        url: '/api/auth/password',
        headers: csrfHeaders(customerCookie),
        payload: {
          currentPassword: customerPassword,
          newPassword: changedCustomerPassword,
        },
      }),
    );
    expectError(
      await app.inject({
        method: 'POST',
        url: '/api/admin/auth/login',
        payload: {
          email: customerEmail,
          password: changedCustomerPassword,
        },
      }),
      401,
      'INVALID_CREDENTIALS',
    );

    const productList = parseSuccess<ProductPageResponse>(
      await app.inject({
        method: 'GET',
        url: '/api/products',
      }),
    );
    expect(productList.items.some((product) => product.id === catalogProduct.id)).toBe(true);
    expect(productList.pagination.limit).toBe(20);

    const featuredProducts = parseSuccess<ProductResponse[]>(
      await app.inject({
        method: 'GET',
        url: '/api/products/featured',
      }),
    );
    expect(featuredProducts.some((product) => product.id === catalogProduct.id)).toBe(true);

    const brands = parseSuccess<Array<{ slug: string }>>(
      await app.inject({
        method: 'GET',
        url: '/api/products/brands',
      }),
    );
    expect(brands.some((item) => item.slug === brand.slug)).toBe(true);

    const categories = parseSuccess<Array<{ slug: string }>>(
      await app.inject({
        method: 'GET',
        url: '/api/products/categories',
      }),
    );
    expect(categories.some((item) => item.slug === category.slug)).toBe(true);

    const brandProducts = parseSuccess<ProductResponse[]>(
      await app.inject({
        method: 'GET',
        url: `/api/products/brand/${brand.slug}`,
      }),
    );
    expect(brandProducts.some((product) => product.id === catalogProduct.id)).toBe(true);

    parseSuccess<ProductResponse>(
      await app.inject({
        method: 'GET',
        url: `/api/products/${catalogProduct.id}`,
      }),
    );

    expectError(
      await app.inject({
        method: 'GET',
        url: '/api/admin/dashboard',
      }),
      401,
      'UNAUTHENTICATED',
    );
    expectError(
      await app.inject({
        method: 'GET',
        url: '/api/admin/dashboard',
        headers: { cookie: customerCookie },
      }),
      403,
      'ADMIN_REQUIRED',
    );
    const dashboard = parseSuccess<DashboardResponse>(
      await app.inject({
        method: 'GET',
        url: '/api/admin/dashboard',
        headers: { cookie: adminCookie },
      }),
    );
    expect(Array.isArray(dashboard.recentOrders)).toBe(true);
    expect(Array.isArray(dashboard.topProducts)).toBe(true);
    parseSuccess<Array<Record<string, unknown>>>(
      await app.inject({
        method: 'GET',
        url: '/api/admin/sales-report',
        headers: { cookie: adminCookie },
      }),
    );
    parseSuccess<Array<Record<string, unknown>>>(
      await app.inject({
        method: 'GET',
        url: '/api/admin/top-products',
        headers: { cookie: adminCookie },
      }),
    );
    parseSuccess<Array<Record<string, unknown>>>(
      await app.inject({
        method: 'GET',
        url: '/api/admin/top-customers',
        headers: { cookie: adminCookie },
      }),
    );

    const contact = parseSuccess<ContactCreateResponse>(
      await app.inject({
        method: 'POST',
        url: '/api/contact',
        payload: {
          name: 'Smoke Contact',
          email: `contact-${scope}@example.com`,
          subject: `Endpoint smoke ${scope}`,
          message: 'Please verify the contact endpoint.',
        },
      }),
      201,
    );
    expect(contact.status).toBe('OPEN');
    const contactMessages = parseSuccess<Array<{ id: string }>>(
      await app.inject({
        method: 'GET',
        url: '/api/admin/contact-messages',
        headers: { cookie: adminCookie },
      }),
    );
    expect(contactMessages.some((message) => message.id === contact.id)).toBe(true);
    parseSuccess<{ status: string }>(
      await app.inject({
        method: 'PATCH',
        url: `/api/admin/contact-messages/${contact.id}`,
        headers: csrfHeaders(adminCookie),
        payload: { status: 'IN_PROGRESS' },
      }),
    );

    const adminProductPayload = {
      name: `Admin CRUD Phone ${scope}`,
      brand: `Admin Brand ${scope}`,
      category: `Admin Category ${scope}`,
      description: 'Product created by endpoint smoke tests.',
      price: 125_000,
      originalPrice: 135_000,
      imageUrl: 'https://example.com/admin-crud-phone.jpg',
      storage: '256GB',
      color: 'Blue',
      condition: 'new',
      countInStock: 6,
      isFeatured: false,
      status: 'ACTIVE',
    };

    expectError(
      await app.inject({
        method: 'POST',
        url: '/api/admin/products',
        payload: adminProductPayload,
      }),
      401,
      'UNAUTHENTICATED',
    );
    expectError(
      await app.inject({
        method: 'POST',
        url: '/api/admin/products',
        headers: csrfHeaders(customerCookie),
        payload: adminProductPayload,
      }),
      403,
      'ADMIN_REQUIRED',
    );
    const createdProduct = parseSuccess<ProductResponse>(
      await app.inject({
        method: 'POST',
        url: '/api/admin/products',
        headers: csrfHeaders(adminCookie),
        payload: adminProductPayload,
      }),
      201,
    );
    expect(createdProduct.name).toBe(adminProductPayload.name);

    const corsResponse = await app.inject({
      method: 'OPTIONS',
      url: `/api/admin/products/${createdProduct.id}`,
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'PUT',
        'access-control-request-headers': 'content-type,x-csrf-token,x-guest-id',
      },
    });
    expect(corsResponse.statusCode).toBe(204);
    expect(corsResponse.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(corsResponse.headers['access-control-allow-credentials']).toBe('true');
    expect(String(corsResponse.headers['access-control-allow-methods']).toUpperCase()).toContain('PUT');
    expect(String(corsResponse.headers['access-control-allow-headers']).toLowerCase()).toContain('content-type');
    expect(String(corsResponse.headers['access-control-allow-headers']).toLowerCase()).toContain('x-csrf-token');

    const updatedProduct = parseSuccess<ProductResponse>(
      await app.inject({
        method: 'PUT',
        url: `/api/admin/products/${createdProduct.id}`,
        headers: csrfHeaders(adminCookie),
        payload: {
          price: 119_000,
          countInStock: 8,
        },
      }),
    );
    expect(updatedProduct.price).toBe(119_000);
    expect(updatedProduct.countInStock).toBe(8);

    parseSuccess<{ deleted: boolean }>(
      await app.inject({
        method: 'DELETE',
        url: `/api/admin/products/${createdProduct.id}`,
        headers: csrfHeaders(adminCookie),
      }),
    );
    expectError(
      await app.inject({
        method: 'GET',
        url: `/api/products/${createdProduct.id}`,
      }),
      404,
      'PRODUCT_NOT_FOUND',
    );

    const emptyCartResponse = await app.inject({
      method: 'GET',
      url: '/api/cart',
      headers: { 'x-guest-id': guestId },
    });
    const emptyCart = parseSuccess<CartResponse>(emptyCartResponse);
    expect(emptyCart.items).toHaveLength(0);
    expect(extractCookieHeader(emptyCartResponse.headers['set-cookie'])).toContain(`guestCartId=${guestId}`);

    const addedCart = parseSuccess<CartResponse>(
      await app.inject({
        method: 'POST',
        url: '/api/cart/add',
        headers: { 'x-guest-id': guestId },
        payload: {
          productId: catalogProduct.id,
          quantity: 2,
        },
      }),
    );
    expect(addedCart.totals.itemCount).toBe(2);

    const updatedCart = parseSuccess<CartResponse>(
      await app.inject({
        method: 'PUT',
        url: `/api/cart/update/${catalogProduct.id}`,
        headers: { 'x-guest-id': guestId },
        payload: { quantity: 3 },
      }),
    );
    expect(updatedCart.items[0]?.quantity).toBe(3);

    const promo = parseSuccess<{ discount: number; discountRate: number }>(
      await app.inject({
        method: 'POST',
        url: '/api/cart/promo',
        headers: { 'x-guest-id': guestId },
        payload: { code: promoCode },
      }),
    );
    expect(promo.discount).toBeGreaterThan(0);
    expect(promo.discountRate).toBe(10);

    const removedCart = parseSuccess<CartResponse>(
      await app.inject({
        method: 'DELETE',
        url: `/api/cart/remove/${catalogProduct.id}`,
        headers: { 'x-guest-id': guestId },
      }),
    );
    expect(removedCart.items).toHaveLength(0);

    const mergeGuestCartResponse = await app.inject({
      method: 'GET',
      url: '/api/cart',
      headers: { 'x-guest-id': mergeGuestId },
    });
    const signedMergeGuestCookie = extractCookieHeader(mergeGuestCartResponse.headers['set-cookie']);
    const mergeGuestCart = await prisma.cart.findFirstOrThrow({ where: { guestId: mergeGuestId } });
    await prisma.cartItem.create({
      data: { cartId: mergeGuestCart.id, variantId: catalogVariant.id, quantity: 1 },
    });

    expect(parseSuccess<{ merged: boolean }>(
      await app.inject({
        method: 'POST',
        url: '/api/cart/merge',
        headers: csrfHeaders(customerCookie),
        payload: {},
      }),
    ).merged).toBe(false);
    expect(await prisma.cart.findFirst({ where: { id: mergeGuestCart.id } })).not.toBeNull();

    expect(parseSuccess<{ merged: boolean }>(
      await app.inject({
        method: 'POST',
        url: '/api/cart/merge',
        headers: csrfHeaders(`${customerCookie}; ${signedMergeGuestCookie}`),
        payload: {},
      }),
    ).merged).toBe(true);

    const order = parseSuccess<OrderResponse>(
      await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: csrfHeaders(customerCookie),
        payload: checkoutPayload(`buyer-${scope}@example.com`),
      }),
      201,
    );
    expect(order.guestEmail).toBeNull();
    expect(order.items).toHaveLength(1);

    expectError(
      await app.inject({
        method: 'GET',
        url: `/api/orders/${order.id}`,
      }),
      401,
      'UNAUTHENTICATED',
    );
    parseSuccess<OrderResponse>(
      await app.inject({
        method: 'GET',
        url: `/api/orders/${order.id}`,
        headers: { cookie: customerCookie },
      }),
    );
    parseSuccess<OrderResponse>(
      await app.inject({
        method: 'GET',
        url: `/api/admin/orders/${order.id}`,
        headers: { cookie: adminCookie },
      }),
    );
    parseSuccess<OrderResponse[]>(
      await app.inject({
        method: 'GET',
        url: '/api/orders/my-orders',
        headers: { cookie: customerCookie },
      }),
    );
    parseSuccess<OrderResponse[]>(
      await app.inject({
        method: 'GET',
        url: '/api/admin/orders',
        headers: { cookie: adminCookie },
      }),
    );
    parseSuccess<{ orders: number; revenue: number }>(
      await app.inject({
        method: 'GET',
        url: '/api/admin/orders/stats/overview',
        headers: { cookie: adminCookie },
      }),
    );
    const statusUpdate = parseSuccess<OrderResponse>(
      await app.inject({
        method: 'PUT',
        url: `/api/admin/orders/${order.id}/status`,
        headers: csrfHeaders(adminCookie),
        payload: {
          status: 'CONFIRMED',
          note: 'Smoke test confirmed',
        },
      }),
    );
    expect(statusUpdate.status).toBe('confirmed');
    const persistedStatus = parseSuccess<OrderResponse>(
      await app.inject({
        method: 'GET',
        url: `/api/admin/orders/${order.id}`,
        headers: { cookie: adminCookie },
      }),
    );
    expect(persistedStatus.status).toBe('confirmed');

    const deliveredOrder = parseSuccess<OrderResponse>(
      await app.inject({
        method: 'PUT',
        url: `/api/admin/orders/${order.id}/status`,
        headers: csrfHeaders(adminCookie),
        payload: {
          status: 'DELIVERED',
          note: 'Smoke test delivered',
        },
      }),
    );
    expect(deliveredOrder.status).toBe('delivered');

    const returnRequest = parseSuccess<{ id: string; status: string }>(
      await app.inject({
        method: 'POST',
        url: `/api/orders/${order.id}/returns`,
        headers: csrfHeaders(customerCookie),
        payload: {
          reason: 'Smoke-test return request',
          details: 'The product was delivered but is no longer needed.',
        },
      }),
      201,
    );
    expect(returnRequest.status).toBe('pending');

    const resolvedReturn = parseSuccess<{ id: string; status: string }>(
      await app.inject({
        method: 'PATCH',
        url: `/api/admin/orders/returns/${returnRequest.id}`,
        headers: csrfHeaders(adminCookie),
        payload: {
          status: 'APPROVED',
          resolutionNote: 'Smoke-test refund approved and confirmed.',
          manualRefundCompleted: true,
        },
      }),
    );
    expect(resolvedReturn.status).toBe('APPROVED');

    const refundedOrder = parseSuccess<OrderResponse>(
      await app.inject({
        method: 'GET',
        url: `/api/orders/${order.id}`,
        headers: { cookie: customerCookie },
      }),
    );
    expect(refundedOrder.status).toBe('refunded');

    const lockedVariant = await prisma.productVariant.findUniqueOrThrow({
      where: { id: catalogVariant.id },
    });
    expect(lockedVariant.stockQuantity).toBe(9);

    const customerLogoutResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: csrfHeaders(coexistingCookies),
    });
    parseSuccess<{ loggedOut: boolean }>(customerLogoutResponse);
    expect(String(customerLogoutResponse.headers['set-cookie'])).toContain('accessToken=');
    expect(String(customerLogoutResponse.headers['set-cookie'])).not.toContain('adminAccessToken=');

    parseSuccess<UserResponse>(
      await app.inject({
        method: 'GET',
        url: '/api/admin/auth/profile',
        headers: { cookie: adminCookie },
      }),
    );

    const adminLogoutResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/auth/logout',
      headers: csrfHeaders(adminCookie),
    });
    parseSuccess<{ loggedOut: boolean }>(adminLogoutResponse);
    expect(String(adminLogoutResponse.headers['set-cookie'])).toContain('adminAccessToken=');
  }, 60000);
});
