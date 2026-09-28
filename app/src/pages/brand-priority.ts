const BRAND_PRIORITY = ['apple', 'samsung', 'google pixel', 'honor', 'oppo', 'realme', 'motorola', 'itel'];

export const prioritizeBrands = <T extends { name: string }>(brands: T[]): T[] => {
  const priority = (name: string) => {
    const normalized = name.trim().toLowerCase();
    const index = BRAND_PRIORITY.indexOf(normalized === 'iphone' ? 'apple' : normalized);
    return index < 0 ? BRAND_PRIORITY.length : index;
  };
  return [...brands].sort((a, b) => priority(a.name) - priority(b.name));
};
