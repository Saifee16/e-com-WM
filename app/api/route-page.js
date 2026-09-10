const SITE_URL = 'https://wahabmobiles.com';
const PRODUCT_API_BASE_URL = (process.env.PRODUCT_API_BASE_URL || 'https://api.wahabmobiles.com').replace(/\/+$/, '');
const DEFAULT_OG_IMAGE = `${SITE_URL}/assets/wahab-mobiles-social.jpg`;
const LOCAL_BUSINESS_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'MobilePhoneStore',
  '@id': `${SITE_URL}/#store`,
  name: 'Wahab Mobiles',
  url: `${SITE_URL}/hyderabad`,
  image: DEFAULT_OG_IMAGE,
  telephone: '+92 312 2995584',
  email: 'wahabmobiles@gmail.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Shop #30, 2nd Corner, Ground Floor, Chandni Shopping Mall, opposite Soghat-e-Sheerin, Saddar Cantt',
    addressLocality: 'Hyderabad',
    addressRegion: 'Sindh',
    postalCode: '71000',
    addressCountry: 'PK',
  },
  openingHoursSpecification: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday'].map((dayOfWeek) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek,
    opens: '14:00',
    closes: '00:00',
  })),
  hasMap: 'https://maps.app.goo.gl/sDRAiyBxtHMhD9Mb6',
  foundingDate: '2009-03-21',
  sameAs: [
    'https://www.facebook.com/profile.php?id=100063650661893',
    'https://www.instagram.com/mobileswahab',
    'https://www.youtube.com/@wahabmobiles662',
    'https://www.tiktok.com/@wahabmobilespak',
  ],
};
const serializeJsonLd = (value) => JSON.stringify(value)
  .replaceAll('&', '\\u0026')
  .replaceAll('<', '\\u003c')
  .replaceAll('>', '\\u003e');

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const normalizeText = (value, maxLength = 160) => {
  const normalized = String(value || '').trim().replace(/\s+/g, ' ');
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
};

const validSlug = (value) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value);

const buildProductsMetadata = () => ({
  title: 'Shop Phones and Mobile Accessories | Wahab Mobiles',
  description: 'Browse the live Wahab Mobiles catalogue of phones, smart watches and gadgets.',
  canonical: `${SITE_URL}/products`,
  ogImage: DEFAULT_OG_IMAGE,
});

const landingPages = {
  iphone: {
    kind: 'category',
    title: 'iPhone Price in Pakistan | Wahab Mobiles',
    description: 'Shop the current iPhone range from Wahab Mobiles with live prices, PTA status and stock details.',
  },
  android: {
    kind: 'category',
    title: 'Android Phones Price in Pakistan | Wahab Mobiles',
    description: 'Browse Android phones from Wahab Mobiles with live prices, specifications, PTA status and stock details.',
  },
  samsung: {
    kind: 'brand',
    title: 'Samsung Mobiles Price in Pakistan | Wahab Mobiles',
    description: 'Shop current Samsung phones from Wahab Mobiles with live prices, specifications and availability.',
    brand: 'samsung',
  },
  xiaomi: {
    kind: 'brand',
    title: 'Xiaomi Mobiles Price in Pakistan | Wahab Mobiles',
    description: 'Shop current Xiaomi Mi phones from Wahab Mobiles with live prices, specifications and availability.',
    brand: 'xiaomi-mi',
  },
  realme: {
    kind: 'brand',
    title: 'Realme Mobiles Price in Pakistan | Wahab Mobiles',
    description: 'Shop current Realme phones from Wahab Mobiles with live prices, specifications and availability.',
    brand: 'realme',
  },
  honor: {
    kind: 'brand',
    title: 'Honor Mobiles Price in Pakistan | Wahab Mobiles',
    description: 'Shop current Honor phones from Wahab Mobiles with live prices, specifications and availability.',
    brand: 'honor',
  },
  tecno: {
    kind: 'brand',
    title: 'Tecno Mobiles Price in Pakistan | Wahab Mobiles',
    description: 'Shop current Tecno phones from Wahab Mobiles with live prices, specifications and availability.',
    brand: 'tecno',
  },
  'google-pixel': {
    kind: 'brand',
    title: 'Google Pixel Phones Price in Pakistan | Wahab Mobiles',
    description: 'Browse current Google Pixel phones, prices and available variants in Pakistan, with PTA status shown on each Wahab Mobiles product.',
    brand: 'google',
  },
  'under-30000': {
    kind: 'price',
    title: 'Under Rs. 30,000 Phones in Pakistan | Wahab Mobiles',
    description: 'Compare phones available under Rs. 30,000 from the live Wahab Mobiles catalogue.',
    maxPrice: 30000,
    minProducts: 5,
    minBrands: 3,
  },
  'under-50000': {
    kind: 'price',
    title: 'Under Rs. 50,000 Phones in Pakistan | Wahab Mobiles',
    description: 'Compare phones available under Rs. 50,000 from the live Wahab Mobiles catalogue.',
    maxPrice: 50000,
    minProducts: 5,
    minBrands: 3,
  },
  'under-100000': {
    kind: 'price',
    title: 'Under Rs. 100,000 Phones in Pakistan | Wahab Mobiles',
    description: 'Compare phones available under Rs. 100,000 from the live Wahab Mobiles catalogue.',
    maxPrice: 100000,
    minProducts: 5,
    minBrands: 3,
  },
};

