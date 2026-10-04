const SITE_URL = 'https://wahabmobiles.com';
const PRODUCT_API_BASE_URL = (process.env.PRODUCT_API_BASE_URL || 'https://api.wahabmobiles.com').replace(/\/+$/, '');
const DEFAULT_OG_IMAGE = `${SITE_URL}/assets/wahab-mobiles-social.jpg`;
const ROOT_CONTENT_START = '<!-- wahab-mobiles-content:start -->';
const ROOT_CONTENT_END = '<!-- wahab-mobiles-content:end -->';
const DEFAULT_FALLBACK_LINKS = [
  { href: '/phones', label: 'Shop phones' },
  { href: '/products', label: 'All products' },
  { href: '/support', label: 'Support' },
];
const PHONE_FALLBACK_LINKS = [
  { href: '/phones', label: 'All phones' },
  { href: '/phones/iphone', label: 'iPhone' },
  { href: '/phones/android', label: 'Android phones' },
  { href: '/products', label: 'All products' },
];
const APP_PATHS = new Set([
  '/cart', '/compare', '/help', '/checkout', '/login', '/register',
  '/forgot-password', '/reset-password', '/auth/google/callback', '/auth/facebook/callback',
  '/account', '/account/dashboard', '/account/orders', '/account/wishlist',
  '/account/addresses', '/account/settings', '/account/support',
  '/admin/login', '/admin', '/admin/dashboard', '/admin/products', '/admin/orders',
  '/admin/users', '/admin/account-management', '/admin/contact', '/admin/returns',
]);
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
const validAppPath = (value) => typeof value === 'string'
  && value.length <= 200
  && (APP_PATHS.has(value) || /^\/account\/orders\/[a-z0-9_-]+$/i.test(value));

const buildProductsMetadata = () => ({
  title: 'Shop Phones and Mobile Accessories | Wahab Mobiles',
  description: 'Browse the live Wahab Mobiles catalogue of phones, smart watches and gadgets.',
  canonical: `${SITE_URL}/products`,
  ogImage: DEFAULT_OG_IMAGE,
});

const landingPages = {
  iphone: {
    kind: 'category',
    h1: 'iPhone Price in Pakistan',
    intro: 'Compare the iPhone models currently available from Wahab Mobiles, with live variant prices and PTA information.',
    title: 'iPhone Price in Pakistan | Wahab Mobiles',
    description: 'Shop the current iPhone range from Wahab Mobiles with live prices, PTA status and stock details.',
  },
  android: {
    kind: 'category',
    h1: 'Android Phones Price in Pakistan',
    intro: 'Browse the current Android phone catalogue by model, brand, price and live availability.',
    title: 'Android Phones Price in Pakistan | Wahab Mobiles',
    description: 'Browse Android phones from Wahab Mobiles with live prices, specifications, PTA status and stock details.',
  },
  samsung: {
    kind: 'brand',
    h1: 'Samsung Mobiles Price in Pakistan',
    intro: 'See the Samsung phones currently listed in the live Wahab Mobiles catalogue.',
    title: 'Samsung Mobiles Price in Pakistan | Wahab Mobiles',
    description: 'Shop current Samsung phones from Wahab Mobiles with live prices, specifications and availability.',
    brand: 'samsung',
  },
  xiaomi: {
    kind: 'brand',
    h1: 'Xiaomi Mi Mobiles Price in Pakistan',
    intro: 'See the Xiaomi Mi phones currently listed in the live Wahab Mobiles catalogue.',
    title: 'Xiaomi Mobiles Price in Pakistan | Wahab Mobiles',
    description: 'Shop current Xiaomi Mi phones from Wahab Mobiles with live prices, specifications and availability.',
    brand: 'xiaomi-mi',
  },
  realme: {
    kind: 'brand',
    h1: 'Realme Mobiles Price in Pakistan',
    intro: 'See the Realme phones currently listed in the live Wahab Mobiles catalogue.',
    title: 'Realme Mobiles Price in Pakistan | Wahab Mobiles',
    description: 'Shop current Realme phones from Wahab Mobiles with live prices, specifications and availability.',
    brand: 'realme',
  },
  honor: {
    kind: 'brand',
    h1: 'Honor Mobiles Price in Pakistan',
    intro: 'See the Honor phones currently listed in the live Wahab Mobiles catalogue.',
    title: 'Honor Mobiles Price in Pakistan | Wahab Mobiles',
    description: 'Shop current Honor phones from Wahab Mobiles with live prices, specifications and availability.',
    brand: 'honor',
  },
  tecno: {
    kind: 'brand',
    h1: 'Tecno Mobiles Price in Pakistan',
    intro: 'See the Tecno phones currently listed in the live Wahab Mobiles catalogue.',
    title: 'Tecno Mobiles Price in Pakistan | Wahab Mobiles',
    description: 'Shop current Tecno phones from Wahab Mobiles with live prices, specifications and availability.',
    brand: 'tecno',
  },
  'google-pixel': {
    kind: 'brand',
    h1: 'Google Pixel Phones in Pakistan',
    intro: 'See the Google Pixel phones currently listed in the live Wahab Mobiles catalogue, including variant availability and product-specific PTA status.',
    title: 'Google Pixel Phones Price in Pakistan | Wahab Mobiles',
    description: 'Browse current Google Pixel phones, prices and available variants in Pakistan, with PTA status shown on each Wahab Mobiles product.',
    brand: 'google',
  },
  'under-30000': {
    kind: 'price',
    h1: 'Under Rs. 30,000 Phones in Pakistan',
    intro: 'Browse sellable phones within this budget, using current catalogue prices and availability.',
    title: 'Under Rs. 30,000 Phones in Pakistan | Wahab Mobiles',
    description: 'Compare phones available under Rs. 30,000 from the live Wahab Mobiles catalogue.',
    maxPrice: 30000,
    minProducts: 5,
    minBrands: 3,
  },
  'under-50000': {
    kind: 'price',
    h1: 'Under Rs. 50,000 Phones in Pakistan',
    intro: 'Browse sellable phones within this budget, using current catalogue prices and availability.',
    title: 'Under Rs. 50,000 Phones in Pakistan | Wahab Mobiles',
    description: 'Compare phones available under Rs. 50,000 from the live Wahab Mobiles catalogue.',
    maxPrice: 50000,
    minProducts: 5,
    minBrands: 3,
  },
  'under-100000': {
    kind: 'price',
    h1: 'Under Rs. 100,000 Phones in Pakistan',
    intro: 'Browse sellable phones within this budget, using current catalogue prices and availability.',
    title: 'Under Rs. 100,000 Phones in Pakistan | Wahab Mobiles',
    description: 'Compare phones available under Rs. 100,000 from the live Wahab Mobiles catalogue.',
    maxPrice: 100000,
    minProducts: 5,
    minBrands: 3,
  },
};

