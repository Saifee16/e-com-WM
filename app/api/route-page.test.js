import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import handler from './route-page.js';

const shell = '<!doctype html><html><head><meta name="description" content="Home" /><link rel="canonical" href="https://wahabmobiles.com/" /><meta property="og:title" content="Home" /><title>Wahab Mobiles - Home</title></head><body><div id="root"></div></body></html>';

const invoke = async (request) => {
  let statusCode;
  let body;
  const response = {
    setHeader: vi.fn(),
    status: vi.fn((code) => {
      statusCode = code;
      return response;
    }),
    send: vi.fn((payload) => {
      body = payload;
      return response;
    }),
  };

  await handler(request, response);
  return { statusCode, body, response };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('raw route metadata', () => {
  it('renders category-specific title, description, canonical, and OG metadata', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input) => {
      if (String(input).endsWith('/index.html')) return { ok: true, text: async () => shell };
      return {
        ok: true,
        json: async () => ({
          data: [{
            slug: 'phones',
            name: 'Phones',
            description: 'Shop current phones from the live catalogue.',
            isActive: true,
            children: [],
          }],
        }),
      };
    }));

    const result = await invoke({
      url: 'https://wahabmobiles.com/phones',
      query: { route: 'category', root: 'phones', slug: 'phones' },
    });

    expect(result.statusCode).toBe(200);
    expect(result.body).toContain('<title>Phones | Wahab Mobiles</title>');
    expect(result.body).toContain('content="Shop current phones from the live catalogue."');
    expect(result.body).toContain('rel="canonical" href="https://wahabmobiles.com/phones"');
    expect(result.body).toContain('property="og:url" content="https://wahabmobiles.com/phones"');
    expect(result.body).not.toContain('href="https://wahabmobiles.com/"');
    expect(result.body).not.toContain('<title>Wahab Mobiles - Home</title>');
  });

  it('renders search as noindex with a stable safe canonical and no raw query injection', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => shell })));

    const result = await invoke({
      url: 'https://wahabmobiles.com/search?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E',
      query: { route: 'search' },
    });

    expect(result.statusCode).toBe(200);
    expect(result.body).toContain('name="robots" content="noindex,follow"');
    expect(result.body).toContain('rel="canonical" href="https://wahabmobiles.com/search"');
    expect(result.body).toContain('<title>Search products | Wahab Mobiles</title>');
    expect(result.body).not.toContain('alert(1)');
    expect(result.body).not.toContain('<script>');
    expect(result.body).not.toContain('href="https://wahabmobiles.com/"');
  });

  it('keeps filtered category URLs out of the index while preserving the category canonical', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input) => {
      if (String(input).endsWith('/index.html')) return { ok: true, text: async () => shell };
      return { ok: true, json: async () => ({ data: [{ slug: 'phones', name: 'Phones', isActive: true, children: [] }] }) };
    }));

    const result = await invoke({
      url: 'https://wahabmobiles.com/phones?brand=Samsung',
      query: { route: 'category', root: 'phones', slug: 'phones', brand: 'Samsung' },
    });

    expect(result.body).toContain('name="robots" content="noindex,follow"');
    expect(result.body).toContain('rel="canonical" href="https://wahabmobiles.com/phones"');
  });
});

describe('Vercel route policy', () => {
  it('keeps product rendering, adds raw catalogue routes, and redirects the legacy smartphones path', () => {
    const config = JSON.parse(readFileSync('vercel.json', 'utf8'));

    expect(config.redirects).toContainEqual({ source: '/smartphones', destination: '/phones', permanent: true });
    expect(config.rewrites).toContainEqual({ source: '/products/:slug', destination: '/api/product-page?slug=:slug' });
    expect(config.rewrites).toContainEqual({ source: '/search', destination: '/api/route-page?route=search' });
    expect(config.rewrites).toContainEqual({ source: '/phones', destination: '/api/route-page?route=category&root=phones&slug=phones' });
  });
});
