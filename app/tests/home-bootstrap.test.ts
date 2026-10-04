import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const html = readFileSync(process.env.WAHAB_BOOTSTRAP_HTML ?? 'index.html', 'utf8');
const runBootstrap = (pathname = '/', fetch = vi.fn(), base = 'https://api.example.com/api', mode = 'production') => {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const script = document.getElementById('wahab-home-featured-bootstrap');
  expect(script).not.toBeNull();
  script!.setAttribute('data-api-base', base);
  script!.setAttribute('data-mode', mode);
  const window = { location: { pathname }, __WAHAB_HOME_FEATURED_PROMISE__: undefined as Promise<{ ok: boolean; products?: unknown[] }> | undefined };
  runInNewContext(script!.textContent!, { window, document, fetch, AbortController, setTimeout, clearTimeout });
  return { window, document, fetch };
};

describe('initial homepage featured bootstrap', () => {
  it('appears before the Vite entry and contains no hardcoded product or image URL', () => {
    expect(html.indexOf('id="wahab-home-featured-bootstrap"')).toBeGreaterThan(0);
    const mainEntry = html.match(/<script\b[^>]*type="module"[^>]*src="[^"]+"[^>]*>/)?.[0];
    expect(mainEntry).toBeDefined();
    expect(html.indexOf('id="wahab-home-featured-bootstrap"')).toBeLessThan(html.indexOf(mainEntry!));
    const script = new DOMParser().parseFromString(html, 'text/html').getElementById('wahab-home-featured-bootstrap')!.textContent!;
    expect(script).toContain('/products/featured');
    expect(script).toContain('__WAHAB_HOME_FEATURED_PROMISE__');
    expect(script).not.toMatch(/cloudinary|iphone|\.jpe?g|\.webp/i);
    if (process.env.WAHAB_BOOTSTRAP_HTML) {
      const config = new DOMParser().parseFromString(html, 'text/html').getElementById('wahab-home-featured-bootstrap')!;
      expect(config.getAttribute('data-mode')).toBe('production');
      expect(config.getAttribute('data-api-base')).toMatch(/^https?:\/\//);
    }
  });

  it('starts exactly one credentialed simple GET and preloads only the first usable hero image', async () => {
    const products = [{ images: ['', 'https://images.example.com/live-image', 'https://images.example.com/second'] }, { images: ['https://images.example.com/other'] }];
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: products }) });
    const result = runBootstrap('/', fetch);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('https://api.example.com/api/products/featured');
    expect(options.credentials).toBe('include');
    expect(options.headers).toEqual({ Accept: 'application/json' });
    expect(options.body).toBeUndefined();
    expect(await result.window.__WAHAB_HOME_FEATURED_PROMISE__).toEqual({ ok: true, products });
    const preloads = result.document.querySelectorAll('link[rel="preload"][as="image"]');
    expect(preloads).toHaveLength(1);
    expect(preloads[0].getAttribute('href')).toBe(products[0].images[1]);
    expect(preloads[0].getAttribute('fetchpriority')).toBe('high');
  });

  it.each(['/phones', '/products', '/products/example', '/account', '/cart', '/checkout', '/admin', '/hyderabad'])('does not fetch on %s', (pathname) => {
    const result = runBootstrap(pathname);
    expect(result.fetch).not.toHaveBeenCalled();
    expect(result.window.__WAHAB_HOME_FEATURED_PROMISE__).toBeUndefined();
  });

  it.each([{ products: [] }, { products: [{ images: [] }] }, { products: [{ images: ['', ''] }] }])('does not preload an empty catalogue or missing usable image: %j', async ({ products }) => {
    const result = runBootstrap('/', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: products }) }));
    expect((await result.window.__WAHAB_HOME_FEATURED_PROMISE__)?.ok).toBe(true);
    expect(result.document.querySelectorAll('link[rel="preload"][as="image"]')).toHaveLength(0);
  });

  it.each([
    () => Promise.reject(new Error('Network')),
    () => Promise.resolve({ ok: false }),
    () => Promise.resolve({ ok: true, json: async () => { throw new Error('Invalid JSON'); } }),
    () => Promise.resolve({ ok: true, json: async () => ({}) }),
    () => Promise.resolve({ ok: true, json: async () => ({ data: [{}] }) }),
    () => Promise.resolve({ ok: true, json: async () => ({ data: [{ images: [123] }] }) }),
    () => Promise.resolve({ ok: true, json: async () => ({ data: [{ images: ['   '] }] }) }),
    () => { throw new Error('Synchronous failure'); },
  ])('resolves safely on failure %#', async (fetch) => {
    const result = runBootstrap('/', vi.fn(fetch));
    await expect(result.window.__WAHAB_HOME_FEATURED_PROMISE__).resolves.toEqual({ ok: false });
    expect(result.document.querySelectorAll('link[rel="preload"][as="image"]')).toHaveLength(0);
  });

  it('uses the existing localhost fallback only in development when the env value is absent', () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false });
    runBootstrap('/', fetch, '%VITE_API_BASE_URL%', 'development');
    expect(fetch.mock.calls[0][0]).toBe('http://localhost:4000/api/products/featured');
    const production = runBootstrap('/', vi.fn(), '%VITE_API_BASE_URL%');
    expect(production.fetch).not.toHaveBeenCalled();
  });

  it('matches Axios URL joining when the API base ends in a slash', () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false });
    runBootstrap('/', fetch, 'https://api.example.com/api/');
    expect(fetch.mock.calls[0][0]).toBe('https://api.example.com/api/products/featured');
  });

  it('aborts a stalled request after ten seconds and resolves safely', async () => {
    vi.useFakeTimers();
    try {
      const fetch = vi.fn((_url, { signal }) => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('Aborted')));
      }));
      const result = runBootstrap('/', fetch);
      await vi.advanceTimersByTimeAsync(10_000);
      await expect(result.window.__WAHAB_HOME_FEATURED_PROMISE__).resolves.toEqual({ ok: false });
      expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
