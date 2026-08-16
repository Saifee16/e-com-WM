import type { Category, Product } from '../../types';

export type NavigationMenuId = 'phones' | 'smart-watches' | 'gadgets';

export const getCategoryBySlug = (categories: Category[], slug: string): Category | undefined => {
  for (const category of categories) {
    if (category.slug === slug) return category;
    const childMatch = getCategoryBySlug(category.children ?? [], slug);
    if (childMatch) return childMatch;
  }

  return undefined;
};

export const getCategoryDescendants = (category: Category): Category[] =>
  (category.children ?? []).flatMap((child) => [child, ...getCategoryDescendants(child)]);

export const getActiveCategoryDescendants = (category: Category): Category[] =>
  getCategoryDescendants(category).filter(
    (child) => child.isActive !== false && child.productCount > 0,
  );

export const getCategoryHref = (category: Category, rootSlug: string): string => {
  if (category.slug === rootSlug) return `/${rootSlug}`;
  if (category.parentSlug === rootSlug) return `/${rootSlug}/${category.slug}`;
  return `/products?category=${encodeURIComponent(category.slug)}`;
};

export const getNavigationBrands = (products: Product[]): string[] =>
  [...new Set(
    products
      .filter((product) => product.status === undefined || product.status === 'ACTIVE')
      .map((product) => product.brand.trim())
      .filter(Boolean),
  )].sort((left, right) => left.localeCompare(right));

export const getFeaturedProduct = (products: Product[]): Product | undefined =>
  products.find(
    (product) =>
      product.isFeatured &&
      (product.status === undefined || product.status === 'ACTIVE'),
  );

export const hasProductDiscount = (product: Product): boolean => {
  const activeVariants = (product.variants ?? []).filter((variant) => variant.isActive);
  if (activeVariants.length > 0) {
    return activeVariants.some(
      (variant) => variant.originalPrice !== undefined && variant.originalPrice > variant.price,
    );
  }

  return product.originalPrice !== undefined && product.originalPrice > product.price;
};

export const getFeaturedVariantLabel = (product: Product): string | undefined => {
  const activeVariants = (product.variants ?? []).filter((variant) => variant.isActive);
  const selectedVariant = activeVariants.sort((left, right) => left.price - right.price)[0];

  return selectedVariant?.title || selectedVariant?.storage || product.specifications.storage;
};

const gadgetGroupMatchers: Array<{ label: string; matches: RegExp }> = [
  { label: 'Audio', matches: /earbud|tws|headphone|earphone|handsfree|neckband|speaker/ },
  { label: 'Power & Charging', matches: /charger|power-bank|charging-cable/ },
  { label: 'Mobile Accessories', matches: /case|cover|screen-protector|phone-holder|stand|car-accessor/ },
];

export const getGadgetGroup = (category: Category): string => {
  const identity = `${category.slug} ${category.name}`.toLowerCase();
  return gadgetGroupMatchers.find((group) => group.matches.test(identity))?.label ?? 'More gadgets';
};

export const getGadgetGroups = (categories: Category[]) => {
  const groups = new Map<string, Category[]>();

  categories.forEach((category) => {
    const group = getGadgetGroup(category);
    groups.set(group, [...(groups.get(group) ?? []), category]);
  });

  return ['Audio', 'Power & Charging', 'Mobile Accessories', 'More gadgets']
    .map((label) => ({ label, categories: groups.get(label) ?? [] }))
    .filter((group) => group.categories.length > 0);
};
