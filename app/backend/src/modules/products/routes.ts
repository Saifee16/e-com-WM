import type { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import path from 'node:path';
import { prisma } from '../../db/prisma.js';
import { aggregateCategoryProductCounts } from './category-tree.js';
import { env } from '../../config/env.js';
import { fail, ok } from '../../utils/responses.js';
import { authenticateCustomer, requireChangedAdminPassword } from '../auth/session.js';
import { MAX_PRODUCT_IMAGES, deleteOwnedProductImageUrls, saveProductImages } from './image-upload.js';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const productInclude = {
  brand: true,
  category: true,
  images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] },
  variants: { orderBy: { createdAt: 'asc' } },
  reviews: { where: { isApproved: true }, orderBy: { createdAt: 'desc' } },
} satisfies Prisma.ProductInclude;

export type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

const categoryListInclude = {
  parent: { select: { id: true, name: true, slug: true } },
  _count: { select: { products: { where: { status: 'ACTIVE' } } } },
} satisfies Prisma.CategoryInclude;

type CategoryWithRelations = Prisma.CategoryGetPayload<{ include: typeof categoryListInclude }>;

export interface CategoryNode {
  id: string;
  parentId: string | null;
  parentSlug: string | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  children: CategoryNode[];
}

const mapCategory = (category: CategoryWithRelations): CategoryNode => ({
  id: category.id,
  parentId: category.parentId,
  parentSlug: category.parent?.slug ?? null,
  name: category.name,
  slug: category.slug,
  description: category.description,
  imageUrl: category.imageUrl,
  sortOrder: category.sortOrder,
  isActive: category.isActive,
  productCount: category._count.products,
  children: [],
});

const getCategoryTree = async (activeOnly: boolean) => {
  const categories = await prisma.category.findMany({
    where: activeOnly ? { isActive: true } : {},
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: categoryListInclude,
  });
  const nodes = new Map(categories.map((category) => [category.id, mapCategory(category)]));
  const roots: CategoryNode[] = [];

  for (const category of categories) {
    const node = nodes.get(category.id)!;
    const parent: CategoryNode | undefined = category.parentId ? nodes.get(category.parentId) : undefined;
    if (parent) parent.children.push(node);
    else if (!activeOnly || !category.parentId) roots.push(node);
  }

  aggregateCategoryProductCounts(roots);
  return roots;
};

const legacyCategoryAliases: Record<string, string[]> = {
  phones: ['smartphones', 'iphone', 'android'],
  smartphones: ['phones'],
  'smart-watches': ['wearables', 'fitness-bands', 'calling-watches'],
  gadgets: [
    'wireless-earbuds',
    'headphones',
    'speakers',
    'power-banks',
    'chargers',
    'charging-cables',
    'mobile-accessories',
  ],
};

const getCategoryDescendantIds = async (slug: string) => {
  const categorySlugs = [slugify(slug), ...(legacyCategoryAliases[slugify(slug)] ?? [])];
  const roots = await prisma.category.findMany({
    where: { slug: { in: categorySlugs }, isActive: true },
    select: { id: true },
  });
  if (roots.length === 0) return [];

  const ids = roots.map((root) => root.id);
  const seen = new Set(ids);
  let frontier = [...ids];
  while (frontier.length) {
    const children = await prisma.category.findMany({
      where: { parentId: { in: frontier }, isActive: true },
      select: { id: true },
    });
    frontier = children.map((category) => category.id).filter((id) => !seen.has(id));
    frontier.forEach((id) => seen.add(id));
    ids.push(...frontier);
  }

  return ids;
};

const asStringRecord = (value: unknown) =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
    : {};

const variantTitle = (variant: { title: string; storage: string | null; color: string | null; condition: string | null; options: unknown }) => {
  if (variant.title.trim()) return variant.title;
  return [variant.storage, variant.color, variant.condition, ...Object.values(asStringRecord(variant.options))]
    .filter(Boolean)
    .join(' / ') || 'Default';
};

const availableVariantStock = (variant: { stockQuantity: number; reservedQuantity: number }) =>
  Math.max(0, variant.stockQuantity - variant.reservedQuantity);

