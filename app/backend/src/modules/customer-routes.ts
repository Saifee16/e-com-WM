import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { fail, ok } from '../utils/responses.js';
import { authenticateCustomer } from './auth/session.js';
import { mapProduct, productInclude } from './products/routes.js';

const idParams = z.object({ id: z.string().uuid() });
const addressSchema = z.object({
  label: z.string().trim().max(40).optional(),
  fullName: z.string().trim().min(1).max(160),
  phone: z.string().trim().min(1).max(40),
  line1: z.string().trim().min(1).max(240),
  line2: z.string().trim().max(240).optional(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(30),
  country: z.string().trim().min(1).max(100).default('Pakistan'),
  isDefaultShipping: z.boolean().default(false),
  isDefaultBilling: z.boolean().default(false),
});

const mapAddress = (address: {
  id: string; label: string | null; fullName: string; phone: string; line1: string; line2: string | null;
  city: string; state: string; postalCode: string; country: string; isDefaultShipping: boolean;
  isDefaultBilling: boolean; createdAt: Date; updatedAt: Date;
}) => ({
  ...address,
  label: address.label ?? undefined,
  line2: address.line2 ?? undefined,
  createdAt: address.createdAt.toISOString(),
  updatedAt: address.updatedAt.toISOString(),
});

export const wishlistRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticateCustomer);

  app.get('/', async (request, reply) => {
    const rows = await prisma.wishlist.findMany({
      where: { userId: request.authUser!.id },
      include: { product: { include: productInclude } },
      orderBy: { createdAt: 'desc' },
    });
    return ok(reply, rows.map((row) => mapProduct(row.product)));
  });

  app.post('/', async (request, reply) => {
    const body = z.object({ productId: z.string().uuid() }).parse(request.body);
    const product = await prisma.product.findFirst({ where: { id: body.productId, status: 'ACTIVE' } });
    if (!product) return fail(reply, 404, { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' });
    const row = await prisma.wishlist.upsert({
      where: { userId_productId: { userId: request.authUser!.id, productId: body.productId } },
      update: {},
      create: { userId: request.authUser!.id, productId: body.productId },
    });
    return ok(reply.status(201), { id: row.id, productId: row.productId, createdAt: row.createdAt.toISOString() });
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = idParams.parse(request.params);
    await prisma.wishlist.deleteMany({ where: { userId: request.authUser!.id, productId: id } });
    return ok(reply, { deleted: true });
  });
};

export const addressRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticateCustomer);

  app.get('/', async (request, reply) => {
    const rows = await prisma.address.findMany({
      where: { userId: request.authUser!.id },
      orderBy: [{ isDefaultShipping: 'desc' }, { createdAt: 'asc' }],
    });
    return ok(reply, rows.map(mapAddress));
  });

  app.post('/', async (request, reply) => {
    const body = addressSchema.parse(request.body);
    const address = await prisma.$transaction(async (tx) => {
      const count = await tx.address.count({ where: { userId: request.authUser!.id } });
      const shippingDefault = count === 0 || body.isDefaultShipping;
      const billingDefault = count === 0 || body.isDefaultBilling;
      if (shippingDefault) await tx.address.updateMany({ where: { userId: request.authUser!.id }, data: { isDefaultShipping: false } });
      if (billingDefault) await tx.address.updateMany({ where: { userId: request.authUser!.id }, data: { isDefaultBilling: false } });
      return tx.address.create({
        data: {
          userId: request.authUser!.id,
          fullName: body.fullName,
          phone: body.phone,
          line1: body.line1,
          city: body.city,
          state: body.state,
          postalCode: body.postalCode,
          country: body.country,
          isDefaultShipping: shippingDefault,
          isDefaultBilling: billingDefault,
          ...(body.label !== undefined ? { label: body.label } : {}),
          ...(body.line2 !== undefined ? { line2: body.line2 } : {}),
        },
      });
    });
    return ok(reply.status(201), mapAddress(address));
  });

  app.patch('/:id', async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const body = addressSchema.partial().parse(request.body);
    const address = await prisma.$transaction(async (tx) => {
      const existing = await tx.address.findFirst({ where: { id, userId: request.authUser!.id } });
      if (!existing) return null;
      if (body.isDefaultShipping) await tx.address.updateMany({ where: { userId: request.authUser!.id, id: { not: id } }, data: { isDefaultShipping: false } });
      if (body.isDefaultBilling) await tx.address.updateMany({ where: { userId: request.authUser!.id, id: { not: id } }, data: { isDefaultBilling: false } });
      return tx.address.update({
        where: { id },
        data: {
          ...(body.label !== undefined ? { label: body.label } : {}),
          ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
          ...(body.phone !== undefined ? { phone: body.phone } : {}),
          ...(body.line1 !== undefined ? { line1: body.line1 } : {}),
          ...(body.line2 !== undefined ? { line2: body.line2 } : {}),
          ...(body.city !== undefined ? { city: body.city } : {}),
          ...(body.state !== undefined ? { state: body.state } : {}),
          ...(body.postalCode !== undefined ? { postalCode: body.postalCode } : {}),
          ...(body.country !== undefined ? { country: body.country } : {}),
          ...(body.isDefaultShipping !== undefined ? { isDefaultShipping: body.isDefaultShipping } : {}),
          ...(body.isDefaultBilling !== undefined ? { isDefaultBilling: body.isDefaultBilling } : {}),
        },
      });
    });
    if (!address) return fail(reply, 404, { code: 'ADDRESS_NOT_FOUND', message: 'Address not found' });
    return ok(reply, mapAddress(address));
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.address.findFirst({ where: { id, userId: request.authUser!.id } });
      if (!existing) return false;
      await tx.address.delete({ where: { id } });
      const next = await tx.address.findFirst({ where: { userId: request.authUser!.id }, orderBy: { createdAt: 'asc' } });
      if (next && (existing.isDefaultShipping || existing.isDefaultBilling)) {
        await tx.address.update({
          where: { id: next.id },
          data: {
            ...(existing.isDefaultShipping ? { isDefaultShipping: true } : {}),
            ...(existing.isDefaultBilling ? { isDefaultBilling: true } : {}),
          },
        });
      }
      return true;
    });
    if (!deleted) return fail(reply, 404, { code: 'ADDRESS_NOT_FOUND', message: 'Address not found' });
    return ok(reply, { deleted: true });
  });
};
