import type { Product } from '../../types';
import type { ProductCreateRequest } from '../../services/api';

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

export const createProductFormState = (product: Product | null): ProductFormState => ({
  name: product?.name ?? '',
  brand: product?.brand ?? 'Apple',
  category: product?.categoryName ?? product?.category ?? 'Smartphones',
  price: product ? String(product.price) : '',
  originalPrice: product?.originalPrice !== undefined ? String(product.originalPrice) : '',
  countInStock: product ? String(product.countInStock) : '',
  description: product?.description ?? '',
  storage: product?.specifications.storage ?? '64GB',
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
});

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

  const price = nonNegativeInteger('Sale price', form.price);
  const countInStock = nonNegativeInteger('Stock quantity', form.countInStock);
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
  const originalPrice = form.originalPrice.trim()
    ? nonNegativeInteger('Regular price', form.originalPrice)
    : undefined;

  if (originalPrice !== undefined && originalPrice <= price) {
    throw new ProductFormValidationError('Regular price must be greater than the sale price.');
  }

  return {
    name: requiredText('Product name', form.name),
    brand: requiredText('Brand', form.brand),
    category: requiredText('Product type', form.category),
    description: requiredText('Description', form.description),
    price,
    ...(originalPrice !== undefined ? { originalPrice } : {}),
    ...(form.existingImageUrls.length ? { images: form.existingImageUrls } : {}),
    ...(storage ? { storage } : {}),
    ...(color ? { color } : {}),
    specifications,
    condition: form.condition,
    countInStock,
    ptaApproved: form.ptaApproved,
    isFeatured: form.isFeatured,
    status: form.status,
  };
};
