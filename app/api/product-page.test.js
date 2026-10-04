import { describe, expect, it } from 'vitest';
import { buildProductBreadcrumbJsonLd, buildProductJsonLd, renderProductShell } from './product-page.js';

const product = { slug: 'phone-script', name: 'Phone Script', brand: 'Example', description: 'A test phone for metadata.', price: 55_000, countInStock: 4, images: ['https://example.com/phone.jpg'], variants: [{ title: '128GB', sku: 'PHONE-128', price: 55_000, countInStock: 4, isActive: true }], numReviews: 0, rating: null };
const shell = '<!doctype html><html><head><link rel="canonical" href="https://wahabmobiles.com/" /><title>Home</title><script type="application/ld+json" id="wahab-mobiles-seo-jsonld">[{"@type":"Organization"},{"@type":"WebSite"}]</script></head><body><div id="root"><!-- wahab-mobiles-content:start --><main><h1>Find the right phone, faster.</h1></main><!-- wahab-mobiles-content:end --></div></body></html>';
const fallbackContent = (html) => html.match(/<!-- wahab-mobiles-content:start -->([\s\S]*?)<!-- wahab-mobiles-content:end -->/)?.[1] || '';

describe('product page initial metadata', () => {
  it('renders product canonical, OG metadata, and JSON-LD into the shell', () => {
    const html = renderProductShell(shell, product);
    const schemaTag = html.match(/<script\s+type="application\/ld\+json"\s+id="wahab-mobiles-seo-jsonld">([\s\S]*?)<\/script>/);
    expect(html).toContain('rel="canonical" href="https://wahabmobiles.com/products/phone-script"');
    expect(html).toContain('property="og:url" content="https://wahabmobiles.com/products/phone-script"');
    expect(html).toContain('<title>Phone Script Price in Pakistan | Wahab Mobiles</title>');
    expect(html).toContain('"@type":"Product"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('"url":"https://wahabmobiles.com/products/phone-script"');
    expect(schemaTag).not.toBeNull();
    expect(html.match(/id="wahab-mobiles-seo-jsonld"/g)).toHaveLength(1);
    expect(html).not.toContain('"@type":"Organization"');
    expect(html).not.toContain('"@type":"WebSite"');
    expect(fallbackContent(html)).not.toContain('Find the right phone, faster.');
  });

  it('renders escaped product facts and linked breadcrumbs without adding variant specifications', () => {
    const name = 'Phone <>&"\' </script>';
    const description = 'Useful <details> & clear "quotes" \'safely\' </script>.';
    const html = renderProductShell(shell, {
      ...product,
      name,
      description,
      brand: 'Example & <Brand>',
      category: 'iphone',
    });
    const content = fallbackContent(html);
    const schemaTag = html.match(/<script\s+type="application\/ld\+json"\s+id="wahab-mobiles-seo-jsonld">([\s\S]*?)<\/script>/);
    const schema = JSON.parse(schemaTag[1]);

    expect(content).toMatch(/<h1\b[^>]*>Phone &lt;&gt;&amp;&quot;&#39; &lt;\/script&gt;<\/h1>/);
    expect(content).toContain('Useful &lt;details&gt; &amp; clear &quot;quotes&quot; &#39;safely&#39; &lt;/script&gt;.');
    expect(content).toContain('Example &amp; &lt;Brand&gt;');
    expect(content).toContain('PKR 55,000');
    expect(content).toContain('href="/"');
    expect(content).toContain('href="/products"');
    expect(content).toContain('href="/phones/iphone"');
    expect(content).not.toContain('128GB');
    expect(schemaTag[1]).not.toContain('</script>');
    expect(schema[0].name).toBe(name);
    expect(schema[0].description).toBe(description);
    expect(schema[0].brand.name).toBe('Example & <Brand>');
  });

  it('omits absent product facts instead of inventing summary values', () => {
    const html = renderProductShell(shell, { slug: 'bare-phone', name: 'Bare Phone' });
    const content = fallbackContent(html);

    expect(content).toMatch(/<h1\b[^>]*>Bare Phone<\/h1>/);
    expect(content).not.toContain('Brand:');
    expect(content).not.toContain('Price:');
    expect(content).not.toContain('Description:');
    expect(content).not.toContain('undefined');
    expect(content).not.toContain('GB');
    expect(content).not.toContain('PTA');
    expect(html).not.toContain('from undefined.');
  });

  it('uses the lowest purchasable price and suppresses stale storage descriptions like React', () => {
    const html = renderProductShell(shell, {
      ...product,
      price: 100,
      description: 'This model includes 128GB storage and long battery life.',
      variants: [
        { title: '128GB Black', storage: '128GB', price: 100, countInStock: 0, isActive: true },
        { title: '256GB Blue', storage: '256GB', price: 200, countInStock: 2, isActive: true },
      ],
    });
    const content = fallbackContent(html);

    expect(content).toContain('Price: PKR 200');
    expect(content).not.toContain('PKR 100');
    expect(content).not.toContain('128GB storage');
    expect(content).not.toContain('long battery life');
  });

  it('labels a range when multiple active prices can currently be purchased', () => {
    const html = renderProductShell(shell, {
      ...product,
      variants: [
        { title: '128GB Black', price: 100, countInStock: 0, isActive: true },
        { title: '256GB Blue', price: 200, countInStock: 2, isActive: true },
        { title: '512GB Blue', price: 300, countInStock: 1, isActive: true },
      ],
    });

    expect(fallbackContent(html)).toContain('Price: From PKR 200');
  });
  it('uses color-only ProductGroup variation and supported offer condition markup', () => {
    const grouped = {
      ...product,
      variants: [
        { title: '128GB Black', sku: 'PHONE-128', storage: '128GB', color: 'Black', condition: 'new', options: { RAM: '8GB' }, price: 55_000, countInStock: 4, isActive: true },
        { title: '256GB Blue', sku: 'PHONE-256', storage: '256GB', color: 'Blue', condition: 'new', options: { RAM: '12GB' }, price: 65_000, countInStock: 2, isActive: true },
      ],
    };
    const schema = buildProductJsonLd(grouped, 'https://wahabmobiles.com/products/phone-script');
    expect(schema).toMatchObject({ '@type': 'ProductGroup', productGroupID: 'phone-script', variesBy: ['https://schema.org/color'] });
    expect(schema.hasVariant[0]).toMatchObject({
      isVariantOf: { '@id': 'https://wahabmobiles.com/products/phone-script#product-group' },
      offers: { itemCondition: 'https://schema.org/NewCondition' },
    });
    expect(schema.variesBy).not.toContain('storage');
    expect(schema.variesBy).not.toContain('RAM');
  });
  it('uses the canonical product URL for variant offers', () => {
    expect(buildProductJsonLd(product, 'https://wahabmobiles.com/products/phone-script')).toMatchObject({ offers: { url: 'https://wahabmobiles.com/products/phone-script' } });
  });

  it('uses canonical phone category paths for Android and iPhone breadcrumbs', () => {
    const canonical = 'https://wahabmobiles.com/products/phone-script';
    expect(buildProductBreadcrumbJsonLd({ ...product, category: 'android' }, canonical)).toMatchObject({
      itemListElement: expect.arrayContaining([expect.objectContaining({ item: 'https://wahabmobiles.com/phones/android' })]),
    });
    expect(buildProductBreadcrumbJsonLd({ ...product, category: 'iphone' }, canonical)).toMatchObject({
      itemListElement: expect.arrayContaining([expect.objectContaining({ item: 'https://wahabmobiles.com/phones/iphone' })]),
    });
  });
});
