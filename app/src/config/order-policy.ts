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

export const NATIONWIDE_ORDER_NOTICE = 'Orders outside Hyderabad require confirmation and advance payment before dispatch. Our team will contact you after your order is placed.';

export const NATIONWIDE_SHIPPING_COPY = 'Orders outside Hyderabad can be placed online. Our team will contact you to confirm your order and arrange advance payment before dispatch. Standard nationwide shipping is PKR 300, with fast shipping available for PKR 1,000.';

export const isHyderabadCity = (city: string) => city.trim().toLowerCase() === 'hyderabad';

export const getShippingCosts = (city: string) =>
  isHyderabadCity(city) ? LOCAL_SHIPPING_COSTS : NATIONWIDE_SHIPPING_COSTS;
