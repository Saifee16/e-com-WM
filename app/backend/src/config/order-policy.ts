export type CheckoutShippingMethod = 'standard' | 'express' | 'pickup';

export const FREE_STANDARD_SHIPPING_SUBTOTAL = 100_000;

export const LOCAL_SHIPPING_COSTS: Record<CheckoutShippingMethod, number> = {
  standard: 500,
  express: 1_500,
  pickup: 0,
};

export const NATIONWIDE_SHIPPING_COSTS: Record<CheckoutShippingMethod, number> = {
  standard: 300,
  express: 1_000,
  pickup: 0,
};

export const isHyderabadCity = (city: string) => city.trim().toLowerCase() === 'hyderabad';

export const getShippingCost = (city: string, shippingMethod: CheckoutShippingMethod) =>
  (isHyderabadCity(city) ? LOCAL_SHIPPING_COSTS : NATIONWIDE_SHIPPING_COSTS)[shippingMethod];