const staticPages = {
  about: { path: '/about', h1: 'A Hyderabad mobile shop built on real customer relationships.', intro: 'Wahab Mobiles combines a physical Saddar Cantt store with an online catalogue for new and used phones.', title: 'About Wahab Mobiles | Wahab Mobiles', description: 'Learn about Wahab Mobiles, its phone catalogue and customer support.' },
  services: { path: '/services', h1: 'Shop with the details in view', intro: 'Browse product-specific information, choose a checkout option and keep support requests tied to your order.', title: 'Services | Wahab Mobiles', description: 'Explore Wahab Mobiles store, delivery and customer support services.' },
  support: { path: '/support', h1: 'How Can We Help?', intro: 'Find answers to common questions or get in touch with our support team', title: 'Support | Wahab Mobiles', description: 'Get help with products, orders, deliveries, returns and support at Wahab Mobiles.' },
  returns: { path: '/returns', h1: 'Returns & Refund Policy', title: 'Returns & Refund Policy | Wahab Mobiles', description: 'Read the Wahab Mobiles returns and refund policy.' },
  privacy: { path: '/privacy', h1: 'Privacy Policy', title: 'Privacy Policy | Wahab Mobiles', description: 'Read the Wahab Mobiles privacy policy.' },
  terms: { path: '/terms', h1: 'Terms of Service', title: 'Terms of Service | Wahab Mobiles', description: 'Read the terms for using Wahab Mobiles and its support services.' },
  'data-deletion': { path: '/data-deletion', h1: 'Data deletion request', title: 'Data Deletion | Wahab Mobiles', description: 'Learn how to request deletion of Wahab Mobiles account data.' },
  hyderabad: {
    path: '/hyderabad',
    h1: 'Wahab Mobiles in Hyderabad',
    intro: 'A family-run mobile-phone shop in Saddar Cantt for new and used phones, tablets, smart watches, accessories and repairs. More than 20,000 customers served.',
    title: 'Wahab Mobiles Hyderabad | Mobile Shop in Chandni Market',
    description: 'Visit Wahab Mobiles at Chandni Shopping Mall, Saddar Cantt, Hyderabad for new and used phones, accessories, local pickup and delivery. Trusted since 2009.',
    structuredData: [
      LOCAL_BUSINESS_JSON_LD,
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Wahab Mobiles Hyderabad', item: `${SITE_URL}/hyderabad` },
        ],
      },
    ],
  },
};

