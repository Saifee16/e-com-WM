import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Home from './Home';
import PrivacyPolicy from './PrivacyPolicy';

vi.mock('../services/api', () => ({
  productsAPI: {
    getFeaturedProducts: vi.fn().mockRejectedValue(new Error('offline')),
    getBrands: vi.fn().mockRejectedValue(new Error('offline')),
  },
  businessAPI: {
    getGoogleReviews: vi.fn().mockRejectedValue(new Error('offline')),
  },
}));

describe('production credibility cleanup', () => {
  it('presents the privacy policy as a completed customer-facing policy', () => {
    render(
      <MemoryRouter>
        <PrivacyPolicy />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Information we collect' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'How we use information' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Sharing and retention' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Your choices' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Contact' })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/draft|placeholder|to be completed|legal review/i);
  });

  it('positions the homepage for Pakistan-wide online retail', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(document.title).toBe('Wahab Mobiles | New & Used Phones in Pakistan');
    });
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Shop new and used smartphones, accessories, and selected warranty-backed devices from Wahab Mobiles. Nationwide delivery across Pakistan. Trusted since 2009.',
    );
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://wahabmobiles.com/',
    );
  });
});
