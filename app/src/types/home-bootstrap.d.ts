import type { Product } from '../types';

export type HomeFeaturedResult = { ok: true; products: Product[] } | { ok: false };

declare global {
  interface Window {
    __WAHAB_HOME_FEATURED_PROMISE__?: Promise<HomeFeaturedResult>;
  }
}
