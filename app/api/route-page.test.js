import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import handler from './route-page.js';

const ROOT_CONTENT_START = '<!-- wahab-mobiles-content:start -->';
const ROOT_CONTENT_END = '<!-- wahab-mobiles-content:end -->';
const HOME_FALLBACK = '<main><h1>Find the right phone, faster.</h1><p>Shop current phones with clear prices, condition details and PTA status.</p></main>';
const homeSchema = '<script type="application/ld+json" id="wahab-mobiles-seo-jsonld">[{"@type":"Organization"},{"@type":"WebSite"}]</script>';
const shell = `<!doctype html><html><head><meta name="description" content="Home" /><link rel="canonical" href="https://wahabmobiles.com/" /><meta property="og:title" content="Home" /><title>Wahab Mobiles - Home</title>${homeSchema}</head><body><div id="root">${ROOT_CONTENT_START}${HOME_FALLBACK}${ROOT_CONTENT_END}</div></body></html>`;

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
  it('ships visible homepage fallback copy, stable links, and one managed Organization/WebSite schema', () => {
    const index = readFileSync('index.html', 'utf8');
    const contentSlot = index.match(/<!-- wahab-mobiles-content:start -->([\s\S]*?)<!-- wahab-mobiles-content:end -->/);
    const links = [...(contentSlot?.[1] || '').matchAll(/<a\s+[^>]*href="([^"]+)"/g)].map((match) => match[1]);
    const schemaScript = index.match(/<script\s+type="application\/ld\+json"\s+id="wahab-mobiles-seo-jsonld">([\s\S]*?)<\/script>/);

    expect(contentSlot?.[1]).toMatch(/<h1\b[^>]*>Find the right phone, faster\.<\/h1>/);
    expect(contentSlot?.[1]).toContain('Shop current phones with clear prices, condition details and PTA status.');
    expect(links).toEqual(['/phones', '/phones/iphone', '/products', '/hyderabad', '/support']);
    expect(index).not.toMatch(/href="\/products\?brand=/);
    expect(index).not.toMatch(/display\s*:\s*none|aria-hidden="true"|<[^>]+\shidden(?:\s|>)/i);
    expect(schemaScript).not.toBeNull();
    expect(JSON.parse(schemaScript[1]).map(({ '@type': type }) => type)).toEqual(['Organization', 'WebSite']);
  });

  it('replaces the homepage fallback with the products page content and removes inherited homepage schema', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => shell })));

    const result = await invoke({ url: 'https://wahabmobiles.com/products', query: { route: 'products' } });
    const content = result.body.match(/<!-- wahab-mobiles-content:start -->([\s\S]*?)<!-- wahab-mobiles-content:end -->/)?.[1] || '';

    expect(content).toMatch(/<h1\b[^>]*>Shop all products<\/h1>/);
    expect(content).toContain('href="/phones"');
    expect(content).toContain('href="/phones/iphone"');
    expect(content).not.toContain('Find the right phone, faster.');
    expect(result.body.match(/id="wahab-mobiles-seo-jsonld"/g)).toBeNull();
    expect(result.body).not.toContain('"@type":"Organization"');
    expect(result.body).not.toContain('"@type":"WebSite"');
  });

  it('uses category and configured landing H1/intro content for catalogue routes', async () => {
    const fetchMock = vi.fn(async (input) => {
      if (String(input).endsWith('/index.html')) return { ok: true, text: async () => shell };
      if (String(input).endsWith('/categories')) {
        return { ok: true, json: async () => ({ data: [{ slug: 'phones', name: 'Phones', isActive: true, children: [] }] }) };
      }
      return {
        ok: true,
        json: async () => ({ data: { items: [{ brand: 'Samsung', brandSlug: 'samsung' }], pagination: { total: 1 } } }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const phones = await invoke({
      url: 'https://wahabmobiles.com/phones',
      query: { route: 'category', root: 'phones', slug: 'phones' },
    });
    const phoneContent = phones.body.match(/<!-- wahab-mobiles-content:start -->([\s\S]*?)<!-- wahab-mobiles-content:end -->/)?.[1] || '';
    expect(phoneContent).toMatch(/<h1\b[^>]*>Phones<\/h1>/);

    const samsung = await invoke({
      url: 'https://wahabmobiles.com/phones/samsung',
      query: { route: 'category', root: 'phones', slug: 'samsung', categorySlug: 'samsung' },
    });
    const samsungContent = samsung.body.match(/<!-- wahab-mobiles-content:start -->([\s\S]*?)<!-- wahab-mobiles-content:end -->/)?.[1] || '';
    expect(samsungContent).toMatch(/<h1\b[^>]*>Samsung Mobiles Price in Pakistan<\/h1>/);
    expect(samsungContent).toContain('See the Samsung phones currently listed in the live Wahab Mobiles catalogue.');
    expect(samsungContent).not.toContain('Find the right phone, faster.');
  });

  it('renders the Hyderabad H1 and only its intended LocalBusiness/Breadcrumb schema', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => shell })));

    const result = await invoke({
      url: 'https://wahabmobiles.com/hyderabad',
      query: { route: 'static', slug: 'hyderabad' },
    });
    const content = result.body.match(/<!-- wahab-mobiles-content:start -->([\s\S]*?)<!-- wahab-mobiles-content:end -->/)?.[1] || '';
    const schemaScript = result.body.match(/<script\s+type="application\/ld\+json"\s+id="wahab-mobiles-seo-jsonld">([\s\S]*?)<\/script>/);
    const schema = JSON.parse(schemaScript[1]);

    expect(content).toMatch(/<h1\b[^>]*>Wahab Mobiles in Hyderabad<\/h1>/);
    expect(schema.map(({ '@type': type }) => type)).toEqual(['MobilePhoneStore', 'BreadcrumbList']);
    expect(result.body.match(/id="wahab-mobiles-seo-jsonld"/g)).toHaveLength(1);
    expect(result.body).not.toContain('"@type":"Organization"');
    expect(result.body).not.toContain('"@type":"WebSite"');
  });

  it('fails safely when the fetched shell has no marked root content slot', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: async () => '<!doctype html><html><head><title>Home</title></head><body><div id="root"></div></body></html>',
    })));

    const result = await invoke({ url: 'https://wahabmobiles.com/products', query: { route: 'products' } });

    expect(result.statusCode).toBe(502);
    expect(result.body).toBe('Route page unavailable');
    expect(result.body).not.toContain('Find the right phone, faster.');
  });

  it.each(['headers', 'body'])('fails safely when the shell stalls during %s', async (stage) => {
    const nativeTimeout = AbortSignal.timeout.bind(AbortSignal);
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => nativeTimeout(20));
    const fetchMock = vi.fn(async (_url, { signal }) => {
      const stalled = () => new Promise((_resolve, reject) => {
        if (signal.aborted) reject(signal.reason);
        else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      });
      return stage === 'headers' ? stalled() : { ok: true, text: stalled };
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      const result = await invoke({ url: '/search', query: { route: 'search' } });
      expect(result.statusCode).toBe(502);
      expect(result.body).toBe('Route page unavailable');
      expect(result.response.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
      expect(timeout).toHaveBeenCalledWith(10_000);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      timeout.mockRestore();
    }
  });
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
    expect(result.body).toContain('Search results for &quot;&lt;script&gt;alert(1)&lt;/script&gt;&quot;');
    expect(result.body).not.toContain('<script>');
    expect(result.body).not.toContain('href="https://wahabmobiles.com/"');
  });

  it('renders search without a query and matches React q/search query handling', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => shell })));

    const empty = await invoke({ url: 'https://wahabmobiles.com/search', query: { route: 'search' } });
    const alias = await invoke({
      url: 'https://wahabmobiles.com/search?search=Samsung',
      query: { route: 'search' },
    });

    expect(empty.statusCode).toBe(200);
    expect(empty.body).toContain('<h1 class="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Search products</h1>');
    expect(alias.statusCode).toBe(200);
    expect(alias.body).toContain('Search results for &quot;Samsung&quot;');
  });

  it('serves private SPA routes without homepage content or schema', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => shell })));

    const result = await invoke({ url: '/api/route-page?route=app&path=%2Fcart', query: { route: 'app', path: '/cart' } });
    const content = result.body.match(/<!-- wahab-mobiles-content:start -->([\s\S]*?)<!-- wahab-mobiles-content:end -->/)?.[1] || '';

    expect(result.statusCode).toBe(200);
    expect(content.trim()).toBe('');
    expect(result.body).toContain('name="robots" content="noindex,follow"');
    expect(result.body).toContain('rel="canonical" href="https://wahabmobiles.com/cart"');
    expect(result.body).not.toContain('Find the right phone, faster.');
    expect(result.body).not.toContain('wahab-mobiles-seo-jsonld');
    expect(result.body).not.toContain('"@type":"Organization"');
    expect(result.body).not.toContain('"@type":"WebSite"');
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
    expect(result.body).toContain('<title>Wahab Mobiles Hyderabad | Mobile Shop in Chandni Market</title>');
    expect(result.body).toContain('content="Visit Wahab Mobiles at Chandni Shopping Mall, Saddar Cantt, Hyderabad for new and used phones, accessories, local pickup and delivery. Trusted since 2009."');
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
  it('preserves server-rendered routes, explicit SPA deep links, and true unknown-route fallback', () => {
    const config = JSON.parse(readFileSync('vercel.json', 'utf8'));

    expect(config.redirects).toContainEqual({
      source: '/smartphones',
      destination: '/phones',
      permanent: true,
    });

    expect(config.rewrites).toContainEqual({
      source: '/products/:slug',
      destination: '/api/product-page?slug=:slug',
    });

    expect(config.rewrites).toContainEqual({
      source: '/search',
      destination: '/api/route-page?route=search',
    });

    expect(config.rewrites).toContainEqual({
      source: '/phones',
      destination: '/api/route-page?route=category&root=phones&slug=phones',
    });

    expect(config.rewrites).toContainEqual({
      source: '/tablets',
      destination: '/api/route-page?route=category&root=tablets&slug=tablets',
    });

    for (const slug of [
      'about',
      'services',
      'support',
      'returns',
      'privacy',
      'terms',
      'data-deletion',
      'hyderabad',
    ]) {
      expect(config.rewrites).toContainEqual({
        source: `/${slug}`,
        destination: `/api/route-page?route=static&slug=${slug}`,
      });
    }

    const spaRoutes = [
      '/cart',
      '/compare',
      '/help',
      '/checkout',
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/auth/google/callback',
      '/auth/facebook/callback',
      '/account',
      '/account/dashboard',
      '/account/orders',
      '/account/orders/:id',
      '/account/wishlist',
      '/account/addresses',
      '/account/settings',
      '/account/support',
      '/admin/login',
      '/admin',
      '/admin/dashboard',
      '/admin/products',
      '/admin/orders',
      '/admin/users',
      '/admin/account-management',
      '/admin/contact',
      '/admin/returns',
    ];

    for (const source of spaRoutes) {
      expect(config.rewrites).toContainEqual({
        source,
        destination: `/api/route-page?route=app&path=${source}`,
      });
    }

    const catchAlls = config.rewrites.filter(
      ({ source }) => source === '/(.*)',
    );

    expect(catchAlls).toEqual([
      {
        source: '/(.*)',
        destination: '/api/not-found',
      },
    ]);

    expect(config.rewrites).not.toContainEqual({
      source: '/(.*)',
      destination: '/index.html',
    });

    expect(config.rewrites.at(-1)).toEqual({
      source: '/(.*)',
      destination: '/api/not-found',
    });
  });
});
