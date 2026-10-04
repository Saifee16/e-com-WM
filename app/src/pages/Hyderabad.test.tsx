import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { NATIONWIDE_SHIPPING_COPY } from '../config/order-policy';
import Hyderabad from './Hyderabad';

describe('Hyderabad landing page', () => {
  it('uses the owner-confirmed nationwide shipping wording separately from local delivery', () => {
    render(<MemoryRouter><Hyderabad /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Wahab Mobiles in Hyderabad' })).toBeInTheDocument();
    expect(screen.getByText(NATIONWIDE_SHIPPING_COPY)).toBeInTheDocument();
    expect(screen.getByText(/Same-day delivery is available in Hyderabad where applicable/)).toBeInTheDocument();
    expect(document.title).toBe('Wahab Mobiles Hyderabad | Mobile Shop in Chandni Market');
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Visit Wahab Mobiles at Chandni Shopping Mall, Saddar Cantt, Hyderabad for new and used phones, accessories, local pickup and delivery. Trusted since 2009.',
    );
});

});
