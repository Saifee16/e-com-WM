import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Category, Product } from '../../types';
import Navbar from './Navbar';

const mocks = vi.hoisted(() => ({
  getCategories: vi.fn(),
  getProducts: vi.fn(),
}));

vi.mock('../../services/api', () => ({ productsAPI: mocks }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null, logout: vi.fn() }),
}));
vi.mock('../../contexts/CartContext', () => ({
  useCart: () => ({ totals: { itemCount: 0 }, items: [] }),
}));
vi.mock('../cart/CartDrawer', () => ({ default: () => null }));

const category = (overrides: Partial<Category>): Category => ({
  id: overrides.id ?? overrides.slug ?? 'category',
  name: overrides.name ?? 'Category',
  slug: overrides.slug ?? 'category',
  productCount: overrides.productCount ?? 1,
  isActive: true,
  ...overrides,
});

const product = (overrides: Partial<Product>): Product => ({
  _id: overrides._id ?? 'product',
  name: overrides.name ?? 'Phone',
  brand: overrides.brand ?? 'Apple',
  description: '',
  price: overrides.price ?? 100_000,
  images: overrides.images ?? ['/phone.jpg'],
  category: overrides.category ?? 'phones',
  specifications: overrides.specifications ?? { storage: '128GB' },
  condition: 'new',
  ptaApproved: true,
  countInStock: 1,
  rating: null,
  numReviews: 0,
  reviews: [],
  isFeatured: false,
  tags: [],
  ...overrides,
});

const page = (items: Product[]) => ({
  data: {
    data: {
      items,
      pagination: { page: 1, limit: 100, total: items.length, totalPages: 1, hasPreviousPage: false, hasNextPage: false },
    },
  },
});

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
};

const categories: Category[] = [
  category({ slug: 'phones', name: 'Phones', productCount: 0 }),
  category({ slug: 'smart-watches', name: 'Smart Watches', productCount: 0, children: [category({ slug: 'fitness-bands', name: 'Fitness Bands', productCount: 1 })] }),
  category({ slug: 'gadgets', name: 'Gadgets', productCount: 0, children: [
    category({ slug: 'wireless-earbuds', name: 'Wireless Earbuds', parentSlug: 'gadgets', productCount: 1 }),
    category({ slug: 'chargers', name: 'Chargers', parentSlug: 'gadgets', productCount: 0 }),
    category({ slug: 'screen-protectors', name: 'Screen Protectors', parentSlug: 'gadgets', productCount: 1 }),
  ] }),
];

const renderNavbar = () => render(<MemoryRouter><Routes><Route path="*" element={<><Navbar /><LocationProbe /></>} /></Routes></MemoryRouter>);

