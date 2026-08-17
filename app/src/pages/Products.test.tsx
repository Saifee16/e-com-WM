import React, { forwardRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  getBrands: vi.fn(),
  getCategories: vi.fn(),
  getProducts: vi.fn(),
}));
const addToCart = vi.hoisted(() => vi.fn());
const showToast = vi.hoisted(() => vi.fn());

vi.mock('framer-motion', () => {
  const Motion = forwardRef<HTMLElement, Record<string, unknown>>((props, ref) => {
    const domProps = { ...props };
    for (const key of ['initial', 'animate', 'exit', 'transition', 'whileInView', 'viewport']) delete domProps[key];
    return React.createElement('div', { ...domProps, ref });
  });

  return {
    motion: new Proxy({}, { get: () => Motion }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

vi.mock('../contexts/CartContext', () => ({
  useCart: () => ({ addToCart }),
}));
vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));
vi.mock('../services/api', () => ({
  productsAPI: {
    getBrands: apiMocks.getBrands,
    getCategories: apiMocks.getCategories,
    getProducts: apiMocks.getProducts,
  },
}));

import Products, { getRouteCategory } from './Products';

const page = (items: unknown[] = []) => ({
  data: {
    data: {
      items,
      pagination: {
        page: 1,
        limit: 20,
        total: items.length,
        totalPages: items.length > 0 ? 1 : 0,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    },
  },
});

const CurrentLocation = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
};

const renderProducts = (entry: string) => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path="*" element={<><Products /><CurrentLocation /></>} />
    </Routes>
  </MemoryRouter>,
);

const catalogueProduct = {
  _id: '22222222-2222-4222-8222-222222222222',
  name: 'Catalogue Phone',
  brand: 'Wahab',
  description: 'A catalogue phone',
  price: 1000,
  images: ['phone.jpg'],
  category: 'phones',
  specifications: {},
  condition: 'new' as const,
  ptaApproved: true,
  countInStock: 2,
  rating: 5,
  numReviews: 0,
  reviews: [],
  isFeatured: false,
  tags: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  addToCart.mockResolvedValue(undefined);
  apiMocks.getBrands.mockResolvedValue({ data: { data: [] } });
  apiMocks.getCategories.mockResolvedValue({ data: { data: [] } });
  apiMocks.getProducts.mockResolvedValue(page());
});

describe('Products category routes', () => {
  it('parses top-level and child catalogue routes', () => {
    expect(getRouteCategory('/phones')).toBe('phones');
    expect(getRouteCategory('/smart-watches')).toBe('smart-watches');
    expect(getRouteCategory('/gadgets/wireless-earbuds')).toBe('wireless-earbuds');
    expect(getRouteCategory('/products')).toBe('');
  });

  it('keeps the route category when optional filters are applied and cleared', async () => {
    const user = userEvent.setup();
    renderProducts('/phones?brand=Apple&condition=used');

    await waitFor(() => expect(apiMocks.getProducts).toHaveBeenCalledWith(expect.objectContaining({
      category: 'phones',
      brand: 'Apple',
      condition: 'used',
    })));

    await user.click(screen.getAllByRole('button', { name: 'Clear all filters' })[0]!);

    await waitFor(() => {
      const lastCall = apiMocks.getProducts.mock.calls.at(-1)?.[0];
      expect(lastCall).toMatchObject({ category: 'phones' });
      expect(lastCall?.brand).toBeUndefined();
      expect(lastCall?.condition).toBeUndefined();
    });
    expect(screen.getByTestId('location')).toHaveTextContent('/phones');
  });

  it('shows a truthful empty state for an empty category route', async () => {
    renderProducts('/smart-watches');

    expect(await screen.findByText('No products are available in this category yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse all products' })).toHaveAttribute('href', '/products');
    expect(apiMocks.getProducts).toHaveBeenCalledWith(expect.objectContaining({ category: 'smart-watches' }));
  });

  it('distinguishes an API failure from a valid empty category', async () => {
    apiMocks.getProducts.mockRejectedValue(new Error('backend unavailable'));
    renderProducts('/gadgets');

    expect(await screen.findByText('Products could not be loaded')).toBeInTheDocument();
    expect(screen.queryByText('No products are available in this category yet.')).not.toBeInTheDocument();
  });

  it('keeps catalogue Buy Now guest-compatible', async () => {
    apiMocks.getProducts.mockResolvedValue(page([catalogueProduct]));
    const user = userEvent.setup();
    renderProducts('/products');

    await user.click(await screen.findByRole('button', { name: 'Buy Catalogue Phone now' }));

    await waitFor(() => {
      expect(addToCart).toHaveBeenCalledWith(catalogueProduct, 1);
      expect(screen.getByTestId('location')).toHaveTextContent('/checkout');
    });
  });
});
