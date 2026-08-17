import { describe, expect, it } from 'vitest';
import type { Product, ProductVariant } from '../../types';
import {
  MAX_PRODUCT_IMAGES,
  ProductFormValidationError,
  createProductFormState,
  phoneCellKey,
  toProductCreateRequest,
  type ProductFormState,
} from './product-form';

const createPhoneForm = (overrides: Partial<ProductFormState> = {}): ProductFormState => {
  const base = createProductFormState(null);
  const memories = [
    { clientId: 'memory-64', ram: '4GB', storage: '64GB', price: '55000', originalPrice: '' },
    { clientId: 'memory-128', ram: '6GB', storage: '128GB', price: '62000', originalPrice: '' },
  ];
  const colors = [
    { clientId: 'color-black', value: 'Awesome Black' },
    { clientId: 'color-white', value: 'Awesome White' },
    { clientId: 'color-blue', value: 'Awesome Blue' },
  ];
  return {
    ...base,
    name: 'Launch Phone',
    category: 'phones',
    phoneCategory: true,
    description: 'A complete phone description.',
    memoryConfigurations: memories,
    colors,
    phoneAvailability: {
      [phoneCellKey('memory-64', 'color-black')]: { enabled: true, countInStock: '3' },
      [phoneCellKey('memory-64', 'color-white')]: { enabled: true, countInStock: '2' },
      [phoneCellKey('memory-128', 'color-black')]: { enabled: true, countInStock: '5' },
      [phoneCellKey('memory-128', 'color-blue')]: { enabled: true, countInStock: '2' },
    },
    ...overrides,
  };
};

const variant = (overrides: Partial<ProductVariant>): ProductVariant => ({
  id: 'variant-id', sku: 'PHONE-SKU', title: '128GB / 6GB / Black', storage: '128GB', color: 'Black', condition: 'new',
  options: { RAM: '6GB' }, price: 62000, countInStock: 5, isActive: true, images: [], image: '', ...overrides,
});

