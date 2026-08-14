import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OrderEmailDetails } from './mailer.js';

const importMailer = async (overrides: Record<string, unknown> = {}) => {
  vi.resetModules();
  vi.doMock('../../config/env.js', () => ({
    env: {
      EMAIL_FROM: 'Wahab Mobiles <noreply@wahabmobiles.com>',
      FRONTEND_URL: 'https://wahabmobiles.com',
      RESEND_API_KEY: 'unit-test-api-key',
      SUPPORT_EMAIL: 'support@wahabmobiles.com',
      ...overrides,
    },
  }));

  return import('./mailer.js');
};

const order: OrderEmailDetails = {
  id: '6d11432f-0db4-4b64-a54a-971af63b4a17',
  orderNumber: 'WAH-20260814-AB12CD34',
  customer: {
    name: '<script>alert("name")</script>',
    email: 'customer@example.com',
    phone: '+923001234567',
  },
  items: [
    {
      name: '<strong>Phone</strong>',
      variant: '256GB Blue',
      sku: 'SKU-256-BLUE',
      quantity: 2,
      unitPrice: 50_000,
      lineTotal: 100_000,
    },
  ],
  subtotal: 100_000,
  discount: 5_000,
  shipping: 500,
  tax: 2_000,
  total: 97_500,
  shippingMethod: 'standard',
  shippingAddress: '123 Test Street, Lahore, Punjab, 54000, Pakistan',
  trackingNumber: 'TRACK-123',
  cancellationReason: 'Requested by customer',
};

describe('order mailer', () => {
  afterEach(() => {
    vi.doUnmock('../../config/env.js');
    vi.unstubAllGlobals();
  });

  it('sends customer and store order-placed messages through Resend with distinct idempotency keys', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    const { sendOrderPlacedEmails } = await importMailer();
    await sendOrderPlacedEmails(order);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const messages = fetchMock.mock.calls.map((call) => ({
      options: call[1] as RequestInit,
      payload: JSON.parse(String((call[1] as RequestInit).body)),
    }));
    const customer = messages.find((message) => message.payload.subject.startsWith('Order received:'))!;
    const store = messages.find((message) => message.payload.subject.startsWith('New order:'))!;

    expect(customer.options.headers).toMatchObject({
      Authorization: 'Bearer unit-test-api-key',
      'Idempotency-Key': `order-${order.id}-placed-customer`,
    });
    expect(customer.payload).toMatchObject({
      to: [order.customer.email],
      subject: `Order received: ${order.orderNumber}`,
    });
    expect(customer.payload.html).toContain('&lt;strong&gt;Phone&lt;/strong&gt;');
    expect(customer.payload.html).not.toContain('<script>');

    expect(store.options.headers).toMatchObject({
      'Idempotency-Key': `order-${order.id}-placed-store`,
    });
    expect(store.payload).toMatchObject({
      to: ['support@wahabmobiles.com'],
      reply_to: order.customer.email,
      subject: `New order: ${order.orderNumber}`,
    });
    expect(store.payload.html).toContain('&lt;script&gt;');
    expect(store.payload.html).not.toContain('<script>');
    expect(store.payload.text).toContain('Admin Portal: https://wahabmobiles.com/admin/orders');
  });

  it('sends a status update only with genuinely available tracking and cancellation details', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const { sendOrderStatusEmail } = await importMailer();

    await sendOrderStatusEmail(order, 'SHIPPED');
    await sendOrderStatusEmail(order, 'CANCELLED');

    const shipped = JSON.parse(String((fetchMock.mock.calls[0]![1] as RequestInit).body));
    const cancelled = JSON.parse(String((fetchMock.mock.calls[1]![1] as RequestInit).body));
    expect(shipped.text).toContain('Tracking number: TRACK-123');
    expect(shipped.text).not.toContain('Cancellation reason:');
    expect(cancelled.text).toContain('Cancellation reason: Requested by customer');
    expect(cancelled.text).not.toContain('Tracking number:');
    expect((fetchMock.mock.calls[0]![1] as RequestInit).headers).toMatchObject({
      'Idempotency-Key': `order-${order.id}-status-shipped`,
    });
  });

  it('returns a safe error without calling Resend when mail settings are incomplete', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { sendOrderPlacedEmails } = await importMailer({ SUPPORT_EMAIL: undefined });

    await expect(sendOrderPlacedEmails(order)).rejects.toThrow('Order notification email is not configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not expose order or provider details in Resend failure errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422 }));
    const { sendOrderStatusEmail } = await importMailer();

    const promise = sendOrderStatusEmail(order, 'CONFIRMED');
    await expect(promise).rejects.toThrow('Resend order notification failed with status 422');
    await expect(promise).rejects.not.toThrow('unit-test-api-key');
    await expect(promise).rejects.not.toThrow(order.orderNumber);
  });
});
