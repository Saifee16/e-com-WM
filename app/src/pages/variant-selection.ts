import type { ProductVariant } from '../types';

export type VariantOptions = Record<string, string>;

export const getVariantAvailableStock = (variant: ProductVariant) =>
  variant.availableCountInStock ?? variant.countInStock;

export const getVariantOptionGroups = (variants: ProductVariant[]) => variants.reduce<Record<string, string[]>>((groups, variant) => {
  const values: Record<string, string | undefined> = {
    ...(variant.storage ? { Storage: variant.storage } : {}),
    ...(variant.color ? { Color: variant.color } : {}),
    ...variant.options,
  };
  Object.entries(values).forEach(([name, value]) => {
    if (value && !groups[name]?.includes(value)) groups[name] = [...(groups[name] ?? []), value];
  });
  return groups;
}, {});

export const variantMatchesOptions = (variant: ProductVariant, options: VariantOptions) =>
  Object.entries(options).every(([name, value]) => {
    const variantValue = name === 'Storage' ? variant.storage : name === 'Color' ? variant.color : variant.options[name];
    return variantValue === value;
  });

export const resolveVariantSelection = (
  variants: ProductVariant[],
  selectedOptions: VariantOptions,
  name: string,
  value: string,
) => {
  const optionNames = Object.keys(getVariantOptionGroups(variants));
  const nextOptions = { ...selectedOptions, [name]: value };
  const changedIndex = optionNames.indexOf(name);
  optionNames.slice(changedIndex + 1).forEach((dependentName, offset) => {
    const prerequisiteNames = optionNames.slice(0, changedIndex + 1 + offset);
    const prerequisiteOptions = Object.fromEntries(
      prerequisiteNames
        .filter((optionName) => nextOptions[optionName] !== undefined)
        .map((optionName) => [optionName, nextOptions[optionName]]),
    );
    const stillMatches = nextOptions[dependentName] !== undefined
      && variants.some((variant) => variantMatchesOptions(variant, { ...prerequisiteOptions, [dependentName]: nextOptions[dependentName]! }));
    if (!stillMatches) {
      const dependentIndex = optionNames.indexOf(dependentName);
      optionNames.slice(dependentIndex).forEach((optionName) => delete nextOptions[optionName]);
    }
  });
  const matchingVariants = variants.filter((variant) => variantMatchesOptions(variant, nextOptions));
  return {
    options: nextOptions,
    matchingVariants,
    variant: matchingVariants.length === 1 ? matchingVariants[0] : undefined,
  };
};
