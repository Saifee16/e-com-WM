import type { Category, Product, ProductVariant } from '../../types';
import type { ProductCreateRequest, ProductVariantRequest } from '../../services/api';
import { getCategorySpecificationFields, isPhoneCategory } from '../../config/category-catalog';

export interface VariantFormState {
  /** Stable React identity for rows that have not yet been persisted. */
  clientId?: string;
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

export interface PhoneMemoryConfiguration {
  /** Stable client identity; never derive React keys from editable values. */
  clientId: string;
  ram: string;
  storage: string;
  price: string;
  originalPrice: string;
  initialPrice?: string;
  initialOriginalPrice?: string;
  sourcePrices?: Record<string, { price: string; originalPrice: string }>;
}

export interface PhoneColor {
  /** Stable client identity; the value remains freely editable. */
  clientId: string;
  value: string;
}

export interface PhoneAvailabilityCell {
  variantId?: string;
  enabled: boolean;
  countInStock: string;
}

export interface ProductFormState {
  name: string;
  brand: string;
  customBrand: string;
  category: string;
  price: string;
  originalPrice: string;
  countInStock: string;
  description: string;
  storage: string;
  color: string;
  specifications: Record<string, string>;
  display: string;
  processor: string;
  ram: string;
  battery: string;
  camera: string;
  os: string;
  network: string;
  launchYear: string;
  rearCamera: string;
  frontCamera: string;
  fingerprint: string;
  existingImageUrls: string[];
  imageFiles: File[];
  imagesChanged: boolean;
  condition: ProductCreateRequest['condition'];
  ptaApproved: boolean;
  isFeatured: boolean;
  status: ProductCreateRequest['status'];
  hasVariants: boolean;
  variants: VariantFormState[];
  variantStorageOptions: string[];
  variantColorOptions: string[];
  phoneCategory: boolean;
  memoryConfigurations: PhoneMemoryConfiguration[];
  colors: PhoneColor[];
  phoneAvailability: Record<string, PhoneAvailabilityCell>;
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

const newClientId = () => globalThis.crypto?.randomUUID?.() ?? `variant-${Math.random().toString(36).slice(2)}`;

export const normalizePhoneValue = (value: string) => value.trim().replace(/\s+/g, ' ');

export const phoneCellKey = (memoryClientId: string, colorClientId: string) => `${memoryClientId}\u0000${colorClientId}`;

const normalizedPhoneKey = (value: string) => normalizePhoneValue(value).toLocaleLowerCase();

const phoneVariantRam = (variant: ProductVariant, fallback: string) =>
  normalizePhoneValue(variant.options?.RAM ?? fallback) || 'Standard';

const phoneVariantStorage = (variant: ProductVariant, fallback: string) =>
  normalizePhoneValue(variant.storage ?? fallback) || 'Standard';

const phoneVariantColor = (variant: ProductVariant, fallback: string) =>
  normalizePhoneValue(variant.color ?? fallback) || 'Default';

const createPhoneConfiguration = (product: Product | null) => {
  const variants = product?.variants ?? [];
  const productRam = product?.specifications.ram ?? '';
  const productStorage = product?.specifications.storage ?? '';
  const productColor = product?.specifications.color ?? '';
  const memoryConfigurations: PhoneMemoryConfiguration[] = [];
  const colors: PhoneColor[] = [];
  const memoryByKey = new Map<string, PhoneMemoryConfiguration>();
  const colorByKey = new Map<string, PhoneColor>();
  const phoneAvailability: Record<string, PhoneAvailabilityCell> = {};

  variants.forEach((variant) => {
    const ram = phoneVariantRam(variant, productRam);
    const storage = phoneVariantStorage(variant, productStorage);
    const color = phoneVariantColor(variant, productColor);
    const memoryKey = `${normalizedPhoneKey(ram)}\u0000${normalizedPhoneKey(storage)}`;
    let memory = memoryByKey.get(memoryKey);
    if (!memory) {
      memory = {
        clientId: newClientId(),
        ram,
        storage,
        price: String(variant.price),
        originalPrice: variant.originalPrice === undefined ? '' : String(variant.originalPrice),
        initialPrice: String(variant.price),
        initialOriginalPrice: variant.originalPrice === undefined ? '' : String(variant.originalPrice),
        sourcePrices: {},
      };
      memoryByKey.set(memoryKey, memory);
      memoryConfigurations.push(memory);
    }
    if (variant.id && memory.sourcePrices) {
      memory.sourcePrices[variant.id] = {
        price: String(variant.price),
        originalPrice: variant.originalPrice === undefined ? '' : String(variant.originalPrice),
      };
    }

    const colorKey = normalizedPhoneKey(color);
    let colorEntry = colorByKey.get(colorKey);
    if (!colorEntry) {
      colorEntry = { clientId: newClientId(), value: color };
      colorByKey.set(colorKey, colorEntry);
      colors.push(colorEntry);
    }

    phoneAvailability[phoneCellKey(memory.clientId, colorEntry.clientId)] = {
      ...(variant.id ? { variantId: variant.id } : {}),
      enabled: variant.isActive,
      countInStock: String(variant.countInStock),
    };
  });

  if (!memoryConfigurations.length) {
    memoryConfigurations.push({ clientId: newClientId(), ram: '', storage: '', price: '', originalPrice: '' });
  }

  return { memoryConfigurations, colors, phoneAvailability };
};

const toVariantFormState = (variant: ProductVariant): VariantFormState => ({
  clientId: variant.id,
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
  clientId: newClientId(),
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

export const createProductFormState = (product: Product | null, categories: readonly Category[] = []): ProductFormState => {
  const variants = product?.variants?.map(toVariantFormState) ?? [createDefaultVariant(product)];
  const phoneConfiguration = createPhoneConfiguration(product);
  const specifications: Record<string, string> = Object.fromEntries(
    Object.entries(product?.specifications ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  ) as Record<string, string>;
  return {
  name: product?.name ?? '',
  brand: product?.brand ?? 'Apple',
  customBrand: '',
  category: product?.category ?? '',
  price: product ? String(product.price) : '',
  originalPrice: product?.originalPrice !== undefined ? String(product.originalPrice) : '',
  countInStock: product ? String(product.countInStock) : '',
  description: product?.description ?? '',
  storage: product?.specifications.storage ?? '',
  color: product?.specifications.color ?? '',
  specifications,
  display: product?.specifications.display ?? '',
  processor: product?.specifications.processor ?? '',
  ram: product?.specifications.ram ?? '',
  battery: product?.specifications.battery ?? '',
  camera: product?.specifications.camera ?? '',
  os: product?.specifications.os ?? '',
  network: product?.specifications.network ?? '',
  launchYear: product?.specifications.launchYear ?? '',
  rearCamera: product?.specifications.rearCamera ?? '',
  frontCamera: product?.specifications.frontCamera ?? '',
  fingerprint: product?.specifications.fingerprint ?? '',
  existingImageUrls: product?.images.slice(0, MAX_PRODUCT_IMAGES) ?? [],
  imageFiles: [],
  imagesChanged: false,
  condition: product?.condition ?? 'new',
  ptaApproved: product?.ptaApproved ?? true,
  isFeatured: product?.isFeatured ?? false,
    status: product?.status ?? 'ACTIVE',
    hasVariants: variants.length > 1,
    variants,
    variantStorageOptions: [...new Set(variants.map((variant) => variant.storage).filter(Boolean))],
    variantColorOptions: [...new Set(variants.map((variant) => variant.color).filter(Boolean))],
    phoneCategory: isPhoneCategory(product?.category ?? '', categories),
    memoryConfigurations: phoneConfiguration.memoryConfigurations,
    colors: phoneConfiguration.colors,
    phoneAvailability: phoneConfiguration.phoneAvailability,
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

const phoneVariantLabels = {
  price: 'Memory configuration sale price',
  stock: 'Availability stock quantity',
  regularPrice: 'Memory configuration regular price',
  regularPriceError: 'Regular price must be greater than the memory configuration sale price.',
};

const requiredPhoneText = (label: string, value: string) => {
  const normalized = normalizePhoneValue(value);
  if (!normalized) throw new ProductFormValidationError(`${label} is required.`);
  return normalized;
};

const toPhoneVariantRequests = (form: ProductFormState): ProductVariantRequest[] => {
  if (!form.memoryConfigurations.length) {
    throw new ProductFormValidationError('Add at least one memory option.');
  }
  if (!form.colors.length) {
    throw new ProductFormValidationError('Add at least one color.');
  }

  const seenMemories = new Set<string>();
  const seenColors = new Set<string>();
  const existingVariants = new Map(form.variants.flatMap((variant) => variant.id ? [[variant.id, variant] as const] : []));
  const requests: ProductVariantRequest[] = [];
  const submittedExistingIds = new Set<string>();

  form.colors.forEach((color) => {
    const normalizedColor = requiredPhoneText('Color', color.value);
    const colorKey = normalizedPhoneKey(normalizedColor);
    if (seenColors.has(colorKey)) {
      throw new ProductFormValidationError('Colors must be unique.');
    }
    seenColors.add(colorKey);
  });

  form.memoryConfigurations.forEach((memory) => {
    const ram = requiredPhoneText('RAM', memory.ram);
    const storage = requiredPhoneText('Storage / ROM', memory.storage);
    const memoryKey = `${normalizedPhoneKey(ram)}\u0000${normalizedPhoneKey(storage)}`;
    if (seenMemories.has(memoryKey)) {
      throw new ProductFormValidationError('RAM and Storage / ROM configurations must be unique.');
    }
    seenMemories.add(memoryKey);
    const memoryPrice = nonNegativeInteger('Memory configuration sale price', memory.price);
    const memoryOriginalPrice = optionalText(memory.originalPrice)
      ? nonNegativeInteger('Memory configuration regular price', memory.originalPrice)
      : undefined;
    if (memoryOriginalPrice !== undefined && memoryOriginalPrice <= memoryPrice) {
      throw new ProductFormValidationError(phoneVariantLabels.regularPriceError);
    }

    form.colors.forEach((color) => {
      const normalizedColor = requiredPhoneText('Color', color.value);
      const cellKey = phoneCellKey(memory.clientId, color.clientId);
      const cell = form.phoneAvailability[cellKey] ?? { enabled: false, countInStock: '0' };
      const existing = cell.variantId ? existingVariants.get(cell.variantId) : undefined;
      if (existing?.id) submittedExistingIds.add(existing.id);

      if (!cell.enabled) {
        if (existing) requests.push(toVariantRequest({ ...existing, isActive: false }, phoneVariantLabels));
        return;
      }

      const sourcePrice = existing?.id
        && memory.initialPrice !== undefined
        && memory.initialPrice === memory.price
        ? memory.sourcePrices?.[existing.id]
        : undefined;
      const price = sourcePrice ? sourcePrice.price : memory.price;
      const originalPrice = sourcePrice ? sourcePrice.originalPrice : memory.originalPrice;
      const variant: VariantFormState = existing
        ? {
            ...existing,
            storage,
            color: normalizedColor,
            options: { ...existing.options, RAM: ram },
            price,
            originalPrice,
            countInStock: cell.countInStock,
            isActive: true,
          }
        : {
            clientId: newClientId(),
            sku: '',
            title: `${storage} / ${ram} / ${normalizedColor}`,
            storage,
            color: normalizedColor,
            condition: form.condition,
            options: { RAM: ram },
            price,
            originalPrice,
            countInStock: cell.countInStock,
            isActive: true,
          };
      requests.push(toVariantRequest(variant, phoneVariantLabels));
    });
  });

  // Removed memory rows/colors are intentionally represented as inactive existing variants.
  // This keeps historical records, SKUs, and variant images while making them non-purchasable.
  form.variants.forEach((variant) => {
    if (variant.id && !submittedExistingIds.has(variant.id)) {
      requests.push(toVariantRequest({ ...variant, isActive: false }, phoneVariantLabels));
    }
  });

  if (!requests.length) throw new ProductFormValidationError('Enable at least one availability combination.');
  if (!requests.some((variant) => variant.isActive) && !form.variants.some((variant) => variant.id)) {
    throw new ProductFormValidationError('Enable at least one availability combination.');
  }
  return requests;
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

  const phoneProduct = form.phoneCategory || isPhoneCategory(form.category);
  const storage = optionalText(form.storage);
  const color = optionalText(form.color);
  const legacySpecifications = {
    display: optionalText(form.display),
    processor: optionalText(form.processor),
    battery: optionalText(form.battery),
    camera: optionalText(form.camera),
    rearCamera: optionalText(form.rearCamera),
    frontCamera: optionalText(form.frontCamera),
    os: optionalText(form.os),
    network: optionalText(form.network),
    fingerprint: optionalText(form.fingerprint),
    launchYear: optionalText(form.launchYear),
  };
  const configuredKeys = new Set(
    getCategorySpecificationFields(phoneProduct ? 'phones' : form.category).map((field) => field.key),
  );
  if (phoneProduct) configuredKeys.add('camera');
  const phoneVariantSpecificationKeys = new Set(['ram', 'storage', 'color']);
  const specifications = Object.fromEntries(
    Object.entries({ ...legacySpecifications, ...form.specifications })
      .filter(([, value]) => value !== undefined)
      .filter(([key]) => !phoneProduct || !phoneVariantSpecificationKeys.has(key))
      .filter(([key]) => !configuredKeys.size || configuredKeys.has(key)),
  );
  const variants = phoneProduct
    ? toPhoneVariantRequests(form)
    : form.hasVariants
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
    brand: requiredText('Brand', form.brand === 'Other' ? form.customBrand : form.brand),
    category: requiredText('Category', form.category),
    description: requiredText('Description', form.description),
    price: lowestVariant.price,
    ...(lowestVariant.originalPrice !== undefined ? { originalPrice: lowestVariant.originalPrice } : {}),
    ...(form.imagesChanged ? { images: form.existingImageUrls } : {}),
    ...(!phoneProduct && storage ? { storage } : {}),
    ...(!phoneProduct && color ? { color } : {}),
    specifications,
    condition: lowestVariant.condition ?? form.condition,
    countInStock: variants.reduce((total, variant) => total + (variant.isActive ? variant.countInStock : 0), 0),
    ptaApproved: form.ptaApproved,
    isFeatured: form.isFeatured,
    status: form.status,
    variants,
  };
};
