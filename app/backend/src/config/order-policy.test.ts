import { describe, expect, it } from 'vitest';
import {
  getShippingCost,
  LOCAL_SHIPPING_COSTS,
  NATIONWIDE_SHIPPING_COSTS,
} from './order-policy.js';

describe('backend order policy', () => {
  it('charges standard shipping in Hyderabad while preserving express and pickup', () => {
    expect(getShippingCost('Hyderabad', 'standard')).toBe(300);
    expect(getShippingCost('Hyderabad', 'express')).toBe(1_500);
    expect(getShippingCost('Hyderabad', 'pickup')).toBe(0);
    expect(LOCAL_SHIPPING_COSTS.standard).toBe(300);
  });

  it('charges the confirmed nationwide fees outside Hyderabad', () => {
    expect(getShippingCost('Karachi', 'standard')).toBe(300);
    expect(getShippingCost('Karachi', 'express')).toBe(1_000);
    expect(NATIONWIDE_SHIPPING_COSTS).toMatchObject({ standard: 300, express: 1_000, pickup: 0 });
    expect(getShippingCost('Lahore', 'standard')).toBe(300);
  });

});
