import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/env.js', () => ({
  env: { NODE_ENV: 'test', API_BASE_URL: 'http://127.0.0.1:4000', PRODUCT_IMAGE_STORAGE: 'local', CLOUDINARY_UPLOAD_FOLDER: 'test-products' },
}));
vi.mock('../auth/session.js', () => ({
  requireChangedAdminPassword: vi.fn(),
  authenticateCustomer: vi.fn(),
}));
vi.mock('../../db/prisma.js', async () => {
  const { PrismaClient } = await import('@prisma/client');
  const databaseUrl = new URL(process.env.DATABASE_URL ?? '');
  if (!['127.0.0.1', 'localhost'].includes(databaseUrl.hostname)) {
    throw new Error('Product atomicity tests require a disposable local database');
  }
  return { prisma: new PrismaClient({ datasourceUrl: databaseUrl.toString(), log: [] }) };
});

import { prisma } from '../../db/prisma.js';
import { adminProductRoutes } from './routes.js';

describe('atomic product creation', () => {
  const scope = `atomic-${randomUUID()}`;
  const actorId = randomUUID();
  const categoryId = randomUUID();
  let createProduct: (request: unknown, reply: unknown) => Promise<unknown>;
  const payload = {
    name: `Product ${scope}`, brand: `Brand ${scope}`, category: categoryId,
    description: 'Disposable transaction fixture', price: 100, images: [`https://example.com/${scope}/common.jpg`],
    variants: [
      { sku: `BLUE-${scope}`, color: 'Blue', price: 100, countInStock: 2, imageUrl: `https://example.com/${scope}/blue.jpg` },
      { sku: `RED-${scope}`, color: 'Red', price: 200, countInStock: 3, imageUrl: `https://example.com/${scope}/red.jpg` },
    ],
  };
  const reply = () => {
    const result = { status: vi.fn(), send: vi.fn((body) => body) };
    result.status.mockReturnValue(result);
    return result;
  };

  beforeAll(async () => {
    await prisma.category.create({ data: { id: categoryId, name: scope, slug: scope } });
    await prisma.user.create({ data: {
      id: actorId, email: `${scope}@example.com`, passwordHash: 'unused-test-hash',
      firstName: 'Test', lastName: 'Admin', role: 'ADMIN',
    } });
    await adminProductRoutes({
      addHook: vi.fn(), get: vi.fn(), put: vi.fn(), delete: vi.fn(),
      post: (path: string, handler: typeof createProduct) => { if (path === '/') createProduct = handler; },
    } as never, { uploadDirectory: 'unused-test-upload-directory' });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorUserId: actorId } });
    await prisma.product.deleteMany({ where: { categoryId } });
    await prisma.brand.deleteMany({ where: { slug: { endsWith: scope } } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.user.deleteMany({ where: { id: actorId } });
    await prisma.$disconnect();
  });

  it('rejects an invalid category before creating a brand', async () => {
    const result = await createProduct({
      body: { ...payload, category: randomUUID() }, authUser: { id: actorId },
    }, reply());
    expect(result).toMatchObject({ success: false, error: { code: 'INVALID_CATEGORY' } });
    expect(await prisma.brand.count({ where: { slug: { endsWith: scope } } })).toBe(0);
  });

  it('rolls back brand, product, variants and images when the final audit write fails, then allows retry', async () => {
    const failedReply = reply();
    await expect(createProduct({
      body: payload, authUser: { id: randomUUID() },
    }, failedReply)).rejects.toMatchObject({ code: 'P2003' });
    expect(failedReply.status).not.toHaveBeenCalledWith(201);
    expect(await prisma.brand.count({ where: { slug: { endsWith: scope } } })).toBe(0);
    expect(await prisma.product.count({ where: { categoryId } })).toBe(0);
    expect(await prisma.productVariant.count({ where: { sku: { endsWith: scope } } })).toBe(0);
    expect(await prisma.productImage.count({ where: { url: { contains: scope } } })).toBe(0);

    const successReply = reply();
    await createProduct({ body: payload, authUser: { id: actorId } }, successReply);
    expect(successReply.status).toHaveBeenCalledWith(201);
    const product = await prisma.product.findFirstOrThrow({
      where: { categoryId }, include: { variants: true, images: true },
    });
    expect(product.variants).toHaveLength(2);
    expect(product.images).toHaveLength(3);
    for (const variant of product.variants) {
      const expected = payload.variants.find((item) => item.sku === variant.sku)!;
      expect(product.images.find((item) => item.variantId === variant.id)?.url).toBe(expected.imageUrl);
    }
    expect(await prisma.auditLog.count({ where: { actorUserId: actorId, entityId: product.id, action: 'CREATE' } })).toBe(1);
  });

  it('restores an existing brand when a nested SKU conflict aborts creation', async () => {
    const brand = await prisma.brand.findFirstOrThrow({ where: { slug: { endsWith: scope } } });
    await prisma.brand.update({ where: { id: brand.id }, data: { name: 'Original name', isActive: false } });
    await expect(createProduct({
      body: { ...payload, name: `Conflicting product ${scope}` }, authUser: { id: actorId },
    }, reply())).rejects.toMatchObject({ code: 'P2002' });
    expect(await prisma.brand.findUniqueOrThrow({ where: { id: brand.id } })).toMatchObject({
      name: 'Original name', isActive: false,
    });
    expect(await prisma.product.count({ where: { categoryId } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { actorUserId: actorId } })).toBe(1);
  });
});
