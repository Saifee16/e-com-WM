import argon2 from 'argon2';
import { PrismaClient, ProductStatus, PromoType, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  ['iPhone 15 Pro', 'iphone-15-pro', 'apple', 'iphone', 389_999],
  ['iPhone 14', 'iphone-14', 'apple', 'iphone', 259_999],
  ['Samsung Galaxy S24 Ultra', 'galaxy-s24-ultra', 'samsung', 'android', 369_999],
  ['Samsung Galaxy A55', 'galaxy-a55', 'samsung', 'android', 139_999],
  ['Google Pixel 8 Pro', 'pixel-8-pro', 'google', 'android', 279_999],
  ['OnePlus 12', 'oneplus-12', 'oneplus', 'android', 249_999],
  ['Xiaomi 14', 'xiaomi-14', 'xiaomi', 'android', 219_999],
  ['Vivo V30', 'vivo-v30', 'vivo', 'android', 129_999],
  ['Oppo Reno 11', 'oppo-reno-11', 'oppo', 'android', 119_999],
  ['Realme GT 6', 'realme-gt-6', 'realme', 'android', 154_999],
  ['Infinix Zero 30', 'infinix-zero-30', 'infinix', 'android', 84_999],
  ['Tecno Camon 30', 'tecno-camon-30', 'tecno', 'android', 74_999],
] as const;

const titleCase = (value: string) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

async function main() {
  const adminPassword = await argon2.hash('Admin123!Local');
  const customerPassword = await argon2.hash('Customer123!Local');

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      passwordHash: customerPassword,
      firstName: 'Customer',
      lastName: 'User',
      role: UserRole.CUSTOMER,
    },
  });

  const categoryRecords = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'iphone' },
      update: {},
      create: { name: 'iPhone', slug: 'iphone', sortOrder: 1 },
    }),
    prisma.category.upsert({
      where: { slug: 'android' },
      update: {},
      create: { name: 'Android Phones', slug: 'android', sortOrder: 2 },
    }),
    prisma.category.upsert({
      where: { slug: 'smart-watches' },
      update: {},
      create: { name: 'Smart Watches', slug: 'smart-watches', sortOrder: 3 },
    }),
    prisma.category.upsert({
      where: { slug: 'gadgets' },
      update: {},
      create: { name: 'Gadgets', slug: 'gadgets', sortOrder: 4 },
    }),
    prisma.category.upsert({
      where: { slug: 'headphones' },
      update: {},
      create: { name: 'Headphones', slug: 'headphones', sortOrder: 5 },
    }),
    prisma.category.upsert({
      where: { slug: 'speakers' },
      update: {},
      create: { name: 'Speakers', slug: 'speakers', sortOrder: 6 },
    }),
  ]);

  const brandSlugs = ['apple', 'samsung', 'google', 'oneplus', 'xiaomi', 'vivo', 'oppo', 'realme', 'infinix', 'tecno'];
  const brandRecords = await Promise.all(
    brandSlugs.map((slug) =>
      prisma.brand.upsert({
        where: { slug },
        update: {},
        create: {
          name: titleCase(slug),
          slug,
        },
      }),
    ),
  );

  const categoryBySlug = new Map(categoryRecords.map((category) => [category.slug, category]));
  const brandBySlug = new Map(brandRecords.map((brand) => [brand.slug, brand]));

  for (const [name, slug, brandSlug, categorySlug, priceAmount] of products) {
    const category = categoryBySlug.get(categorySlug);
    const brand = brandBySlug.get(brandSlug);

    if (!category || !brand) {
      throw new Error(`Missing seed relation for ${slug}`);
    }

    const product = await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        name,
        slug,
        brandId: brand.id,
        categoryId: category.id,
        description: `${name} with verified local stock and warranty support.`,
        shortDescription: `${name} in stock`,
        status: ProductStatus.ACTIVE,
        isFeatured: slug.includes('iphone') || slug.includes('galaxy'),
      },
    });

    await prisma.productVariant.upsert({
      where: { sku: `${slug.toUpperCase()}-128` },
      update: {},
      create: {
        productId: product.id,
        sku: `${slug.toUpperCase()}-128`,
        title: '128GB',
        storage: '128GB',
        condition: 'new',
        priceAmount,
        compareAtPriceAmount: Math.round(priceAmount * 1.08),
        stockQuantity: 25,
        lowStockThreshold: 5,
      },
    });

    await prisma.productImage.createMany({
      data: [
        {
          productId: product.id,
          url: `https://placehold.co/800x800?text=${encodeURIComponent(name)}`,
          altText: name,
          isPrimary: true,
        },
      ],
      skipDuplicates: true,
    });
  }

  await prisma.promoCode.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      type: PromoType.PERCENTAGE,
      valuePercent: 10,
      minOrderAmount: 50_000,
      maxDiscountAmount: 25_000,
      usageLimit: 1_000,
      perUserLimit: 1,
      isActive: true,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
