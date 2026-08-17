import type { Category } from '../types';

export interface CategorySpecificationField {
  key: string;
  label: string;
  placeholder: string;
  maxLength?: number;
}

const phoneFields: CategorySpecificationField[] = [
  { key: 'display', label: 'Display', placeholder: 'e.g. 6.7-inch AMOLED, 120Hz' },
  { key: 'processor', label: 'Processor', placeholder: 'e.g. Snapdragon 8 Gen 3' },
  { key: 'battery', label: 'Battery', placeholder: 'e.g. 5,000mAh, 65W charging' },
  { key: 'rearCamera', label: 'Rear camera', placeholder: 'e.g. 64MP + 8MP + 5MP + 5MP', maxLength: 240 },
  { key: 'frontCamera', label: 'Front camera', placeholder: 'e.g. 20MP', maxLength: 160 },
  { key: 'os', label: 'Operating system', placeholder: 'e.g. Android 15' },
  { key: 'network', label: 'Network', placeholder: 'e.g. 5G, dual SIM' },
  { key: 'fingerprint', label: 'Fingerprint', placeholder: 'e.g. In-display' },
  { key: 'launchYear', label: 'Launch year', placeholder: 'e.g. 2021', maxLength: 4 },
];

const watchFields: CategorySpecificationField[] = [
  { key: 'display', label: 'Display', placeholder: 'e.g. 1.9-inch AMOLED' },
  { key: 'battery', label: 'Battery', placeholder: 'e.g. Up to 7 days' },
  { key: 'compatibility', label: 'Compatibility', placeholder: 'e.g. Android and iOS' },
  { key: 'connectivity', label: 'Connectivity', placeholder: 'e.g. Bluetooth 5.3, Wi-Fi' },
  { key: 'gps', label: 'GPS', placeholder: 'e.g. Built-in GPS' },
  { key: 'calling', label: 'Calling', placeholder: 'e.g. Bluetooth calling' },
  { key: 'waterResistance', label: 'Water resistance', placeholder: 'e.g. 5 ATM' },
];

const categorySpecificationFields: Record<string, CategorySpecificationField[]> = {
  phones: phoneFields,
  'smart-watches': watchFields,
  'fitness-bands': watchFields,
  'calling-watches': watchFields,
  'wireless-earbuds': [
    { key: 'batteryLife', label: 'Battery life', placeholder: 'e.g. Up to 30 hours' },
    { key: 'bluetooth', label: 'Bluetooth', placeholder: 'e.g. Bluetooth 5.3' },
    { key: 'anc', label: 'ANC', placeholder: 'e.g. Hybrid active noise cancellation' },
    { key: 'microphone', label: 'Microphone', placeholder: 'e.g. Dual-mic calls' },
    { key: 'charging', label: 'Charging', placeholder: 'e.g. USB-C, fast charging' },
    { key: 'waterResistance', label: 'Water resistance', placeholder: 'e.g. IPX4' },
  ],
  'power-banks': [
    { key: 'capacity', label: 'Capacity', placeholder: 'e.g. 20,000mAh' },
    { key: 'outputWattage', label: 'Output wattage', placeholder: 'e.g. 22.5W' },
    { key: 'ports', label: 'Ports', placeholder: 'e.g. 2 USB-A, 1 USB-C' },
    { key: 'fastCharging', label: 'Fast charging', placeholder: 'e.g. Supported' },
    { key: 'wirelessCharging', label: 'Wireless charging', placeholder: 'e.g. 15W MagSafe-compatible' },
  ],
  chargers: [
    { key: 'wattage', label: 'Wattage', placeholder: 'e.g. 67W' },
    { key: 'ports', label: 'Ports', placeholder: 'e.g. 2 USB-C, 1 USB-A' },
    { key: 'pd', label: 'PD', placeholder: 'e.g. USB-PD 3.0' },
    { key: 'gan', label: 'GaN', placeholder: 'e.g. GaN technology' },
    { key: 'plugType', label: 'Plug type', placeholder: 'e.g. Type G' },
  ],
  'charging-cables': [
    { key: 'connector', label: 'Connector', placeholder: 'e.g. USB-C to USB-C' },
    { key: 'wattage', label: 'Wattage', placeholder: 'e.g. 100W' },
    { key: 'dataSpeed', label: 'Data speed', placeholder: 'e.g. 480Mbps' },
    { key: 'material', label: 'Material', placeholder: 'e.g. Braided nylon' },
  ],
};

export const flattenCategories = (categories: Category[]): Category[] =>
  categories.flatMap((category) => [category, ...flattenCategories(category.children ?? [])]);

// Older catalogue rows use these phone slugs. Keep their established product data editable.
const phoneCategoryAliases: Record<string, string> = {
  smartphones: 'phones',
  iphone: 'phones',
  android: 'phones',
};

const phoneCategorySlugs = new Set(['phones', ...Object.keys(phoneCategoryAliases)]);

const normalizeCategorySlug = (value: string) => value.trim().toLowerCase();

export const isPhoneCategory = (categorySlug: string, categories: readonly Category[] = []) => {
  const categoryBySlug = new Map<string, Category>();
  const categoryById = new Map<string, Category>();
  const visit = (category: Category) => {
    categoryBySlug.set(normalizeCategorySlug(category.slug), category);
    categoryById.set(category.id, category);
    category.children?.forEach(visit);
  };
  categories.forEach(visit);

  let current = categoryBySlug.get(normalizeCategorySlug(categorySlug));
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    if (phoneCategorySlugs.has(normalizeCategorySlug(current.slug))) return true;
    const parentSlug = current.parentSlug ? normalizeCategorySlug(current.parentSlug) : undefined;
    current = (parentSlug ? categoryBySlug.get(parentSlug) : undefined)
      ?? (current.parentId ? categoryById.get(current.parentId) : undefined);
  }

  return phoneCategorySlugs.has(normalizeCategorySlug(categorySlug));
};

export const getCategorySpecificationFields = (categorySlug: string, categories: readonly Category[] = []) => {
  if (isPhoneCategory(categorySlug, categories)) return phoneFields;
  return categorySpecificationFields[normalizeCategorySlug(categorySlug)] ?? [];
};
