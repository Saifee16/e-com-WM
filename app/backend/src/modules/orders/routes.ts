import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { env } from '../../config/env.js';
import { fail, ok } from '../../utils/responses.js';
import { authenticateAdmin, authenticateCustomer, getAuthenticatedUser, getGuestId } from '../auth/session.js';
import { sendOrderPlacedEmails, sendOrderStatusEmail, type OrderEmailDetails } from './mailer.js';

const orderInclude = {
  items: true,
  shipments: true,
  returnRequests: { orderBy: { createdAt: 'desc' } },
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

type ShippingAddressSnapshot = {
  fullName?: string;
  phone?: string;
  email?: string;
  line1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  shippingMethod?: string;
};

const getString = (value: unknown) => typeof value === 'string' ? value : '';

const toOrderEmailDetails = (order: OrderWithRelations): OrderEmailDetails => {
  const address = order.shippingAddressSnapshot as ShippingAddressSnapshot;
  const trackingNumber = order.shipments[0]?.trackingNumber;
  const cancellationReason = order.cancellationReason;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customer: {
      name: getString(address.fullName),
      email: getString(address.email) || getString(order.guestEmail),
      phone: getString(address.phone),
    },
    items: order.items.map((item) => ({
      name: item.productNameSnapshot,
      variant: item.variantTitleSnapshot,
      sku: item.skuSnapshot,
      quantity: item.quantity,
      unitPrice: item.unitPriceAmount,
      lineTotal: item.lineTotalAmount,
    })),
    subtotal: order.subtotalAmount,
    discount: order.discountAmount,
    shipping: order.shippingAmount,
    tax: order.taxAmount,
    total: order.totalAmount,
    shippingMethod: getString(address.shippingMethod),
    shippingAddress: [address.line1, address.city, address.state, address.postalCode, address.country]
      .map(getString)
      .filter(Boolean)
      .join(', '),
    ...(trackingNumber ? { trackingNumber } : {}),
    ...(cancellationReason ? { cancellationReason } : {}),
  };
};

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
  cancelledAt: order.cancelledAt?.toISOString(),
  cancellationReason: order.cancellationReason ?? undefined,
  returnRequest: order.returnRequests[0]
    ? {
        id: order.returnRequests[0].id,
        status: order.returnRequests[0].status.toLowerCase(),
        reason: order.returnRequests[0].reason,
        details: order.returnRequests[0].details ?? undefined,
        resolutionNote: order.returnRequests[0].resolutionNote ?? undefined,
        refundConfirmedAt: order.returnRequests[0].refundConfirmedAt?.toISOString(),
        createdAt: order.returnRequests[0].createdAt.toISOString(),
      }
    : undefined,
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
  paymentMethod: z.literal('cod').default('cod'),
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
  app.post('/', { preHandler: authenticateCustomer }, async (request, reply) => {
    const body = checkoutSchema.parse(request.body);
    const idempotencyKey = z.string().uuid().parse(request.headers['idempotency-key']);
    const existingOrder = await prisma.order.findFirst({
      where: { idempotencyKey, userId: request.authUser!.id },
      include: orderInclude,
    });
    if (existingOrder) return ok(reply, mapOrder(existingOrder));
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

    let checkoutError:
      | 'CART_EMPTY'
      | 'INSUFFICIENT_STOCK'
      | 'PRODUCT_NOT_AVAILABLE'
      | 'PROMO_NOT_ELIGIBLE'
      | null = null;
    let isReplay = false;
    const order = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM cart_items WHERE cart_id = ${cart.id}::uuid FOR UPDATE`;
      const replay = await tx.order.findUnique({ where: { idempotencyKey }, include: orderInclude });
      if (replay) {
        if (replay.userId !== request.authUser!.id) throw new Error('IDEMPOTENCY_KEY_CONFLICT');
        isReplay = true;
        return replay;
      }
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
      let shipping = body.shippingMethod === 'standard' && subtotal >= 100_000
        ? 0
        : shippingCosts[body.shippingMethod];
      let discount = 0;
      let appliedPromoId: string | null = null;

      if (lockedCart.promoCodeId) {
        await tx.$queryRaw`SELECT id FROM promo_codes WHERE id = ${lockedCart.promoCodeId}::uuid FOR UPDATE`;
        const promo = await tx.promoCode.findUnique({ where: { id: lockedCart.promoCodeId } });
        const now = new Date();
        const userUsage = promo?.perUserLimit
          ? await tx.order.count({
              where: {
                userId: request.authUser!.id,
                promoCodeId: lockedCart.promoCodeId,
                status: { notIn: ['CANCELLED', 'REFUNDED'] },
              },
            })
          : 0;
        const isEligible = Boolean(
          promo?.isActive
          && (!promo.startsAt || promo.startsAt <= now)
          && (!promo.expiresAt || promo.expiresAt > now)
          && (promo.usageLimit === null || promo.usageCount < promo.usageLimit)
          && (promo.perUserLimit === null || userUsage < promo.perUserLimit)
          && subtotal >= promo.minOrderAmount,
        );
        if (!promo || !isEligible) throw new Error('PROMO_NOT_ELIGIBLE');

        appliedPromoId = promo.id;
        if (promo.type === 'FREE_SHIPPING') {
          shipping = 0;
        } else if (promo.type === 'PERCENTAGE') {
          discount = Math.min(
            Math.round((subtotal * (promo.valuePercent ?? 0)) / 100),
            promo.maxDiscountAmount ?? subtotal,
          );
        } else {
          discount = Math.min(promo.valueAmount ?? 0, subtotal);
        }
      }
      const total = subtotal + tax + shipping - discount;

      const created = await tx.order.create({
        data: {
          orderNumber: makeOrderNumber(),
          ...(user ? { user: { connect: { id: user.id } } } : { guestEmail: body.shippingInfo.email }),
          status: 'PENDING',
          paymentStatus: 'UNPAID',
          subtotalAmount: subtotal,
          discountAmount: discount,
          shippingAmount: shipping,
          taxAmount: tax,
          totalAmount: total,
          idempotencyKey,
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

      if (appliedPromoId) {
        await tx.promoCode.update({
          where: { id: appliedPromoId },
          data: { usageCount: { increment: 1 } },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return created;
    }).catch((error: unknown) => {
      if (
        error instanceof Error &&
        (error.message === 'CART_EMPTY'
          || error.message === 'INSUFFICIENT_STOCK'
          || error.message === 'PRODUCT_NOT_AVAILABLE'
          || error.message === 'PROMO_NOT_ELIGIBLE')
      ) {
        checkoutError = error.message;
        return null;
      }
      throw error;
    });

    if (!order) {
      if (checkoutError === 'PROMO_NOT_ELIGIBLE') {
        await prisma.cart.update({ where: { id: cart.id }, data: { promoCodeId: null } });
        return fail(reply, 409, {
          code: 'PROMO_NOT_ELIGIBLE',
          message: 'The promotion is no longer eligible and was removed. Review the total and try again.',
        });
      }
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

    if (!isReplay) {
      try {
        await sendOrderPlacedEmails(toOrderEmailDetails(order));
      } catch (error) {
        request.log.error({ err: error, orderId: order.id }, 'order placed notification email failed');
      }
    }

    return ok(isReplay ? reply : reply.status(201), mapOrder(order));
  });

  app.get('/my-orders', { preHandler: authenticateCustomer }, async (request, reply) => {
    const orders = await prisma.order.findMany({
      where: { userId: request.authUser!.id },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });

    return ok(reply, orders.map(mapOrder));
  });

  app.get('/dashboard', { preHandler: authenticateCustomer }, async (request, reply) => {
    const userId = request.authUser!.id;
    const [totalOrders, deliveredOrders, wishlistItems, reviews, recentOrders] = await Promise.all([
      prisma.order.count({ where: { userId } }),
      prisma.order.count({ where: { userId, status: 'DELIVERED' } }),
      prisma.wishlist.count({ where: { userId } }),
      prisma.review.count({ where: { userId } }),
      prisma.order.findMany({
        where: { userId },
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);
    return ok(reply, {
      stats: { totalOrders, deliveredOrders, wishlistItems, reviews },
      recentOrders: recentOrders.map(mapOrder),
    });
  });

  app.get('/returns', { preHandler: authenticateCustomer }, async (request, reply) => {
    const requests = await prisma.returnRequest.findMany({
      where: { userId: request.authUser!.id },
      include: { order: true },
      orderBy: { createdAt: 'desc' },
    });
    return ok(reply, requests.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      orderNumber: item.order.orderNumber,
      status: item.status.toLowerCase(),
      reason: item.reason,
      details: item.details ?? undefined,
      resolutionNote: item.resolutionNote ?? undefined,
      refundConfirmedAt: item.refundConfirmedAt?.toISOString(),
      createdAt: item.createdAt.toISOString(),
    })));
  });

  app.post('/guest/:orderNumber/returns', {
    config: {
      rateLimit: {
        max: env.PUBLIC_FORM_RATE_LIMIT_MAX,
        timeWindow: `${env.PUBLIC_FORM_RATE_LIMIT_WINDOW_SECONDS} seconds`,
      },
    },
  }, async (request, reply) => {
    const params = z.object({ orderNumber: z.string().trim().min(1) }).parse(request.params);
    const body = z.object({
      email: z.string().email().transform((value) => value.toLowerCase()),
      reason: z.string().trim().min(3).max(200),
      details: z.string().trim().max(2000).optional(),
    }).parse(request.body);
    const order = await prisma.order.findUnique({ where: { orderNumber: params.orderNumber }, include: orderInclude });
    if (!order || order.userId || order.guestEmail?.toLowerCase() !== body.email) {
      return fail(reply, 404, { code: 'ORDER_NOT_FOUND', message: 'Order not found for that email' });
    }
    const deliveredAt = order.shipments.find((shipment) => shipment.deliveredAt)?.deliveredAt ?? order.updatedAt;
    if (order.status !== 'DELIVERED' || Date.now() - deliveredAt.getTime() > 7 * 24 * 60 * 60 * 1000) {
      return fail(reply, 409, { code: 'RETURN_NOT_ELIGIBLE', message: 'This order is outside the seven-day return window' });
    }
    if (order.returnRequests.length) return fail(reply, 409, { code: 'RETURN_EXISTS', message: 'A return already exists for this order' });
    const result = await prisma.returnRequest.create({
      data: { orderId: order.id, guestEmail: body.email, reason: body.reason, ...(body.details ? { details: body.details } : {}) },
    });
    return ok(reply.status(201), { id: result.id, status: result.status.toLowerCase(), createdAt: result.createdAt.toISOString() });
  });

  app.post('/:id/cancel', { preHandler: authenticateCustomer }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({ reason: z.string().trim().min(3).max(500) }).parse(request.body);
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${params.id}::uuid FOR UPDATE`;
      const order = await tx.order.findUnique({ where: { id: params.id }, include: { items: true } });
      if (!order) return 'NOT_FOUND' as const;
      if (order.userId !== request.authUser!.id) return 'FORBIDDEN' as const;
      if (!['PENDING', 'CONFIRMED'].includes(order.status)) return 'NOT_CANCELLABLE' as const;
      for (const item of order.items) {
        await tx.productVariant.update({ where: { id: item.variantId }, data: { stockQuantity: { increment: item.quantity } } });
      }
      await tx.inventoryMovement.createMany({
        data: order.items.map((item) => ({
          variantId: item.variantId,
          orderId: order.id,
          type: 'RELEASE',
          quantityDelta: item.quantity,
          reason: 'Customer cancellation',
        })),
      });
      await tx.shipment.updateMany({ where: { orderId: order.id }, data: { status: 'CANCELLED' } });
      return tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: 'CUSTOMER', cancellationReason: body.reason },
        include: orderInclude,
      });
    });
    if (result === 'NOT_FOUND') return fail(reply, 404, { code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    if (result === 'FORBIDDEN') return fail(reply, 403, { code: 'ORDER_FORBIDDEN', message: 'You cannot cancel this order' });
    if (result === 'NOT_CANCELLABLE') return fail(reply, 409, { code: 'ORDER_NOT_CANCELLABLE', message: 'Orders cannot be cancelled once processing begins' });
    return ok(reply, mapOrder(result));
  });

  app.post('/:id/returns', { preHandler: authenticateCustomer }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({
      reason: z.string().trim().min(3).max(200),
      details: z.string().trim().max(2000).optional(),
    }).parse(request.body);
    const order = await prisma.order.findUnique({ where: { id: params.id }, include: orderInclude });
    if (!order) return fail(reply, 404, { code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    if (order.userId !== request.authUser!.id) return fail(reply, 403, { code: 'ORDER_FORBIDDEN', message: 'You cannot return this order' });
    const deliveredAt = order.shipments.find((shipment) => shipment.deliveredAt)?.deliveredAt ?? order.updatedAt;
    if (order.status !== 'DELIVERED' || Date.now() - deliveredAt.getTime() > 7 * 24 * 60 * 60 * 1000) {
      return fail(reply, 409, { code: 'RETURN_NOT_ELIGIBLE', message: 'This order is outside the seven-day return window' });
    }
    if (order.returnRequests.length) return fail(reply, 409, { code: 'RETURN_EXISTS', message: 'A return already exists for this order' });
    const result = await prisma.returnRequest.create({
      data: { orderId: order.id, userId: request.authUser!.id, reason: body.reason, ...(body.details ? { details: body.details } : {}) },
    });
    return ok(reply.status(201), { id: result.id, status: result.status.toLowerCase(), createdAt: result.createdAt.toISOString() });
  });

  app.get('/:id', { preHandler: authenticateCustomer }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
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

    if (order.userId !== request.authUser!.id) {
      return fail(reply, 403, {
        code: 'ORDER_FORBIDDEN',
        message: 'You cannot access this order',
      });
    }

    return ok(reply, mapOrder(order));
  });
};

