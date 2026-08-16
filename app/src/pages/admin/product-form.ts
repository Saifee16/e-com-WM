import type { Product, ProductVariant } from '../../types';
import type { ProductCreateRequest, ProductVariantRequest } from '../../services/api';

export interface VariantFormState {
  id?: string;
  sku: string;
  title: string;
  storage: string;
  color: string;
  condition: ProductCreateRequest['condition'];
  options: Record<string, string>;
  price: string;
  originalPrice: string;
  countInStock: string;
  isActive: boolean;
}

export interface ProductFormState {
  name: string;
  brand: string;
  category: string;
  price: string;
  originalPrice: string;
  countInStock: string;
  description: string;
  storage: string;
  color: string;
  display: string;
  processor: string;
  ram: string;
  battery: string;
  camera: string;
  os: string;
  network: string;
  existingImageUrls: string[];
  imageFiles: File[];
  condition: ProductCreateRequest['condition'];
  ptaApproved: boolean;
  isFeatured: boolean;
  status: ProductCreateRequest['status'];
  hasVariants: boolean;
  variants: VariantFormState[];
  variantStorageOptions: string[];
  variantColorOptions: string[];
}

export const MAX_PRODUCT_IMAGES = 5;
export const MAX_PRODUCT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_PRODUCT_IMAGE_TYPES = ['image/jpeg', 'image/png'] as const;

export class ProductFormValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProductFormValidationError';
  }
}

const toVariantFormState = (variant: ProductVariant): VariantFormState => ({
  id: variant.id,
  sku: variant.sku,
  title: variant.title,
  storage: variant.storage ?? '',
  color: variant.color ?? '',
  condition: variant.condition ?? 'new',
  options: variant.options,
  price: String(variant.price),
  originalPrice: variant.originalPrice === undefined ? '' : String(variant.originalPrice),
  countInStock: String(variant.countInStock),
  isActive: variant.isActive,
});

const createDefaultVariant = (product: Product | null): VariantFormState => ({
  sku: '',
  title: product?.specifications.storage ?? 'Default',
  storage: product?.specifications.storage ?? '',
  color: product?.specifications.color ?? '',
  condition: product?.condition ?? 'new',
  options: {},
  price: product ? String(product.price) : '',
  originalPrice: product?.originalPrice === undefined ? '' : String(product.originalPrice),
  countInStock: product ? String(product.countInStock) : '',
  isActive: true,
});

export const createProductFormState = (product: Product | null): ProductFormState => {
  const variants = product?.variants?.map(toVariantFormState) ?? [createDefaultVariant(product)];
  return {
  name: product?.name ?? '',
  brand: product?.brand ?? 'Apple',
  category: product?.categoryName ?? product?.category ?? 'Smartphones',
  price: product ? String(product.price) : '',
  originalPrice: product?.originalPrice !== undefined ? String(product.originalPrice) : '',
  countInStock: product ? String(product.countInStock) : '',
  description: product?.description ?? '',
  storage: product?.specifications.storage ?? '',
  color: product?.specifications.color ?? '',
  display: product?.specifications.display ?? '',
  processor: product?.specifications.processor ?? '',
  ram: product?.specifications.ram ?? '',
  battery: product?.specifications.battery ?? '',
  camera: product?.specifications.camera ?? '',
  os: product?.specifications.os ?? '',
  network: product?.specifications.network ?? '',
  existingImageUrls: product?.images.slice(0, MAX_PRODUCT_IMAGES) ?? [],
  imageFiles: [],
  condition: product?.condition ?? 'new',
  ptaApproved: product?.ptaApproved ?? true,
  isFeatured: product?.isFeatured ?? false,
    status: product?.status ?? 'ACTIVE',
    hasVariants: variants.length > 1,
    variants,
    variantStorageOptions: [...new Set(variants.map((variant) => variant.storage).filter(Boolean))],
    variantColorOptions: [...new Set(variants.map((variant) => variant.color).filter(Boolean))],
  };
};

const requiredText = (label: string, value: string) => {
  const normalized = value.trim();
  if (!normalized) throw new ProductFormValidationError(`${label} is required.`);
  return normalized;
};

const nonNegativeInteger = (label: string, value: string) => {
  const normalized = value.trim();
  const number = Number(normalized);
  if (!normalized || !Number.isSafeInteger(number) || number < 0) {
    throw new ProductFormValidationError(`${label} must be a whole number of 0 or more.`);
  }
  return number;
};

