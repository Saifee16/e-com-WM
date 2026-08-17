import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cartFindFirst: vi.fn(),
  orderFindFirst: vi.fn(),
  transaction: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  getGuestId: vi.fn(),
  sendOrderPlacedEmails: vi.fn(),
  sendOrderStatusEmail: vi.fn(),
}));

vi.mock('../../db/prisma.js', () => ({
  prisma: {
    cart: { findFirst: mocks.cartFindFirst },
    order: { findFirst: mocks.orderFindFirst },
    $transaction: mocks.transaction,
  },
}));
vi.mock('../auth/session.js', () => ({
  authenticateAdmin: vi.fn(),
  authenticateCustomer: vi.fn(),
  getAuthenticatedUser: mocks.getAuthenticatedUser,
  getGuestId: mocks.getGuestId,
}));
vi.mock('./mailer.js', () => ({
  sendOrderPlacedEmails: mocks.sendOrderPlacedEmails,
  sendOrderStatusEmail: mocks.sendOrderStatusEmail,
}));

import { adminOrderRoutes, orderRoutes } from './routes.js';

const baseOrder = {
  id: '6d11432f-0db4-4b64-a54a-971af63b4a17',
  orderNumber: 'WAH-20260814-AB12CD34',
  userId: '8a2e3033-afbf-4e74-9f15-64d8ca8f0871',
  guestEmail: null,
  status: 'PENDING',
  paymentStatus: 'UNPAID',
  subtotalAmount: 100_000,
  discountAmount: 0,
  shippingAmount: 500,
  taxAmount: 0,
  totalAmount: 100_500,
  shippingAddressSnapshot: {
    fullName: 'Customer Name',
    email: 'customer@example.com',
    phone: '+923001234567',
    line1: '123 Test Street',
    city: 'Lahore',
    state: 'Punjab',
    postalCode: '54000',
    country: 'Pakistan',
    shippingMethod: 'standard',
  },
  billingAddressSnapshot: {},
  items: [{
    productId: 'a0c87135-332c-4f2d-972d-f94e89450c92',
    variantId: 'ce8c5528-346d-4cbc-9799-568521a51f86',
    productNameSnapshot: 'Phone',
    variantTitleSnapshot: '256GB Blue',
    skuSnapshot: 'SKU-256-BLUE',
    quantity: 1,
    unitPriceAmount: 100_000,
    lineTotalAmount: 100_000,
    imageUrlSnapshot: null,
  }],
  shipments: [{ trackingNumber: null }],
  returnRequests: [],
  notes: null,
  cancelledAt: null,
  cancellationReason: null,
  createdAt: new Date('2026-08-14T01:00:00.000Z'),
};

const checkoutPayload = {
  shippingInfo: {
    firstName: 'Customer',
    lastName: 'Name',
    email: 'Customer@Example.com',
    phone: '+923001234567',
    address: '123 Test Street',
    city: 'Lahore',
    state: 'Punjab',
    zipCode: '54000',
    country: 'Pakistan',
  },
  paymentMethod: 'cod',
  shippingMethod: 'standard',
};

const makeReply = () => {
  const reply: Record<string, unknown> = {};
  reply.status = vi.fn(() => reply);
  reply.send = vi.fn((payload) => payload);
  return reply;
};

const registerOrderRoute = async () => {
  let route: ((request: Record<string, unknown>, reply: Record<string, unknown>) => Promise<unknown>) | undefined;
  const app = {
    post: vi.fn((path, _options, handler) => {
      if (path === '/') route = handler;
    }),
    get: vi.fn(),
  };
  await orderRoutes(app as never, {});
  return route!;
};

const registerCancelRoute = async () => {
  let route: ((request: Record<string, unknown>, reply: Record<string, unknown>) => Promise<unknown>) | undefined;
  const app = {
    post: vi.fn((path, _options, handler) => {
      if (path === '/:id/cancel') route = handler;
    }),
    get: vi.fn(),
  };
  await orderRoutes(app as never, {});
  return route!;
};

const registerStatusRoute = async () => {
  let route: ((request: Record<string, unknown>, reply: Record<string, unknown>) => Promise<unknown>) | undefined;
  const app = {
    addHook: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    put: vi.fn((path, optionsOrHandler, handler) => {
      if (path === '/:id/status') route = handler ?? optionsOrHandler;
    }),
  };
  await adminOrderRoutes(app as never, {});
  return route!;
};