export const adminOrderRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticateAdmin);

  app.get('/stats/overview', async (_request, reply) => {
    const [orders, revenue] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { totalAmount: true } }),
    ]);

    return ok(reply, {
      orders,
      revenue: revenue._sum.totalAmount ?? 0,
    });
  });

  app.get('/', async (_request, reply) => {
    const orders = await prisma.order.findMany({
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return ok(reply, orders.map(mapOrder));
  });

  app.get('/returns', async (_request, reply) => {
    const requests = await prisma.returnRequest.findMany({
      include: {
        order: true,
        user: { select: { firstName: true, lastName: true, email: true } },
        resolvedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return ok(reply, requests.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      orderNumber: item.order.orderNumber,
      customer: item.user ? `${item.user.firstName} ${item.user.lastName}`.trim() : 'Guest customer',
      email: item.user?.email ?? item.guestEmail ?? item.order.guestEmail,
      isGuest: item.userId === null,
      status: item.status,
      reason: item.reason,
      details: item.details ?? undefined,
      resolutionNote: item.resolutionNote ?? undefined,
      refundConfirmedAt: item.refundConfirmedAt?.toISOString(),
      createdAt: item.createdAt.toISOString(),
    })));
  });

  app.patch('/returns/:id', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.discriminatedUnion('status', [
      z.object({ status: z.literal('APPROVED'), resolutionNote: z.string().trim().min(3).max(1000), manualRefundCompleted: z.literal(true) }),
      z.object({ status: z.literal('REJECTED'), resolutionNote: z.string().trim().min(3).max(1000), manualRefundCompleted: z.boolean().optional() }),
    ]).parse(request.body);
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.returnRequest.findUnique({ where: { id: params.id } });
      if (!existing) return null;
      if (existing.status !== 'PENDING') return 'RESOLVED' as const;
      const now = new Date();
      const updated = await tx.returnRequest.update({
        where: { id: existing.id },
        data: {
          status: body.status,
          resolutionNote: body.resolutionNote,
          resolvedByUserId: request.authUser!.id,
          resolvedAt: now,
          refundConfirmedAt: body.status === 'APPROVED' ? now : null,
        },
      });
      if (body.status === 'APPROVED') {
        await tx.order.update({ where: { id: existing.orderId }, data: { status: 'REFUNDED', paymentStatus: 'REFUNDED' } });
      }
      return updated;
    });
    if (!result) return fail(reply, 404, { code: 'RETURN_NOT_FOUND', message: 'Return request not found' });
    if (result === 'RESOLVED') return fail(reply, 409, { code: 'RETURN_ALREADY_RESOLVED', message: 'Return request is already resolved' });
    return ok(reply, {
      id: result.id,
      status: result.status,
      resolutionNote: result.resolutionNote,
      refundConfirmedAt: result.refundConfirmedAt?.toISOString(),
      resolvedAt: result.resolvedAt?.toISOString(),
    });
  });

  app.get('/:id', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
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

    return ok(reply, mapOrder(order));
  });

  app.put('/:id/status', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
        note: z.string().trim().max(1000).optional(),
      })
      .parse(request.body);
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${params.id}::uuid FOR UPDATE`;
      const existing = await tx.order.findUnique({ where: { id: params.id }, include: orderInclude });
      if (!existing) return { type: 'NOT_FOUND' as const };
      if (existing.status === body.status) return { type: 'UNCHANGED' as const, order: existing };

      const allowedTransitions: Record<string, string[]> = {
        PENDING: ['CONFIRMED', 'CANCELLED'],
        CONFIRMED: ['PROCESSING', 'CANCELLED'],
        PROCESSING: ['SHIPPED', 'CANCELLED'],
        SHIPPED: ['DELIVERED'],
        DELIVERED: [],
        CANCELLED: [],
        REFUNDED: [],
      };
      if (!allowedTransitions[existing.status]?.includes(body.status)) {
        return { type: 'INVALID_TRANSITION' as const };
      }

      if (body.status === 'CANCELLED') {
        for (const item of existing.items) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }
        await tx.inventoryMovement.createMany({
          data: existing.items.map((item) => ({
            variantId: item.variantId,
            orderId: existing.id,
            adminUserId: request.authUser!.id,
            type: 'RELEASE',
            quantityDelta: item.quantity,
            reason: 'Administrator cancellation',
          })),
        });
      }

      const updated = await tx.order.update({
        where: { id: params.id },
        data: {
          status: body.status,
          ...(body.status === 'DELIVERED' ? { paymentStatus: 'PAID' } : {}),
          ...(body.status === 'CANCELLED'
            ? {
                cancelledAt: new Date(),
                cancelledBy: `ADMIN:${request.authUser!.id}`,
                cancellationReason: body.note?.trim() || 'Cancelled by administrator',
              }
            : {}),
          ...(body.note !== undefined ? { notes: body.note } : {}),
        },
        include: orderInclude,
      });
      if (body.status === 'SHIPPED') await tx.shipment.updateMany({ where: { orderId: params.id }, data: { status: 'SHIPPED', shippedAt: new Date() } });
      if (body.status === 'DELIVERED') await tx.shipment.updateMany({ where: { orderId: params.id }, data: { status: 'DELIVERED', deliveredAt: new Date() } });
      if (body.status === 'CANCELLED') await tx.shipment.updateMany({ where: { orderId: params.id }, data: { status: 'CANCELLED' } });
      await tx.auditLog.create({
        data: {
          actorUserId: request.authUser!.id,
          action: 'STATUS_CHANGE',
          entityType: 'Order',
          entityId: updated.id,
          before: { status: existing.status },
          after: { status: updated.status, note: body.note ?? null },
        },
      });
      return { type: 'UPDATED' as const, order: updated };
    });

    if (result.type === 'NOT_FOUND') return fail(reply, 404, { code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    if (result.type === 'INVALID_TRANSITION') {
      return fail(reply, 409, {
        code: 'ORDER_STATUS_TRANSITION_INVALID',
        message: 'That order status transition is not allowed',
      });
    }

    const order = result.order;
    if (result.type === 'UPDATED') {
      try {
        await sendOrderStatusEmail(toOrderEmailDetails(order), order.status as 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED');
      } catch (error) {
        request.log.error({ err: error, orderId: order.id, status: order.status }, 'order status notification email failed');
      }
    }

    return ok(reply, mapOrder(order));
  });
};
