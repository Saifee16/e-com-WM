import { act, render, screen, within } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '../types';
import type { GoogleBusinessReviews } from '../services/api';

const requests = vi.hoisted(() => ({
  featured: vi.fn(),
  brands: vi.fn(),
  reviews: vi.fn(),
}));

vi.mock('../services/api', () => ({
  productsAPI: { getFeaturedProducts: requests.featured, getBrands: requests.brands },
  businessAPI: { getGoogleReviews: requests.reviews },
}));

import Home from './Home';

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const featuredProduct: Product = {
  _id: 'featured-phone',
  slug: 'featured-phone',
  name: 'Featured phone',
  brand: 'Samsung',
  description: 'Current featured phone',
  price: 80_000,
  images: ['https://example.com/featured-phone.webp'],
  category: 'phones',
  specifications: { storage: '128GB' },
  condition: 'new',
  ptaApproved: true,
  countInStock: 2,
  rating: null,
  numReviews: 0,
  reviews: [],
  isFeatured: true,
  tags: [],
};

const reviewData: GoogleBusinessReviews = {
  configured: true,
  placeId: 'store',
  rating: 4.8,
  userRatingCount: 20,
  googleMapsUri: 'https://example.com/reviews',
  reviews: [],
};

const pendingRequests = () => ({
  featured: deferred<{ data: { data: Product[] } }>(),
  brands: deferred<{ data: { data: { name: string; productCount: number }[] } }>(),
  reviews: deferred<{ data: { data: GoogleBusinessReviews } }>(),
});

const setup = () => {
  const { featured, brands, reviews } = pendingRequests();
  requests.featured.mockReturnValue(featured.promise);
  requests.brands.mockReturnValue(brands.promise);
  requests.reviews.mockReturnValue(reviews.promise);
  const view = render(<MemoryRouter><Home /></MemoryRouter>);
  return { featured, brands, reviews, ...view };
};

beforeEach(() => {
  vi.clearAllMocks();
  delete window.__WAHAB_HOME_FEATURED_PROMISE__;
});