export const mapProduct = (
  product: ProductWithRelations,
  includeInactiveVariants = false,
  preferredVariantIds?: ReadonlySet<string>,
) => {
  const availableVariants = product.variants.filter((item) => item.isActive);
  const variants = includeInactiveVariants ? product.variants : availableVariants;
  const pricingVariants = availableVariants.length ? availableVariants : product.variants;
  const matchingPricingVariants = preferredVariantIds
    ? pricingVariants.filter((item) => preferredVariantIds.has(item.id))
    : pricingVariants;
  const variantPool = matchingPricingVariants.length ? matchingPricingVariants : pricingVariants;
  const variant = variantPool.reduce<typeof pricingVariants[number] | undefined>(
    (lowest, item) => !lowest || item.priceAmount < lowest.priceAmount ? item : lowest,
    undefined,
  );
  const storedSpecifications =
    product.specifications && typeof product.specifications === 'object' && !Array.isArray(product.specifications)
      ? product.specifications as Record<string, unknown>
      : {};
  const stringSpecifications = asStringRecord(storedSpecifications);
  const commonImages = product.images.filter((image) => !image.variantId);
  const primaryImage = commonImages[0]?.url ?? product.images[0]?.url ?? 'https://placehold.co/800x800?text=Product';
  const rating =
    product.reviews.length > 0
      ? product.reviews.reduce((total, review) => total + review.rating, 0) / product.reviews.length
      : null;

  return {
    _id: product.id,
    id: product.id,
    name: product.name,
    slug: product.slug,
    brand: product.brand.name,
    brandSlug: product.brand.slug,
    description: product.description,
    price: variant?.priceAmount ?? 0,
    originalPrice: variant?.compareAtPriceAmount ?? undefined,
    images: commonImages.length > 0 ? commonImages.map((image) => image.url) : [primaryImage],
    category: product.category.slug,
    categoryName: product.category.name,
    specifications: {
      ...stringSpecifications,
      storage: variant?.storage ?? stringSpecifications.storage,
      color: variant?.color ?? stringSpecifications.color,
    },
    condition: (variant?.condition ?? 'new') as 'new' | 'used' | 'refurbished',
    ptaApproved: product.ptaApproved,
    countInStock: availableVariants.reduce((total, item) => total + availableVariantStock(item), 0),
    rating: rating === null ? null : Number(rating.toFixed(1)),
    numReviews: product.reviews.length,
    reviews: product.reviews.map((review) => ({
      _id: review.id,
      user: review.userId,
      name: 'Customer',
      rating: review.rating,
      comment: review.body,
      createdAt: review.createdAt.toISOString(),
    })),
    isFeatured: product.isFeatured,
    tags: [product.brand.slug, product.category.slug],
    status: product.status,
    createdAt: product.createdAt.toISOString(),
    variants: variants.map((item) => {
      const variantImages = product.images.filter((image) => image.variantId === item.id).map((image) => image.url);
      return {
        id: item.id,
        sku: item.sku,
        title: variantTitle(item),
        storage: item.storage ?? undefined,
        color: item.color ?? undefined,
        condition: item.condition as 'new' | 'used' | 'refurbished' | null,
        options: asStringRecord(item.options),
        price: item.priceAmount,
        originalPrice: item.compareAtPriceAmount ?? undefined,
        countInStock: item.stockQuantity,
        availableCountInStock: availableVariantStock(item),
        isActive: item.isActive,
        images: variantImages,
        image: variantImages[0] ?? primaryImage,
      };
    }),
  };
};

const productQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  search: z.string().trim().max(200).optional(),
  brand: z.string().trim().optional(),
  category: z.string().trim().optional(),
  featured: z.coerce.boolean().optional(),
  sort: z.enum(['newest', 'price-low', 'price-high', 'rating']).default('newest'),
  page: z.coerce.number().int().positive().max(10_000).default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  storage: z.string().trim().min(1).max(40).optional(),
  condition: z.enum(['new', 'used', 'refurbished']).optional(),
  discounted: z.coerce.boolean().optional(),
  ptaApproved: z.coerce.boolean().optional(),
}).refine(
  (query) => query.minPrice === undefined || query.maxPrice === undefined || query.minPrice <= query.maxPrice,
  {
    message: 'minPrice cannot be greater than maxPrice',
    path: ['minPrice'],
  },
);

const normalizeSearch = (value: string | undefined) => value
  ?.replace(/[\\%_*]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 200);

