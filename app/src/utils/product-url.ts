import type { Product } from '../types';

export const getProductPath = (product: Pick<Product, '_id' | 'slug'>) =>
  `/products/${encodeURIComponent(product.slug ?? product._id)}`;
