import { afterEach, describe, expect, it, vi } from 'vitest';

const importMailer = async (overrides: Record<string, unknown>) => {
  vi.resetModules();
  vi.doMock('../../config/env.js', () => ({
    env: {
      NODE_ENV: 'production',
      EMAIL_FROM: 'onboarding@resend.dev',
      PASSWORD_RESET_TOKEN_TTL_MINUTES: 30,
      RESEND_API_KEY: 'unit-test-api-key',
      ...overrides,
    },
  }));

  return import('./mailer.js');
};

describe('sendPasswordResetEmail', () => {
  afterEach(() => {
    vi.doUnmock('../../config/env.js');
    vi.unstubAllGlobals();
  });

  it('sends password-reset mail through Resend HTTPS API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    const { sendPasswordResetEmail } = await importMailer({});
    await sendPasswordResetEmail(
      'delivered@resend.dev',
      'https://e-com-wm.vercel.app/reset-password?token=fake-test-token',
      vi.fn(),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(options.method).toBe('POST');
    expect(options.headers).toMatchObject({
      Authorization: 'Bearer unit-test-api-key',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(String(options.body))).toMatchObject({
      from: 'onboarding@resend.dev',
      to: ['delivered@resend.dev'],
      subject: 'Reset your password',
    });
  });

  it('fails safely in production when Resend is not configured', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { sendPasswordResetEmail } = await importMailer({ RESEND_API_KEY: undefined });
    await expect(sendPasswordResetEmail(
      'delivered@resend.dev',
      'https://e-com-wm.vercel.app/reset-password?token=fake-test-token',
      vi.fn(),
    )).rejects.toThrow('Resend API key is not configured');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not include reset URL details in Resend failure errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422 }));

    const { sendPasswordResetEmail } = await importMailer({});
    await expect(sendPasswordResetEmail(
      'delivered@resend.dev',
      'https://e-com-wm.vercel.app/reset-password?token=fake-test-token',
      vi.fn(),
    )).rejects.toThrow('Resend email send failed with status 422');
  });
});
