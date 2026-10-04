import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import Footer from './Footer';

it('uses the optimized footer logo with reserved dimensions and deferred loading', () => {
  render(<MemoryRouter><Footer /></MemoryRouter>);
  const logo = screen.getByRole('img', { name: 'Wahab Mobiles logo' });
  expect(logo).toHaveAttribute('src', '/assets/wahab-mobiles-logo-footer-352.webp');
  expect(logo).toHaveAttribute('width', '352');
  expect(logo).toHaveAttribute('height', '112');
  expect(logo).toHaveAttribute('loading', 'lazy');
  expect(logo).toHaveAttribute('decoding', 'async');
  expect(logo).toHaveClass('h-14', 'w-44', 'object-cover', 'object-center');
  expect(screen.getByRole('link', { name: 'Wahab Mobiles logo' })).toHaveAttribute('href', '/');
});
