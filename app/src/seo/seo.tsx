/* eslint-disable react-refresh/only-export-components */
import { useEffect } from 'react';
import type { Category, Product, ProductVariant } from '../types';
import {
  BUSINESS_NAME,
  CONTACT_EMAIL,
  CONTACT_PHONE_NUMBERS,
  SHOP_MAPS_URL,
  SHOP_OPENING_HOURS,
  SHOP_STRUCTURED_ADDRESS,
  SOCIAL_PROFILE_URLS,
} from '../config/contact';
import { getProductPath } from '../utils/product-url';
import type { SeoLandingPage } from './landing-pages';

export const SITE_URL = 'https://wahabmobiles.com';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/assets/wahab-shop.jpg`;

export interface SeoMetadata {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  robots?: string;
}

export type JsonLd = Record<string, unknown>;

const truncateDescription = (value: string, maxLength = 160) => {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
};

export const absoluteUrl = (value: string | undefined, fallback = DEFAULT_OG_IMAGE) => {
  if (!value) return fallback;

  try {
    return new URL(value, SITE_URL).toString();
  } catch {
    return fallback;
  }
};

export const buildCanonicalUrl = (pathname: string) => {
  const cleanPath = pathname.split(/[?#]/, 1)[0]?.replace(/\/+$/, '') || '/';
  return `${SITE_URL}${cleanPath === '/' ? '/' : cleanPath}`;
};

export const buildStaticMetadata = (
  title: string,
  description: string,
  pathname: string,
): SeoMetadata => ({
  title,
  description: truncateDescription(description),
  canonical: buildCanonicalUrl(pathname),
  ogImage: DEFAULT_OG_IMAGE,
});

export const buildProductMetadata = (product: Product): SeoMetadata => ({
  title: `${product.name} Price in Pakistan | Wahab Mobiles`,
  description: truncateDescription(product.description || `${product.name} from ${product.brand}.`),
  canonical: buildCanonicalUrl(getProductPath(product)),
  ogImage: absoluteUrl(product.images.find(Boolean)),
});

export const buildCategoryMetadata = (category: Category | undefined, pathname: string): SeoMetadata => {
  const name = category?.name ?? (pathname === '/products' ? 'Mobile Phones and Accessories' : 'Catalogue');
  const description = category?.description?.trim()
    || `Browse ${name} from the live Wahab Mobiles catalogue.`;

  return {
    title: `${name} | Wahab Mobiles`,
    description: truncateDescription(description),
    canonical: buildCanonicalUrl(pathname),
    ogImage: absoluteUrl(category?.imageUrl ?? undefined),
  };
};

export const buildLandingMetadata = (page: SeoLandingPage, pathname = page.path): SeoMetadata => ({
  title: page.title,
  description: truncateDescription(page.description),
  canonical: buildCanonicalUrl(pathname),
  ogImage: DEFAULT_OG_IMAGE,
});

export const buildSearchMetadata = (query: string, pathname = '/search'): SeoMetadata => {
  const cleanQuery = query.trim();
  return {
    title: cleanQuery ? `Search results for "${cleanQuery}" | Wahab Mobiles` : 'Search products | Wahab Mobiles',
    description: cleanQuery
      ? `Search the live Wahab Mobiles catalogue for ${cleanQuery}.`
      : 'Search the live Wahab Mobiles catalogue for phones, brands, storage and more.',
    canonical: buildCanonicalUrl(pathname),
    ogImage: DEFAULT_OG_IMAGE,
    robots: 'noindex,follow',
  };
};

const productConditionUrl = (condition: ProductVariant['condition']) => {
  if (condition === 'new') return 'https://schema.org/NewCondition';
  if (condition === 'used') return 'https://schema.org/UsedCondition';
  if (condition === 'refurbished') return 'https://schema.org/RefurbishedCondition';
  return undefined;
};

const buildOffer = (
  price: number,
  availableStock: number,
  canonicalUrl: string,
  condition?: ProductVariant['condition'],
) => ({
  '@type': 'Offer',
  url: canonicalUrl,
  priceCurrency: 'PKR',
  price,
  availability: availableStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
  ...(productConditionUrl(condition) ? { itemCondition: productConditionUrl(condition) } : {}),
});

const buildAggregateRating = (product: Product): JsonLd | undefined =>
  product.numReviews > 0 && product.rating !== null
    ? {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.numReviews,
      }
    : undefined;

const buildVariantProperties = (variant: ProductVariant) => [
  variant.storage ? { '@type': 'PropertyValue', name: 'Storage', propertyID: 'storage', value: variant.storage } : undefined,
  variant.options.RAM ? { '@type': 'PropertyValue', name: 'RAM', propertyID: 'RAM', value: variant.options.RAM } : undefined,
].filter(Boolean) as JsonLd[];

const buildVariantJsonLd = (
  product: Product,
  variant: ProductVariant,
  canonicalUrl: string,
  productGroupId?: string,
): JsonLd => ({
  '@type': 'Product',
  name: variant.title ? `${product.name} - ${variant.title}` : product.name,
  ...(variant.sku ? { sku: variant.sku } : {}),
  ...(variant.images.length > 0 ? { image: variant.images } : { image: product.images }),
  ...(variant.color ? { color: variant.color } : {}),
  ...(buildVariantProperties(variant).length > 0 ? { additionalProperty: buildVariantProperties(variant) } : {}),
  ...(productGroupId ? { isVariantOf: { '@id': productGroupId } } : {}),
  brand: { '@type': 'Brand', name: product.brand },
  offers: buildOffer(
    variant.price,
    variant.availableCountInStock ?? variant.countInStock,
    canonicalUrl,
    variant.condition ?? product.condition,
  ),
});

export const buildProductJsonLd = (product: Product, canonicalUrl = buildCanonicalUrl(getProductPath(product))): JsonLd => {
  const activeVariants = (product.variants ?? []).filter((variant) => variant.isActive);
  const common = {
    '@context': 'https://schema.org',
    name: product.name,
    description: product.description,
    ...(product.images.length > 0 ? { image: product.images } : {}),
    brand: { '@type': 'Brand', name: product.brand },
    url: canonicalUrl,
    ...(buildAggregateRating(product) ? { aggregateRating: buildAggregateRating(product) } : {}),
  } satisfies JsonLd;

  if (activeVariants.length > 1) {
    const productGroupId = `${canonicalUrl}#product-group`;
    const colors = new Set(activeVariants.map((variant) => variant.color).filter(Boolean));
    const variesBy = colors.size > 1 ? ['https://schema.org/color'] : [];

    return {
      ...common,
      '@type': 'ProductGroup',
      '@id': productGroupId,
      productGroupID: product.slug ?? product._id,
      ...(variesBy.length > 0 ? { variesBy } : {}),
      hasVariant: activeVariants.map((variant) => buildVariantJsonLd(product, variant, canonicalUrl, productGroupId)),
    };
  }

  const variant = activeVariants[0];
  return {
    ...common,
    '@type': 'Product',
    ...(variant?.sku ? { sku: variant.sku } : {}),
    offers: buildOffer(
      variant?.price ?? product.price,
      variant?.availableCountInStock ?? variant?.countInStock ?? product.countInStock,
      canonicalUrl,
      variant?.condition ?? product.condition,
    ),
  };
};

