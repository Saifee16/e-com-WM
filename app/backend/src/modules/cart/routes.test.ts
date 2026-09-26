import { describe, expect, it } from 'vitest';
import { calculateTotals } from './routes.js';

const cartItems = (priceAmount: number, quantity = 1) =>
  [{ variant: { priceAmount }, quantity }] as Parameters<typeof calculateTotals>[0];

describe('cart shipping totals', () => {
  it.each([20_000, 79_999, 100_000, 680_000])(
    'charges Rs 300 standard shipping for a Rs %i subtotal',
    (subtotal) => {
      const totals = calculateTotals(cartItems(subtotal));

      expect(totals).toMatchObject({
        subtotal,
        shipping: 300,
        total: subtotal + 300,
        freeShipping: false,
      });
    },
  );

  it('does not waive shipping for an attached FREE_SHIPPING promo', () => {
    const totals = calculateTotals(cartItems(79_999), {
      code: 'OLD-FREE',
      type: 'FREE_SHIPPING',
      valueAmount: null,
      valuePercent: null,
      maxDiscountAmount: null,
    });

    expect(totals).toMatchObject({ shipping: 300, total: 80_299, freeShipping: false });
    expect(totals.promoCode).toBeUndefined();
  });

  it('keeps ordinary discounts without changing standard shipping', () => {
    const totals = calculateTotals(cartItems(20_000), {
      code: 'TEN',
      type: 'PERCENTAGE',
      valueAmount: null,
      valuePercent: 10,
      maxDiscountAmount: null,
    });

    expect(totals).toMatchObject({ shipping: 300, discount: 2_000, total: 18_300 });
  });

  it('keeps an empty cart at zero', () => {
    expect(calculateTotals([])).toMatchObject({ subtotal: 0, shipping: 0, total: 0 });
  });

  it('charges shipping for an item even when its price is zero', () => {
    expect(calculateTotals(cartItems(0))).toMatchObject({ subtotal: 0, shipping: 300, total: 300 });
  });
});
