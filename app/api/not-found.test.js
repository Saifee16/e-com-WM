import { describe, expect, it, vi } from 'vitest';
import handler from './not-found.js';

const invoke = async () => {
  let statusCode;
  let body;

  const response = {
    setHeader: vi.fn(),
    status: vi.fn((code) => {
      statusCode = code;
      return response;
    }),
    send: vi.fn((value) => {
      body = value;
      return response;
    }),
  };

  await handler({}, response);

  return {
    statusCode,
    body,
    response,
  };
};

describe('not-found handler', () => {
  it('returns a sanitized non-cacheable 404 without a homepage canonical', async () => {
    const result = await invoke();

    expect(result.statusCode).toBe(404);

    expect(result.response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'no-store',
    );

    expect(result.response.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/html; charset=utf-8',
    );

    expect(result.body).toContain('<title>Page Not Found | Wahab Mobiles</title>');
    expect(result.body).toContain('name="robots" content="noindex,follow"');

    expect(result.body).not.toContain('rel="canonical"');
    expect(result.body).not.toContain('https://wahabmobiles.com/');
  });
});