import React, { forwardRef } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', () => {
  const Motion = forwardRef<HTMLElement, Record<string, unknown>>((props, ref) => {
    const domProps = { ...props };
    for (const key of ['initial', 'animate', 'exit', 'transition']) delete domProps[key];
    return React.createElement('div', { ...domProps, ref });
  });
  return { motion: new Proxy({}, { get: () => Motion }) };
});

const checkoutState = vi.hoisted(() => ({ subtotal: 50_000, freeShipping: false, emptyCart: false }));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));
vi.mock('../contexts/CartContext', () => ({
  useCart: () => ({
    items: checkoutState.emptyCart ? [] : [{ product: 'product-1', variantId: 'variant-1', name: 'Guest phone', image: 'https://example.com/phone.jpg', price: checkoutState.subtotal, quantity: 1 }],
    totals: { subtotal: checkoutState.subtotal, shipping: 300, total: checkoutState.subtotal + 300, tax: 10_000, discount: 0, freeShipping: checkoutState.freeShipping },
    clearCart: vi.fn(),
  }),
}));
vi.mock('../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../services/api', () => ({ ordersAPI: { createOrder: vi.fn() } }));

import { NATIONWIDE_ORDER_NOTICE } from '../config/order-policy';
import { formatPrice } from '../utils/format';
import Checkout from './Checkout';

const fillShippingInfo = (city: string) => {
  const values = ['Test', 'Customer', 'test@example.com', '03001234567', '1 Test Street', city, 'Sindh', '71000'];
  const fields = screen.getAllByRole('textbox');

  values.forEach((value, index) => {
    fireEvent.change(fields[index]!, { target: { value } });
  });
};

describe('guest checkout', () => {
  beforeEach(() => {
    checkoutState.subtotal = 50_000;
    checkoutState.freeShipping = false;
    checkoutState.emptyCart = false;
  });
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

  it('preserves the empty-cart checkout guard and its browse-products action', () => {
    checkoutState.emptyCart = true;
    render(<MemoryRouter initialEntries={['/checkout']}><Routes>
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/products" element={<p>Products page</p>} />
    </Routes></MemoryRouter>);

    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    expect(screen.queryByText('Shipping Information')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Browse Products' }));
    expect(screen.getByText('Products page')).toBeInTheDocument();
  });
});

const summary = () => within(screen.getByText('Order Summary').parentElement!);
const price = (amount: number) => formatPrice(amount).replace(/\s/g, ' ');

describe('checkout shipping summary', () => {
  beforeEach(() => {
    checkoutState.subtotal = 50_000;
    checkoutState.freeShipping = false;
    checkoutState.emptyCart = false;
  });

  it('shows Rs 300 standard shipping before an address and after Hyderabad is entered', () => {
    render(<MemoryRouter initialEntries={['/checkout']}><Checkout /></MemoryRouter>);

    expect(summary().getByText('Standard Shipping')).toBeInTheDocument();
    expect(summary().getByText(price(300))).toBeInTheDocument();
    expect(summary().getByText(price(50_300))).toBeInTheDocument();
    expect(summary().queryByText('Free')).not.toBeInTheDocument();

    fillShippingInfo('Hyderabad');

    expect(summary().getByText(price(300))).toBeInTheDocument();
    expect(summary().getByText(price(50_300))).toBeInTheDocument();
  });

  it('keeps high-value standard shipping at Rs 300 despite a stale freeShipping cart flag', () => {
    checkoutState.subtotal = 680_000;
    checkoutState.freeShipping = true;
    render(<MemoryRouter initialEntries={['/checkout']}><Checkout /></MemoryRouter>);

    fillShippingInfo('Hyderabad');

    expect(summary().getByText('Standard Shipping')).toBeInTheDocument();
    expect(summary().getByText(price(300))).toBeInTheDocument();
    expect(summary().getByText(price(680_300))).toBeInTheDocument();
    expect(summary().queryByText('Free')).not.toBeInTheDocument();
  });

  it('changes the summary only after pickup or express is explicitly selected', () => {
    render(<MemoryRouter initialEntries={['/checkout']}><Checkout /></MemoryRouter>);
    fillShippingInfo('Hyderabad');

    expect(summary().getByText(price(300))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /Store Pickup/ }));
    expect(summary().getByText('Store Pickup')).toBeInTheDocument();
    expect(summary().getByText('Free')).toBeInTheDocument();
    expect(within(summary().getByText('Total').parentElement!).getByText(price(50_000))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /Fast Shipping/ }));
    expect(summary().getByText('Fast Shipping')).toBeInTheDocument();
    expect(summary().getByText(price(1_500))).toBeInTheDocument();
    expect(summary().getByText(price(51_500))).toBeInTheDocument();
  });
});
