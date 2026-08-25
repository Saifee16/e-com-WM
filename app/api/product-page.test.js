import { describe, expect, it } from 'vitest';
import { buildProductBreadcrumbJsonLd, buildProductJsonLd, renderProductShell } from './product-page.js';

const product = { slug: 'phone-script', name: 'Phone Script', brand: 'Example', description: 'A test phone for metadata.', price: 55_000, countInStock: 4, images: ['https://example.com/phone.jpg'], variants: [{ title: '128GB', sku: 'PHONE-128', price: 55_000, countInStock: 4, isActive: true }], numReviews: 0, rating: null };

describe('product page initial metadata', () => {
  it('renders product canonical, OG metadata, and JSON-LD into the shell', () => {
    const html = renderProductShell('<!doctype html><html><head><link rel="canonical" href="https://wahabmobiles.com/" /><title>Home</title></head><body><div id="root"></div></body></html>', product);
    expect(html).toContain('rel="canonical" href="https://wahabmobiles.com/products/phone-script"');
    expect(html).toContain('property="og:url" content="https://wahabmobiles.com/products/phone-script"');
    expect(html).toContain('<title>Phone Script Price in Pakistan | Wahab Mobiles</title>');
    expect(html).toContain('"@type":"Product"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('"url":"https://wahabmobiles.com/products/phone-script"');
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
