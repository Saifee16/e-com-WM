import { describe, expect, it } from 'vitest';
import {
  getShippingCosts,
  LOCAL_SHIPPING_COSTS,
  NATIONWIDE_ORDER_NOTICE,
  NATIONWIDE_SHIPPING_COSTS,
  NATIONWIDE_SHIPPING_COPY,
} from './order-policy';

describe('order policy', () => {
  it('keeps the existing local Hyderabad shipping behavior', () => {
    expect(getShippingCosts('Hyderabad')).toEqual(LOCAL_SHIPPING_COSTS);
    expect(LOCAL_SHIPPING_COSTS).toMatchObject({ standard: 500, express: 1_500, pickup: 0 });
  });

  it('uses the owner-confirmed nationwide shipping fees', () => {
    expect(getShippingCosts('Karachi')).toEqual(NATIONWIDE_SHIPPING_COSTS);
    expect(NATIONWIDE_SHIPPING_COSTS).toMatchObject({ standard: 300, express: 1_000, pickup: 0 });
  });

  it('keeps the outside-Hyderabad order notice explicit', () => {
    expect(NATIONWIDE_ORDER_NOTICE).toContain('advance payment before dispatch');
    expect(NATIONWIDE_SHIPPING_COPY).toBe('Orders outside Hyderabad can be placed online. Our team will contact you to confirm your order and arrange advance payment before dispatch. Standard nationwide shipping is PKR 300, with fast shipping available for PKR 1,000.');
  });

});