const renderFallbackContent = (h1, intro, links = DEFAULT_FALLBACK_LINKS) => `
  <main class="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
    <h1 class="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">${escapeHtml(h1)}</h1>
    ${intro ? `<p class="mt-3 max-w-3xl text-sm leading-6 text-slate-600">${escapeHtml(intro)}</p>` : ''}
    <nav class="mt-5 flex flex-wrap gap-4 text-sm font-bold" aria-label="Browse Wahab Mobiles">
      ${links.map(({ href, label }) => `<a class="text-blue-700" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`).join('')}
    </nav>
  </main>`;
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
  const startIndex = shell.indexOf(ROOT_CONTENT_START);
  const endIndex = shell.indexOf(ROOT_CONTENT_END);
  if (startIndex < 0 || endIndex < startIndex + ROOT_CONTENT_START.length
    || shell.indexOf(ROOT_CONTENT_START, startIndex + ROOT_CONTENT_START.length) !== -1
    || shell.indexOf(ROOT_CONTENT_END, endIndex + ROOT_CONTENT_END.length) !== -1
    || typeof metadata.fallbackHtml !== 'string') {
    throw new Error('Frontend shell has no valid marked root content slot');
  }

  const contentStart = startIndex + ROOT_CONTENT_START.length;
  const shellWithFallback = shell.slice(0, contentStart)
    + metadata.fallbackHtml
    + shell.slice(endIndex);
  const headEnd = shellWithFallback.toLowerCase().indexOf('</head>');
  if (headEnd === -1) throw new Error('Frontend shell has no head element');

  const cleanedHead = shellWithFallback.slice(0, headEnd)
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
      ? [`<script type="application/ld+json" id="wahab-mobiles-seo-jsonld">${serializeJsonLd(metadata.structuredData)}</script>`]
      : []),
  ].join('');

  return `${cleanedHead}${rendered}</head>${shellWithFallback.slice(headEnd + '</head>'.length)}`;
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

  if (route !== 'search' && route !== 'products' && route !== 'category' && route !== 'static' && route !== 'app') {
    response.status(404).send('Route metadata unavailable');
    return;
  }

  const shellResponse = await fetch(`${SITE_URL}/index.html`, { signal: AbortSignal.timeout(10_000), cache: 'no-store' });
  if (!shellResponse.ok) {
    response.status(502).send('Route page unavailable');
    return;
  }

  let metadata;
  if (route === 'app') {
    const appPath = queryValue(request, 'path', requestUrl);
    if (!validAppPath(appPath)) {
      response.status(404).send('App route unavailable');
      return;
    }
    metadata = {
      title: 'Wahab Mobiles',
      description: 'Wahab Mobiles account and shopping pages.',
      canonical: SITE_URL + appPath,
      ogImage: DEFAULT_OG_IMAGE,
      robots: 'noindex,follow',
      fallbackHtml: '',
    };
  } else if (route === 'static') {
    const page = staticPages[queryValue(request, 'slug', requestUrl)];
    if (!page) {
      response.status(404).send('Static metadata unavailable');
      return;
    }
    metadata = {
      ...page,
      canonical: SITE_URL + page.path,
      ogImage: DEFAULT_OG_IMAGE,
      robots: 'index,follow',
      fallbackHtml: renderFallbackContent(page.h1, page.intro),
    };
  } else if (route === 'search') {
    const searchTerm = (queryValue(request, 'q', requestUrl) ?? queryValue(request, 'search', requestUrl) ?? '').trim();
    metadata = {
      ...buildSearchMetadata(),
      fallbackHtml: renderFallbackContent(searchTerm ? `Search results for "${searchTerm}"` : 'Search products'),
    };
  } else if (route === 'products') {
    metadata = {
      ...buildProductsMetadata(),
      ...(hasAdditionalQuery(request, requestUrl, new Set(['route'])) ? { robots: 'noindex,follow' } : {}),
      fallbackHtml: renderFallbackContent('Shop all products', 'Browse the current catalogue.', PHONE_FALLBACK_LINKS),
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
        fallbackHtml: renderFallbackContent(landing.h1, landing.intro, DEFAULT_FALLBACK_LINKS),
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
        fallbackHtml: renderFallbackContent(
          landing?.h1 || category.name || 'Phones in Pakistan',
          landing?.intro,
          rootSlug === 'phones' ? PHONE_FALLBACK_LINKS : DEFAULT_FALLBACK_LINKS,
        ),
      };
    }
  }

  let renderedShell;
  try {
    renderedShell = renderMetadataShell(await shellResponse.text(), metadata);
  } catch {
    response.setHeader('Cache-Control', 'no-store');
    response.status(502).send('Route page unavailable');
    return;
  }

  response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.status(200).send(renderedShell);
}

export { renderMetadataShell, findCategory };
