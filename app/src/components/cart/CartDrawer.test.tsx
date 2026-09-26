import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';

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
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
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
    updateQuantity: vi.fn(),
    removeFromCart: vi.fn(),
    refreshCart: vi.fn(),
  }),
}));

import CartDrawer from './CartDrawer';

it('shows the backend standard shipping and total in the cart drawer', () => {
  render(<MemoryRouter><CartDrawer open onOpenChange={vi.fn()} /></MemoryRouter>);

  expect(screen.getByText('Standard Shipping')).toBeInTheDocument();
  expect(screen.getByText(/Rs\s*300/)).toBeInTheDocument();
  expect(screen.getByText(/Rs\s*80,299/)).toBeInTheDocument();
  expect(screen.queryByText('Free')).not.toBeInTheDocument();
});