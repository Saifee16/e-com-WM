import React, { forwardRef } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from './types';

const apiMocks = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(), consumePasswordReset: vi.fn(),
  wishlistGet: vi.fn(), wishlistRemove: vi.fn(), wishlistAdd: vi.fn(),
  addressesGet: vi.fn(), addressesCreate: vi.fn(), addressesUpdate: vi.fn(), addressesRemove: vi.fn(),
  contactMine: vi.fn(), contactSubmit: vi.fn(),
  getReturns: vi.fn(), resolveReturn: vi.fn(),
  getContactMessages: vi.fn(), updateContactMessage: vi.fn(),
  getOrder: vi.fn(), cancelOrder: vi.fn(), requestReturn: vi.fn(),
  getProduct: vi.fn(), getProducts: vi.fn(), submitReview: vi.fn(),
}));
const showToast = vi.hoisted(() => vi.fn());

vi.mock('framer-motion', () => {
  const Motion = forwardRef<HTMLElement, Record<string, unknown>>((props, ref) => {
    const domProps = { ...props };
    for (const key of ['initial', 'animate', 'exit', 'transition', 'whileInView', 'viewport']) delete domProps[key];
    return React.createElement('div', { ...domProps, ref });
  });
  return { motion: new Proxy({}, { get: () => Motion }), AnimatePresence: ({ children }: { children: React.ReactNode }) => children };
});
vi.mock('./contexts/ToastContext', () => ({ useToast: () => ({ showToast }) }));
vi.mock('./contexts/AuthContext', () => ({ useAuth: () => ({
  user: { id: 'u1', firstName: 'Ayesha', lastName: 'Khan', email: 'ayesha@example.com' },
  isAuthenticated: true, isLoading: false,
}) }));
vi.mock('./contexts/CartContext', () => ({ useCart: () => ({ addToCart: vi.fn(), items: [], totals: {} }) }));
vi.mock('./services/api', () => ({
  authAPI: { requestPasswordReset: apiMocks.requestPasswordReset, consumePasswordReset: apiMocks.consumePasswordReset },
  wishlistAPI: { get: apiMocks.wishlistGet, remove: apiMocks.wishlistRemove, add: apiMocks.wishlistAdd },
  addressesAPI: { get: apiMocks.addressesGet, create: apiMocks.addressesCreate, update: apiMocks.addressesUpdate, remove: apiMocks.addressesRemove },
  contactAPI: { mine: apiMocks.contactMine, submit: apiMocks.contactSubmit },
  adminAPI: {
    getReturns: apiMocks.getReturns,
    resolveReturn: apiMocks.resolveReturn,
    getContactMessages: apiMocks.getContactMessages,
    updateContactMessage: apiMocks.updateContactMessage,
  },
  ordersAPI: { getOrderById: apiMocks.getOrder, cancelOrder: apiMocks.cancelOrder, requestReturn: apiMocks.requestReturn },
  productsAPI: { getProductById: apiMocks.getProduct, getProducts: apiMocks.getProducts, submitReview: apiMocks.submitReview },
}));

import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Wishlist from './pages/account/Wishlist';
import Addresses from './pages/account/Addresses';
import SupportTickets from './pages/account/SupportTickets';
import AdminReturns from './pages/admin/Returns';
import AdminContactMessages from './pages/admin/ContactMessages';
import OrderDetail from './pages/account/OrderDetail';
import ProductDetail from './pages/ProductDetail';

const product: Product = {
  _id: '11111111-1111-4111-8111-111111111111', name: 'Phone', brand: 'Brand', description: 'A phone', price: 1000,
  images: ['phone.jpg'], category: 'phones', specifications: { storage: '128GB' }, condition: 'new', ptaApproved: true,
  countInStock: 2, rating: 5, numReviews: 0, reviews: [], isFeatured: false, tags: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  apiMocks.requestPasswordReset.mockResolvedValue({ data: { data: { requested: true } } });
  apiMocks.consumePasswordReset.mockResolvedValue({ data: { data: { changed: true } } });
  apiMocks.wishlistGet.mockResolvedValue({ data: { data: [product] } });
  apiMocks.wishlistRemove.mockResolvedValue({});
  apiMocks.addressesGet.mockResolvedValue({ data: { data: [] } });
  apiMocks.addressesCreate.mockResolvedValue({});
  apiMocks.contactMine.mockResolvedValue({ data: { data: [] } });
  apiMocks.contactSubmit.mockResolvedValue({});
  apiMocks.getContactMessages.mockResolvedValue({ data: { data: [] } });
  apiMocks.updateContactMessage.mockResolvedValue({});
  apiMocks.resolveReturn.mockResolvedValue({});
  apiMocks.cancelOrder.mockResolvedValue({});
  apiMocks.submitReview.mockResolvedValue({});
  apiMocks.getProduct.mockResolvedValue({ data: { data: product } });
  apiMocks.getProducts.mockResolvedValue({ data: { data: { items: [], pagination: {} } } });
});

