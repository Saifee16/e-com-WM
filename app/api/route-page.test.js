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
    expect(result.body).toContain('<title>Phones Price in Pakistan | Wahab Mobiles</title>');
    expect(result.body).toContain('content="Browse the live Wahab Mobiles phone catalogue with iPhone, Android, brand, price and PTA filters."');
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

  it('renders eligible brand landing metadata without a filter query', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input) => {
      if (String(input).endsWith('/index.html')) return { ok: true, text: async () => shell };
      return {
        ok: true,
        json: async () => ({
          data: {
            items: [
              { brand: 'Samsung', brandSlug: 'samsung' },
              { brand: 'Samsung', brandSlug: 'samsung' },
            ],
            pagination: { total: 2 },
          },
        }),
      };
    }));

    const result = await invoke({
      url: 'https://wahabmobiles.com/phones/samsung',
      query: { route: 'category', root: 'phones', slug: 'samsung', categorySlug: 'samsung' },
    });

    expect(result.statusCode).toBe(200);
    expect(result.body).toContain('<title>Samsung Mobiles Price in Pakistan | Wahab Mobiles</title>');
    expect(result.body).toContain('rel="canonical" href="https://wahabmobiles.com/phones/samsung"');
    expect(result.body).not.toContain('name="robots" content="noindex,follow"');
  });

  it('renders Hyderabad as indexable with self-canonical LocalBusiness data', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => shell })));

    const result = await invoke({
      url: 'https://wahabmobiles.com/hyderabad',
      query: { route: 'static', slug: 'hyderabad' },
    });

    expect(result.statusCode).toBe(200);
    expect(result.body).toContain('<title>Wahab Mobiles Hyderabad | Mobile Phones &amp; Accessories</title>');
    expect(result.body).toContain('name="robots" content="index,follow"');
    expect(result.body).toContain('rel="canonical" href="https://wahabmobiles.com/hyderabad"');
    expect(result.body).toContain('"@type":"MobilePhoneStore"');
    expect(result.body).toContain('"telephone":"+92 312 2995584"');
    expect(result.body).toContain('"hasMap":"https://maps.app.goo.gl/sDRAiyBxtHMhD9Mb6"');
    expect(result.body).not.toContain('AggregateRating');
    expect(result.body).not.toContain('0348 3034922');
  });

  it('renders only the canonical Google Pixel landing and filters by the live Google brand slug', async () => {
    const fetchMock = vi.fn(async (input) => {
      if (String(input).endsWith('/index.html')) return { ok: true, text: async () => shell };
      return {
        ok: true,
        json: async () => ({
          data: {
            items: [{ brand: 'Google', brandSlug: 'google' }],
            pagination: { total: 1 },
          },
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await invoke({
      url: 'https://wahabmobiles.com/phones/google-pixel',
      query: { route: 'category', root: 'phones', slug: 'google-pixel', categorySlug: 'google-pixel' },
    });

    expect(result.statusCode).toBe(200);
    expect(result.body).toContain('<title>Google Pixel Phones Price in Pakistan | Wahab Mobiles</title>');
    expect(result.body).toContain('rel="canonical" href="https://wahabmobiles.com/phones/google-pixel"');
    expect(result.body).not.toContain('name="robots" content="noindex,follow"');
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('brand=google'))).toBe(true);
  });

  it('keeps tablets routeable but noindexable when the inventory is empty', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input) => {
      if (String(input).endsWith('/index.html')) return { ok: true, text: async () => shell };
      return {
        ok: true,
        json: async () => ({
          data: [{ slug: 'tablets', name: 'Tablets', isActive: true, children: [] }],
        }),
      };
    }));

    const result = await invoke({
      url: 'https://wahabmobiles.com/tablets',
      query: { route: 'category', root: 'tablets', slug: 'tablets' },
    });

    expect(result.statusCode).toBe(200);
    expect(result.body).toContain('name="robots" content="noindex,follow"');
    expect(result.body).toContain('rel="canonical" href="https://wahabmobiles.com/tablets"');
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
  it('keeps every sitemap-eligible landing indexable and every listed static page coherent', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input) => {
      if (String(input).endsWith('/index.html')) return { ok: true, text: async () => shell };
      if (String(input).endsWith('/categories')) {
        return {
          ok: true,
          json: async () => ({
            data: [{
              slug: 'phones',
              name: 'Phones',
              isActive: true,
              children: [
                { slug: 'iphone', name: 'iPhone', isActive: true },
                { slug: 'android', name: 'Android Phones', isActive: true },
              ],
            }],
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          data: {
            items: [
              { brandSlug: 'samsung' },
              { brandSlug: 'xiaomi-mi' },
              { brandSlug: 'realme' },
              { brandSlug: 'honor' },
              { brandSlug: 'tecno' },
            ],
            pagination: { total: 5 },
          },
        }),
      };
    }));

    for (const slug of ['iphone', 'android', 'samsung', 'xiaomi', 'realme', 'honor', 'tecno', 'google-pixel', 'under-30000', 'under-50000', 'under-100000']) {
      const result = await invoke({
        url: `https://wahabmobiles.com/phones/${slug}`,
        query: { route: 'category', root: 'phones', slug, categorySlug: slug },
      });
      expect(result.statusCode).toBe(200);
      expect(result.body).not.toContain('name="robots" content="noindex,follow"');
      expect(result.body).toContain(`rel="canonical" href="https://wahabmobiles.com/phones/${slug}"`);
    }

    for (const slug of ['about', 'services', 'support', 'returns', 'privacy', 'terms', 'data-deletion', 'hyderabad']) {
      const result = await invoke({
        url: `https://wahabmobiles.com/${slug}`,
        query: { route: 'static', slug },
      });
      expect(result.statusCode).toBe(200);
      expect(result.body).toContain('name="robots" content="index,follow"');
      expect(result.body).toContain(`rel="canonical" href="https://wahabmobiles.com/${slug}"`);
    }
  });

  it('keeps an ineligible price landing noindex and out of the index contract', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input) => {
      if (String(input).endsWith('/index.html')) return { ok: true, text: async () => shell };
      return {
        ok: true,
        json: async () => ({
          data: {
            items: [{ brandSlug: 'samsung' }, { brandSlug: 'xiaomi-mi' }, { brandSlug: 'realme' }, { brandSlug: 'honor' }],
            pagination: { total: 4 },
          },
        }),
      };
    }));

    const result = await invoke({
      url: 'https://wahabmobiles.com/phones/under-30000',
      query: { route: 'category', root: 'phones', slug: 'under-30000', categorySlug: 'under-30000' },
    });

    expect(result.body).toContain('name="robots" content="noindex,follow"');
  });
});

describe('Vercel route policy', () => {
  it('keeps product rendering, adds raw catalogue routes, and redirects the legacy smartphones path', () => {
    const config = JSON.parse(readFileSync('vercel.json', 'utf8'));

    expect(config.redirects).toContainEqual({ source: '/smartphones', destination: '/phones', permanent: true });
    expect(config.rewrites).toContainEqual({ source: '/products/:slug', destination: '/api/product-page?slug=:slug' });
    expect(config.rewrites).toContainEqual({ source: '/search', destination: '/api/route-page?route=search' });
    expect(config.rewrites).toContainEqual({ source: '/phones', destination: '/api/route-page?route=category&root=phones&slug=phones' });
    expect(config.rewrites).toContainEqual({ source: '/tablets', destination: '/api/route-page?route=category&root=tablets&slug=tablets' });
    for (const slug of ['about', 'services', 'support', 'returns', 'privacy', 'terms', 'data-deletion', 'hyderabad']) {
      expect(config.rewrites).toContainEqual({ source: `/${slug}`, destination: `/api/route-page?route=static&slug=${slug}` });
    }
  });
});
