import axios, { AxiosError } from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import type { Product } from '../types';

type JsonObject = Record<string, unknown>;
type ProductPayload = JsonObject;
type OrderPayload = JsonObject;
type ContactPayload = { name: string; email: string; subject: string; message: string };

interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ProductQueryParams {
  search?: string;
  brand?: string;
  category?: string;
  featured?: boolean;
  sort?: 'newest' | 'price-low' | 'price-high' | 'rating';
  page?: number;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  storage?: string;
  condition?: 'new' | 'used' | 'refurbished';
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ProductPage {
  items: Product[];
  pagination: Pagination;
}

export interface OrderAddressSnapshot {
  fullName?: string;
  phone?: string;
  email?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  shippingMethod?: string;
}

export interface ApiOrderItem {
  product: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  specs?: string;
}

export interface ApiOrder {
  _id: string;
  id: string;
  orderNumber: string;
  user?: string | null;
  guestEmail?: string | null;
  status: string;
  paymentStatus: string;
  subtotal: number;
  tax: number;
  discount: number;
  shippingCost: number;
  total: number;
  shippingAddress: OrderAddressSnapshot;
  billingAddress: OrderAddressSnapshot;
  items: ApiOrderItem[];
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface AdminDashboardData {
  products: number;
  orders: number;
  users: number;
  newContactMessages: number;
  revenue: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customer: string;
    email?: string | null;
    total: number;
    status: string;
    createdAt: string;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
}

export const GUEST_CART_ID_KEY = 'guestCartId';

export const getGuestCartId = () => {
  return localStorage.getItem(GUEST_CART_ID_KEY);
};

export const clearGuestCartId = () => {
  localStorage.removeItem(GUEST_CART_ID_KEY);
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

// Customer/public API. The browser sends accessToken only for /api paths.
const api: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Admin API. The browser sends adminAccessToken only for /api/admin paths.
const adminApi: AxiosInstance = axios.create({
  baseURL: `${apiBaseUrl.replace(/\/$/, '')}/admin`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor keeps legacy localStorage guest carts working while
// the hardened backend cookie remains the primary cart identity.
api.interceptors.request.use(
  (config) => {
    const legacyGuestId = getGuestCartId();
    if (legacyGuestId && !config.url?.startsWith('/auth/')) {
      config.headers['X-Guest-Id'] = legacyGuestId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Customer response interceptor.
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const requestUrl = error.config?.url ?? '';
    const isAuthEndpoint = requestUrl.startsWith('/auth/');
    if (error.response?.status === 401 && !isAuthEndpoint) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Admin failures must never destroy or redirect the customer session.
adminApi.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const requestUrl = error.config?.url ?? '';
    const isAuthEndpoint = requestUrl.startsWith('/auth/');
    if (error.response?.status === 401 && !isAuthEndpoint) {
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { firstName: string; lastName: string; email: string; password: string; phone?: string }) =>
    api.post('/auth/register', data),
  googleStart: () => api.get('/auth/google/start'),
  googleCallback: (code: string) => api.post('/auth/google/callback', { code }),
  getProfile: () => api.get('/auth/profile'),
  logout: () => api.post('/auth/logout'),
  updateProfile: (data: Partial<{ firstName: string; lastName: string; phone: string }>) =>
    api.put('/auth/profile', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/password', { currentPassword, newPassword }),
};

export const adminAuthAPI = {
  login: (email: string, password: string) =>
    adminApi.post('/auth/login', { email, password }),
  googleStart: () => adminApi.get('/auth/google/start'),
  googleCallback: (code: string) => adminApi.post('/auth/google/callback', { code }),
  getProfile: () => adminApi.get('/auth/profile'),
  logout: () => adminApi.post('/auth/logout'),
};

// Products API
export const productsAPI = {
  getProducts: (params?: ProductQueryParams) => api.get<ApiSuccess<ProductPage>>('/products', { params }),
  getProductById: (id: string) => api.get(`/products/${id}`),
  getFeaturedProducts: () => api.get('/products/featured'),
  getProductsByBrand: (brand: string) => api.get(`/products/brand/${brand}`),
  getBrands: () => api.get('/products/brands'),
  getCategories: () => api.get('/products/categories'),
  // Admin only
  createProduct: (data: ProductPayload) => adminApi.post('/products', data),
  updateProduct: (id: string, data: ProductPayload) => adminApi.put(`/products/${id}`, data),
  deleteProduct: (id: string) => adminApi.delete(`/products/${id}`),
};

// Cart API
export const cartAPI = {
  getCart: () => api.get('/cart'),
  addToCart: (productId: string, quantity: number = 1) =>
    api.post('/cart/add', { productId, quantity }),
  updateQuantity: (productId: string, quantity: number) =>
    api.put(`/cart/update/${productId}`, { quantity }),
  removeFromCart: (productId: string) => api.delete(`/cart/remove/${productId}`),
  clearCart: () => api.delete('/cart/clear'),
  applyPromoCode: (code: string) => api.post('/cart/promo', { code }),
  mergeGuestCart: (guestId?: string | null) => api.post('/cart/merge', guestId ? { guestId } : {}),
};

// Orders API
export const ordersAPI = {
  createOrder: (data: OrderPayload) => api.post('/orders', data),
  getMyOrders: () => api.get<ApiSuccess<ApiOrder[]>>('/orders/my-orders'),
  getOrderById: (id: string) => api.get<ApiSuccess<ApiOrder>>(`/orders/${id}`),
  // Admin only
  getAllOrders: (params?: JsonObject) => adminApi.get<ApiSuccess<ApiOrder[]>>('/orders', { params }),
  updateOrderStatus: (id: string, status: string, note?: string) =>
    adminApi.put<ApiSuccess<ApiOrder>>(`/orders/${id}/status`, { status, note }),
  getOrderStats: () => adminApi.get('/orders/stats/overview'),
};

// Admin API
export const adminAPI = {
  getDashboardStats: () => adminApi.get<ApiSuccess<AdminDashboardData>>('/dashboard'),
  getSalesReport: (params?: JsonObject) => adminApi.get('/sales-report', { params }),
  getTopProducts: (params?: JsonObject) => adminApi.get('/top-products', { params }),
  getTopCustomers: (params?: JsonObject) => adminApi.get('/top-customers', { params }),
  getContactMessages: (params?: JsonObject) => adminApi.get('/contact-messages', { params }),
  updateContactMessage: (id: string, status: string) => adminApi.patch(`/contact-messages/${id}`, { status }),
};

export const contactAPI = {
  submit: (data: ContactPayload) => api.post('/contact', data),
};

export default api;
