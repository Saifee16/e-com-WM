import type { FastifyPluginAsync } from 'fastify';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import path from 'node:path';
import { prisma } from '../../db/prisma.js';
import { env } from '../../config/env.js';
import { fail, ok } from '../../utils/responses.js';
import { authenticateAdmin, authenticateCustomer } from '../auth/session.js';
import { MAX_PRODUCT_IMAGES, deleteProductImageUrls, saveProductImages } from './image-upload.js';

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

export const mapProduct = (product: ProductWithRelations, includeInactiveVariants = false) => {
  const availableVariants = product.variants.filter((item) => item.isActive);
  const variants = includeInactiveVariants ? product.variants : availableVariants;
  const pricingVariants = availableVariants.length ? availableVariants : product.variants;
  const variant = pricingVariants.reduce<typeof pricingVariants[number] | undefined>(
    (lowest, item) => !lowest || item.priceAmount < lowest.priceAmount ? item : lowest,
    undefined,
  );
  const storedSpecifications =
    product.specifications && typeof product.specifications === 'object' && !Array.isArray(product.specifications)
      ? product.specifications as Record<string, unknown>
      : {};
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
      storage: variant?.storage ?? undefined,
      color: variant?.color ?? undefined,
      display: typeof storedSpecifications.display === 'string' ? storedSpecifications.display : undefined,
      processor: typeof storedSpecifications.processor === 'string' ? storedSpecifications.processor : undefined,
      ram: typeof storedSpecifications.ram === 'string' ? storedSpecifications.ram : undefined,
      battery: typeof storedSpecifications.battery === 'string' ? storedSpecifications.battery : undefined,
      camera: typeof storedSpecifications.camera === 'string' ? storedSpecifications.camera : undefined,
      os: typeof storedSpecifications.os === 'string' ? storedSpecifications.os : undefined,
      network: typeof storedSpecifications.network === 'string' ? storedSpecifications.network : undefined,
    },
    condition: (variant?.condition ?? 'new') as 'new' | 'used' | 'refurbished',
    ptaApproved: product.ptaApproved,
    countInStock: variant?.stockQuantity ?? 0,
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
        isActive: item.isActive,
        images: variantImages,
        image: variantImages[0] ?? primaryImage,
      };
    }),
  };
};

