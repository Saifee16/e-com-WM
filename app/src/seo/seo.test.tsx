import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Category, Product } from '../types';
import Seo, {
  buildCategoryMetadata,
  buildProductJsonLd,
  buildProductMetadata,
  serializeJsonLd,
} from './seo';

const product: Product = {
  _id: 'product-id',
  name: 'Phone <script>',
  slug: 'phone-script',
  brand: 'Brand',
  description: 'A genuine product description.',
  price: 100_000,
  images: ['https://cdn.example/phone.jpg'],
  category: 'phones',
  specifications: {},
  condition: 'new',
  ptaApproved: true,
  countInStock: 3,
  rating: null,
  numReviews: 0,
  reviews: [],
  isFeatured: false,
  tags: [],
  variants: [
    {
      id: 'variant-1',
      sku: 'PHONE-128',
      title: '128GB / Black',
      storage: '128GB',
      color: 'Black',
      condition: 'new',
      options: {},
      price: 100_000,
      countInStock: 3,
      availableCountInStock: 3,
      isActive: true,
      images: [],
      image: '',
    },
    {
      id: 'variant-2',
      sku: 'PHONE-256',
      title: '256GB / Black',
      storage: '256GB',
      color: 'Black',
      condition: 'new',
      options: {},
      price: 120_000,
      countInStock: 0,
      availableCountInStock: 0,
      isActive: true,
      images: [],
      image: '',
    },
  ],
};

describe('SEO metadata and structured data', () => {
  it('uses the product slug as the canonical URL', () => {
    expect(buildProductMetadata(product).canonical).toBe('https://wahabmobiles.com/products/phone-script');
  });

  it('uses route paths for category canonicals and ignores filter queries', () => {
    const category: Category = {
      id: 'gadgets',
      name: 'Gadgets',
      slug: 'gadgets',
      description: 'Live gadgets.',
      productCount: 1,
    };
    const metadata = buildCategoryMetadata(category, '/gadgets');

    expect(metadata.canonical).toBe('https://wahabmobiles.com/gadgets');
    expect(buildCategoryMetadata(category, '/gadgets?brand=Anker').canonical).toBe('https://wahabmobiles.com/gadgets');
  });

  it('updates title, description, Open Graph, and canonical metadata', async () => {
    render(<Seo metadata={buildProductMetadata(product)} />);

    await waitFor(() => {
      expect(document.title).toBe('Phone <script> | Wahab Mobiles');
    });
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute('content', product.description);
    expect(document.querySelector('meta[property="og:url"]')).toHaveAttribute(
      'content',
      'https://wahabmobiles.com/products/phone-script',
    );
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://wahabmobiles.com/products/phone-script',
    );
  });

  it('omits aggregateRating when there are no approved reviews', () => {
    const structuredData = buildProductJsonLd(product);
    expect(structuredData).not.toHaveProperty('aggregateRating');
  });

  it('includes genuine aggregate data and variant price/availability', () => {
    const structuredData = buildProductJsonLd({
      ...product,
      rating: 4.5,
      numReviews: 2,
    });
    const variants = structuredData.hasVariant as Array<Record<string, unknown>>;

    expect(structuredData).toMatchObject({ '@type': 'ProductGroup', aggregateRating: { ratingValue: 4.5, reviewCount: 2 } });
    expect(variants[0]).toMatchObject({ sku: 'PHONE-128', offers: { price: 100_000, availability: 'https://schema.org/InStock' } });
    expect(variants[1]).toMatchObject({ sku: 'PHONE-256', offers: { price: 120_000, availability: 'https://schema.org/OutOfStock' } });
  });

  it('serializes user-provided text without a script-closing sequence', () => {
    const serialized = serializeJsonLd({ description: '</script><script>alert(1)</script>' });

    expect(serialized).not.toContain('</script>');
    expect(serialized).not.toContain('<script>');
    expect(serialized).toContain('\\u003c/script\\u003e');
  });
});
