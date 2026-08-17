import React, { forwardRef } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', () => {
  const Motion = forwardRef<HTMLElement, Record<string, unknown>>((props, ref) => {
    const domProps = { ...props };
    for (const key of ['initial', 'animate', 'exit', 'transition']) delete domProps[key];
    return React.createElement('div', { ...domProps, ref });
  });
  return { motion: new Proxy({}, { get: () => Motion }) };
});

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));
vi.mock('../contexts/CartContext', () => ({
  useCart: () => ({
    items: [{ product: 'product-1', variantId: 'variant-1', name: 'Guest phone', image: '', price: 50_000, quantity: 1 }],
    totals: { subtotal: 50_000, tax: 1_000, discount: 0, freeShipping: false },
    clearCart: vi.fn(),
  }),
}));
vi.mock('../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../services/api', () => ({ ordersAPI: { createOrder: vi.fn() } }));

import Checkout from './Checkout';

describe('guest checkout', () => {
  it('renders checkout for an unauthenticated visitor instead of redirecting to login', () => {
    render(<MemoryRouter initialEntries={['/checkout']}><Checkout /></MemoryRouter>);

    expect(screen.getByText('Shipping Information')).toBeInTheDocument();
    expect(screen.getByText('Guest phone')).toBeInTheDocument();
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
  });
});