const staticPages = {
  about: { path: '/about', title: 'About Wahab Mobiles | Wahab Mobiles', description: 'Learn about Wahab Mobiles, its phone catalogue and customer support.' },
  services: { path: '/services', title: 'Services | Wahab Mobiles', description: 'Explore Wahab Mobiles store, delivery and customer support services.' },
  support: { path: '/support', title: 'Support | Wahab Mobiles', description: 'Get help with products, orders, deliveries, returns and support at Wahab Mobiles.' },
  returns: { path: '/returns', title: 'Returns & Refund Policy | Wahab Mobiles', description: 'Read the Wahab Mobiles returns and refund policy.' },
  privacy: { path: '/privacy', title: 'Privacy Policy | Wahab Mobiles', description: 'Read the Wahab Mobiles privacy policy.' },
  terms: { path: '/terms', title: 'Terms of Service | Wahab Mobiles', description: 'Read the terms for using Wahab Mobiles and its support services.' },
  'data-deletion': { path: '/data-deletion', title: 'Data Deletion | Wahab Mobiles', description: 'Learn how to request deletion of Wahab Mobiles account data.' },
  hyderabad: {
    path: '/hyderabad',
    title: 'Wahab Mobiles Hyderabad | Mobile Phones & Accessories',
    description: 'Visit Wahab Mobiles in Saddar Cantt Hyderabad for new and used phones, tablets, accessories, local pickup and same-day Hyderabad delivery.',
    structuredData: LOCAL_BUSINESS_JSON_LD,
  },
};
const buildPhonesMetadata = () => ({
  title: 'Phones Price in Pakistan | Wahab Mobiles',
  description: 'Browse the live Wahab Mobiles phone catalogue with iPhone, Android, brand, price and PTA filters.',
  canonical: SITE_URL + '/phones',
  ogImage: DEFAULT_OG_IMAGE,
});

const buildLandingMetadata = (page, pathname) => ({
  title: page.title,
  description: page.description,
  canonical: SITE_URL + pathname,
  ogImage: DEFAULT_OG_IMAGE,
});
export const buildCategoryMetadata = (category, pathname) => {
  const name = normalizeText(category?.name || 'Catalogue', 120);
  const description = normalizeText(
    category?.description || `Browse ${name} from the live Wahab Mobiles catalogue.`,
  );

  return {
    title: `${name} | Wahab Mobiles`,
    description,
    canonical: `${SITE_URL}${pathname}`,
    ogImage: DEFAULT_OG_IMAGE,
  };
};

export const buildSearchMetadata = () => ({
  title: 'Search products | Wahab Mobiles',
  description: 'Search the live Wahab Mobiles catalogue for phones, brands, storage and more.',
  canonical: `${SITE_URL}/search`,
  ogImage: DEFAULT_OG_IMAGE,
  robots: 'noindex,follow',
});

