import React, { forwardRef } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '../types';

const authState = vi.hoisted(() => ({ isAuthenticated: false }));
const addToCart = vi.hoisted(() => vi.fn());
const showToast = vi.hoisted(() => vi.fn());
const apiMocks = vi.hoisted(() => ({
  getProductById: vi.fn(),
  getProducts: vi.fn(),
  submitReview: vi.fn(),
  wishlistAdd: vi.fn(),
  wishlistRemove: vi.fn(),
}));

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

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: authState.isAuthenticated ? { id: 'customer-1', firstName: 'Ayesha', lastName: 'Khan', email: 'ayesha@example.com' } : null,
    isAuthenticated: authState.isAuthenticated,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
  }),
}));
vi.mock('../contexts/CartContext', () => ({
  useCart: () => ({ addToCart, items: [], totals: {} }),
}));
vi.mock('../contexts/ToastContext', () => ({ useToast: () => ({ showToast }) }));
vi.mock('../services/api', () => ({
  productsAPI: {
    getProductById: apiMocks.getProductById,
    getProducts: apiMocks.getProducts,
    submitReview: apiMocks.submitReview,
  },
  wishlistAPI: {
    add: apiMocks.wishlistAdd,
    remove: apiMocks.wishlistRemove,
  },
}));

import ProductDetail from './ProductDetail';

const product: Product = {
  _id: '11111111-1111-4111-8111-111111111111',
  name: 'Guest Phone',
  brand: 'Wahab',
  description: 'A phone',
  price: 1000,
  images: ['phone.jpg'],
  category: 'phones',
  specifications: { storage: '128GB' },
  condition: 'new',
  ptaApproved: true,
  countInStock: 4,
  rating: 5,
  numReviews: 0,
  reviews: [],
  isFeatured: false,
  tags: [],
  variants: [
    {
      id: 'variant-128', sku: 'PHONE-128', title: '128GB', storage: '128GB', options: {},
      price: 1000, countInStock: 4, availableCountInStock: 4, isActive: true, images: ['phone.jpg'], image: 'phone.jpg',
    },
    {
      id: 'variant-256', sku: 'PHONE-256', title: '256GB', storage: '256GB', options: {},
      price: 1200, countInStock: 4, availableCountInStock: 4, isActive: true, images: ['phone.jpg'], image: 'phone.jpg',
    },
  ],
};

const LocationProbe = () => <output data-testid="location">{useLocation().pathname}</output>;

const renderProduct = () => render(
  <MemoryRouter initialEntries={[`/products/${product._id}`]}>
    <Routes>
      <Route path="/products/:id" element={<ProductDetail />} />
      <Route path="/checkout" element={<div data-testid="checkout">Checkout</div>} />
    </Routes>
    <LocationProbe />
  </MemoryRouter>,
);

beforeEach(() => {
  vi.clearAllMocks();
  authState.isAuthenticated = false;
  addToCart.mockResolvedValue(undefined);
  apiMocks.getProductById.mockResolvedValue({ data: { data: product } });
  apiMocks.getProducts.mockResolvedValue({ data: { data: { items: [] } } });
  apiMocks.submitReview.mockResolvedValue({});
});

describe('guest-compatible product detail Buy Now', () => {
  it('adds the selected variant and quantity for a guest without opening AuthModal', async () => {
    const user = userEvent.setup();
    renderProduct();

    await user.click(await screen.findByRole('button', { name: '256GB' }));
    const quantityControl = screen.getByText('1').parentElement!;
    await user.click(within(quantityControl).getAllByRole('button')[1]!);
    await user.click(within(quantityControl).getAllByRole('button')[1]!);
    await user.click(screen.getByRole('button', { name: 'Buy Now' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/checkout'));
    expect(addToCart).toHaveBeenCalledWith(product, 3, 'variant-256');
    expect(screen.queryByText('Buy Now requires a customer account.')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign in to continue')).not.toBeInTheDocument();
  });

  it('keeps authenticated Buy Now behavior intact', async () => {
    authState.isAuthenticated = true;
    const user = userEvent.setup();
    renderProduct();

    await user.click(await screen.findByRole('button', { name: '256GB' }));
    await user.click(screen.getByRole('button', { name: 'Buy Now' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/checkout'));
    expect(addToCart).toHaveBeenCalledWith(product, 1, 'variant-256');
  });

  it('keeps wishlist protected for guests', async () => {
    const user = userEvent.setup();
    renderProduct();

    await user.click(await screen.findByRole('button', { name: 'Toggle wishlist' }));

    expect(screen.getByText('Sign in to continue with account-only features.')).toBeInTheDocument();
    expect(apiMocks.wishlistAdd).not.toHaveBeenCalled();
  });

  it('keeps review submission protected for guests', async () => {
    const user = userEvent.setup();
    renderProduct();

    await user.click(await screen.findByRole('button', { name: /Reviews/ }));
    await user.type(screen.getByLabelText('Review'), 'Very good phone');
    await user.click(screen.getByRole('button', { name: 'Submit review' }));

    expect(screen.getByText('Sign in to continue with account-only features.')).toBeInTheDocument();
    expect(apiMocks.submitReview).not.toHaveBeenCalled();
  });
});
