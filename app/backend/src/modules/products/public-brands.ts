export interface PublicBrandRecord {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  _count: { products: number };
}

export const mapPublicBrands = (brands: readonly PublicBrandRecord[]) => brands
  .filter((brand) => brand._count.products > 0 && brand.name.trim().toLowerCase() !== 'other')
  .map((brand) => ({
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    logoUrl: brand.logoUrl,
    productCount: brand._count.products,
  }));