describe('admin product form contract', () => {
  it('keeps the generic single-product flow for non-phone categories', () => {
    const request = toProductCreateRequest({
      ...createProductFormState(null), category: 'wireless-earbuds', name: '  Launch Earbuds  ', price: '125000', originalPrice: '', countInStock: '6',
      description: '  A complete product description.  ', storage: '', color: ' ', status: 'DRAFT',
    });
    expect(request).toMatchObject({ name: 'Launch Earbuds', description: 'A complete product description.', price: 125000, countInStock: 6, status: 'DRAFT' });
    expect(request).not.toHaveProperty('originalPrice');
    expect(request).not.toHaveProperty('storage');
    expect(request).not.toHaveProperty('color');
  });

  it.each([
    ['negative price', { memoryConfigurations: [{ clientId: 'memory', ram: '4GB', storage: '64GB', price: '-1', originalPrice: '' }] }, 'Memory configuration sale price must be a whole number of 0 or more.'],
    ['fractional stock', { phoneAvailability: { [phoneCellKey('memory-64', 'color-black')]: { enabled: true, countInStock: '1.5' } } }, 'Availability stock quantity must be a whole number of 0 or more.'],
    ['missing name', { name: '   ' }, 'Product name is required.'],
  ])('rejects %s before submission', (_case, override, message) => {
    expect(() => toProductCreateRequest(createPhoneForm(override))).toThrow(new ProductFormValidationError(message));
  });

  it('maps enabled memory/color cells to exact variants and excludes disabled cells', () => {
    const request = toProductCreateRequest(createPhoneForm({
      phoneAvailability: {
        [phoneCellKey('memory-64', 'color-black')]: { enabled: true, countInStock: '3' },
        [phoneCellKey('memory-64', 'color-white')]: { enabled: false, countInStock: '0' },
        [phoneCellKey('memory-128', 'color-black')]: { enabled: true, countInStock: '5' },
        [phoneCellKey('memory-128', 'color-blue')]: { enabled: true, countInStock: '2' },
      },
    }));
    expect(request.variants).toEqual(expect.arrayContaining([
      expect.objectContaining({ storage: '64GB', color: 'Awesome Black', options: { RAM: '4GB' }, price: 55000, countInStock: 3, isActive: true }),
      expect.objectContaining({ storage: '128GB', color: 'Awesome Black', options: { RAM: '6GB' }, price: 62000, countInStock: 5, isActive: true }),
      expect.objectContaining({ storage: '128GB', color: 'Awesome Blue', options: { RAM: '6GB' }, price: 62000, countInStock: 2, isActive: true }),
    ]));
    expect(request.variants).toHaveLength(3);
    expect(request.countInStock).toBe(10);
  });

  it('accepts an enabled sold-out cell and preserves its exact mapping', () => {
    const request = toProductCreateRequest(createPhoneForm({
      memoryConfigurations: [{ clientId: 'memory-64', ram: '4GB', storage: '64GB', price: '55000', originalPrice: '' }],
      colors: [{ clientId: 'color-black', value: 'Black' }],
      phoneAvailability: { [phoneCellKey('memory-64', 'color-black')]: { enabled: true, countInStock: '0' } },
    }));
    expect(request.variants).toEqual([expect.objectContaining({ options: { RAM: '4GB' }, color: 'Black', countInStock: 0, isActive: true })]);
    expect(request.countInStock).toBe(0);
  });

  it('rejects duplicate memory configurations and duplicate colors', () => {
    expect(() => toProductCreateRequest(createPhoneForm({
      memoryConfigurations: [
        { clientId: 'memory-1', ram: '4 GB', storage: '64GB', price: '55000', originalPrice: '' },
        { clientId: 'memory-2', ram: ' 4 GB ', storage: '64GB', price: '56000', originalPrice: '' },
      ],
    }))).toThrow('RAM and Storage / ROM configurations must be unique.');
    expect(() => toProductCreateRequest(createPhoneForm({
      colors: [{ clientId: 'color-1', value: 'Black' }, { clientId: 'color-2', value: ' black ' }],
    }))).toThrow('Colors must be unique.');
  });

  it('does not duplicate RAM, Storage, or Color in general phone specifications', () => {
    const request = toProductCreateRequest(createPhoneForm({
      specifications: { display: '6.4-inch AMOLED', processor: 'Helio G80', battery: '5000mAh', rearCamera: '64MP', frontCamera: '20MP', os: 'Android 11', network: '4G LTE', fingerprint: 'In-display', launchYear: '2021', ram: '12GB', storage: '256GB', color: 'Black' },
    }));
    expect(request.specifications).toEqual({ display: '6.4-inch AMOLED', processor: 'Helio G80', battery: '5000mAh', rearCamera: '64MP', frontCamera: '20MP', os: 'Android 11', network: '4G LTE', fingerprint: 'In-display', launchYear: '2021' });
  });

  it('reconstructs existing memory rows, colors, matrix cells, IDs, and SKUs', () => {
    const existing: Product = {
      _id: 'product-1', name: 'Existing Phone', brand: 'Apple', description: 'Existing phone', price: 55000, images: [], category: 'smartphones', specifications: {}, condition: 'new', ptaApproved: true, countInStock: 7, rating: null, numReviews: 0, reviews: [], isFeatured: false, tags: [], status: 'ACTIVE',
      variants: [
        variant({ id: 'variant-64-black', sku: 'PHONE-64-BLK', title: '64GB / 4GB / Black', storage: '64GB', color: 'Black', options: { RAM: '4GB' }, price: 55000, countInStock: 3 }),
        variant({ id: 'variant-64-white', sku: 'PHONE-64-WHT', title: '64GB / 4GB / White', storage: '64GB', color: 'White', options: { RAM: '4GB' }, price: 55000, countInStock: 2 }),
        variant({ id: 'variant-128-blue', sku: 'PHONE-128-BLU', title: '128GB / 6GB / Blue', storage: '128GB', color: 'Blue', options: { RAM: '6GB' }, price: 62000, countInStock: 2 }),
      ],
    };
    const form = createProductFormState(existing);
    expect(form.memoryConfigurations.map(({ ram, storage }) => `${ram}/${storage}`)).toEqual(['4GB/64GB', '6GB/128GB']);
    expect(form.colors.map((color) => color.value)).toEqual(['Black', 'White', 'Blue']);
    const memory = form.memoryConfigurations.find((item) => item.storage === '128GB')!;
    const blue = form.colors.find((item) => item.value === 'Blue')!;
    expect(form.phoneAvailability[phoneCellKey(memory.clientId, blue.clientId)]).toMatchObject({ variantId: 'variant-128-blue', enabled: true, countInStock: '2' });
    const black64Memory = form.memoryConfigurations.find((item) => item.storage === '64GB')!;
    const black = form.colors.find((item) => item.value === 'Black')!;
    form.phoneAvailability[phoneCellKey(black64Memory.clientId, black.clientId)]!.countInStock = '1';
    const request = toProductCreateRequest({ ...form, phoneCategory: true });
    expect(request.variants).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'variant-64-black', sku: 'PHONE-64-BLK', countInStock: 1 }),
      expect.objectContaining({ id: 'variant-64-white', sku: 'PHONE-64-WHT', countInStock: 2 }),
      expect.objectContaining({ id: 'variant-128-blue', sku: 'PHONE-128-BLU', countInStock: 2 }),
    ]));
  });

  it('serializes a trimmed custom brand', () => {
    const request = toProductCreateRequest(createPhoneForm({ brand: 'Other', customBrand: '  Nothing  ' }));
    expect(request.brand).toBe('Nothing');
  });

  it('retains complete phone specifications through category changes', () => {
    const form = createProductFormState(null);
    form.category = 'phones';
    form.specifications = { display: '6.7-inch', processor: 'Test chip', battery: '5000mAh', fingerprint: 'In-display', launchYear: '2021' };
    form.category = 'wireless-earbuds';
    form.category = 'phones';
    expect(form.specifications).toEqual({ display: '6.7-inch', processor: 'Test chip', battery: '5000mAh', fingerprint: 'In-display', launchYear: '2021' });
  });

  it('accepts up to five JPG or PNG files selected from the device', () => {
    const imageFiles = Array.from({ length: MAX_PRODUCT_IMAGES }, (_, index) => new File(['image'], `phone-${index + 1}.jpg`, { type: 'image/jpeg' }));
    const request = toProductCreateRequest(createPhoneForm({ imageFiles }));
    expect(request).not.toHaveProperty('images');
  });

  it('rejects more than five product images', () => {
    const imageFiles = Array.from({ length: MAX_PRODUCT_IMAGES + 1 }, (_, index) => new File(['image'], `phone-${index + 1}.png`, { type: 'image/png' }));
    expect(() => toProductCreateRequest(createPhoneForm({ imageFiles }))).toThrow(new ProductFormValidationError('You can add up to 5 product images.'));
  });

  it('keeps generic variants for non-phone categories', () => {
    const form = createProductFormState(null);
    form.category = 'smart-watches';
    form.hasVariants = true;
    form.name = 'Watch';
    form.description = 'A watch with size options.';
    form.variants = [{ clientId: 'watch-1', sku: 'WATCH-44', title: '44mm', storage: '', color: '', condition: 'new', options: { Size: '44mm' }, price: '1000', originalPrice: '', countInStock: '2', isActive: true }];
    const request = toProductCreateRequest(form);
    expect(request.variants).toEqual([expect.objectContaining({ sku: 'WATCH-44', options: { Size: '44mm' } })]);
  });
});
