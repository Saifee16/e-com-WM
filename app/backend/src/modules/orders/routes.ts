import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { fail, ok } from '../../utils/responses.js';
import { getAuthenticatedUser, getGuestId, requireAdminUser, requireAuthenticatedUser } from '../auth/session.js';

const orderInclude = {
  items: true,
  shipments: true,
} satisfies Prisma.OrderInclude;

const checkoutCartInclude = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            include: {
              images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
            },
          },
        },
      },
    },
  },
  promoCode: true,
} satisfies Prisma.CartInclude;

type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

const mapOrder = (order: OrderWithRelations) => ({
  _id: order.id,
  id: order.id,
  orderNumber: order.orderNumber,
  user: order.userId,
  guestEmail: order.guestEmail,
  status: order.status.toLowerCase(),
  paymentStatus: order.paymentStatus.toLowerCase(),
  subtotal: order.subtotalAmount,
  tax: order.taxAmount,
  discount: order.discountAmount,
  shippingCost: order.shippingAmount,
  total: order.totalAmount,
  shippingAddress: order.shippingAddressSnapshot,
  billingAddress: order.billingAddressSnapshot,
  items: order.items.map((item) => ({
    product: item.productId,
    name: item.productNameSnapshot,
    image: item.imageUrlSnapshot ?? '',
    price: item.unitPriceAmount,
    quantity: item.quantity,
    specs: item.variantTitleSnapshot,
  })),
  trackingNumber: order.shipments[0]?.trackingNumber ?? undefined,
  notes: order.notes ?? undefined,
  createdAt: order.createdAt.toISOString(),
});

const checkoutSchema = z.object({
  shippingInfo: z.object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    email: z.string().email().transform((value) => value.toLowerCase()),
    phone: z.string().trim().min(1),
    address: z.string().trim().min(1),
    city: z.string().trim().min(1),
    state: z.string().trim().min(1),
    zipCode: z.string().trim().min(1),
    country: z.string().trim().default('Pakistan'),
  }),
  paymentMethod: z.enum(['jazzcash', 'easypaisa', 'cod']).default('cod'),
  shippingMethod: z.enum(['standard', 'express', 'pickup']).default('standard'),
  notes: z.string().trim().max(1000).optional(),
});

const shippingCosts = {
  standard: 500,
  express: 1500,
  pickup: 0,
};

const getCartForRequest = async (request: FastifyRequest) => {
  const user = await getAuthenticatedUser(request);
  const guestId = getGuestId(request);

  if (!user && !guestId) {
    return { user, guestId, cart: null };
  }

  const cart = await prisma.cart.findFirst({
    where: user ? { userId: user.id } : { guestId },
    orderBy: { updatedAt: 'desc' },
    include: checkoutCartInclude,
  });

  return { user, guestId, cart };
};

const makeOrderNumber = () => `WAH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 8).toUpperCase()}`;

