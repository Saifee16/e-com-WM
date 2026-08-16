import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
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
  brand: string;
  brandSlug: string;
  category: string;
  price: number;
  countInStock: number;
  status: string;
  images: string[];
  specifications: {
    display?: string;
    processor?: string;
    ram?: string;
    battery?: string;
    camera?: string;
    os?: string;
    network?: string;
  };
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
    variantId?: string;
    sku?: string;
    name?: string;
    image?: string;
    price?: number;
    specs?: string;
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

const multipartImages = (files: Array<{ filename: string; mimeType: string; contents: Buffer }>) => {
  const boundary = `----codex-${randomUUID()}`;
  const chunks: Buffer[] = [];
  files.forEach((file) => {
    chunks.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="images"; filename="${file.filename}"\r\n`
      + `Content-Type: ${file.mimeType}\r\n\r\n`,
    ));
    chunks.push(file.contents, Buffer.from('\r\n'));
  });
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return {
    payload: Buffer.concat(chunks),
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
  };
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
  let uploadDirectory: string;
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
    uploadDirectory = await mkdtemp(path.join(tmpdir(), 'ecommerce-product-uploads-'));
    app = await buildApp({ uploadDirectory });
    await cleanupScope(scope);
  });

  afterAll(async () => {
    await app.close();
    await cleanupScope(scope);
    await rm(uploadDirectory, { recursive: true, force: true });
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

    const pngImage = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );
    const imageUpload = multipartImages([
      { filename: 'phone-front.png', mimeType: 'image/png', contents: pngImage },
      { filename: 'phone-back.png', mimeType: 'image/png', contents: pngImage },
    ]);
    const uploadedImages = parseSuccess<{ urls: string[] }>(
      await app.inject({
        method: 'POST',
        url: '/api/admin/products/images',
        headers: { ...csrfHeaders(adminCookie), ...imageUpload.headers },
        payload: imageUpload.payload,
      }),
      201,
    );
    expect(uploadedImages.urls).toHaveLength(2);
    expect(uploadedImages.urls.every((url) => url.endsWith('.png'))).toBe(true);
    const uploadedImageResponse = await app.inject({
      method: 'GET',
      url: new URL(uploadedImages.urls[0]!).pathname,
    });
    expect(uploadedImageResponse.statusCode).toBe(200);
    expect(uploadedImageResponse.headers['content-type']).toBe('image/png');
    expect(uploadedImageResponse.headers['cross-origin-resource-policy']).toBe('cross-origin');

    const disposableImageUpload = multipartImages([
      { filename: 'temporary-phone.png', mimeType: 'image/png', contents: pngImage },
    ]);
    const disposableImages = parseSuccess<{ urls: string[] }>(
      await app.inject({
        method: 'POST',
        url: '/api/admin/products/images',
        headers: { ...csrfHeaders(adminCookie), ...disposableImageUpload.headers },
        payload: disposableImageUpload.payload,
      }),
      201,
    );
    parseSuccess<{ deleted: boolean }>(
      await app.inject({
        method: 'DELETE',
        url: '/api/admin/products/images',
        headers: csrfHeaders(adminCookie),
        payload: { urls: disposableImages.urls },
      }),
    );
    expect((await app.inject({
      method: 'GET',
      url: new URL(disposableImages.urls[0]!).pathname,
    })).statusCode).toBe(404);

    const disguisedImage = multipartImages([
      { filename: 'not-really-an-image.jpg', mimeType: 'image/jpeg', contents: Buffer.from('not an image') },
    ]);
    expectError(
      await app.inject({
        method: 'POST',
        url: '/api/admin/products/images',
        headers: { ...csrfHeaders(adminCookie), ...disguisedImage.headers },
        payload: disguisedImage.payload,
      }),
      400,
      'REQUEST_ERROR',
    );

    const tooManyFiles = multipartImages(Array.from({ length: 6 }, (_, index) => ({
      filename: `phone-${index + 1}.png`,
      mimeType: 'image/png',
      contents: pngImage,
    })));
    expectError(
      await app.inject({
        method: 'POST',
        url: '/api/admin/products/images',
        headers: { ...csrfHeaders(adminCookie), ...tooManyFiles.headers },
        payload: tooManyFiles.payload,
      }),
      413,
      'REQUEST_ERROR',
    );

    const adminProductPayload = {
      name: `Admin CRUD Phone ${scope}`,
      brand: `Admin Brand ${scope}`,
      category: `Admin Category ${scope}`,
      description: 'Product created by endpoint smoke tests.',
      price: 125_000,
      originalPrice: 135_000,
      images: uploadedImages.urls,
      storage: '256GB',
      color: 'Blue',
      specifications: {
        display: '6.7-inch AMOLED, 120Hz',
        processor: 'Snapdragon 8 Gen 3',
        ram: '12GB',
        battery: '5,000mAh',
        camera: '50MP main + 12MP ultra-wide',
        os: 'Android 15',
        network: '5G, dual SIM',
      },
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

    const invalidImageError = expectError(
      await app.inject({
        method: 'POST',
        url: '/api/admin/products',
        headers: csrfHeaders(adminCookie),
        payload: { ...adminProductPayload, images: ['http://example.com/insecure-product.jpg'] },
      }),
      400,
      'VALIDATION_ERROR',
    );
    expect(invalidImageError.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: ['images', 0], message: 'Product image URLs must use HTTPS' }),
    ]));

    const tooManyImagesError = expectError(
      await app.inject({
        method: 'POST',
        url: '/api/admin/products',
        headers: csrfHeaders(adminCookie),
        payload: {
          ...adminProductPayload,
          images: Array.from(
            { length: 6 },
            (_, index) => `https://example.com/admin-crud-phone-${index + 1}.jpg`,
          ),
        },
      }),
      400,
      'VALIDATION_ERROR',
    );
    expect(tooManyImagesError.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: ['images'], message: 'You can add up to 5 product images' }),
    ]));

    for (const invalidPayload of [
      { ...adminProductPayload, price: -1 },
      { ...adminProductPayload, countInStock: -1 },
      { ...adminProductPayload, countInStock: 1.5 },
      { ...adminProductPayload, name: '   ' },
      { ...adminProductPayload, unexpectedField: true },
      { ...adminProductPayload, price: String(adminProductPayload.price) },
    ]) {
      expectError(
        await app.inject({
          method: 'POST',
          url: '/api/admin/products',
          headers: csrfHeaders(adminCookie),
          payload: invalidPayload,
        }),
        400,
        'VALIDATION_ERROR',
      );
    }

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
    expect(createdProduct.images).toEqual(adminProductPayload.images);
    expect(createdProduct.specifications).toMatchObject(adminProductPayload.specifications);

    const draftPayload = {
      name: `Draft Phone ${scope}`,
      brand: `Draft Brand ${scope}`,
      description: 'Draft product with optional fields omitted.',
      price: 99_000,
      status: 'DRAFT',
    };
    const draftProduct = parseSuccess<ProductResponse>(
      await app.inject({
        method: 'POST',
        url: '/api/admin/products',
        headers: csrfHeaders(adminCookie),
        payload: draftPayload,
      }),
      201,
    );
    expect(draftProduct.status).toBe('DRAFT');
    const adminDrafts = parseSuccess<ProductPageResponse>(
      await app.inject({
        method: 'GET',
        url: `/api/admin/products?status=DRAFT&search=${encodeURIComponent(scope)}`,
        headers: { cookie: adminCookie },
      }),
    );
    expect(adminDrafts.items.some((product) => product.id === draftProduct.id)).toBe(true);
    expectError(
      await app.inject({ method: 'GET', url: `/api/products/${draftProduct.id}` }),
      404,
      'PRODUCT_NOT_FOUND',
    );

    const minimalProduct = parseSuccess<ProductResponse>(
      await app.inject({
        method: 'POST',
        url: '/api/admin/products',
        headers: csrfHeaders(adminCookie),
        payload: {
          name: `Minimal Active Phone ${scope}`,
          brand: `Minimal Brand ${scope}`,
          description: 'Published product using only the required create fields.',
          price: 75_000,
        },
      }),
      201,
    );
    expect(minimalProduct.status).toBe('ACTIVE');
    parseSuccess<ProductResponse>(
      await app.inject({ method: 'GET', url: `/api/products/${minimalProduct.id}` }),
    );

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
          brand: `Updated Admin Brand ${scope}`,
          category: `Updated Category ${scope}`,
          price: 119_000,
          countInStock: 8,
          specifications: { ram: '16GB', network: '5G, eSIM' },
        },
      }),
    );
    expect(updatedProduct.price).toBe(119_000);
    expect(updatedProduct.countInStock).toBe(8);
    expect(updatedProduct.brand).toBe(`Updated Admin Brand ${scope}`);
    expect(updatedProduct.category).toBe(`updated-category-${scope}`);
    expect(updatedProduct.specifications).toMatchObject({ ram: '16GB', network: '5G, eSIM' });

    parseSuccess<{ deleted: boolean }>(
      await app.inject({
        method: 'DELETE',
        url: `/api/admin/products/${createdProduct.id}`,
        headers: csrfHeaders(adminCookie),
      }),
    );
    expect((await app.inject({
      method: 'GET',
      url: new URL(uploadedImages.urls[0]!).pathname,
    })).statusCode).toBe(404);
    for (const productId of [draftProduct.id, minimalProduct.id]) {
      parseSuccess<{ deleted: boolean }>(
        await app.inject({
          method: 'DELETE',
          url: `/api/admin/products/${productId}`,
          headers: csrfHeaders(adminCookie),
        }),
      );
    }
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
        headers: {
          ...csrfHeaders(customerCookie),
          'idempotency-key': randomUUID(),
        },
        payload: checkoutPayload(`buyer-${scope}@example.com`),
      }),
      201,
    );
    expect(order.guestEmail).toBeNull();
    expect(order.items).toHaveLength(1);

    const variantProduct = await prisma.product.create({
      data: {
        name: `Variant Checkout Phone ${scope}`,
        slug: `variant-checkout-phone-${scope}`,
        description: 'Variant checkout test product',
        status: 'ACTIVE',
        brandId: brand.id,
        categoryId: category.id,
        variants: {
          create: [
            {
              sku: `VARIANT-BLACK-${scope}`,
              title: '128GB / Black',
              storage: '128GB',
              color: 'Black',
              priceAmount: 100_000,
              stockQuantity: 2,
              isActive: true,
            },
            {
              sku: `VARIANT-GOLD-${scope}`,
              title: '256GB / Gold',
              storage: '256GB',
              color: 'Gold',
              priceAmount: 125_000,
              stockQuantity: 3,
              isActive: true,
            },
          ],
        },
      },
      include: { variants: true },
    });
    const selectedVariant = variantProduct.variants.find((variant) => variant.color === 'Gold')!;
    await prisma.productImage.create({
      data: {
        productId: variantProduct.id,
        variantId: selectedVariant.id,
        url: 'https://example.com/variant-gold.jpg',
        altText: selectedVariant.title,
      },
    });
    await prisma.cart.create({
      data: {
        userId: customer.id,
        items: { create: { variantId: selectedVariant.id, quantity: 1 } },
      },
    });
    const variantOrder = parseSuccess<OrderResponse>(
      await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: { ...csrfHeaders(customerCookie), 'idempotency-key': randomUUID() },
        payload: checkoutPayload(`variant-buyer-${scope}@example.com`),
      }),
      201,
    );
    expect(variantOrder.items[0]).toMatchObject({
      product: variantProduct.id,
      variantId: selectedVariant.id,
      sku: selectedVariant.sku,
      name: variantProduct.name,
      image: 'https://example.com/variant-gold.jpg',
      price: selectedVariant.priceAmount,
      specs: selectedVariant.title,
      quantity: 1,
    });
    await expect(prisma.productVariant.findUniqueOrThrow({ where: { id: selectedVariant.id } })).resolves.toMatchObject({
      stockQuantity: 2,
    });

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

    for (const status of ['PROCESSING', 'SHIPPED'] as const) {
      const transitionedOrder = parseSuccess<OrderResponse>(
        await app.inject({
          method: 'PUT',
          url: `/api/admin/orders/${order.id}/status`,
          headers: csrfHeaders(adminCookie),
          payload: {
            status,
            note: `Smoke test ${status.toLowerCase()}`,
          },
        }),
      );
      expect(transitionedOrder.status).toBe(status.toLowerCase());
    }

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