export const buildBreadcrumbJsonLd = (items: Array<{ name: string; url: string }>): JsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, position) => ({
    '@type': 'ListItem',
    position: position + 1,
    name: item.name,
    item: item.url,
  })),
});

export const buildOrganizationJsonLd = (): JsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: BUSINESS_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/assets/wahab-mobiles-logo.png`,
  email: CONTACT_EMAIL,
  telephone: CONTACT_PHONE_NUMBERS[0].label,
  address: { '@type': 'PostalAddress', ...SHOP_STRUCTURED_ADDRESS },
  sameAs: SOCIAL_PROFILE_URLS,
});

export const buildWebSiteJsonLd = (): JsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Wahab Mobiles',
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/search?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
});

export const buildLocalBusinessJsonLd = (): JsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'MobilePhoneStore',
  '@id': `${SITE_URL}/#store`,
  name: BUSINESS_NAME,
  url: `${SITE_URL}/hyderabad`,
  image: DEFAULT_OG_IMAGE,
  telephone: CONTACT_PHONE_NUMBERS[0].label,
  email: CONTACT_EMAIL,
  address: {
    '@type': 'PostalAddress',
    ...SHOP_STRUCTURED_ADDRESS,
  },
  openingHoursSpecification: SHOP_OPENING_HOURS.map((hours) => ({
    '@type': 'OpeningHoursSpecification',
    ...hours,
  })),
  hasMap: SHOP_MAPS_URL,
  foundingDate: '2009-03-21',
  sameAs: SOCIAL_PROFILE_URLS,
});

const upsertMeta = (attribute: 'name' | 'property', key: string, content: string | undefined) => {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!content) {
    element?.remove();
    return;
  }

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
};

const upsertCanonical = (href: string) => {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }
  element.href = href;
};

export const serializeJsonLd = (value: JsonLd | JsonLd[]) =>
  JSON.stringify(value)
    .replace(/&/g, '\\u0026')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

const JSON_LD_SCRIPT_ID = 'wahab-mobiles-seo-jsonld';

const Seo = ({ metadata, structuredData }: { metadata: SeoMetadata; structuredData?: JsonLd | JsonLd[] }) => {
  useEffect(() => {
    document.title = metadata.title;
    upsertMeta('name', 'description', metadata.description);
    upsertMeta('name', 'robots', metadata.robots);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', 'Wahab Mobiles');
    upsertMeta('property', 'og:title', metadata.title);
    upsertMeta('property', 'og:description', metadata.description);
    upsertMeta('property', 'og:url', metadata.canonical);
    upsertMeta('property', 'og:image', absoluteUrl(metadata.ogImage));
    upsertCanonical(metadata.canonical);

    const existingScript = document.getElementById(JSON_LD_SCRIPT_ID) as HTMLScriptElement | null;
    if (!structuredData) {
      existingScript?.remove();
      return;
    }

    const script = existingScript ?? document.createElement('script');
    script.id = JSON_LD_SCRIPT_ID;
    script.type = 'application/ld+json';
    script.textContent = serializeJsonLd(structuredData);
    if (!existingScript) document.head.appendChild(script);
  }, [metadata.canonical, metadata.description, metadata.ogImage, metadata.robots, metadata.title, structuredData]);

  return null;
};

export default Seo;
