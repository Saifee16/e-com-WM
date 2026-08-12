import { afterEach, describe, expect, it, vi } from 'vitest';

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

const notification = {
  id: '6d11432f-0db4-4b64-a54a-971af63b4a17',
  name: '<script>alert("name")</script>',
  email: 'customer@example.com',
  subject: '<strong>Phone enquiry</strong>',
  message: 'Line one\n<img src=x onerror=alert(1)>',
  createdAt: new Date('2026-08-13T01:00:00.000Z'),
};

describe('sendContactMessageNotification', () => {
  afterEach(() => {
    vi.doUnmock('../../config/env.js');
    vi.unstubAllGlobals();
  });

  it('uses the operational sender, support recipient, and customer reply-to', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    const { sendContactMessageNotification } = await importMailer();
    await sendContactMessageNotification(notification);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(options.headers).toMatchObject({
      Authorization: 'Bearer unit-test-api-key',
      'Idempotency-Key': `contact-message-${notification.id}`,
    });
    const payload = JSON.parse(String(options.body));
    expect(payload).toMatchObject({
      from: 'Wahab Mobiles <noreply@wahabmobiles.com>',
      to: ['support@wahabmobiles.com'],
      reply_to: 'customer@example.com',
      subject: 'New Wahab Mobiles contact message',
    });
    expect(payload.html).toContain('&lt;script&gt;');
    expect(payload.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(payload.html).not.toContain('<script>');
    expect(payload.html).not.toContain('<img src=x');
    expect(payload.text).toContain(notification.id);
    expect(payload.text).toContain('https://wahabmobiles.com/admin/contact');
  });

  it('fails with a safe error when Resend rejects the request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422 }));

    const { sendContactMessageNotification } = await importMailer();
    const promise = sendContactMessageNotification(notification);

    await expect(promise).rejects.toThrow('Resend contact notification failed with status 422');
    await expect(promise).rejects.not.toThrow('unit-test-api-key');
    await expect(promise).rejects.not.toThrow(notification.message);
  });

  it('does not call the provider when notification settings are incomplete', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { sendContactMessageNotification } = await importMailer({ SUPPORT_EMAIL: undefined });
    await expect(sendContactMessageNotification(notification)).rejects.toThrow(
      'Contact notification email is not configured',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
