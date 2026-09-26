import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';

const cartActions = vi.hoisted(() => ({ removeFromCart: vi.fn(), updateQuantity: vi.fn() }));

vi.mock('../ui/sheet', () => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return {
    Sheet: Wrapper,
    SheetContent: Wrapper,
    SheetDescription: Wrapper,
    SheetFooter: Wrapper,
    SheetHeader: Wrapper,
    SheetTitle: Wrapper,
  };
});
vi.mock('../ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));
vi.mock('../ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../ui/separator', () => ({
  Separator: () => <hr />,
}));
vi.mock('../../contexts/CartContext', () => ({
  useCart: () => ({
    items: [{
      product: 'product-id',
      variantId: 'variant-id',
      name: 'Phone',
      image: 'https://example.com/phone.jpg',
      price: 79_999,
      quantity: 1,
      brand: 'Wahab',
      specs: '256GB',
    }],
    totals: {
      subtotal: 79_999,
      itemCount: 1,
      shipping: 300,
      tax: 0,
      discount: 0,
      freeShipping: false,
      total: 80_299,
    },
    isLoading: false,
    updateQuantity: cartActions.updateQuantity,
    removeFromCart: cartActions.removeFromCart,
    refreshCart: vi.fn(),
  }),
}));

import CartDrawer from './CartDrawer';
import Cart from '../../pages/Cart';

const CurrentPath = () => <span data-testid="pathname">{useLocation().pathname}</span>;

const renderCheckoutRoute = (start: '/cart' | '/products') => {
  render(
    <MemoryRouter initialEntries={[start]}>
      <CurrentPath />
      <Routes>
        <Route path="/cart" element={<Cart />} />
        <Route path="/products" element={start === '/cart' ? <p>Products page</p> : <CartDrawer open onOpenChange={vi.fn()} />} />
        <Route path="/checkout" element={<p>Guest checkout</p>} />
      </Routes>
    </MemoryRouter>,
  );
};

beforeEach(() => {
  cartActions.removeFromCart.mockClear();
  cartActions.updateQuantity.mockClear();
});

it('shows the backend standard shipping and total in the cart drawer', () => {
  render(<MemoryRouter><CartDrawer open onOpenChange={vi.fn()} /></MemoryRouter>);

  expect(screen.getByText('Standard Shipping')).toBeInTheDocument();
  expect(screen.getByText(/Rs\s*300/)).toBeInTheDocument();
  expect(screen.getByText(/Rs\s*80,299/)).toBeInTheDocument();
  expect(screen.queryByText('Free')).not.toBeInTheDocument();
});

it.each(['/products', '/cart'] as const)('takes a populated %s drawer to guest checkout without clearing the cart', (start) => {
  renderCheckoutRoute(start);

  expect(screen.getByText('Standard Shipping')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Checkout' }));

  expect(screen.getByTestId('pathname')).toHaveTextContent('/checkout');
  expect(screen.getByText('Guest checkout')).toBeInTheDocument();
  expect(screen.queryByText('Products page')).not.toBeInTheDocument();
  expect(cartActions.removeFromCart).not.toHaveBeenCalled();
  expect(cartActions.updateQuantity).not.toHaveBeenCalled();
});
