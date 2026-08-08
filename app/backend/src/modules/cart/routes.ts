import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { prisma } from '../../db/prisma.js';
import { fail, ok } from '../../utils/responses.js';
import { authenticateCustomer, GUEST_CART_COOKIE, getAuthenticatedUser, getGuestId, getSignedGuestId } from '../auth/session.js';
import { mapProduct, productInclude } from '../products/routes.js';

const cartItemInclude = {
  variant: {
    include: {
      product: {
        include: productInclude,
      },
    },
  },
} satisfies Prisma.CartItemInclude;

type CartItemWithRelations = Prisma.CartItemGetPayload<{ include: typeof cartItemInclude }>;
type CartPromo = {
  code: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  valueAmount: number | null;
  valuePercent: number | null;
  maxDiscountAmount: number | null;
};

const calculateTotals = (items: CartItemWithRelations[], promo?: CartPromo | null) => {
  const subtotal = items.reduce((total, item) => total + item.variant.priceAmount * item.quantity, 0);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const freeShipping = promo?.type === 'FREE_SHIPPING';
  const shipping = freeShipping || subtotal >= 100_000 || subtotal === 0 ? 0 : 500;
  const tax = Math.round(subtotal * 0.02);
  const discount = promo?.type === 'PERCENTAGE'
    ? Math.min(
        Math.round((subtotal * (promo.valuePercent ?? 0)) / 100),
        promo.maxDiscountAmount ?? subtotal,
      )
    : promo?.type === 'FIXED_AMOUNT'
      ? Math.min(promo.valueAmount ?? 0, subtotal)
      : 0;

  return {
    subtotal,
    itemCount,
    shipping,
    tax,
    discount,
    freeShipping,
    promoCode: promo?.code,
    total: subtotal + shipping + tax - discount,
  };
};

const mapCart = (items: CartItemWithRelations[], promo?: CartPromo | null) => ({
  items: items.map((item) => {
    const product = mapProduct(item.variant.product);
    return {
      product: product._id,
      variantId: item.variantId,
      name: product.name,
      image: product.images[0],
      price: item.variant.priceAmount,
      quantity: item.quantity,
      brand: product.brand,
      specs: [item.variant.storage, item.variant.color].filter(Boolean).join(' / '),
      ptaApproved: product.ptaApproved,
    };
  }),
  totals: calculateTotals(items, promo),
});

const setGuestCartCookie = (reply: FastifyReply, guestId: string) => {
  reply.setCookie(GUEST_CART_COOKIE, guestId, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: '/',
    signed: true,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  });
};

const resolveCartOwner = async (request: FastifyRequest, reply?: FastifyReply, createGuest = false) => {
  const user = await getAuthenticatedUser(request);
  let guestId = getGuestId(request);

  if (!user && !guestId && createGuest) {
    guestId = randomUUID();
  }

  if (!user && guestId && reply) {
    setGuestCartCookie(reply, guestId);
  }

  return { user, guestId };
};

const getOrCreateCart = async (owner: Awaited<ReturnType<typeof resolveCartOwner>>) => {
  if (!owner.user && !owner.guestId) {
    return null;
  }

  const where = owner.user ? { userId: owner.user.id } : { guestId: owner.guestId };
  const existing = await prisma.cart.findFirst({
    where,
    orderBy: { updatedAt: 'desc' },
  });

  if (existing) {
    return existing;
  }

  return prisma.cart.create({
    data: owner.user ? { userId: owner.user.id } : { guestId: owner.guestId },
  });
};

const loadCartItems = async (cartId: string) => {
  return prisma.cartItem.findMany({
    where: { cartId },
    include: cartItemInclude,
    orderBy: { createdAt: 'asc' },
  });
};

const loadCartResponse = async (cartId: string) => {
  const [items, cart] = await Promise.all([
    loadCartItems(cartId),
    prisma.cart.findUnique({ where: { id: cartId }, select: { promoCode: true } }),
  ]);
  return mapCart(items, cart?.promoCode);
};