const renderMetadataShell = (shell, metadata) => {
  const headEnd = shell.toLowerCase().indexOf('</head>');
  if (headEnd === -1) throw new Error('Frontend shell has no head element');

  const cleanedHead = shell.slice(0, headEnd)
    .replace(/<meta\s+name="description"[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="robots"[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '')
    .replace(/<meta\s+property="og:[^"]+"[^>]*>\s*/gi, '')
    .replace(/<title>[\s\S]*?<\/title>\s*/gi, '')
    .replace(/<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>\s*/gi, '');

  const rendered = [
    `<meta name="description" content="${escapeHtml(metadata.description)}" />`,
    ...(metadata.robots ? [`<meta name="robots" content="${escapeHtml(metadata.robots)}" />`] : []),
    `<link rel="canonical" href="${escapeHtml(metadata.canonical)}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="Wahab Mobiles" />',
    `<meta property="og:title" content="${escapeHtml(metadata.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(metadata.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(metadata.canonical)}" />`,
    `<meta property="og:image" content="${escapeHtml(metadata.ogImage || DEFAULT_OG_IMAGE)}" />`,
    `<title>${escapeHtml(metadata.title)}</title>`,
    ...(metadata.structuredData
      ? [`<script type="application/ld+json">${serializeJsonLd(metadata.structuredData)}</script>`]
      : []),
  ].join('');

  return `${cleanedHead}${rendered}</head>${shell.slice(headEnd + '</head>'.length)}`;
};

const queryValue = (request, key, requestUrl) => {
  const value = request.query?.[key];
  if (Array.isArray(value)) return value[0];
  return typeof value === 'string' ? value : requestUrl.searchParams.get(key);
};

const hasAdditionalQuery = (request, requestUrl, reservedKeys) => {
  const keys = new Set([
    ...requestUrl.searchParams.keys(),
    ...Object.keys(request.query ?? {}),
  ]);
  return [...keys].some((key) => !reservedKeys.has(key));
};

const findCategory = (categories, rootSlug, categorySlug) => {
  const root = categories.find((category) => category.slug === rootSlug && category.isActive !== false);
  if (!root) return undefined;
  if (categorySlug === rootSlug) return root;
  return root.children?.find((category) => category.slug === categorySlug && category.isActive !== false);
};

export default async function handler(request, response) {
  try {
    await renderPage(request, response);
  } catch {
    response.setHeader('Cache-Control', 'no-store');
    response.status(502).send('Route page unavailable');
  }
}

async function renderPage(request, response) {
  const requestUrl = new URL(request.url || '/', SITE_URL);
  const route = queryValue(request, 'route', requestUrl);

  if (route !== 'search' && route !== 'products' && route !== 'category' && route !== 'static') {
    response.status(404).send('Route metadata unavailable');
    return;
  }

  const shellResponse = await fetch(`${SITE_URL}/index.html`, { signal: AbortSignal.timeout(10_000), cache: 'no-store' });
  if (!shellResponse.ok) {
    response.status(502).send('Route page unavailable');
    return;
  }

  let metadata;
  if (route === 'static') {
    const page = staticPages[queryValue(request, 'slug', requestUrl)];
    if (!page) {
      response.status(404).send('Static metadata unavailable');
      return;
    }
    metadata = { ...page, canonical: SITE_URL + page.path, ogImage: DEFAULT_OG_IMAGE, robots: 'index,follow' };
  } else if (route === 'search') {
    metadata = buildSearchMetadata();
  } else if (route === 'products') {
    metadata = {
      ...buildProductsMetadata(),
      ...(hasAdditionalQuery(request, requestUrl, new Set(['route'])) ? { robots: 'noindex,follow' } : {}),
    };
  } else {
    const rootSlug = queryValue(request, 'root', requestUrl);
    const categorySlug = queryValue(request, 'slug', requestUrl);
    if (!validSlug(rootSlug) || !validSlug(categorySlug)) {
      response.status(400).send('Invalid category route');
      return;
    }

    const pathname = categorySlug === rootSlug
      ? '/' + rootSlug
      : '/' + rootSlug + '/' + categorySlug;
    const landing = rootSlug === 'phones' ? landingPages[categorySlug] : undefined;
    const reservedKeys = new Set(['route', 'root', 'slug', 'categorySlug']);

    if (landing && landing.kind !== 'category') {
      const params = new URLSearchParams({ limit: '100', page: '1', category: 'phones' });
      if (landing.brand) params.set('brand', landing.brand);
      if (landing.maxPrice) params.set('maxPrice', String(landing.maxPrice));
      const productsResponse = await fetch(PRODUCT_API_BASE_URL + '/api/products?' + params.toString(), {
        signal: AbortSignal.timeout(10_000),
        headers: { accept: 'application/json' },
        cache: 'no-store',
      });
      if (!productsResponse.ok) {
        response.status(502).send('Landing page unavailable');
        return;
      }
      const payload = await productsResponse.json();
      const products = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.data?.items) ? payload.data.items : [];
      const productCount = Number(payload?.pagination?.total ?? payload?.data?.pagination?.total ?? products.length);
      const brandCount = new Set(products.map((product) => product.brandSlug || product.brand).filter(Boolean)).size;
      const eligible = productCount >= (landing.minProducts || 0) && brandCount >= (landing.minBrands || 0);
      metadata = {
        ...buildLandingMetadata(landing, pathname),
        ...(hasAdditionalQuery(request, requestUrl, reservedKeys) || !eligible ? { robots: 'noindex,follow' } : {}),
      };
    } else {
      const categoriesResponse = await fetch(PRODUCT_API_BASE_URL + '/api/products/categories', {
        signal: AbortSignal.timeout(10_000),
        headers: { accept: 'application/json' },
        cache: 'no-store',
      });
      if (!categoriesResponse.ok) {
        response.status(502).send('Category page unavailable');
        return;
      }

      const categories = (await categoriesResponse.json())?.data;
      const category = Array.isArray(categories) ? findCategory(categories, rootSlug, categorySlug) : undefined;
      if (!category) {
        response.status(404).send('Category not found');
        return;
      }

      metadata = {
        ...(landing ? buildLandingMetadata(landing, pathname) : rootSlug === 'phones' ? buildPhonesMetadata() : buildCategoryMetadata(category, pathname)),
        ...(hasAdditionalQuery(request, requestUrl, reservedKeys) || rootSlug !== 'phones' ? { robots: 'noindex,follow' } : {}),
      };
    }
  }

  response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.status(200).send(renderMetadataShell(await shellResponse.text(), metadata));
}

export { renderMetadataShell, findCategory };