const optionalText = (value: string) => value.trim() || undefined;

const toVariantRequest = (
  variant: VariantFormState,
  labels: {
    price: string;
    stock: string;
    regularPrice: string;
    regularPriceError: string;
  } = {
    price: 'Variant price',
    stock: 'Variant stock quantity',
    regularPrice: 'Variant regular price',
    regularPriceError: 'Variant regular price must be greater than the variant price.',
  },
): ProductVariantRequest => {
  const price = nonNegativeInteger(labels.price, variant.price);
  const countInStock = nonNegativeInteger(labels.stock, variant.countInStock);
  const originalPrice = optionalText(variant.originalPrice)
    ? nonNegativeInteger(labels.regularPrice, variant.originalPrice)
    : undefined;
  if (originalPrice !== undefined && originalPrice <= price) {
    throw new ProductFormValidationError(labels.regularPriceError);
  }
  return {
    ...(variant.id ? { id: variant.id } : {}),
    ...(optionalText(variant.sku) ? { sku: requiredText('Variant SKU', variant.sku) } : {}),
    ...(optionalText(variant.title) ? { title: optionalText(variant.title) } : {}),
    ...(optionalText(variant.storage) ? { storage: optionalText(variant.storage) } : {}),
    ...(optionalText(variant.color) ? { color: optionalText(variant.color) } : {}),
    condition: variant.condition,
    ...(Object.keys(variant.options).length ? { options: variant.options } : {}),
    price,
    ...(originalPrice !== undefined ? { originalPrice } : {}),
    countInStock,
    isActive: variant.isActive,
  };
};

export const validateProductImageSelection = (existingImageUrls: string[], imageFiles: File[]) => {
  if (existingImageUrls.length + imageFiles.length > MAX_PRODUCT_IMAGES) {
    throw new ProductFormValidationError(`You can add up to ${MAX_PRODUCT_IMAGES} product images.`);
  }

  imageFiles.forEach((file) => {
    if (!ACCEPTED_PRODUCT_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_PRODUCT_IMAGE_TYPES)[number])) {
      throw new ProductFormValidationError(`${file.name} must be a JPG, JPEG, or PNG image.`);
    }
    if (file.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
      throw new ProductFormValidationError(`${file.name} must be 5 MB or smaller.`);
    }
  });
};

export const toProductCreateRequest = (form: ProductFormState): ProductCreateRequest => {
  validateProductImageSelection(form.existingImageUrls, form.imageFiles);

  const storage = optionalText(form.storage);
  const color = optionalText(form.color);
  const specifications = {
    display: optionalText(form.display),
    processor: optionalText(form.processor),
    ram: optionalText(form.ram),
    battery: optionalText(form.battery),
    camera: optionalText(form.camera),
    os: optionalText(form.os),
    network: optionalText(form.network),
  };
  const variants = form.hasVariants
    ? form.variants.map((variant) => toVariantRequest(variant))
      : [toVariantRequest({
        ...(form.variants[0] ?? createDefaultVariant(null)),
        price: form.price,
        originalPrice: form.originalPrice,
        countInStock: form.countInStock,
        storage: form.storage,
        color: form.color,
        condition: form.condition,
      }, {
        price: 'Sale price',
        stock: 'Stock quantity',
        regularPrice: 'Regular price',
        regularPriceError: 'Regular price must be greater than the sale price.',
      })];
  if (!variants.length) throw new ProductFormValidationError('Add at least one variant.');
  const lowestVariant = variants.reduce((lowest, variant) => variant.price < lowest.price ? variant : lowest);

  return {
    name: requiredText('Product name', form.name),
    brand: requiredText('Brand', form.brand),
    category: requiredText('Product type', form.category),
    description: requiredText('Description', form.description),
    price: lowestVariant.price,
    ...(lowestVariant.originalPrice !== undefined ? { originalPrice: lowestVariant.originalPrice } : {}),
    ...(form.existingImageUrls.length ? { images: form.existingImageUrls } : {}),
    ...(storage ? { storage } : {}),
    ...(color ? { color } : {}),
    specifications,
    condition: lowestVariant.condition ?? form.condition,
    countInStock: variants.reduce((total, variant) => total + variant.countInStock, 0),
    ptaApproved: form.ptaApproved,
    isFeatured: form.isFeatured,
    status: form.status,
    variants,
  };
};
