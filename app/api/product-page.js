const SITE_URL = 'https://wahabmobiles.com';
const PRODUCT_API_BASE_URL = (process.env.PRODUCT_API_BASE_URL || 'https://api.wahabmobiles.com').replace(/\/+$/, '');

const escapeHtml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const serializeJsonLd = (value) => JSON.stringify(value).replaceAll('&', '\\u0026').replaceAll('<', '\\u003c').replaceAll('>', '\\u003e');
const productPath = (slug) => `/products/${encodeURIComponent(slug)}`;

const buildProductJsonLd = (product, canonicalUrl) => {
  const variants = Array.isArray(product.variants) ? product.variants.filter((variant) => variant.isActive !== false) : [];
  const offer = (variant) => ({
    '@type': 'Offer', url: canonicalUrl, priceCurrency: 'PKR', price: variant?.price ?? product.price,
    availability: (variant?.availableCountInStock ?? variant?.countInStock ?? product.countInStock) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
  });
  const common = {
    '@context': 'https://schema.org', name: product.name, description: product.description,
    ...(product.images?.length ? { image: product.images } : {}), brand: { '@type': 'Brand', name: product.brand }, url: canonicalUrl,
    ...(product.numReviews > 0 && product.rating !== null ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.numReviews } } : {}),
  };
  if (variants.length > 1) {
    return { ...common, '@type': 'ProductGroup', hasVariant: variants.map((variant) => ({
      '@type': 'Product', name: variant.title ? `${product.name} - ${variant.title}` : product.name,
      ...(variant.sku ? { sku: variant.sku } : {}), ...(variant.images?.length ? { image: variant.images } : {}),
      brand: { '@type': 'Brand', name: product.brand }, offers: offer(variant),
    })) };
  }
  return { ...common, '@type': 'Product', ...(variants[0]?.sku ? { sku: variants[0].sku } : {}), offers: offer(variants[0]) };
};

const renderProductShell = (shell, product) => {
  const canonical = `${SITE_URL}${productPath(product.slug)}`;
  const title = `${product.name} | Wahab Mobiles`;
  const description = String(product.description || `${product.name} from ${product.brand}.`).trim().replace(/\s+/g, ' ').slice(0, 159);
  const image = product.images?.find(Boolean) || `${SITE_URL}/assets/wahab-shop.jpg`;
  const headEnd = shell.toLowerCase().indexOf('</head>');
  if (headEnd === -1) throw new Error('Frontend shell has no head element');
  const cleanedHead = shell.slice(0, headEnd)
    .replace(/<meta\s+name="description"[^>]*>\s*/gi, '').replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '')
    .replace(/<meta\s+property="og:[^"]+"[^>]*>\s*/gi, '').replace(/<title>[\s\S]*?<\/title>\s*/gi, '')
    .replace(/<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>\s*/gi, '');
  const metadata = [
    `<meta name="description" content="${escapeHtml(description)}" />`, `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    '<meta property="og:type" content="product" />', '<meta property="og:site_name" content="Wahab Mobiles" />',
    `<meta property="og:title" content="${escapeHtml(title)}" />`, `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`, `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<title>${escapeHtml(title)}</title>`, `<script type="application/ld+json">${serializeJsonLd(buildProductJsonLd(product, canonical))}</script>`,
  ].join('');
  return `${cleanedHead}${metadata}</head>${shell.slice(headEnd + '</head>'.length)}`;
};

export default async function handler(request, response) {
  const requestUrl = new URL(request.url || '/', SITE_URL);
  const slugValue = typeof request.query?.slug === 'string' ? request.query.slug : requestUrl.searchParams.get('slug');
  const slug = slugValue?.trim();
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)) { response.status(400).send('Invalid product slug'); return; }
  const [shellResponse, productResponse] = await Promise.all([
    fetch(`${SITE_URL}/index.html`, { cache: 'no-store' }),
    fetch(`${PRODUCT_API_BASE_URL}/api/products/${encodeURIComponent(slug)}`, { headers: { accept: 'application/json' }, cache: 'no-store' }),
  ]);
  if (!shellResponse.ok || !productResponse.ok) { response.status(productResponse.status === 404 ? 404 : 502).send('Product page unavailable'); return; }
  const product = (await productResponse.json())?.data;
  if (!product?.slug) { response.status(404).send('Product not found'); return; }
  response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.status(200).send(renderProductShell(await shellResponse.text(), product));
}

export { buildProductJsonLd, renderProductShell };
