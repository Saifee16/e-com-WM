import { describe, expect, it } from 'vitest';
import type { Product } from '../../types';
import {
  MAX_PRODUCT_IMAGES,
  ProductFormValidationError,
  createProductFormState,
  toProductCreateRequest,
} from './product-form';

describe('admin product form contract', () => {
  it('converts HTML numeric input strings and omits empty optional fields', () => {
    const request = toProductCreateRequest({
      ...createProductFormState(null),
      name: '  Launch Phone  ',
      price: '125000',
      originalPrice: '',
      countInStock: '6',
      description: '  A complete product description.  ',
      storage: '',
      color: ' ',
      existingImageUrls: [],
      imageFiles: [],
      status: 'DRAFT',
    });

    expect(request).toMatchObject({
      name: 'Launch Phone',
      description: 'A complete product description.',
      price: 125000,
      countInStock: 6,
      status: 'DRAFT',
    });
    expect(request).not.toHaveProperty('originalPrice');
    expect(request).not.toHaveProperty('imageUrl');
    expect(request).not.toHaveProperty('images');
    expect(request).not.toHaveProperty('storage');
    expect(request).not.toHaveProperty('color');
  });

  it.each([
    ['negative price', { price: '-1' }, 'Sale price must be a whole number of 0 or more.'],
    ['fractional stock', { countInStock: '1.5' }, 'Stock quantity must be a whole number of 0 or more.'],
    ['missing name', { name: '   ' }, 'Product name is required.'],
    [
      'unsupported image type',
      { imageFiles: [new File(['gif'], 'phone.gif', { type: 'image/gif' })] },
      'phone.gif must be a JPG, JPEG, or PNG image.',
    ],
  ])('rejects %s before submission', (_case, override, message) => {
    const form = {
      ...createProductFormState(null),
      name: 'Launch Phone',
      price: '125000',
      countInStock: '6',
      description: 'A complete product description.',
      ...override,
    };

    expect(() => toProductCreateRequest(form)).toThrow(new ProductFormValidationError(message));
  });

  it('accepts up to five JPG or PNG files selected from the device', () => {
    const imageFiles = Array.from(
      { length: MAX_PRODUCT_IMAGES },
      (_, index) => new File(['image'], `phone-${index + 1}.jpg`, { type: 'image/jpeg' }),
    );
    const request = toProductCreateRequest({
      ...createProductFormState(null),
      name: 'Launch Phone',
      price: '125000',
      originalPrice: '135000',
      countInStock: '6',
      description: 'A complete product description.',
      imageFiles,
    });

    expect(request).not.toHaveProperty('images');
    expect(request.originalPrice).toBe(135000);
  });

  it('includes comparison specifications entered in the add product form', () => {
    const request = toProductCreateRequest({
      ...createProductFormState(null),
      name: 'Compare Phone',
      price: '125000',
      countInStock: '6',
      description: 'A phone with complete comparison data.',
      display: ' 6.7-inch AMOLED, 120Hz ',
      processor: ' Snapdragon 8 Gen 3 ',
      ram: ' 12GB ',
      battery: ' 5,000mAh ',
      camera: ' 50MP main + 12MP ultra-wide ',
      os: ' Android 15 ',
      network: ' 5G, dual SIM ',
    });

    expect(request.specifications).toEqual({
      display: '6.7-inch AMOLED, 120Hz',
      processor: 'Snapdragon 8 Gen 3',
      ram: '12GB',
      battery: '5,000mAh',
      camera: '50MP main + 12MP ultra-wide',
      os: 'Android 15',
      network: '5G, dual SIM',
    });
  });

  it('serializes multiple variants without turning their combinations into products', () => {
    const request = toProductCreateRequest({
      ...createProductFormState(null),
      name: 'Variant Phone',
      description: 'A phone with independently priced storage and color variants.',
      hasVariants: true,
      variants: [
        { sku: 'PHONE-128-BLK', title: '128GB / Black', storage: '128GB', color: 'Black', condition: 'new', options: {}, price: '100000', originalPrice: '110000', countInStock: '2', isActive: true },
        { sku: 'PHONE-256-GLD', title: '256GB / Gold', storage: '256GB', color: 'Gold', condition: 'new', options: { Finish: 'Matte' }, price: '120000', originalPrice: '', countInStock: '3', isActive: true },
      ],
    });

    expect(request.price).toBe(100000);
    expect(request.countInStock).toBe(5);
    expect(request.variants).toEqual([
      expect.objectContaining({ sku: 'PHONE-128-BLK', storage: '128GB', color: 'Black', price: 100000, countInStock: 2 }),
      expect.objectContaining({ sku: 'PHONE-256-GLD', options: { Finish: 'Matte' }, price: 120000, countInStock: 3 }),
    ]);
  });

  it('retains an existing single variant when converting the product to multiple variants', () => {
    const existing = createProductFormState({
      _id: 'product-1',
      name: 'Existing Phone',
      brand: 'Apple',
      description: 'Existing single-variant product',
      price: 100000,
      images: [],
      category: 'smartphones',
      specifications: { storage: '256GB', color: 'Black' },
      condition: 'new',
      ptaApproved: true,
      countInStock: 4,
      rating: null,
      numReviews: 0,
      reviews: [],
      isFeatured: false,
      tags: [],
      status: 'ACTIVE',
      variants: [{
        id: 'variant-1',
        sku: 'PHONE-256-BLK',
        title: '256GB / Black',
        storage: '256GB',
        color: 'Black',
        condition: 'new',
        options: {},
        price: 100000,
        countInStock: 4,
        isActive: true,
        images: [],
        image: '',
      }],
    } satisfies Product);

    expect(existing.hasVariants).toBe(false);
    const request = toProductCreateRequest({
      ...existing,
      hasVariants: true,
      name: 'Existing Phone',
      description: 'Converted product with two variants',
      variants: [
        existing.variants[0]!,
        { ...existing.variants[0]!, id: undefined, sku: '', title: '128GB / Blue', storage: '128GB', color: 'Blue', price: '90000', countInStock: '2' },
      ],
    });

    expect(request.variants).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'variant-1', sku: 'PHONE-256-BLK', storage: '256GB', color: 'Black' }),
      expect.objectContaining({ storage: '128GB', color: 'Blue', price: 90000, countInStock: 2 }),
    ]));
  });

  it('rejects more than five product images', () => {
    const form = {
      ...createProductFormState(null),
      name: 'Launch Phone',
      price: '125000',
      countInStock: '6',
      description: 'A complete product description.',
      imageFiles: Array.from(
        { length: MAX_PRODUCT_IMAGES + 1 },
        (_, index) => new File(['image'], `phone-${index + 1}.png`, { type: 'image/png' }),
      ),
    };

    expect(() => toProductCreateRequest(form)).toThrow(
      new ProductFormValidationError('You can add up to 5 product images.'),
    );
  });
});
