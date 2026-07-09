import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AxiosError } from 'axios';
import type { CartItem, CartTotals, Product } from '../types';
import { cartAPI } from '../services/api';
import { useToast } from './ToastContext';

interface CartContextType {
  items: CartItem[];
  totals: CartTotals;
  isLoading: boolean;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyPromoCode: (code: string) => Promise<{ discount: number; discountRate: number }>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

const defaultTotals: CartTotals = {
  subtotal: 0,
  itemCount: 0,
  shipping: 0,
  tax: 0,
  total: 0,
};

interface BackendCartPayload {
  items: CartItem[];
  totals: CartTotals;
}

interface BackendErrorPayload {
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
}

const getApiError = (error: unknown) => {
  const axiosError = error as AxiosError<BackendErrorPayload>;
  const code = axiosError.response?.data?.error?.code;
  const message = axiosError.response?.data?.error?.message ?? axiosError.response?.data?.message;

  return {
    code,
    message: message ?? 'Cart request failed',
  };
};

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [totals, setTotals] = useState<CartTotals>(defaultTotals);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const hydrateCart = useCallback((payload: BackendCartPayload) => {
    setItems(payload.items ?? []);
    setTotals(payload.totals ?? defaultTotals);
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await cartAPI.getCart();
      hydrateCart(response.data.data);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setIsLoading(false);
    }
  }, [hydrateCart]);

  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  const addToCart = async (product: Product, quantity: number = 1) => {
    try {
      setIsLoading(true);
      const response = await cartAPI.addToCart(product._id, quantity);
      hydrateCart(response.data.data);
      showToast('Item added to cart', 'success');
    } catch (error: unknown) {
      const apiError = getApiError(error);
      showToast(
        apiError.code === 'INSUFFICIENT_STOCK' ? 'Requested quantity exceeds available stock' : apiError.message,
        'error',
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    try {
      setIsLoading(true);
      const response = await cartAPI.updateQuantity(productId, quantity);
      hydrateCart(response.data.data);
    } catch (error: unknown) {
      const apiError = getApiError(error);
      showToast(
        apiError.code === 'INSUFFICIENT_STOCK' ? 'Requested quantity exceeds available stock' : apiError.message,
        'error',
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromCart = async (productId: string) => {
    try {
      setIsLoading(true);
      const response = await cartAPI.removeFromCart(productId);
      hydrateCart(response.data.data);
      showToast('Item removed from cart', 'success');
    } catch (error: unknown) {
      showToast(getApiError(error).message || 'Failed to remove item', 'error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    try {
      setIsLoading(true);
      const response = await cartAPI.clearCart();
      hydrateCart(response.data.data);
    } catch (error: unknown) {
      showToast(getApiError(error).message || 'Failed to clear cart', 'error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const applyPromoCode = async (code: string) => {
    try {
      const response = await cartAPI.applyPromoCode(code);
      await refreshCart();
      return response.data.data;
    } catch (error: unknown) {
      showToast(getApiError(error).message || 'Invalid promo code', 'error');
      throw error;
    }
  };

  const value: CartContextType = {
    items,
    totals,
    isLoading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    applyPromoCode,
    refreshCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
