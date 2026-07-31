import type { FastifyPluginAsync } from 'fastify';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { fail, ok } from '../../utils/responses.js';
import { authenticateAdmin } from '../auth/session.js';

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
  reviews: true,
} satisfies Prisma.ProductInclude;

export type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

export const mapProduct = (product: ProductWithRelations) => {
  const variant = product.variants.find((item) => item.isActive) ?? product.variants[0];
  const primaryImage = product.images[0]?.url ?? 'https://placehold.co/800x800?text=Product';
  const rating =
    product.reviews.length > 0
      ? product.reviews.reduce((total, review) => total + review.rating, 0) / product.reviews.length
      : 4.5;

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
    images: product.images.length > 0 ? product.images.map((image) => image.url) : [primaryImage],
    category: product.category.slug,
    categoryName: product.category.name,
    specifications: {
      storage: variant?.storage ?? undefined,
      color: variant?.color ?? undefined,
    },
    condition: (variant?.condition ?? 'new') as 'new' | 'used' | 'refurbished',
    ptaApproved: true,
    countInStock: variant?.stockQuantity ?? 0,
    rating: Number(rating.toFixed(1)),
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
  };
};

const productQuerySchema = z.object({
  search: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  category: z.string().trim().optional(),
  featured: z.coerce.boolean().optional(),
  sort: z.enum(['newest', 'price-low', 'price-high', 'rating']).default('newest'),
  limit: z.coerce.number().int().positive().max(100).default(100),
});

const productPayloadSchema = z.object({
  name: z.string().trim().min(1).max(200),
  brand: z.string().trim().min(1).max(80),
  category: z.string().trim().min(1).max(80).default('Smartphones'),
  description: z.string().trim().min(1).max(5000),
  price: z.coerce.number().int().nonnegative(),
  originalPrice: z.coerce.number().int().nonnegative().optional(),
  imageUrl: z.string().url().optional(),
  images: z.array(z.string().url()).optional(),
  storage: z.string().trim().max(40).optional(),
  color: z.string().trim().max(80).optional(),
  condition: z.enum(['new', 'used', 'refurbished']).default('new'),
  countInStock: z.coerce.number().int().nonnegative().default(0),
  isFeatured: z.coerce.boolean().default(false),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('ACTIVE'),
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
    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
      ...(query.featured === true ? { isFeatured: true } : {}),
      ...(query.brand ? { brand: { slug: slugify(query.brand) } } : {}),
      ...(query.category ? { category: { slug: slugify(query.category) } } : {}),
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

    const products = await prisma.product.findMany({
      where,
      include: productInclude,
      take: query.limit,
      orderBy: query.sort === 'newest' ? { createdAt: 'desc' } : { createdAt: 'desc' },
    });

    const mapped = products.map(mapProduct);

    if (query.sort === 'price-low') {
      mapped.sort((a, b) => a.price - b.price);
    }
    if (query.sort === 'price-high') {
      mapped.sort((a, b) => b.price - a.price);
    }
    if (query.sort === 'rating') {
      mapped.sort((a, b) => b.rating - a.rating);
    }

    return ok(reply, mapped);
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

  app.get('/:id', async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const isUuid = z.string().uuid().safeParse(params.id).success;
    const product = await prisma.product.findFirst({
      where: {
        OR: [...(isUuid ? [{ id: params.id }] : []), { slug: params.id }],
      },
      include: productInclude,
    });

    if (!product || product.status === 'ARCHIVED') {
      return fail(reply, 404, {
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found',
      });
    }

    return ok(reply, mapProduct(product));
  });
};

export const adminProductRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticateAdmin);

  app.post('/', async (request, reply) => {
    const body = productPayloadSchema.parse(request.body);
    const brand = await getOrCreateBrand(body.brand);
    const category = await getOrCreateCategory(body.category);
    const slug = await getUniqueProductSlug(body.name);
    const imageUrls = body.images?.length ? body.images : body.imageUrl ? [body.imageUrl] : [];

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
        variants: {
          create: {
            sku: `${slug.toUpperCase()}-${Date.now()}`,
            title: body.storage ?? 'Default',
            ...(body.storage ? { storage: body.storage } : {}),
            ...(body.color ? { color: body.color } : {}),
            condition: body.condition,
            priceAmount: body.price,
            ...(body.originalPrice !== undefined ? { compareAtPriceAmount: body.originalPrice } : {}),
            stockQuantity: body.countInStock,
          },
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

    await prisma.auditLog.create({
      data: {
        actorUserId: request.authUser!.id,
        action: 'CREATE',
        entityType: 'Product',
        entityId: product.id,
        after: mapProduct(product),
      },
    });

    return ok(reply.status(201), mapProduct(product));
  });

  app.put('/:id', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = productPayloadSchema.partial().parse(request.body);
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

    if (variant) {
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

    const imageUrls = body.images?.length ? body.images : body.imageUrl ? [body.imageUrl] : null;
    if (imageUrls) {
      await prisma.productImage.deleteMany({ where: { productId: params.id } });
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

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: {
        slug,
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(brand ? { brandId: brand.id } : {}),
        ...(category ? { categoryId: category.id } : {}),
        ...(body.description !== undefined
          ? { description: body.description, shortDescription: body.description.slice(0, 140) }
          : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.isFeatured !== undefined ? { isFeatured: body.isFeatured } : {}),
      },
      include: productInclude,
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: request.authUser!.id,
        action: 'UPDATE',
        entityType: 'Product',
        entityId: updated.id,
        before: mapProduct(existing),
        after: mapProduct(updated),
      },
    });

    return ok(reply, mapProduct(updated));
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
        before: mapProduct(existing),
        after: mapProduct(updated),
      },
    });

    return ok(reply, { deleted: true });
  });
};
