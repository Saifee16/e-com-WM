const SITE_URL = 'https://wahabmobiles.com';
const PRODUCT_API_BASE_URL = (process.env.PRODUCT_API_BASE_URL || 'https://api.wahabmobiles.com').replace(/\/+$/, '');
const DEFAULT_OG_IMAGE = `${SITE_URL}/assets/wahab-shop.jpg`;

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
    .replace(/<title>[\s\S]*?<\/title>\s*/gi, '');

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
  const requestUrl = new URL(request.url || '/', SITE_URL);
  const route = queryValue(request, 'route', requestUrl);

  if (route !== 'search' && route !== 'products' && route !== 'category') {
    response.status(404).send('Route metadata unavailable');
    return;
  }

  const shellResponse = await fetch(`${SITE_URL}/index.html`, { cache: 'no-store' });
  if (!shellResponse.ok) {
    response.status(502).send('Route page unavailable');
    return;
  }

  let metadata;
  if (route === 'search') {
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

    const categoriesResponse = await fetch(`${PRODUCT_API_BASE_URL}/api/products/categories`, {
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

    const pathname = categorySlug === rootSlug
      ? `/${rootSlug}`
      : `/${rootSlug}/${categorySlug}`;
    metadata = {
      ...buildCategoryMetadata(category, pathname),
      ...(hasAdditionalQuery(request, requestUrl, new Set(['route', 'root', 'slug']))
        ? { robots: 'noindex,follow' }
        : {}),
    };
  }

  response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.status(200).send(renderMetadataShell(await shellResponse.text(), metadata));
}

export { renderMetadataShell, findCategory };
