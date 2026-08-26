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
});

});
