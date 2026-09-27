import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { BrandCard } from './Home';

const renderBrand = (name: string, count: number | null, path: string) =>
  render(
    <MemoryRouter>
      <BrandCard brand={{ name, count, path }} />
    </MemoryRouter>,
  );

describe('BrandCard', () => {
  it('keeps the supplied route and count, with an accessible link name', () => {
    renderBrand('Apple', 5, '/products?brand=Apple');
    expect(screen.getByRole('link', { name: 'Shop Apple phones' })).toHaveAttribute('href', '/products?brand=Apple');
    expect(screen.getByText('5 phones')).toBeInTheDocument();
    expect(document.querySelector('img')).toHaveAttribute('src', '/assets/brands/apple.svg');
  });

  it('shows the brand name when artwork is unavailable or fails to load', () => {
    const { rerender } = renderBrand('Google Pixel', 1, '/products?brand=Google%20Pixel');
    expect(screen.getByRole('link', { name: 'Shop Google Pixel phones' })).toHaveAttribute('href', '/products?brand=Google%20Pixel');
    expect(screen.getByText('Google Pixel')).toBeInTheDocument();
    expect(screen.getByText('1 phone')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <BrandCard key="Samsung" brand={{ name: 'Samsung', count: 8, path: '/products?brand=Samsung' }} />
      </MemoryRouter>,
    );
    fireEvent.error(document.querySelector('img')!);
    expect(screen.getByText('Samsung')).toBeInTheDocument();
    expect(screen.getByText('8 phones')).toBeInTheDocument();
  });
});
