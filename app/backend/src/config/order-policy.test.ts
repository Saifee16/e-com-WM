import { describe, expect, it } from 'vitest';
import {
  getShippingCost,
  LOCAL_SHIPPING_COSTS,
  NATIONWIDE_SHIPPING_COSTS,
} from './order-policy.js';

describe('backend order policy', () => {
  it('preserves local Hyderabad shipping costs', () => {
    expect(getShippingCost('Hyderabad', 'standard')).toBe(LOCAL_SHIPPING_COSTS.standard);
    expect(getShippingCost('Hyderabad', 'express')).toBe(LOCAL_SHIPPING_COSTS.express);
  });

  it('charges the confirmed nationwide fees outside Hyderabad', () => {
    expect(getShippingCost('Karachi', 'standard')).toBe(300);
    expect(getShippingCost('Karachi', 'express')).toBe(1_000);
    expect(NATIONWIDE_SHIPPING_COSTS).toMatchObject({ standard: 300, express: 1_000, pickup: 0 });
  });

});