const getJsonSearchMatchIds = async (term: string) => {
  const pattern = `%${term}%`;
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT DISTINCT p.id
    FROM "products" AS p
    LEFT JOIN "product_variants" AS pv ON pv.product_id = p.id
    WHERE p.specifications::text ILIKE ${pattern}
       OR pv.options::text ILIKE ${pattern}
  `);
  return rows.map((row) => row.id);
};

const searchTermFilters = (term: string, jsonMatchIds: string[]): Prisma.ProductWhereInput[] => [
  { name: { contains: term, mode: 'insensitive' } },
  { slug: { contains: term, mode: 'insensitive' } },
  { description: { contains: term, mode: 'insensitive' } },
  { shortDescription: { contains: term, mode: 'insensitive' } },
  { brand: { name: { contains: term, mode: 'insensitive' } } },
  { brand: { slug: { contains: term, mode: 'insensitive' } } },
  { category: { name: { contains: term, mode: 'insensitive' } } },
  { category: { slug: { contains: term, mode: 'insensitive' } } },
  ...(jsonMatchIds.length > 0 ? [{ id: { in: jsonMatchIds } }] : []),
  {
    variants: {
      some: {
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { storage: { contains: term, mode: 'insensitive' } },
          { color: { contains: term, mode: 'insensitive' } },
          { condition: { contains: term, mode: 'insensitive' } },
        ],
      },
    },
  },
];

const productUploadUrlPrefix = `${env.API_BASE_URL.replace(/\/+$/, '')}/api/uploads/products/`;
const cloudinaryImageUrlPrefix = env.CLOUDINARY_CLOUD_NAME
  ? `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/`
  : null;
const productImageStorageProvider = env.PRODUCT_IMAGE_STORAGE ?? (env.NODE_ENV === 'production' ? 'cloudinary' : 'local');
const cloudinaryFolder = env.CLOUDINARY_UPLOAD_FOLDER.replace(/^\/+|\/+$/g, '');

const isAllowedProductImageUrl = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== 'https:' && !value.startsWith(productUploadUrlPrefix)) return false;
  if (value.startsWith(productUploadUrlPrefix)) return true;
  if (productImageStorageProvider !== 'cloudinary') return true;
  if (!cloudinaryImageUrlPrefix || !value.startsWith(cloudinaryImageUrlPrefix)) return false;

  let afterUpload: string;
  try {
    afterUpload = decodeURIComponent(url.pathname.split('/image/upload/')[1] ?? '');
  } catch {
    return false;
  }
  const parts = afterUpload.split('/').filter(Boolean);
  const versionlessParts = parts[0] && /^v\d+$/.test(parts[0]) ? parts.slice(1) : parts;
  return versionlessParts.join('/').startsWith(`${cloudinaryFolder}/`);
};

const imageUrlSchema = z.string().url().max(2048).refine(
  isAllowedProductImageUrl,
  productImageStorageProvider === 'cloudinary'
    ? 'Product image URLs must be uploaded Cloudinary product images'
    : 'Product image URLs must use HTTPS',
);

const productSpecificationsSchema = z.record(
  z.string().trim().min(1).max(80),
  z.string().trim().min(1).max(240),
).superRefine((specifications, context) => {
  if (Object.keys(specifications).length > 40) {
    context.addIssue({ code: 'custom', message: 'You can add up to 40 product specifications' });
  }
});

const variantOptionsSchema = z.record(
  z.string().trim().min(1).max(80),
  z.string().trim().min(1).max(120),
);

const productVariantPayloadSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().trim().min(1).max(120).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  storage: z.string().trim().min(1).max(40).optional(),
  color: z.string().trim().min(1).max(80).optional(),
  condition: z.enum(['new', 'used', 'refurbished']).optional(),
  options: variantOptionsSchema.optional(),
  price: z.number().int().nonnegative(),
  originalPrice: z.number().int().nonnegative().optional(),
  countInStock: z.number().int().nonnegative(),
  isActive: z.boolean().default(true),
  imageUrl: imageUrlSchema.optional(),
}).superRefine((variant, context) => {
  if (variant.originalPrice !== undefined && variant.originalPrice <= variant.price) {
    context.addIssue({ code: 'custom', path: ['originalPrice'], message: 'Regular price must be greater than the sale price' });
  }
});

type ProductVariantPayload = z.infer<typeof productVariantPayloadSchema>;

const validateVariantPayloads = (variants: ProductVariantPayload[] | undefined, context: z.RefinementCtx) => {
  if (!variants) return;
  const seenCombinations = new Set<string>();
  const seenSkus = new Set<string>();
  variants.forEach((variant, index) => {
    const options = Object.fromEntries(Object.entries(variant.options ?? {}).sort(([left], [right]) => left.localeCompare(right)));
    const combination = JSON.stringify({
      storage: variant.storage ?? '',
      color: variant.color ?? '',
      condition: variant.condition ?? '',
      options,
    });
    if (seenCombinations.has(combination)) {
      context.addIssue({ code: 'custom', path: ['variants', index], message: 'Variant combinations must be unique' });
    }
    seenCombinations.add(combination);
    if (variant.sku) {
      if (seenSkus.has(variant.sku)) {
        context.addIssue({ code: 'custom', path: ['variants', index, 'sku'], message: 'Variant SKUs must be unique' });
      }
      seenSkus.add(variant.sku);
    }
  });
};

const productPayloadSchema = z.object({
  name: z.string().trim().min(1).max(200),
  brand: z.string().trim().min(1).max(80).refine(
    (brand) => brand.toLowerCase() !== 'other',
    'Choose a specific brand name instead of the Other placeholder',
  ),
  category: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(5000),
  price: z.number().int().nonnegative(),
  originalPrice: z.number().int().nonnegative().optional(),
  imageUrl: imageUrlSchema.optional(),
  images: z.array(imageUrlSchema).max(5, 'You can add up to 5 product images').optional(),
  storage: z.string().trim().min(1).max(40).optional(),
  color: z.string().trim().min(1).max(80).optional(),
  specifications: productSpecificationsSchema.optional(),
  condition: z.enum(['new', 'used', 'refurbished']).default('new'),
  countInStock: z.number().int().nonnegative().default(0),
  ptaApproved: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED', 'DISCARDED']).default('ACTIVE'),
  variants: z.array(productVariantPayloadSchema).min(1).max(100).optional(),
}).strict();

const categoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(120).optional(),
  parentId: z.string().uuid().nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  imageUrl: z.string().url().max(2048).nullable().optional(),
  sortOrder: z.number().int().min(0).max(100_000).default(0),
  isActive: z.boolean().default(true),
}).strict();

const categoryUpdateSchema = categoryCreateSchema.partial();

const findCategoryByIdentity = async (identity: string) => {
  const isUuid = z.string().uuid().safeParse(identity).success;
  return prisma.category.findFirst({
    where: {
      OR: [...(isUuid ? [{ id: identity }] : []), { slug: slugify(identity) }],
    },
  });
};

const validateCategoryParent = async (parentId: string | null | undefined, categoryId?: string) => {
  if (parentId === null || parentId === undefined) return null;
  const visited = new Set<string>();
  let currentId: string | null = parentId;

  while (currentId) {
    if (currentId === categoryId) return 'A category cannot be its own ancestor';
    if (visited.has(currentId)) return 'Category hierarchy contains a cycle';
    visited.add(currentId);
    const parent: { id: string; parentId: string | null } | null = await prisma.category.findUnique({
      where: { id: currentId },
      select: { id: true, parentId: true },
    });
    if (!parent) return 'Parent category not found';
    currentId = parent.parentId;
  }

  return null;
};

const productCreateSchema = productPayloadSchema.refine(
  (product) => product.originalPrice === undefined || product.originalPrice > product.price,
  {
    message: 'Regular price must be greater than the sale price',
    path: ['originalPrice'],
  },
).superRefine((product, context) => validateVariantPayloads(product.variants, context));

const productUpdateSchema = productPayloadSchema.partial().superRefine((product, context) => validateVariantPayloads(product.variants, context));

const createVariantData = (variant: ProductVariantPayload, slug: string, index: number) => ({
  sku: variant.sku ?? `${slug.toUpperCase()}-${index + 1}-${randomUUID().slice(0, 8).toUpperCase()}`,
  title: (variant.title ?? [variant.storage, variant.color, variant.condition, ...Object.values(variant.options ?? {})].filter(Boolean).join(' / ')) || 'Default',
  ...(variant.storage ? { storage: variant.storage } : {}),
  ...(variant.color ? { color: variant.color } : {}),
  ...(variant.condition ? { condition: variant.condition } : {}),
  ...(variant.options ? { options: variant.options } : {}),
  priceAmount: variant.price,
  ...(variant.originalPrice !== undefined ? { compareAtPriceAmount: variant.originalPrice } : {}),
  stockQuantity: variant.countInStock,
  isActive: variant.isActive,
});

const legacyVariantPayload = (body: z.infer<typeof productPayloadSchema>): ProductVariantPayload => ({
  title: body.storage ?? 'Default',
  ...(body.storage ? { storage: body.storage } : {}),
  ...(body.color ? { color: body.color } : {}),
  condition: body.condition,
  price: body.price,
  ...(body.originalPrice !== undefined ? { originalPrice: body.originalPrice } : {}),
  countInStock: body.countInStock,
  isActive: true,
});

const getOrCreateBrand = async (name: string) => {
  const slug = slugify(name);

  return prisma.brand.upsert({
    where: { slug },
    update: { name, isActive: true },
    create: { name, slug },
  });
};

const getUniqueProductSlug = async (name: string, currentId?: string) => {
  const base = slugify(name);
  let slug = base;
  let index = 2;

  while (true) {
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (!existing || existing.id === currentId) {
      return slug;
    }

    slug = `${base}-${index}`;
    index += 1;
  }
};

export const productRoutes: FastifyPluginAsync = async (app) => {
  app.get('/brands', async (_request, reply) => {
    const brands = await prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: { where: { status: 'ACTIVE' } } } } },
    });

    return ok(
      reply,
      brands.map((brand) => ({
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        logoUrl: brand.logoUrl,
        productCount: brand._count.products,
      })),
    );
  });

  app.get('/categories', async (_request, reply) => {
    return ok(reply, await getCategoryTree(true));
  });

  app.get('/', async (request, reply) => {
    const query = productQuerySchema.parse(request.query);
    const categoryIds = query.category ? await getCategoryDescendantIds(query.category) : undefined;
    const searchValue = normalizeSearch(query.q ?? query.search);
    const searchTerms = searchValue?.split(' ').filter(Boolean) ?? [];
    const jsonMatchIdsByTerm = new Map<string, string[]>();
    await Promise.all(searchTerms.map(async (term) => {
      jsonMatchIdsByTerm.set(term, await getJsonSearchMatchIds(term));
    }));
    const brandSlugs = query.brand
      ?.split(',')
      .map((brand) => slugify(brand))
      .filter(Boolean);
    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
      ...(query.featured === true ? { isFeatured: true } : {}),
      ...(query.ptaApproved !== undefined ? { ptaApproved: query.ptaApproved } : {}),
      ...(brandSlugs?.length ? { brand: { slug: { in: brandSlugs } } } : {}),
      ...(query.category ? { categoryId: { in: categoryIds ?? [] } } : {}),
      ...(
        query.minPrice !== undefined
        || query.maxPrice !== undefined
        || query.storage !== undefined
        || query.condition !== undefined
        || query.discounted === true
          ? {
              variants: {
                some: {
                  isActive: true,
                  ...(query.minPrice !== undefined || query.maxPrice !== undefined
                    ? {
                        priceAmount: {
                          ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
                          ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
                        },
                      }
                    : {}),
                  ...(query.storage !== undefined ? { storage: query.storage } : {}),
                  ...(query.condition !== undefined ? { condition: query.condition } : {}),
                  ...(query.discounted === true ? { compareAtPriceAmount: { not: null } } : {}),
                },
              },
            }
          : {}
      ),
      ...(searchTerms.length > 0
        ? {
            AND: searchTerms.map((term) => ({ OR: searchTermFilters(term, jsonMatchIdsByTerm.get(term) ?? []) })),
          }
        : {}),
    };

    const databasePaginated = query.sort === 'newest' && query.discounted === undefined;
    const databaseTotal = databasePaginated ? await prisma.product.count({ where }) : null;
    const products = await prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      ...(databasePaginated
        ? { skip: (query.page - 1) * query.limit, take: query.limit }
        : {}),
    });

    const hasVariantFilter =
      query.minPrice !== undefined
      || query.maxPrice !== undefined
      || query.storage !== undefined
      || query.condition !== undefined;
    const filtered = products.map((product) => {
      const preferredVariantIds = hasVariantFilter
        ? new Set(
            product.variants
              .filter((variant) =>
                variant.isActive
                && (query.minPrice === undefined || variant.priceAmount >= query.minPrice)
                && (query.maxPrice === undefined || variant.priceAmount <= query.maxPrice)
                && (query.storage === undefined || variant.storage === query.storage)
                && (query.condition === undefined || variant.condition === query.condition)
                && (query.discounted === undefined
                  || (variant.compareAtPriceAmount !== null && variant.compareAtPriceAmount > variant.priceAmount) === query.discounted),
              )
              .map((variant) => variant.id),
          )
        : undefined;
      return mapProduct(product, false, preferredVariantIds);
    }).filter((product) => {
      if (query.discounted === undefined) return true;
      const activeVariants = product.variants.filter((variant) => variant.isActive);
      return activeVariants.some(
        (variant) => (variant.originalPrice !== undefined && variant.originalPrice > variant.price) === query.discounted,
      );
    });

    filtered.sort((left, right) => {
      let comparison = 0;

      if (query.sort === 'price-low') {
        comparison = left.price - right.price;
      } else if (query.sort === 'price-high') {
        comparison = right.price - left.price;
      } else if (query.sort === 'rating') {
        comparison = (right.rating ?? 0) - (left.rating ?? 0);
      } else {
        comparison = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }

      return comparison || left.id.localeCompare(right.id);
    });

    const total = databaseTotal ?? filtered.length;
    const totalPages = Math.ceil(total / query.limit);
    const offset = (query.page - 1) * query.limit;
    const items = databasePaginated ? filtered : filtered.slice(offset, offset + query.limit);

    return ok(reply, {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasPreviousPage: query.page > 1,
        hasNextPage: query.page < totalPages,
      },
    });
  });

  app.get('/featured', async (_request, reply) => {
    const products = await prisma.product.findMany({
      where: { status: 'ACTIVE', isFeatured: true },
      include: productInclude,
      take: 8,
      orderBy: { createdAt: 'desc' },
    });

    return ok(reply, products.map((p) => mapProduct(p)));
  });

  app.get('/brand/:brand', async (request, reply) => {
    const params = z.object({ brand: z.string().min(1) }).parse(request.params);
    const products = await prisma.product.findMany({
      where: { status: 'ACTIVE', brand: { slug: slugify(params.brand) } },
      include: productInclude,
      orderBy: { createdAt: 'desc' },
    });

    return ok(reply, products.map((p) => mapProduct(p)));
  });

  app.post('/:id/reviews', { preHandler: authenticateCustomer }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({
      rating: z.coerce.number().int().min(1).max(5),
      title: z.string().trim().min(1).max(120).optional(),
      body: z.string().trim().min(2).max(2000),
    }).parse(request.body);
    const product = await prisma.product.findFirst({ where: { id: params.id, status: 'ACTIVE' } });
    if (!product) return fail(reply, 404, { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' });
    const existing = await prisma.review.findUnique({
      where: { userId_productId: { userId: request.authUser!.id, productId: params.id } },
    });
    if (existing) return fail(reply, 409, { code: 'REVIEW_EXISTS', message: 'You have already reviewed this product' });
    const verifiedPurchase = await prisma.order.count({
      where: { userId: request.authUser!.id, status: 'DELIVERED', items: { some: { productId: params.id } } },
    });
    const review = await prisma.review.create({
      data: {
        userId: request.authUser!.id,
        productId: params.id,
        rating: body.rating,
        ...(body.title ? { title: body.title } : {}),
        body: body.body,
        isVerifiedPurchase: verifiedPurchase > 0,
        isApproved: true,
      },
    });
    return ok(reply.status(201), {
      id: review.id,
      rating: review.rating,
      title: review.title,
      body: review.body,
      isVerifiedPurchase: review.isVerifiedPurchase,
      createdAt: review.createdAt.toISOString(),
    });
  });

  app.get('/:id', async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const isUuid = z.string().uuid().safeParse(params.id).success;
    const product = await prisma.product.findFirst({
      where: {
        OR: [...(isUuid ? [{ id: params.id }] : []), { slug: params.id }],
      },
      include: productInclude,
    });

    if (!product || product.status !== 'ACTIVE') {
      return fail(reply, 404, {
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found',
      });
    }

    return ok(reply, mapProduct(product));
  });
};

interface AdminProductRoutesOptions {
  uploadDirectory: string;
}

export const adminProductRoutes: FastifyPluginAsync<AdminProductRoutesOptions> = async (app, options) => {
  app.addHook('preHandler', requireChangedAdminPassword);
  const localImageStorageOptions = {
    uploadDirectory: path.join(options.uploadDirectory, 'products'),
    publicApiBaseUrl: env.API_BASE_URL,
  };

  app.get('/categories', async (_request, reply) => {
    return ok(reply, await getCategoryTree(true));
  });

  // Independent from page data: a brand can be selected even when it has no
  // product in the currently loaded page.
  app.get('/brands', async (_request, reply) => {
    const brands = await prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    });
    return ok(reply, brands);
  });

  app.post('/categories', async (request, reply) => {
    const body = categoryCreateSchema.parse(request.body);
    const slug = slugify(body.slug ?? body.name);
    if (!slug) return fail(reply, 400, { code: 'INVALID_CATEGORY', message: 'Category slug is invalid' });
    const parentError = await validateCategoryParent(body.parentId);
    if (parentError) return fail(reply, 400, { code: 'INVALID_CATEGORY_PARENT', message: parentError });
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) return fail(reply, 409, { code: 'CATEGORY_EXISTS', message: 'A category with this slug already exists' });

    const category = await prisma.category.create({
      data: {
        name: body.name,
        slug,
        ...(body.parentId !== undefined ? { parentId: body.parentId } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
        sortOrder: body.sortOrder,
        isActive: body.isActive,
      },
    });
    const created = await prisma.category.findUniqueOrThrow({ where: { id: category.id }, include: categoryListInclude });
    await prisma.auditLog.create({
      data: {
        actorUserId: request.authUser!.id,
        action: 'CREATE',
        entityType: 'Category',
        entityId: category.id,
        after: mapCategory(created) as unknown as Prisma.InputJsonValue,
      },
    });
    return ok(reply.status(201), mapCategory(created));
  });

  app.put('/categories/:id', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = categoryUpdateSchema.parse(request.body);
    const existing = await prisma.category.findUnique({ where: { id: params.id }, include: categoryListInclude });
    if (!existing) return fail(reply, 404, { code: 'CATEGORY_NOT_FOUND', message: 'Category not found' });

    const nextName = body.name ?? existing.name;
    const slug = slugify(body.slug ?? (body.name !== undefined ? body.name : existing.slug));
    if (!slug) return fail(reply, 400, { code: 'INVALID_CATEGORY', message: 'Category slug is invalid' });
    const parentId = body.parentId !== undefined ? body.parentId : existing.parentId;
    const parentError = await validateCategoryParent(parentId, existing.id);
    if (parentError) return fail(reply, 400, { code: 'INVALID_CATEGORY_PARENT', message: parentError });
    const slugConflict = await prisma.category.findFirst({ where: { slug, id: { not: existing.id } }, select: { id: true } });
    if (slugConflict) return fail(reply, 409, { code: 'CATEGORY_EXISTS', message: 'A category with this slug already exists' });

    const updated = await prisma.category.update({
      where: { id: existing.id },
      data: {
        name: nextName,
        slug,
        parentId,
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });
    const refreshed = await prisma.category.findUniqueOrThrow({ where: { id: updated.id }, include: categoryListInclude });
    await prisma.auditLog.create({
      data: {
        actorUserId: request.authUser!.id,
        action: 'UPDATE',
        entityType: 'Category',
        entityId: updated.id,
        before: mapCategory(existing) as unknown as Prisma.InputJsonValue,
        after: mapCategory(refreshed) as unknown as Prisma.InputJsonValue,
      },
    });
    return ok(reply, mapCategory(refreshed));
  });

  app.post('/images', async (request, reply) => {
    const urls = await saveProductImages(request, localImageStorageOptions);
    return ok(reply.status(201), { urls });
  });

  app.delete('/images', async (request, reply) => {
    const body = z.object({
      productId: z.string().uuid(),
      urls: z.array(imageUrlSchema).min(1).max(MAX_PRODUCT_IMAGES),
    }).parse(request.body);
    const urls = [...new Set(body.urls)];
    const ownedImages = await prisma.productImage.findMany({
      where: { productId: body.productId, url: { in: urls } },
      select: { url: true },
    });
    if (ownedImages.length !== urls.length) {
      return fail(reply, 404, {
        code: 'PRODUCT_IMAGE_NOT_FOUND',
        message: 'Every image must belong to the selected product',
      });
    }

    await deleteOwnedProductImageUrls(urls, localImageStorageOptions);
    await prisma.productImage.deleteMany({ where: { productId: body.productId, url: { in: urls } } });
    return ok(reply, { deleted: true });
  });

  app.get('/', async (request, reply) => {
    const query = z.object({
      q: z.string().trim().max(200).optional(),
      search: z.string().trim().max(200).optional(),
      status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED', 'DISCARDED']).optional(),
      brand: z.string().trim().min(1).max(120).optional(),
      page: z.coerce.number().int().positive().max(10_000).default(1),
      limit: z.coerce.number().int().positive().max(100).default(50),
    }).parse(request.query);
    const searchValue = normalizeSearch(query.q ?? query.search);
    const searchTerms = searchValue?.split(' ').filter(Boolean) ?? [];
    const jsonMatchIdsByTerm = new Map<string, string[]>();
    await Promise.all(searchTerms.map(async (term) => {
      jsonMatchIdsByTerm.set(term, await getJsonSearchMatchIds(term));
    }));
    const where: Prisma.ProductWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.brand ? { brand: { slug: slugify(query.brand) } } : {}),
      ...(searchTerms.length > 0
        ? {
            AND: searchTerms.map((term) => ({ OR: searchTermFilters(term, jsonMatchIdsByTerm.get(term) ?? []) })),
          }
        : {}),
    };
    const [total, products, statusCounts] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.product.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    return ok(reply, {
      items: products.map((product) => mapProduct(product, true)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
      statusCounts: (() => {
        const counts = { ALL: 0, ACTIVE: 0, DRAFT: 0, ARCHIVED: 0, DISCARDED: 0 };
        for (const item of statusCounts) counts[item.status] = item._count._all;
        counts.ALL = counts.ACTIVE + counts.DRAFT + counts.ARCHIVED + counts.DISCARDED;
        return counts;
      })(),
    });
  });

  app.post('/', async (request, reply) => {
    const body = productCreateSchema.parse(request.body);
    const brand = await getOrCreateBrand(body.brand);
    const category = await findCategoryByIdentity(body.category);
    if (!category) return fail(reply, 400, { code: 'INVALID_CATEGORY', message: 'Select an existing category' });
    const slug = await getUniqueProductSlug(body.name);
    const imageUrls = body.images?.length ? body.images : body.imageUrl ? [body.imageUrl] : [];
    const variantPayloads = body.variants?.length ? body.variants : [legacyVariantPayload(body)];
    const variantData = variantPayloads.map((variant, index) => createVariantData(variant, slug, index));

    const product = await prisma.product.create({
      data: {
        name: body.name,
        slug,
        brand: { connect: { id: brand.id } },
        category: { connect: { id: category.id } },
        description: body.description,
        shortDescription: body.description.slice(0, 140),
        status: body.status,
        isFeatured: body.isFeatured,
        ptaApproved: body.ptaApproved,
        ...(body.specifications ? { specifications: body.specifications } : {}),
        variants: {
          create: variantData,
        },
        ...(imageUrls.length > 0
          ? {
              images: {
                create: imageUrls.map((url, index) => ({
                  url,
                  altText: body.name,
                  sortOrder: index,
                  isPrimary: index === 0,
                })),
              },
            }
          : {}),
      },
      include: productInclude,
    });
    const variantImageData = variantPayloads.flatMap((variant, index) =>
      variant.imageUrl
        ? [{ productId: product.id, variantId: product.variants[index]!.id, url: variant.imageUrl, altText: body.name }]
        : [],
    );
    if (variantImageData.length) {
      await prisma.productImage.createMany({ data: variantImageData });
    }
    const createdProduct = variantImageData.length
      ? await prisma.product.findUniqueOrThrow({ where: { id: product.id }, include: productInclude })
      : product;

    await prisma.auditLog.create({
      data: {
        actorUserId: request.authUser!.id,
        action: 'CREATE',
        entityType: 'Product',
        entityId: createdProduct.id,
        after: mapProduct(createdProduct, true),
      },
    });

    return ok(reply.status(201), mapProduct(createdProduct, true));
  });

  app.put('/:id', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = productUpdateSchema.parse(request.body);
    const existing = await prisma.product.findUnique({
      where: { id: params.id },
      include: productInclude,
    });

    if (!existing) {
      return fail(reply, 404, {
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found',
      });
    }

    const brand = body.brand ? await getOrCreateBrand(body.brand) : null;
    const category = body.category ? await findCategoryByIdentity(body.category) : null;
    if (body.category && !category) return fail(reply, 400, { code: 'INVALID_CATEGORY', message: 'Select an existing category' });
    const slug = body.name ? await getUniqueProductSlug(body.name, params.id) : existing.slug;
    const variant = existing.variants[0];

    if (
      variant
      && (body.originalPrice ?? variant.compareAtPriceAmount) !== null
      && (body.originalPrice ?? variant.compareAtPriceAmount)! <= (body.price ?? variant.priceAmount)
    ) {
      return fail(reply, 400, {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: [{ path: ['originalPrice'], message: 'Regular price must be greater than the sale price' }],
      });
    }

    if (body.variants !== undefined) {
      const requestedIds = new Set(body.variants.flatMap((item) => item.id ? [item.id] : []));
      const existingIds = new Set(existing.variants.map((item) => item.id));
      if ([...requestedIds].some((id) => !existingIds.has(id))) {
        return fail(reply, 400, {
          code: 'VALIDATION_ERROR',
          message: 'A variant does not belong to this product',
        });
      }

      await prisma.$transaction(async (tx) => {
        for (const [index, requested] of body.variants!.entries()) {
          const data = createVariantData(requested, slug, index);
          const { sku, ...variantData } = data;
          if (requested.id) {
            await tx.productVariant.update({
              where: { id: requested.id },
              data: {
                ...variantData,
                ...(requested.sku ? { sku } : {}),
              },
            });
            if (requested.imageUrl) {
              await tx.productImage.deleteMany({ where: { productId: params.id, variantId: requested.id } });
              await tx.productImage.create({
                data: { productId: params.id, variantId: requested.id, url: requested.imageUrl, altText: body.name ?? existing.name },
              });
            }
          } else {
            const createdVariant = await tx.productVariant.create({ data: { productId: params.id, ...data } });
            if (requested.imageUrl) {
              await tx.productImage.create({
                data: { productId: params.id, variantId: createdVariant.id, url: requested.imageUrl, altText: body.name ?? existing.name },
              });
            }
          }
        }

      });
    } else if (variant) {
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: {
          ...(body.storage !== undefined ? { storage: body.storage, title: body.storage || variant.title } : {}),
          ...(body.color !== undefined ? { color: body.color } : {}),
          ...(body.condition !== undefined ? { condition: body.condition } : {}),
          ...(body.price !== undefined ? { priceAmount: body.price } : {}),
          ...(body.originalPrice !== undefined ? { compareAtPriceAmount: body.originalPrice } : {}),
          ...(body.countInStock !== undefined ? { stockQuantity: body.countInStock } : {}),
        },
      });
    }

    const imageUrls = body.images !== undefined ? body.images : body.imageUrl ? [body.imageUrl] : null;
    const existingCommonImages = existing.images.filter((image) => !image.variantId);
    const removedImageUrls = imageUrls === null
      ? []
      : existingCommonImages.map((image) => image.url).filter((url) => !imageUrls.includes(url));
    if (imageUrls !== null) {
      await prisma.productImage.deleteMany({ where: { productId: params.id, variantId: null } });
      if (imageUrls.length) {
        await prisma.productImage.createMany({
          data: imageUrls.map((url, index) => ({
            productId: params.id,
            url,
            altText: body.name ?? existing.name,
            sortOrder: index,
            isPrimary: index === 0,
          })),
        });
      }
    }

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: {
        slug,
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(brand ? { brand: { connect: { id: brand.id } } } : {}),
        ...(category ? { category: { connect: { id: category.id } } } : {}),
        ...(body.description !== undefined
          ? { description: body.description, shortDescription: body.description.slice(0, 140) }
          : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.isFeatured !== undefined ? { isFeatured: body.isFeatured } : {}),
        ...(body.ptaApproved !== undefined ? { ptaApproved: body.ptaApproved } : {}),
        ...(body.specifications !== undefined ? { specifications: body.specifications } : {}),
      },
      include: productInclude,
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: request.authUser!.id,
        action: 'UPDATE',
        entityType: 'Product',
        entityId: updated.id,
        before: mapProduct(existing, true),
        after: mapProduct(updated, true),
      },
    });
    if (removedImageUrls.length) {
      await deleteOwnedProductImageUrls(removedImageUrls, localImageStorageOptions);
    }

    return ok(reply, mapProduct(updated, true));
  });

  app.delete('/:id', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const existing = await prisma.product.findUnique({
      where: { id: params.id },
      include: productInclude,
    });

    if (!existing) {
      return fail(reply, 404, {
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found',
      });
    }

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: { status: 'DISCARDED' },
      include: productInclude,
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: request.authUser!.id,
        action: 'DELETE',
        entityType: 'Product',
        entityId: updated.id,
        before: mapProduct(existing, true),
        after: mapProduct(updated, true),
      },
    });
    return ok(reply, { discarded: true, product: mapProduct(updated, true) });
  });
};