const productQuerySchema = z.object({
  search: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  category: z.string().trim().optional(),
  featured: z.coerce.boolean().optional(),
  sort: z.enum(['newest', 'price-low', 'price-high', 'rating']).default('newest'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  storage: z.string().trim().min(1).max(40).optional(),
  condition: z.enum(['new', 'used', 'refurbished']).optional(),
}).refine(
  (query) => query.minPrice === undefined || query.maxPrice === undefined || query.minPrice <= query.maxPrice,
  {
    message: 'minPrice cannot be greater than maxPrice',
    path: ['minPrice'],
  },
);

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

  const afterUpload = decodeURIComponent(url.pathname.split('/image/upload/')[1] ?? '');
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

const productSpecificationsSchema = z.object({
  display: z.string().trim().min(1).max(160).optional(),
  processor: z.string().trim().min(1).max(160).optional(),
  ram: z.string().trim().min(1).max(80).optional(),
  battery: z.string().trim().min(1).max(160).optional(),
  camera: z.string().trim().min(1).max(240).optional(),
  os: z.string().trim().min(1).max(120).optional(),
  network: z.string().trim().min(1).max(120).optional(),
}).strict();

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

const productPayloadSchema = z.object({
  name: z.string().trim().min(1).max(200),
  brand: z.string().trim().min(1).max(80),
  category: z.string().trim().min(1).max(80).default('Smartphones'),
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
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('ACTIVE'),
  variants: z.array(productVariantPayloadSchema).min(1).max(100).optional(),
}).strict();

const productCreateSchema = productPayloadSchema.refine(
  (product) => product.originalPrice === undefined || product.originalPrice > product.price,
  {
    message: 'Regular price must be greater than the sale price',
    path: ['originalPrice'],
  },
);

const productUpdateSchema = productPayloadSchema.partial();

type ProductVariantPayload = z.infer<typeof productVariantPayloadSchema>;

const createVariantData = (variant: ProductVariantPayload, slug: string, index: number) => ({
  sku: variant.sku ?? `${slug.toUpperCase()}-${index + 1}-${randomUUID().slice(0, 8).toUpperCase()}`,
  title: variant.title ?? [variant.storage, variant.color, variant.condition, ...Object.values(variant.options ?? {})].filter(Boolean).join(' / ') || 'Default',
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

const getOrCreateCategory = async (nameOrSlug: string) => {
  const slug = slugify(nameOrSlug);
  const name = nameOrSlug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(' ');

  return prisma.category.upsert({
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
      include: { _count: { select: { products: true } } },
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
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });

    return ok(
      reply,
      categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        productCount: category._count.products,
      })),
    );
  });

  app.get('/', async (request, reply) => {
    const query = productQuerySchema.parse(request.query);
    const brandSlugs = query.brand
      ?.split(',')
      .map((brand) => slugify(brand))
      .filter(Boolean);
    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
      ...(query.featured === true ? { isFeatured: true } : {}),
      ...(brandSlugs?.length ? { brand: { slug: { in: brandSlugs } } } : {}),
      ...(query.category ? { category: { slug: slugify(query.category) } } : {}),
      ...(
        query.minPrice !== undefined
        || query.maxPrice !== undefined
        || query.storage !== undefined
        || query.condition !== undefined
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
                },
              },
            }
          : {}
      ),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { brand: { name: { contains: query.search, mode: 'insensitive' } } },
              { category: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const databasePaginated = query.sort === 'newest';
    const databaseTotal = databasePaginated ? await prisma.product.count({ where }) : null;
    const products = await prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: { createdAt: 'desc' },
      ...(databasePaginated
        ? { skip: (query.page - 1) * query.limit, take: query.limit }
        : {}),
    });

    const filtered = products
      .map(mapProduct)
      .filter((product) => query.minPrice === undefined || product.price >= query.minPrice)
      .filter((product) => query.maxPrice === undefined || product.price <= query.maxPrice)
      .filter((product) => query.storage === undefined || product.specifications.storage === query.storage)
      .filter((product) => query.condition === undefined || product.condition === query.condition);

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

    return ok(reply, products.map(mapProduct));
  });

  app.get('/brand/:brand', async (request, reply) => {
    const params = z.object({ brand: z.string().min(1) }).parse(request.params);
    const products = await prisma.product.findMany({
      where: { status: 'ACTIVE', brand: { slug: slugify(params.brand) } },
      include: productInclude,
      orderBy: { createdAt: 'desc' },
    });

    return ok(reply, products.map(mapProduct));
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
  app.addHook('preHandler', authenticateAdmin);
  const localImageStorageOptions = {
    uploadDirectory: path.join(options.uploadDirectory, 'products'),
    publicApiBaseUrl: env.API_BASE_URL,
  };

  app.post('/images', async (request, reply) => {
    const urls = await saveProductImages(request, localImageStorageOptions);
    return ok(reply.status(201), { urls });
  });

  app.delete('/images', async (request, reply) => {
    const body = z.object({
      urls: z.array(imageUrlSchema).min(1).max(MAX_PRODUCT_IMAGES),
    }).parse(request.body);
    await deleteProductImageUrls(body.urls, localImageStorageOptions);
    return ok(reply, { deleted: true });
  });

  app.get('/', async (request, reply) => {
    const query = z.object({
      search: z.string().trim().max(200).optional(),
      status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(50),
    }).parse(request.query);
    const where: Prisma.ProductWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { brand: { name: { contains: query.search, mode: 'insensitive' } } },
              { category: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);
    return ok(reply, {
      items: products.map((product) => mapProduct(product, true)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  });

  app.post('/', async (request, reply) => {
    const body = productCreateSchema.parse(request.body);
    const brand = await getOrCreateBrand(body.brand);
    const category = await getOrCreateCategory(body.category);
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
    const category = body.category ? await getOrCreateCategory(body.category) : null;
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
        await tx.productVariant.updateMany({
          where: { productId: params.id, id: { notIn: [...requestedIds] } },
          data: { isActive: false },
        });
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
    const removedImageUrls = imageUrls === null
      ? []
      : existing.images.map((image) => image.url).filter((url) => !imageUrls.includes(url));
    if (imageUrls !== null) {
      await prisma.productImage.deleteMany({ where: { productId: params.id } });
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
      await deleteProductImageUrls(removedImageUrls, localImageStorageOptions);
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
      data: { status: 'ARCHIVED' },
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
    const archivedImageUrls = existing.images.map((image) => image.url);
    if (archivedImageUrls.length) {
      await prisma.productImage.deleteMany({ where: { productId: params.id } });
      await deleteProductImageUrls(archivedImageUrls, localImageStorageOptions);
    }

    return ok(reply, { deleted: true });
  });
};
