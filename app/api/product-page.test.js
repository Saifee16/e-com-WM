import { describe, expect, it } from 'vitest';
import { buildProductJsonLd, renderProductShell } from './product-page.js';

const product = { slug: 'phone-script', name: 'Phone Script', brand: 'Example', description: 'A test phone for metadata.', price: 55_000, countInStock: 4, images: ['https://example.com/phone.jpg'], variants: [{ title: '128GB', sku: 'PHONE-128', price: 55_000, countInStock: 4, isActive: true }], numReviews: 0, rating: null };

describe('product page initial metadata', () => {
  it('renders product canonical, OG metadata, and JSON-LD into the shell', () => {
    const html = renderProductShell('<!doctype html><html><head><link rel="canonical" href="https://wahabmobiles.com/" /><title>Home</title></head><body><div id="root"></div></body></html>', product);
    expect(html).toContain('rel="canonical" href="https://wahabmobiles.com/products/phone-script"');
    expect(html).toContain('property="og:url" content="https://wahabmobiles.com/products/phone-script"');
    expect(html).toContain('"@type":"Product"');
    expect(html).toContain('"url":"https://wahabmobiles.com/products/phone-script"');
  });
  it('uses the canonical product URL for variant offers', () => {
    expect(buildProductJsonLd(product, 'https://wahabmobiles.com/products/phone-script')).toMatchObject({ offers: { url: 'https://wahabmobiles.com/products/phone-script' } });
  });
});
