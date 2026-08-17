import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Category, Product } from '../../types';
import { ToastProvider } from '../../contexts/ToastContext';
import { ProductModal } from './Products';

const categories: Category[] = [
  { id: 'phones', name: 'Phones', slug: 'phones', productCount: 0, children: [{ id: 'android', name: 'Android', slug: 'android', parentSlug: 'phones', productCount: 0 }] },
  { id: 'smart-watches', name: 'Smart Watches', slug: 'smart-watches', productCount: 0 },
];

const product = (category: string): Product => ({
  _id: `product-${category}`, name: 'Test Phone', brand: 'Apple', description: 'A test product', price: 55000, images: [], category,
  specifications: { display: '6.4-inch AMOLED', processor: 'Helio G80', battery: '5000mAh', rearCamera: '64MP', frontCamera: '20MP', os: 'Android 11', network: '4G LTE', fingerprint: 'In-display', launchYear: '2021' },
  condition: 'new', ptaApproved: true, countInStock: 2, rating: null, numReviews: 0, reviews: [], isFeatured: false, tags: [], status: 'ACTIVE',
  variants: [{ id: 'variant-black', sku: 'PHONE-BLACK', title: '64GB / 4GB / Black', storage: '64GB', color: 'Black', condition: 'new', options: { RAM: '4GB' }, price: 55000, countInStock: 2, isActive: true, images: [], image: '' }],
});

const renderModal = (category: string) => render(
  <ToastProvider>
    <ProductModal isOpen onClose={vi.fn()} product={product(category)} categories={categories.flatMap((item) => [item, ...(item.children ?? [])])} brands={['Apple']} onSaved={vi.fn(async () => undefined)} />
  </ToastProvider>,
);

describe('phone product configuration UI', () => {
  it('automatically shows the simple phone workflow for legacy phone categories', () => {
    renderModal('android');
    expect(screen.getByText('Storage configurations')).toBeInTheDocument();
    expect(screen.getByText('Colors and stock')).toBeInTheDocument();
    expect(screen.queryByText('Memory & Price')).not.toBeInTheDocument();
    expect(screen.queryByText('Availability & Stock')).not.toBeInTheDocument();
    expect(screen.getByText('Total stock: 2')).toBeInTheDocument();
    expect(screen.getByText('Phone specifications')).toBeInTheDocument();
    expect(screen.queryByText('Does this product have variants?')).not.toBeInTheDocument();
    expect(screen.queryByText('Variant builder')).not.toBeInTheDocument();
    expect(screen.queryByText('Generate combinations')).not.toBeInTheDocument();
    expect(screen.queryByText('Add variant')).not.toBeInTheDocument();
  });

  it('keeps the color input focused while typing and uses one input per color', async () => {
    const user = userEvent.setup();
    renderModal('phones');
    const input = screen.getByLabelText('New color for 4GB 64GB');
    await user.type(input, 'Awesome Blue');
    expect(input).toHaveValue('Awesome Blue');
    expect(input).toHaveFocus();
    await user.click(screen.getByRole('button', { name: '+ New color' }));
    expect(screen.getByRole('button', { name: 'Remove Awesome Blue from 4GB 64GB' })).toBeInTheDocument();
  });

  it('renders additional configurations and lets each one choose a shared color', async () => {
    const user = userEvent.setup();
    renderModal('phones');
    await user.click(screen.getByRole('button', { name: '+ Add configuration' }));
    expect(screen.getAllByLabelText(/RAM option/)).toHaveLength(2);
    const addColorSelect = screen.getAllByRole('combobox', { name: /Add color to/ })[1];
    const blackOption = Array.from(addColorSelect.querySelectorAll('option')).find((option) => option.textContent === 'Black');
    expect(blackOption).toBeDefined();
    await user.selectOptions(addColorSelect, blackOption!.value);
    expect(screen.getAllByText('Black')).toHaveLength(2);
    expect(screen.getByLabelText('Stock for 4GB 64GB Black')).toHaveValue(2);
    expect(screen.getByText('Total stock: 2')).toBeInTheDocument();
  });

  it('preserves the generic variant choice for non-phone categories', async () => {
    const user = userEvent.setup();
    renderModal('smart-watches');
    expect(screen.getByText('Does this product have variants?')).toBeInTheDocument();
    await user.click(screen.getByText('Does this product have variants?'));
    expect(screen.getByText('Variant builder')).toBeInTheDocument();
  });
});
