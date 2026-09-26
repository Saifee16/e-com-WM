import React, { forwardRef } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
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
  it('keeps phone shortcuts in one keyboard-scrollable row and selects the current route', () => {
    renderProducts('/phones/samsung');

    const title = screen.getByRole('heading', { level: 1 });
    const search = screen.getAllByRole('searchbox', { name: 'Search the catalogue' })[0]!;
    const phoneNav = screen.getByRole('navigation', { name: 'Phone shopping pages' });
    const controls = screen.getByRole('group', { name: 'Sort, filter, and view controls' });
    const sort = within(controls).getByRole('combobox', { name: 'Sort products' });
    const filters = within(controls).getByRole('button', { name: /Filters/ });
    const listView = within(controls).getByRole('button', { name: 'List view' });

    expect(title.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(search.compareDocumentPosition(phoneNav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(phoneNav).toHaveAttribute('tabindex', '0');
    expect(phoneNav).toHaveClass('flex-nowrap', 'overflow-x-auto');
    expect(within(phoneNav).getByRole('link', { name: 'Samsung' })).toHaveClass('shrink-0', 'whitespace-nowrap');
    expect(within(phoneNav).getByRole('link', { name: 'Samsung' })).toHaveAttribute('aria-current', 'page');
    expect(within(phoneNav).getByRole('link', { name: /30,000/ })).toHaveClass('shrink-0', 'whitespace-nowrap');
    expect(sort.compareDocumentPosition(filters) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(filters.compareDocumentPosition(listView) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(within(phoneNav).getByRole('link', { name: 'Samsung' })).toHaveAttribute('href', '/phones/samsung');
  });

  it('keeps search, sort, view, and budget filters working in the compact controls', async () => {
    const user = userEvent.setup();
    renderProducts('/phones');

    const search = screen.getAllByRole('searchbox', { name: 'Search the catalogue' })[0]!;
    const controls = screen.getByRole('group', { name: 'Sort, filter, and view controls' });
    const sort = within(controls).getByRole('combobox', { name: 'Sort products' });

    await user.type(search, 'iPhone');
    await waitFor(() => expect(apiMocks.getProducts).toHaveBeenCalledWith(expect.objectContaining({ search: 'iPhone' })), { timeout: 2000 });

    await user.selectOptions(sort, 'price-low');
    await waitFor(() => expect(apiMocks.getProducts).toHaveBeenCalledWith(expect.objectContaining({ sort: 'price-low' })));

    const listView = within(controls).getByRole('button', { name: 'List view' });
    await user.click(listView);
    expect(listView).toHaveAttribute('aria-pressed', 'true');

    await user.click(within(controls).getByRole('button', { name: /Filters/ }));
    const drawer = screen.getByRole('button', { name: 'Close filters' }).closest('[aria-label="Product filters"]') as HTMLElement;
    await user.click(within(drawer).getByLabelText('Under Rs. 30,000'));
    await waitFor(() => expect(apiMocks.getProducts).toHaveBeenCalledWith(expect.objectContaining({ maxPrice: 30000 })));
    expect(screen.getByRole('button', { name: 'Remove Under Rs. 30,000 filter' })).toBeInTheDocument();

    await user.click(within(drawer).getByRole('button', { name: 'Clear' }));
    await waitFor(() => expect(apiMocks.getProducts.mock.calls.at(-1)?.[0]).toMatchObject({ maxPrice: undefined }));
  }, 15_000);

  it('parses top-level and child catalogue routes', () => {
    expect(getRouteCategory('/phones')).toBe('phones');
    expect(getRouteCategory('/phones/iphone')).toBe('iphone');
    expect(getRouteCategory('/phones/android')).toBe('android');
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

  it('loads search results from q and preserves the shareable URL state', async () => {
    apiMocks.getProducts.mockResolvedValue(page([catalogueProduct]));
    renderProducts('/search?q=iPhone');

    await waitFor(() => expect(apiMocks.getProducts).toHaveBeenCalledWith(expect.objectContaining({
      q: 'iPhone',
      search: undefined,
    })));
    expect(screen.getByRole('heading', { name: 'Search results for "iPhone"' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/search?q=iPhone');
  });

  it('shows a truthful query-specific empty state', async () => {
    renderProducts('/search?q=xyz');

    expect(await screen.findByText('No products found for "xyz".')).toBeInTheDocument();
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