describe('Home featured bootstrap', () => {
  it('waits without duplicating the request while brands and reviews load independently', async () => {
    const bootstrap = deferred<{ ok: true; products: Product[] }>();
    window.__WAHAB_HOME_FEATURED_PROMISE__ = bootstrap.promise;
    const { brands, reviews } = setup();
    expect(requests.featured).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Loading featured phone')).toBeInTheDocument();
    await act(async () => {
      brands.resolve({ data: { data: [{ name: 'Samsung', productCount: 9 }] } });
      reviews.resolve({ data: { data: reviewData } });
    });
    expect(screen.getByText('9 phones')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Google customer reviews' })).toBeInTheDocument();
    await act(async () => bootstrap.resolve({ ok: true, products: [featuredProduct] }));
    expect(screen.getByRole('img', { name: 'Featured phone' })).toHaveAttribute('src', featuredProduct.images[0]);
    expect(requests.featured).not.toHaveBeenCalled();
    expect(window.__WAHAB_HOME_FEATURED_PROMISE__).toBeUndefined();
  });

  it('shares a successful bootstrap across StrictMode effect replay', async () => {
    window.__WAHAB_HOME_FEATURED_PROMISE__ = Promise.resolve({ ok: true, products: [featuredProduct] });
    requests.brands.mockReturnValue(new Promise(() => {}));
    requests.reviews.mockReturnValue(new Promise(() => {}));
    await act(async () => render(<StrictMode><MemoryRouter><Home /></MemoryRouter></StrictMode>));
    expect(screen.getByRole('img', { name: 'Featured phone' })).toBeInTheDocument();
    expect(requests.featured).not.toHaveBeenCalled();
  });

  it.each([false, true])('falls back transparently, including normal API failure: %s', async (fallbackFails) => {
    window.__WAHAB_HOME_FEATURED_PROMISE__ = Promise.resolve({ ok: false });
    const { featured } = setup();
    await act(async () => {});
    expect(requests.featured).toHaveBeenCalledExactlyOnceWith();
    await act(async () => {
      if (fallbackFails) featured.reject(new Error('Unavailable'));
      else featured.resolve({ data: { data: [featuredProduct] } });
    });
    expect(fallbackFails
      ? screen.getByRole('heading', { name: 'Catalogue preview unavailable' })
      : screen.getByRole('img', { name: 'Featured phone' })).toBeInTheDocument();
  });

  it('preserves the empty catalogue without refetching', async () => {
    window.__WAHAB_HOME_FEATURED_PROMISE__ = Promise.resolve({ ok: true, products: [] });
    setup();
    await act(async () => {});
    expect(screen.getByRole('heading', { name: 'New phones arriving soon' })).toBeInTheDocument();
    expect(requests.featured).not.toHaveBeenCalled();
  });

  it('does not start a fallback after unmount and fetches normally on a later visit', async () => {
    const bootstrap = deferred<{ ok: false }>();
    window.__WAHAB_HOME_FEATURED_PROMISE__ = bootstrap.promise;
    setup().unmount();
    await act(async () => bootstrap.resolve({ ok: false }));
    expect(requests.featured).not.toHaveBeenCalled();
    setup();
    expect(requests.featured).toHaveBeenCalledExactlyOnceWith();
  });
});

describe('Home resource loading', () => {
  it('renders featured products while brands and reviews remain pending without repeating requests', async () => {
    const { featured, brands, reviews } = setup();
    expect(screen.getByLabelText('Loading featured phone')).toBeInTheDocument();
    expect(requests.featured).toHaveBeenCalledExactlyOnceWith();
    expect(requests.brands).toHaveBeenCalledExactlyOnceWith();
    expect(requests.reviews).toHaveBeenCalledExactlyOnceWith();

    await act(async () => featured.resolve({ data: { data: [featuredProduct] } }));

    expect(screen.getByRole('img', { name: 'Featured phone' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Loading featured phone')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Google customer reviews' })).not.toBeInTheDocument();

    await act(async () => brands.resolve({ data: { data: [{ name: 'Samsung', productCount: 9 }] } }));
    expect(within(screen.getByRole('link', { name: 'Shop Samsung phones' })).getByText('9 phones')).toBeInTheDocument();

    await act(async () => reviews.resolve({ data: { data: reviewData } }));
    expect(screen.getByRole('heading', { name: 'Google customer reviews' })).toBeInTheDocument();
    expect(screen.getByText('4.8 from 20 reviews')).toBeInTheDocument();
    expect(requests.featured).toHaveBeenCalledTimes(1);
    expect(requests.brands).toHaveBeenCalledTimes(1);
    expect(requests.reviews).toHaveBeenCalledTimes(1);
  }, 10_000);

  it('updates brands and reviews independently while featured products remain pending', async () => {
    const { brands, reviews } = setup();
    await act(async () => brands.resolve({ data: { data: [{ name: 'Samsung', productCount: 9 }] } }));
    expect(screen.getByText('9 phones')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading featured phone')).toBeInTheDocument();

    await act(async () => reviews.resolve({ data: { data: reviewData } }));
    expect(screen.getByRole('heading', { name: 'Google customer reviews' })).toBeInTheDocument();
    expect(screen.getByLabelText('Loading featured phone')).toBeInTheDocument();
  });

  it('shows the safe catalogue fallback when featured products fail before optional requests finish', async () => {
    const { featured, brands, reviews } = setup();
    await act(async () => featured.reject(new Error('Featured unavailable')));
    expect(screen.getByRole('heading', { name: 'Catalogue preview unavailable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse phones' })).toHaveAttribute('href', '/products');
    expect(screen.queryByLabelText('Loading featured phone')).not.toBeInTheDocument();

    await act(async () => brands.resolve({ data: { data: [{ name: 'Samsung', productCount: 9 }] } }));
    await act(async () => reviews.resolve({ data: { data: reviewData } }));
    expect(screen.getByText('9 phones')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Google customer reviews' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Catalogue preview unavailable' })).toBeInTheDocument();
  });

  it('preserves featured ordering and prioritizes only the hero image when other resources fail', async () => {
    const { featured, brands, reviews } = setup();
    await act(async () => {
      featured.resolve({ data: { data: [featuredProduct, { ...featuredProduct, _id: 'second', slug: 'second', name: 'Second phone' }] } });
      brands.reject(new Error('Brands unavailable'));
      reviews.reject(new Error('Reviews unavailable'));
    });
    const hero = screen.getByRole('img', { name: 'Featured phone' });
    expect(hero).toHaveAttribute('loading', 'eager');
    expect(hero).toHaveAttribute('fetchpriority', 'high');
    expect(screen.getByRole('link', { name: 'View phone' })).toHaveAttribute('href', '/products/featured-phone');
    const second = screen.getByRole('img', { name: 'Second phone' });
    expect(second).toHaveAttribute('loading', 'lazy');
    expect(second).not.toHaveAttribute('fetchpriority', 'high');
    expect(screen.getByRole('link', { name: 'Shop iPhone phones' })).toHaveAttribute('href', '/products?search=iPhone');
    expect(screen.queryByRole('heading', { name: 'Google customer reviews' })).not.toBeInTheDocument();
  });

  it('preserves the empty catalogue fallback when featured products succeed with no items', async () => {
    const { featured } = setup();
    await act(async () => featured.resolve({ data: { data: [] } }));
    expect(screen.getByRole('heading', { name: 'New phones arriving soon' })).toBeInTheDocument();
  });

  it.each(['resolve', 'reject'] as const)('ignores an earlier effect that settles with %s after cleanup', async (settlement) => {
    const previous = pendingRequests();
    const current = pendingRequests();
    requests.featured.mockReturnValueOnce(previous.featured.promise).mockReturnValue(current.featured.promise);
    requests.brands.mockReturnValueOnce(previous.brands.promise).mockReturnValue(current.brands.promise);
    requests.reviews.mockReturnValueOnce(previous.reviews.promise).mockReturnValue(current.reviews.promise);
    render(<StrictMode><MemoryRouter><Home /></MemoryRouter></StrictMode>);

    await act(async () => {
      if (settlement === 'resolve') {
        previous.featured.resolve({ data: { data: [featuredProduct] } });
        previous.brands.resolve({ data: { data: [{ name: 'Old brand', productCount: 99 }] } });
        previous.reviews.resolve({ data: { data: reviewData } });
      } else {
        previous.featured.reject(new Error('Old featured failure'));
        previous.brands.reject(new Error('Old brand failure'));
        previous.reviews.reject(new Error('Old review failure'));
      }
    });

    expect(screen.getByLabelText('Loading featured phone')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Featured phone' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Shop Old brand phones' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Google customer reviews' })).not.toBeInTheDocument();

    await act(async () => {
      current.featured.resolve({ data: { data: [] } });
      current.brands.resolve({ data: { data: [] } });
      current.reviews.reject(new Error('No reviews'));
    });
    expect(screen.getByRole('heading', { name: 'New phones arriving soon' })).toBeInTheDocument();
  });

  it.each(['resolve', 'reject'] as const)('ignores requests that %s after unmount, including when a new Home is mounted', async (settlement) => {
    const previous = setup();
    previous.unmount();
    const current = setup();

    await act(async () => {
      if (settlement === 'resolve') {
        previous.featured.resolve({ data: { data: [featuredProduct] } });
        previous.brands.resolve({ data: { data: [{ name: 'Old brand', productCount: 99 }] } });
        previous.reviews.resolve({ data: { data: reviewData } });
      } else {
        previous.featured.reject(new Error('Old featured failure'));
        previous.brands.reject(new Error('Old brand failure'));
        previous.reviews.reject(new Error('Old review failure'));
      }
    });

    expect(screen.getByLabelText('Loading featured phone')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Featured phone' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Shop Old brand phones' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Google customer reviews' })).not.toBeInTheDocument();

    await act(async () => current.featured.resolve({ data: { data: [] } }));
    await act(async () => current.brands.resolve({ data: { data: [] } }));
    await act(async () => current.reviews.reject(new Error('No reviews')));
    expect(screen.getByRole('heading', { name: 'New phones arriving soon' })).toBeInTheDocument();
  });
});