export const orderRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', async (request, reply) => {
    const body = checkoutSchema.parse(request.body);
    const { user, cart } = await getCartForRequest(request);

    if (!cart) {
      return fail(reply, 400, {
        code: 'CART_EMPTY',
        message: 'Cart is empty',
      });
    }

    const addressSnapshot = {
      fullName: `${body.shippingInfo.firstName} ${body.shippingInfo.lastName}`,
      phone: body.shippingInfo.phone,
      email: body.shippingInfo.email,
      line1: body.shippingInfo.address,
      city: body.shippingInfo.city,
      state: body.shippingInfo.state,
      postalCode: body.shippingInfo.zipCode,
      country: body.shippingInfo.country,
      shippingMethod: body.shippingMethod,
    };

    let checkoutError: 'CART_EMPTY' | 'INSUFFICIENT_STOCK' | 'PRODUCT_NOT_AVAILABLE' | null = null;
    const order = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM cart_items WHERE cart_id = ${cart.id}::uuid FOR UPDATE`;
      const lockedCart = await tx.cart.findUnique({
        where: { id: cart.id },
        include: checkoutCartInclude,
      });

      if (!lockedCart || lockedCart.items.length === 0) {
        throw new Error('CART_EMPTY');
      }

      const purchasableItems = [];

      for (const item of lockedCart.items) {
        await tx.$queryRaw`SELECT id FROM product_variants WHERE id = ${item.variantId}::uuid FOR UPDATE`;
        const variant = await tx.productVariant.findUniqueOrThrow({
          where: { id: item.variantId },
          include: {
            product: {
              include: {
                images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
              },
            },
          },
        });

        if (!variant.isActive || variant.product.status !== 'ACTIVE') {
          throw new Error('PRODUCT_NOT_AVAILABLE');
        }

        const available = Math.max(0, variant.stockQuantity - variant.reservedQuantity);

        if (item.quantity > available) {
          throw new Error('INSUFFICIENT_STOCK');
        }

        purchasableItems.push({ cartItem: item, variant });
      }

      const subtotal = purchasableItems.reduce(
        (total, item) => total + item.variant.priceAmount * item.cartItem.quantity,
        0,
      );
      const tax = Math.round(subtotal * 0.02);
      const shipping = shippingCosts[body.shippingMethod];
      const discount =
        lockedCart.promoCode?.valuePercent !== null && lockedCart.promoCode?.valuePercent !== undefined
          ? Math.min(
              Math.round((subtotal * lockedCart.promoCode.valuePercent) / 100),
              lockedCart.promoCode.maxDiscountAmount ?? subtotal,
            )
          : lockedCart.promoCode?.valueAmount ?? 0;
      const total = subtotal + tax + shipping - discount;

      const created = await tx.order.create({
        data: {
          orderNumber: makeOrderNumber(),
          ...(user ? { user: { connect: { id: user.id } } } : { guestEmail: body.shippingInfo.email }),
          status: 'PENDING',
          paymentStatus: body.paymentMethod === 'cod' ? 'UNPAID' : 'PENDING',
          subtotalAmount: subtotal,
          discountAmount: discount,
          shippingAmount: shipping,
          taxAmount: tax,
          totalAmount: total,
          ...(lockedCart.promoCodeId ? { promoCode: { connect: { id: lockedCart.promoCodeId } } } : {}),
          shippingAddressSnapshot: addressSnapshot,
          billingAddressSnapshot: addressSnapshot,
          ...(body.notes ? { notes: body.notes } : {}),
          items: {
            create: purchasableItems.map(({ cartItem, variant }) => ({
              product: { connect: { id: variant.productId } },
              variant: { connect: { id: variant.id } },
              skuSnapshot: variant.sku,
              productNameSnapshot: variant.product.name,
              variantTitleSnapshot: variant.title,
              ...(variant.product.images[0]?.url ? { imageUrlSnapshot: variant.product.images[0].url } : {}),
              unitPriceAmount: variant.priceAmount,
              quantity: cartItem.quantity,
              lineTotalAmount: variant.priceAmount * cartItem.quantity,
            })),
          },
          shipments: {
            create: {
              status: 'PENDING',
            },
          },
          inventoryMovements: {
            create: purchasableItems.map(({ cartItem, variant }) => ({
              variant: { connect: { id: variant.id } },
              type: 'SALE',
              quantityDelta: -cartItem.quantity,
              reason: 'Checkout',
            })),
          },
        },
        include: orderInclude,
      });

      for (const { cartItem, variant } of purchasableItems) {
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stockQuantity: { decrement: cartItem.quantity } },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return created;
    }).catch((error: unknown) => {
      if (
        error instanceof Error &&
        (error.message === 'CART_EMPTY' || error.message === 'INSUFFICIENT_STOCK' || error.message === 'PRODUCT_NOT_AVAILABLE')
      ) {
        checkoutError = error.message;
        return null;
      }
      throw error;
    });

    if (!order) {
      if (checkoutError === 'CART_EMPTY') {
        return fail(reply, 400, {
          code: 'CART_EMPTY',
          message: 'Cart is empty',
        });
      }

      if (checkoutError === 'PRODUCT_NOT_AVAILABLE') {
        return fail(reply, 409, {
          code: 'PRODUCT_NOT_AVAILABLE',
          message: 'One or more cart items are no longer available',
        });
      }

      return fail(reply, 409, {
        code: 'INSUFFICIENT_STOCK',
        message: 'One or more cart items no longer have enough stock',
      });
    }

    return ok(reply.status(201), mapOrder(order));
  });

  app.get('/my-orders', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply);
    if (!user) return;

    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });

    return ok(reply, orders.map(mapOrder));
  });

  app.get('/stats/overview', async (request, reply) => {
    const admin = await requireAdminUser(request, reply);
    if (!admin) return;

    const [orders, revenue] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { totalAmount: true } }),
    ]);

    return ok(reply, {
      orders,
      revenue: revenue._sum.totalAmount ?? 0,
    });
  });

  app.get('/', async (request, reply) => {
    const admin = await requireAdminUser(request, reply);
    if (!admin) return;

    const orders = await prisma.order.findMany({
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return ok(reply, orders.map(mapOrder));
  });

  app.get('/:id', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const user = await getAuthenticatedUser(request);
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: orderInclude,
    });

    if (!order) {
      return fail(reply, 404, {
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found',
      });
    }

    if (order.userId && order.userId !== user?.id && user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
      return fail(reply, 403, {
        code: 'ORDER_FORBIDDEN',
        message: 'You cannot access this order',
      });
    }

    return ok(reply, mapOrder(order));
  });

  app.put('/:id/status', async (request, reply) => {
    const admin = await requireAdminUser(request, reply);
    if (!admin) return;

    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
        note: z.string().trim().optional(),
      })
      .parse(request.body);
    const order = await prisma.order.update({
      where: { id: params.id },
      data: {
        status: body.status,
        ...(body.note !== undefined ? { notes: body.note } : {}),
      },
      include: orderInclude,
    });

    return ok(reply, mapOrder(order));
  });
};
