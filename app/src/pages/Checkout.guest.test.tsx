import React, { forwardRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
    totals: { subtotal: 50_000, tax: 10_000, discount: 0, freeShipping: false },
    clearCart: vi.fn(),
  }),
}));
vi.mock('../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../services/api', () => ({ ordersAPI: { createOrder: vi.fn() } }));

import { NATIONWIDE_ORDER_NOTICE } from '../config/order-policy';
import Checkout from './Checkout';

const fillShippingInfo = (city: string) => {
  const values = ['Test', 'Customer', 'test@example.com', '03001234567', '1 Test Street', city, 'Sindh', '71000'];
  const fields = screen.getAllByRole('textbox');

  values.forEach((value, index) => {
    fireEvent.change(fields[index]!, { target: { value } });
  });
};

describe('guest checkout', () => {
  it('renders checkout for an unauthenticated visitor instead of redirecting to login', () => {
    render(<MemoryRouter initialEntries={['/checkout']}><Checkout /></MemoryRouter>);

    expect(screen.getByText('Shipping Information')).toBeInTheDocument();
    expect(screen.getByText('Guest phone')).toBeInTheDocument();
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
    expect(screen.queryByText('Tax')).not.toBeInTheDocument();
  });
  it('shows the outside-Hyderabad confirmation notice instead of promising COD delivery', () => {
    render(<MemoryRouter initialEntries={['/checkout']}><Checkout /></MemoryRouter>);
    fillShippingInfo('Karachi');
    fireEvent.submit(screen.getByRole('button', { name: 'Continue to Payment' }).closest('form')!);

    expect(screen.getByText('Cash on Delivery')).toBeInTheDocument();
    expect(screen.getByText(NATIONWIDE_ORDER_NOTICE)).toBeInTheDocument();
    expect(screen.queryByText('Pay the courier when your order arrives.')).not.toBeInTheDocument();
  });

  it('keeps the Hyderabad local checkout path available', () => {
    render(<MemoryRouter initialEntries={['/checkout']}><Checkout /></MemoryRouter>);
    fillShippingInfo('Hyderabad');
    fireEvent.submit(screen.getByRole('button', { name: 'Continue to Payment' }).closest('form')!);

    expect(screen.getByText('Available for Hyderabad deliveries; our team may contact you to confirm the order.')).toBeInTheDocument();
    expect(screen.queryByText(NATIONWIDE_ORDER_NOTICE)).not.toBeInTheDocument();
  });
});
