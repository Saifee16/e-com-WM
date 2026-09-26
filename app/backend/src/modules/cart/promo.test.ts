import { expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cartFindFirst: vi.fn(),
  cartUpdate: vi.fn(),
  cartItemFindMany: vi.fn(),
  promoFindFirst: vi.fn(),
  orderCount: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}));

vi.mock('../../db/prisma.js', () => ({
  prisma: {
    cart: { findFirst: mocks.cartFindFirst, update: mocks.cartUpdate },
    cartItem: { findMany: mocks.cartItemFindMany },
    promoCode: { findFirst: mocks.promoFindFirst },
    order: { count: mocks.orderCount },
  },
}));
vi.mock('../auth/session.js', () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
  getGuestId: vi.fn(),
  authenticateCustomer: vi.fn(),
  getSignedGuestId: vi.fn(),
  GUEST_CART_COOKIE: 'guestCart',
}));

import { cartRoutes } from './routes.js';

it('rejects an active FREE_SHIPPING code without attaching it to the cart', async () => {
  let promoRoute: ((request: Record<string, unknown>, reply: Record<string, unknown>) => Promise<unknown>) | undefined;
  await cartRoutes({
    get: vi.fn(),
    post: vi.fn((path, handler) => {
      if (path === '/promo') promoRoute = handler;
    }),
    put: vi.fn(),
    delete: vi.fn(),
  } as never, {});

  mocks.getAuthenticatedUser.mockResolvedValue({ id: 'customer-id' });
  mocks.cartFindFirst.mockResolvedValue({ id: 'cart-id' });
  mocks.cartItemFindMany.mockResolvedValue([]);
  mocks.orderCount.mockResolvedValue(0);
  mocks.promoFindFirst.mockResolvedValue({
    id: 'promo-id',
    code: 'OLD-FREE',
    type: 'FREE_SHIPPING',
    isActive: true,
    startsAt: null,
    expiresAt: null,
    usageLimit: null,
    usageCount: 0,
    perUserLimit: null,
    minOrderAmount: 0,
    valueAmount: null,
    valuePercent: null,
    maxDiscountAmount: null,
  });

  const reply: Record<string, unknown> = {};
  reply.status = vi.fn(() => reply);
  reply.send = vi.fn((payload) => payload);

  const result = await promoRoute!({ body: { code: 'OLD-FREE' }, cookies: {} }, reply);

  expect(reply.status).toHaveBeenCalledWith(404);
  expect(result).toMatchObject({ error: { code: 'PROMO_NOT_FOUND' } });
  expect(mocks.cartUpdate).not.toHaveBeenCalled();
});