const findPrimaryVariant = async (productId: string) => {
  return prisma.productVariant.findFirst({
    where: {
      productId,
      isActive: true,
      product: { status: 'ACTIVE' },
    },
    orderBy: { createdAt: 'asc' },
  });
};

const availableStock = (variant: { stockQuantity: number; reservedQuantity: number }) =>
  Math.max(0, variant.stockQuantity - variant.reservedQuantity);

const stockError = (reply: Parameters<typeof fail>[0]) =>
  fail(reply, 409, {
    code: 'INSUFFICIENT_STOCK',
    message: 'Requested quantity exceeds available stock',
  });

export const cartRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request, reply) => {
    const owner = await resolveCartOwner(request, reply, true);
    const cart = await getOrCreateCart(owner);

    if (!cart) {
      return ok(reply, mapCart([]));
    }

    return ok(reply, await loadCartResponse(cart.id));
  });

  app.post('/add', async (request, reply) => {
    const body = z
      .object({
        productId: z.string().uuid(),
        quantity: z.coerce.number().int().positive().max(99).default(1),
      })
      .parse(request.body);
    const owner = await resolveCartOwner(request, reply, true);
    const cart = await getOrCreateCart(owner);

    if (!cart) {
      return fail(reply, 400, {
        code: 'CART_OWNER_REQUIRED',
        message: 'A signed-in user or guest cart ID is required',
      });
    }

    const variant = await findPrimaryVariant(body.productId);
    if (!variant) {
      return fail(reply, 404, {
        code: 'PRODUCT_NOT_AVAILABLE',
        message: 'Product is not available',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM product_variants WHERE id = ${variant.id}::uuid FOR UPDATE`;
      const lockedVariant = await tx.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
      const existing = await tx.cartItem.findUnique({
        where: {
          cartId_variantId: {
            cartId: cart.id,
            variantId: variant.id,
          },
        },
      });
      const nextQuantity = (existing?.quantity ?? 0) + body.quantity;

      if (nextQuantity > availableStock(lockedVariant)) {
        return { ok: false };
      }

      await tx.cartItem.upsert({
        where: {
          cartId_variantId: {
            cartId: cart.id,
            variantId: variant.id,
          },
        },
        update: {
          quantity: nextQuantity,
        },
        create: {
          cartId: cart.id,
          variantId: variant.id,
          quantity: body.quantity,
        },
      });

      return { ok: true };
    });

    if (!result.ok) {
      return stockError(reply);
    }

    return ok(reply, await loadCartResponse(cart.id));
  });

  app.put('/update/:productId', async (request, reply) => {
    const params = z.object({ productId: z.string().uuid() }).parse(request.params);
    const body = z.object({ quantity: z.coerce.number().int().min(0).max(99) }).parse(request.body);
    const owner = await resolveCartOwner(request, reply, true);
    const cart = await getOrCreateCart(owner);

    if (!cart) {
      return ok(reply, mapCart([]));
    }

    const item = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        variant: { productId: params.productId },
      },
    });

    if (item) {
      const result = await prisma.$transaction(async (tx) => {
        if (body.quantity <= 0) {
          await tx.cartItem.delete({ where: { id: item.id } });
          return { ok: true };
        }

        await tx.$queryRaw`SELECT id FROM product_variants WHERE id = ${item.variantId}::uuid FOR UPDATE`;
        const variant = await tx.productVariant.findUniqueOrThrow({ where: { id: item.variantId } });

        if (body.quantity > availableStock(variant)) {
          return { ok: false };
        }

        await tx.cartItem.update({
          where: { id: item.id },
          data: { quantity: body.quantity },
        });

        return { ok: true };
      });

      if (!result.ok) {
        return stockError(reply);
      }
    }

    return ok(reply, await loadCartResponse(cart.id));
  });

  app.delete('/remove/:productId', async (request, reply) => {
    const params = z.object({ productId: z.string().uuid() }).parse(request.params);
    const owner = await resolveCartOwner(request, reply, true);
    const cart = await getOrCreateCart(owner);

    if (!cart) {
      return ok(reply, mapCart([]));
    }

    await prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        variant: { productId: params.productId },
      },
    });

    return ok(reply, await loadCartResponse(cart.id));
  });

  app.delete('/clear', async (request, reply) => {
    const owner = await resolveCartOwner(request, reply, true);
    const cart = await getOrCreateCart(owner);

    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }

    return ok(reply, mapCart([]));
  });

  app.post('/promo', async (request, reply) => {
    const body = z.object({ code: z.string().trim().min(1).transform((value) => value.toUpperCase()) }).parse(request.body);
    const owner = await resolveCartOwner(request, reply, true);
    const cart = await getOrCreateCart(owner);
    const promo = await prisma.promoCode.findFirst({
      where: { code: body.code, isActive: true },
    });

    if (!cart || !promo) {
      return fail(reply, 404, {
        code: 'PROMO_NOT_FOUND',
        message: 'Invalid promo code',
      });
    }

    const totals = calculateTotals(await loadCartItems(cart.id));
    const now = new Date();
    const userUsage = owner.user && promo.perUserLimit
      ? await prisma.order.count({
          where: {
            userId: owner.user.id,
            promoCodeId: promo.id,
            status: { notIn: ['CANCELLED', 'REFUNDED'] },
          },
        })
      : 0;
    if (
      (promo.startsAt && promo.startsAt > now)
      || (promo.expiresAt && promo.expiresAt <= now)
      || (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit)
      || (promo.perUserLimit !== null && owner.user !== null && userUsage >= promo.perUserLimit)
      || totals.subtotal < promo.minOrderAmount
    ) {
      return fail(reply, 409, {
        code: 'PROMO_NOT_ELIGIBLE',
        message: 'This promo code is not eligible for the current cart',
      });
    }
    const discount =
      promo.type === 'PERCENTAGE'
        ? Math.min(Math.round((totals.subtotal * (promo.valuePercent ?? 0)) / 100), promo.maxDiscountAmount ?? totals.subtotal)
        : promo.type === 'FIXED_AMOUNT'
          ? Math.min(promo.valueAmount ?? 0, totals.subtotal)
          : 0;

    await prisma.cart.update({
      where: { id: cart.id },
      data: { promoCodeId: promo.id },
    });

    return ok(reply, {
      discount,
      discountRate: promo.valuePercent ?? 0,
      freeShipping: promo.type === 'FREE_SHIPPING',
    });
  });

  app.post('/merge', { preHandler: authenticateCustomer }, async (request, reply) => {
    z.object({}).strict().parse(request.body);
    const guestId = getSignedGuestId(request);

    if (!guestId) {
      return ok(reply, { merged: false });
    }

    const guestCart = await prisma.cart.findFirst({ where: { guestId } });
    if (!guestCart) {
      return ok(reply, { merged: false });
    }

    const userCart = await getOrCreateCart({ user: request.authUser!, guestId: null });
    if (!userCart) {
      return fail(reply, 400, {
        code: 'CART_MERGE_FAILED',
        message: 'Unable to create customer cart',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const guestItems = await tx.cartItem.findMany({ where: { cartId: guestCart.id } });

      for (const item of guestItems) {
        await tx.$queryRaw`SELECT id FROM product_variants WHERE id = ${item.variantId}::uuid FOR UPDATE`;
        const variant = await tx.productVariant.findUniqueOrThrow({ where: { id: item.variantId } });
        const existing = await tx.cartItem.findUnique({
          where: {
            cartId_variantId: {
              cartId: userCart.id,
              variantId: item.variantId,
            },
          },
        });
        const nextQuantity = Math.min((existing?.quantity ?? 0) + item.quantity, availableStock(variant));

        if (nextQuantity <= 0) {
          continue;
        }

        await tx.cartItem.upsert({
          where: {
            cartId_variantId: {
              cartId: userCart.id,
              variantId: item.variantId,
            },
          },
          update: { quantity: nextQuantity },
          create: {
            cartId: userCart.id,
            variantId: item.variantId,
            quantity: nextQuantity,
          },
        });
      }

      await tx.cart.delete({ where: { id: guestCart.id } });
      return true;
    });

    return ok(reply, { merged: result });
  });
};