describe('Phase 4 customer flows', () => {
  it('requests and consumes a password reset', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    await user.type(screen.getByLabelText('Email'), 'ayesha@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(apiMocks.requestPasswordReset).toHaveBeenCalledWith('ayesha@example.com');
    unmount();
    render(<MemoryRouter initialEntries={['/reset-password?token=reset-token-value-that-is-long']}><ResetPassword /></MemoryRouter>);
    await user.type(screen.getByLabelText('New password'), 'Password123!');
    await user.type(screen.getByLabelText('Confirm password'), 'Password123!');
    await user.click(screen.getByRole('button', { name: 'Save new password' }));
    expect(apiMocks.consumePasswordReset).toHaveBeenCalledWith('reset-token-value-that-is-long', 'Password123!');
  });

  it('loads and removes a real wishlist item', async () => {
    render(<MemoryRouter><Wishlist /></MemoryRouter>);
    expect(await screen.findByText('Phone')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /remove/i }));
    expect(apiMocks.wishlistRemove).toHaveBeenCalledWith(product._id);
  });

  it('creates an address through the account form', async () => {
    render(<MemoryRouter><Addresses /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Add New Address' }));
    const inputs = document.querySelectorAll<HTMLInputElement>('form input');
    ['Ayesha', 'Khan', '03001234567', '1 Main Road', 'Lahore', 'Punjab', '54000', 'Pakistan'].forEach((value, index) => fireEvent.change(inputs[index]!, { target: { value } }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Add Address' }).at(-1)!);
    expect(apiMocks.addressesCreate).toHaveBeenCalledWith(expect.objectContaining({ fullName: 'Ayesha Khan', line1: '1 Main Road' }));
  });

  it('submits a review with a validated rating', async () => {
    render(<MemoryRouter initialEntries={[`/products/${product._id}`]}><Routes><Route path="/products/:id" element={<ProductDetail />} /></Routes></MemoryRouter>);
    await userEvent.click(await screen.findByRole('button', { name: /Reviews/ }));
    await userEvent.click(screen.getByRole('button', { name: '4 stars' }));
    await userEvent.type(screen.getByLabelText('Review'), 'Very good phone');
    await userEvent.click(screen.getByRole('button', { name: 'Submit review' }));
    expect(apiMocks.submitReview).toHaveBeenCalledWith(product._id, expect.objectContaining({ rating: 4, body: 'Very good phone' }));
  });

  it('shows ticket status and submits through the unified support queue', async () => {
    apiMocks.contactMine.mockResolvedValue({ data: { data: [{ id: 't1', subject: 'Delivery', message: 'Late', status: 'OPEN', statusUpdatedAt: new Date().toISOString(), createdAt: new Date().toISOString() }] } });
    render(<SupportTickets />);
    expect(await screen.findByText('OPEN')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Subject'), 'Complaint');
    await userEvent.type(screen.getByLabelText('Message'), 'Please help');
    await userEvent.click(screen.getByRole('button', { name: 'Open ticket' }));
    expect(apiMocks.contactSubmit).toHaveBeenCalledWith(expect.objectContaining({ email: 'ayesha@example.com', subject: 'Complaint' }));
  });

  it('only offers cancellation before processing', async () => {
    apiMocks.getOrder.mockResolvedValue({ data: { data: { id: 'o1', _id: 'o1', orderNumber: 'WAH-1', status: 'pending', paymentStatus: 'unpaid', subtotal: 1, tax: 0, discount: 0, shippingCost: 0, total: 1, shippingAddress: {}, billingAddress: {}, items: [], createdAt: new Date().toISOString() } } });
    render(<MemoryRouter initialEntries={['/account/orders/o1']}><Routes><Route path="/account/orders/:id" element={<OrderDetail />} /></Routes></MemoryRouter>);
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel order' }));
    expect(apiMocks.cancelOrder).toHaveBeenCalledWith('o1', 'Changed my mind');
  });
});

describe('Phase 4 admin flows', () => {
  it('shows guest support tickets and can move them through the shared status queue', async () => {
    apiMocks.getContactMessages.mockResolvedValue({ data: { data: [{
      id: 't-guest', name: 'Guest buyer', email: 'guest@example.com', subject: 'Complaint', message: 'Package was late',
      status: 'OPEN', isGuest: true, statusUpdatedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
    }] } });
    render(<AdminContactMessages />);
    expect(await screen.findByText('Guest submission')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'In progress' }));
    expect(apiMocks.updateContactMessage).toHaveBeenCalledWith('t-guest', 'IN_PROGRESS');
  });

  it('shows guest returns and requires manual refund confirmation before approval', async () => {
    apiMocks.getReturns.mockResolvedValue({ data: { data: [{ id: 'r1', orderNumber: 'WAH-GUEST', customer: 'Guest customer', email: 'guest@example.com', isGuest: true, status: 'PENDING', reason: 'Damaged', createdAt: new Date().toISOString() }] } });
    render(<AdminReturns />);
    expect(await screen.findByText('Guest submission')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Resolution for WAH-GUEST'), 'Cash returned at store');
    await userEvent.click(screen.getByRole('button', { name: 'Record refunded' }));
    expect(apiMocks.resolveReturn).not.toHaveBeenCalled();
    await userEvent.click(screen.getByLabelText('Cash/bank refund has actually been completed'));
    await userEvent.click(screen.getByRole('button', { name: 'Record refunded' }));
    await waitFor(() => expect(apiMocks.resolveReturn).toHaveBeenCalledWith('r1', expect.objectContaining({ status: 'APPROVED', manualRefundCompleted: true })));
  });
});