describe('order notification route behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedUser.mockResolvedValue({ id: baseOrder.userId });
    mocks.getGuestId.mockReturnValue(undefined);
    mocks.cartFindFirst.mockResolvedValue({ id: '9bbcc93a-990b-4910-8b58-5d7ec1089172' });
    mocks.orderFindFirst.mockResolvedValue(null);
    mocks.transaction.mockResolvedValue(baseOrder);
    mocks.sendOrderPlacedEmails.mockResolvedValue(undefined);
    mocks.sendOrderStatusEmail.mockResolvedValue(undefined);
  });

  it('notifies only after a committed order transaction', async () => {
    const route = await registerOrderRoute();
    const reply = makeReply();

    const result = await route({
      body: checkoutPayload,
      headers: { 'idempotency-key': '0f7f6b35-b5a2-4d87-9372-ea2df213b524' },
      authUser: { id: baseOrder.userId },
      log: { error: vi.fn() },
    }, reply);

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.sendOrderPlacedEmails).toHaveBeenCalledWith(expect.objectContaining({
      id: baseOrder.id,
      orderNumber: baseOrder.orderNumber,
      customer: expect.objectContaining({ email: 'customer@example.com' }),
    }));
    expect(mocks.transaction.mock.invocationCallOrder[0]!).toBeLessThan(
      mocks.sendOrderPlacedEmails.mock.invocationCallOrder[0]!,
    );
    expect(reply.status).toHaveBeenCalledWith(201);
    expect(result).toMatchObject({ success: true, data: { id: baseOrder.id } });
  });

  it('returns the committed order when order email delivery fails', async () => {
    const route = await registerOrderRoute();
    const logError = vi.fn();
    mocks.sendOrderPlacedEmails.mockRejectedValue(new Error('provider unavailable'));

    const result = await route({
      body: checkoutPayload,
      headers: { 'idempotency-key': '0f7f6b35-b5a2-4d87-9372-ea2df213b524' },
      authUser: { id: baseOrder.userId },
      log: { error: logError },
    }, makeReply());

    expect(result).toMatchObject({ success: true, data: { id: baseOrder.id } });
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: baseOrder.id }),
      'order placed notification email failed',
    );
  });

  it('uses the server-resolved guest principal for checkout idempotency and email delivery', async () => {
    const route = await registerOrderRoute();
    const guestId = 'guest-server-principal';
    const guestOrder = {
      ...baseOrder,
      userId: null,
      guestId,
      guestEmail: 'guest@example.com',
      shippingAddressSnapshot: { ...baseOrder.shippingAddressSnapshot, email: 'guest@example.com' },
    };
    mocks.getAuthenticatedUser.mockResolvedValue(null);
    mocks.getGuestId.mockReturnValue(guestId);
    mocks.transaction.mockResolvedValue(guestOrder);

    await route({
      body: checkoutPayload,
      headers: { 'idempotency-key': '0f7f6b35-b5a2-4d87-9372-ea2df213b524' },
      log: { error: vi.fn() },
    }, makeReply());

    expect(mocks.orderFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ guestId, idempotencyKey: '0f7f6b35-b5a2-4d87-9372-ea2df213b524' }),
    }));
    expect(mocks.sendOrderPlacedEmails).toHaveBeenCalledWith(expect.objectContaining({
      customer: expect.objectContaining({ email: 'guest@example.com' }),
    }));
  });

  it('does not resend an order-placed email for an idempotent replay', async () => {
    const route = await registerOrderRoute();
    mocks.orderFindFirst.mockResolvedValue(baseOrder);

    await route({
      body: checkoutPayload,
      headers: { 'idempotency-key': '0f7f6b35-b5a2-4d87-9372-ea2df213b524' },
      authUser: { id: baseOrder.userId },
      log: { error: vi.fn() },
    }, makeReply());

    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.sendOrderPlacedEmails).not.toHaveBeenCalled();
  });

  it('sends a status email only for a changed status', async () => {
    const route = await registerStatusRoute();
    const shippedOrder = { ...baseOrder, status: 'SHIPPED', shipments: [{ trackingNumber: 'TRACK-123' }] };
    mocks.transaction.mockResolvedValue({ type: 'UPDATED', order: shippedOrder });

    await route({
      params: { id: baseOrder.id },
      body: { status: 'SHIPPED' },
      authUser: { id: baseOrder.userId },
      log: { error: vi.fn() },
    }, makeReply());

    expect(mocks.sendOrderStatusEmail).toHaveBeenCalledWith(
      expect.objectContaining({ id: baseOrder.id, trackingNumber: 'TRACK-123' }),
      'SHIPPED',
    );

    mocks.transaction.mockResolvedValue({ type: 'UNCHANGED', order: shippedOrder });
    await route({
      params: { id: baseOrder.id },
      body: { status: 'SHIPPED' },
      authUser: { id: baseOrder.userId },
      log: { error: vi.fn() },
    }, makeReply());

    expect(mocks.sendOrderStatusEmail).toHaveBeenCalledTimes(1);
  });

  it('sends a cancellation email only after a customer cancellation commits', async () => {
    const route = await registerCancelRoute();
    const cancelledOrder = {
      ...baseOrder,
      status: 'CANCELLED',
      cancellationReason: 'Changed my mind',
    };
    mocks.transaction.mockResolvedValue(cancelledOrder);

    await route({
      params: { id: baseOrder.id },
      body: { reason: 'Changed my mind' },
      authUser: { id: baseOrder.userId },
      log: { error: vi.fn() },
    }, makeReply());

    expect(mocks.transaction.mock.invocationCallOrder[0]!).toBeLessThan(
      mocks.sendOrderStatusEmail.mock.invocationCallOrder[0]!,
    );
    expect(mocks.sendOrderStatusEmail).toHaveBeenCalledWith(
      expect.objectContaining({ id: baseOrder.id, cancellationReason: 'Changed my mind' }),
      'CANCELLED',
    );
  });

  it('returns the committed status update when status email delivery fails', async () => {
    const route = await registerStatusRoute();
    const confirmedOrder = { ...baseOrder, status: 'CONFIRMED' };
    const logError = vi.fn();
    mocks.transaction.mockResolvedValue({ type: 'UPDATED', order: confirmedOrder });
    mocks.sendOrderStatusEmail.mockRejectedValue(new Error('provider unavailable'));

    const result = await route({
      params: { id: baseOrder.id },
      body: { status: 'CONFIRMED' },
      authUser: { id: baseOrder.userId },
      log: { error: logError },
    }, makeReply());

    expect(result).toMatchObject({ success: true, data: { id: baseOrder.id, status: 'confirmed' } });
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: baseOrder.id, status: 'CONFIRMED' }),
      'order status notification email failed',
    );
  });
});