describe('Navbar data-driven navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCategories.mockResolvedValue({ data: { data: categories } });
    mocks.getProducts.mockImplementation((params: { category?: string; featured?: boolean; q?: string }) => {
      if (params.featured) return Promise.resolve(page([]));
      if (params.q) return Promise.resolve(page([product({ _id: 'suggestion', name: 'Samsung Galaxy S25', brand: 'Samsung', slug: 'samsung-galaxy-s25' })]));
      if (params.category === 'smart-watches') return Promise.resolve(page([product({ brand: 'Garmin', category: 'fitness-bands' })]));
      if (params.category === 'gadgets') return Promise.resolve(page([product({ brand: 'Anker', category: 'wireless-earbuds' })]));
      return Promise.resolve(page([product({ brand: 'Apple' }), product({ brand: 'Samsung' })]));
    });
  });

  it('exposes the requested phone destinations and dynamic brands', async () => {
    const user = userEvent.setup();
    renderNavbar();
    await waitFor(() => expect(mocks.getProducts).toHaveBeenCalled());
    await user.click(document.querySelector('button[aria-controls="desktop-menu-phones"]')!);

    expect(screen.getByRole('link', { name: 'New Phones' })).toHaveAttribute('href', '/phones?condition=new');
    expect(screen.getByRole('link', { name: 'Discounted' })).toHaveAttribute('href', '/phones?discounted=true');
    expect(screen.getByRole('link', { name: 'PTA Approved' })).toHaveAttribute('href', '/phones?ptaApproved=true');
    expect(screen.getByRole('link', { name: 'Under Rs. 30,000' })).toHaveAttribute('href', '/phones?price=Under%20Rs.%2030%2C000');
    expect(screen.getByRole('link', { name: 'Apple' })).toHaveAttribute('href', '/phones?brand=Apple');
    expect(screen.getByRole('link', { name: 'Samsung' })).toBeInTheDocument();
  });

  it('hides the featured tile without a real featured product and renders it with one', async () => {
    const user = userEvent.setup();
    const firstRender = renderNavbar();
    await waitFor(() => expect(mocks.getProducts).toHaveBeenCalled());
    await user.click(document.querySelector('button[aria-controls="desktop-menu-phones"]')!);
    expect(screen.queryByTestId('featured-phone-tile')).not.toBeInTheDocument();

    mocks.getProducts.mockImplementation((params: { category?: string; featured?: boolean }) => {
      if (params.featured) return Promise.resolve(page([product({ _id: 'featured', name: 'Featured Galaxy', isFeatured: true, slug: 'featured-galaxy' })]));
      return Promise.resolve(page([]));
    });
    fireEvent.mouseDown(document.body);
    firstRender.unmount();
    renderNavbar();
    await user.click(document.querySelector('button[aria-controls="desktop-menu-phones"]')!);
    await waitFor(() => expect(screen.getByTestId('featured-phone-tile')).toBeInTheDocument());
    expect(screen.getByTestId('featured-phone-tile')).toHaveAttribute('href', '/products/featured-galaxy');
  });

  it('supports mobile accordion state and closes after navigation', async () => {
    const user = userEvent.setup();
    renderNavbar();
    const menuButton = screen.getByRole('button', { name: 'Open navigation menu' });
    await user.click(menuButton);
    const phonesButton = document.querySelector('button[aria-controls="mobile-menu-phones"]')!;
    await user.click(phonesButton);
    expect(phonesButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Condition' })).toHaveAttribute('aria-expanded', 'false');
    await user.click(screen.getByRole('link', { name: 'All Phones' }));
    await waitFor(() => expect(screen.queryByRole('link', { name: 'All Phones' })).not.toBeInTheDocument());
  });

  it('closes desktop menus with Escape and outside clicks', async () => {
    const user = userEvent.setup();
    renderNavbar();
    const phonesButton = document.querySelector('button[aria-controls="desktop-menu-phones"]')!;
    await user.click(phonesButton);
    expect(phonesButton).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(phonesButton).toHaveAttribute('aria-expanded', 'false');
    await user.click(phonesButton);
    fireEvent.mouseDown(document.body);
    expect(phonesButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('submits a shareable search URL and renders server suggestions', async () => {
    const user = userEvent.setup();
    renderNavbar();
    const searchbox = screen.getAllByRole('searchbox')[0]!;

    await user.type(searchbox, 'Samsung');
    await waitFor(() => expect(mocks.getProducts).toHaveBeenCalledWith(expect.objectContaining({ q: 'Samsung', limit: 6 })));
    expect(screen.getAllByRole('option', { name: /Samsung Galaxy S25/ })).toHaveLength(2);

    await user.keyboard('{ArrowDown}{Enter}');
    expect(screen.getByTestId('location')).toHaveTextContent('/products/samsung-galaxy-s25');
  });

  it('clears search input and closes suggestions with Escape', async () => {
    const user = userEvent.setup();
    renderNavbar();
    const searchbox = screen.getAllByRole('searchbox')[0]!;

    await user.type(searchbox, 'Honor');
    await waitFor(() => expect(screen.getAllByRole('option')).not.toHaveLength(0));
    await user.keyboard('{Escape}');
    expect(screen.queryAllByRole('option')).toHaveLength(0);

    await user.click(screen.getAllByRole('button', { name: 'Clear search' })[0]!);
    expect(screen.getAllByRole('searchbox').every((input) => (input as HTMLInputElement).value === '')).toBe(true);
  });

  it('omits empty or inactive category links while keeping live groups', async () => {
    const user = userEvent.setup();
    renderNavbar();
    await waitFor(() => expect(mocks.getProducts).toHaveBeenCalled());
    await user.click(document.querySelector('button[aria-controls="desktop-menu-gadgets"]')!);
    expect(screen.getByRole('link', { name: 'Wireless Earbuds' })).toHaveAttribute('href', '/gadgets/wireless-earbuds');
    expect(screen.getByRole('link', { name: 'Screen Protectors' })).toHaveAttribute('href', '/gadgets/screen-protectors');
    expect(screen.queryByRole('link', { name: 'Chargers' })).not.toBeInTheDocument();
  });
});
