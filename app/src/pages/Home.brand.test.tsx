import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { BrandCard } from './Home';
import { prioritizeBrands } from './brand-priority';

const renderBrand = (name: string, count: number | null, path: string) =>
  render(
    <MemoryRouter>
      <BrandCard brand={{ name, count, path }} />
    </MemoryRouter>,
  );

describe('BrandCard', () => {
  it('prioritizes known brands before slicing without changing API values or unknown order', () => {
    const brands = [
      { name: 'Zeta', count: 9, path: '/zeta' },
      { name: ' samsung ', count: 8, path: '/samsung' },
      { name: 'iPhone', count: 7, path: '/iphone' },
      { name: 'Google Pixel', count: 6, path: '/pixel' },
      { name: 'Honor', count: 5, path: '/honor' },
      { name: 'Oppo', count: 4, path: '/oppo' },
      { name: 'Realme', count: 3, path: '/realme' },
      { name: 'Motorola', count: 2, path: '/motorola' },
      { name: 'Itel', count: 1, path: '/itel' },
      { name: 'Other', count: 0, path: '/other' },
    ];
    const ordered = prioritizeBrands(brands);
    expect(ordered.map((brand) => brand.name)).toEqual(['iPhone', ' samsung ', 'Google Pixel', 'Honor', 'Oppo', 'Realme', 'Motorola', 'Itel', 'Zeta', 'Other']);
    expect(ordered.map((brand) => [brand.count, brand.path])).toEqual([[7, '/iphone'], [8, '/samsung'], [6, '/pixel'], [5, '/honor'], [4, '/oppo'], [3, '/realme'], [2, '/motorola'], [1, '/itel'], [9, '/zeta'], [0, '/other']]);
    expect(brands[0].name).toBe('Zeta');
  });

  it('uses the clean route for a stocked configured brand while preserving count and accessibility', () => {
    renderBrand('Apple', 5, '/products?brand=Apple');
    expect(screen.getByRole('link', { name: 'Shop Apple phones' })).toHaveAttribute('href', '/phones/iphone');
    expect(screen.getByText('5 phones')).toBeInTheDocument();
    expect(document.querySelector('img')).toHaveAttribute('src', '/assets/brands/apple.svg');
  });

  it.each([
    ['Samsung', 8, '/products?brand=Samsung', '/phones/samsung'],
    ['Google Pixel', 1, '/products?brand=Google%20Pixel', '/phones/google-pixel'],
    ['Honor', 5, '/products?brand=Honor', '/phones/honor'],
    ['Realme', 3, '/products?brand=Realme', '/phones/realme'],
  ])('uses the configured route for stocked %s products', (name, count, filterPath, landingPath) => {
    renderBrand(name, count, filterPath);
    expect(screen.getByRole('link', { name: `Shop ${name} phones` })).toHaveAttribute('href', landingPath);
  });

  it.each([
    ['Samsung', 0, '/products?brand=Samsung'],
    ['iPhone', 0, '/products?search=iPhone'],
    ['Unconfigured', 4, '/products?brand=Unconfigured'],
  ])('preserves the existing filter route when %s is empty or unconfigured', (name, count, filterPath) => {
    renderBrand(name, count, filterPath);
    expect(screen.getByRole('link', { name: `Shop ${name} phones` })).toHaveAttribute('href', filterPath);
  });

  it('shows the brand name when artwork is unavailable or fails to load', () => {
    const { rerender } = renderBrand('Google Pixel', 1, '/products?brand=Google%20Pixel');
    expect(screen.getByRole('link', { name: 'Shop Google Pixel phones' })).toHaveAttribute('href', '/phones/google-pixel');
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
    expect(screen.getByRole('link', { name: 'Shop Samsung phones' })).toHaveAttribute('href', '/phones/samsung');
  });
});
