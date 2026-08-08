import axios, { AxiosError } from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import type { Product, ProductSpecs } from '../types';

type JsonObject = Record<string, unknown>;
type OrderPayload = JsonObject;
type ContactPayload = { name: string; email: string; subject: string; message: string };

export interface ProductCreateRequest {
  name: string;
  brand: string;
  category: string;
  description: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  images?: string[];
  storage?: string;
  color?: string;
  specifications?: Pick<ProductSpecs, 'display' | 'processor' | 'ram' | 'battery' | 'camera' | 'os' | 'network'>;
  condition: 'new' | 'used' | 'refurbished';
  countInStock: number;
  ptaApproved: boolean;
  isFeatured: boolean;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
}

export type ProductUpdateRequest = Partial<ProductCreateRequest>;

interface ProductImageUploadResponse {
  urls: string[];
}

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
  cancelledAt?: string;
  cancellationReason?: string;
  returnRequest?: {
    id: string;
    status: string;
    reason: string;
    details?: string;
    resolutionNote?: string;
    refundConfirmedAt?: string;
    createdAt: string;
  };
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
  recentContacts: Array<{
    id: string;
    name: string;
    email: string;
    subject: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
    createdAt: string;
  }>;
}

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'BLOCKED';
  createdAt: string;
  orders: number;
}

export interface AccountDashboardData {
  stats: {
    totalOrders: number;
    deliveredOrders: number;
    wishlistItems: number;
    reviews: number;
  };
  recentOrders: ApiOrder[];
}

const GUEST_CART_ID_KEY = 'guestCartId';

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

type RetryableRequest = NonNullable<AxiosError['config']> & { _retry?: boolean };
type CsrfRetryableRequest = RetryableRequest & { _csrfRetry?: boolean };
let customerRefresh: Promise<unknown> | null = null;
let adminRefresh: Promise<unknown> | null = null;
let csrfToken: string | null = null;
let csrfTokenRequest: Promise<string> | null = null;

const csrfMethods = new Set(['post', 'put', 'patch', 'delete']);

const ensureCsrfToken = async () => {
  if (csrfToken) return csrfToken;
  csrfTokenRequest ??= api.get<ApiSuccess<{ csrfToken: string }>>('/auth/csrf')
    .then((response) => {
      csrfToken = response.data.data.csrfToken;
      return csrfToken;
    })
    .finally(() => { csrfTokenRequest = null; });
  return csrfTokenRequest;
};

const excludesRefresh = (url: string) =>
  ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout', '/auth/password-reset/'].some((path) =>
    url.startsWith(path),
  );

const retryAfterCsrfRejection = async (error: AxiosError, client: AxiosInstance) => {
  const config = error.config as CsrfRetryableRequest | undefined;
  const errorCode = (error.response?.data as { error?: { code?: string } } | undefined)?.error?.code;
  if (error.response?.status !== 403 || errorCode !== 'CSRF_TOKEN_INVALID' || !config || config._csrfRetry) {
    return null;
  }

  config._csrfRetry = true;
  csrfToken = null;
  csrfTokenRequest = null;
  config.headers['X-CSRF-Token'] = await ensureCsrfToken();
  return client(config);
};

api.interceptors.request.use(
  async (config) => {
    if (csrfMethods.has(config.method?.toLowerCase() ?? '') && config.url !== '/auth/csrf') {
      config.headers['X-CSRF-Token'] = await ensureCsrfToken();
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Customer response interceptor.
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const csrfRetry = await retryAfterCsrfRejection(error, api);
    if (csrfRetry) return csrfRetry;
    const requestUrl = error.config?.url ?? '';
    const config = error.config as RetryableRequest | undefined;
    if (error.response?.status === 401 && config && !config._retry && !excludesRefresh(requestUrl)) {
      config._retry = true;
      try {
        customerRefresh ??= api.post('/auth/refresh').finally(() => { customerRefresh = null; });
        await customerRefresh;
        return api(config);
      } catch {
        // AuthProvider owns the unauthenticated state. Redirecting from this
        // global interceptor reloads /login while its initial profile request
        // is still running, which creates an infinite refresh loop.
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    return Promise.reject(error);
  }
);

// Admin failures must never destroy or redirect the customer session.
adminApi.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const csrfRetry = await retryAfterCsrfRejection(error, adminApi);
    if (csrfRetry) return csrfRetry;
    const requestUrl = error.config?.url ?? '';
    const config = error.config as RetryableRequest | undefined;
    if (error.response?.status === 401 && config && !config._retry && !excludesRefresh(requestUrl)) {
      config._retry = true;
      try {
        adminRefresh ??= adminApi.post('/auth/refresh').finally(() => { adminRefresh = null; });
        await adminRefresh;
        return adminApi(config);
      } catch {
        // AdminAuthProvider and the protected admin routes handle sign-out.
        // Do not navigate here: both auth providers mount on public pages.
      }
    }
    return Promise.reject(error);
  }
);

adminApi.interceptors.request.use(
  async (config) => {
    if (csrfMethods.has(config.method?.toLowerCase() ?? '')) {
      config.headers['X-CSRF-Token'] = await ensureCsrfToken();
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { firstName: string; lastName: string; email: string; password: string; phone?: string }) =>
    api.post('/auth/register', data),
  googleStart: () => api.get('/auth/google/start'),
  googleCallback: (code: string, state: string) => api.post('/auth/google/callback', { code, state }),
  facebookStart: () => api.get('/auth/facebook/start'),
  facebookCallback: (code: string, state: string) => api.post('/auth/facebook/callback', { code, state }),
  getProfile: () => api.get('/auth/profile'),
  logout: () => api.post('/auth/logout'),
  updateProfile: (data: Partial<{ firstName: string; lastName: string; phone: string }>) =>
    api.put('/auth/profile', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/password', { currentPassword, newPassword }),
  requestPasswordReset: (email: string) => api.post('/auth/password-reset/request', { email }),
  consumePasswordReset: (token: string, newPassword: string) =>
    api.post('/auth/password-reset/consume', { token, newPassword }),
};

export const adminAuthAPI = {
  login: (email: string, password: string) =>
    adminApi.post('/auth/login', { email, password }),
  googleStart: () => adminApi.get('/auth/google/start'),
  googleCallback: (code: string, state: string) => adminApi.post('/auth/google/callback', { code, state }),
  facebookStart: () => adminApi.get('/auth/facebook/start'),
  facebookCallback: (code: string, state: string) => adminApi.post('/auth/facebook/callback', { code, state }),
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
  getAdminProducts: (params?: ProductQueryParams) => adminApi.get<ApiSuccess<ProductPage>>('/products', { params }),
  submitReview: (productId: string, data: { rating: number; title?: string; body: string }) =>
    api.post(`/products/${productId}/reviews`, data),
  // Admin only
  uploadProductImages: async (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    const response = await adminApi.post<ApiSuccess<ProductImageUploadResponse>>('/products/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30_000,
    });
    return response.data.data.urls;
  },
  createProduct: (data: ProductCreateRequest) => adminApi.post('/products', data),
  updateProduct: (id: string, data: ProductUpdateRequest) => adminApi.put(`/products/${id}`, data),
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
  mergeGuestCart: () => api.post('/cart/merge', {}),
};

// Orders API
export const ordersAPI = {
  createOrder: (data: OrderPayload, idempotencyKey: string) =>
    api.post('/orders', data, { headers: { 'Idempotency-Key': idempotencyKey } }),
  getMyOrders: () => api.get<ApiSuccess<ApiOrder[]>>('/orders/my-orders'),
  getAccountDashboard: () => api.get<ApiSuccess<AccountDashboardData>>('/orders/dashboard'),
  getOrderById: (id: string) => api.get<ApiSuccess<ApiOrder>>(`/orders/${id}`),
  cancelOrder: (id: string, reason: string) => api.post<ApiSuccess<ApiOrder>>(`/orders/${id}/cancel`, { reason }),
  requestReturn: (id: string, data: { reason: string; details?: string }) => api.post(`/orders/${id}/returns`, data),
  requestGuestReturn: (orderNumber: string, data: { email: string; reason: string; details?: string }) =>
    api.post(`/orders/guest/${encodeURIComponent(orderNumber)}/returns`, data),
  getMyReturns: () => api.get('/orders/returns'),
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
  getUsers: (params?: { search?: string }) => adminApi.get<ApiSuccess<AdminUser[]>>('/users', { params }),
  updateUser: (id: string, data: Partial<Omit<Pick<AdminUser, 'firstName' | 'lastName' | 'email' | 'phone' | 'role' | 'status'>, 'phone'>> & { phone?: string | null }) =>
    adminApi.patch<ApiSuccess<AdminUser>>(`/users/${id}`, data),
  getContactMessages: (params?: JsonObject) => adminApi.get('/contact-messages', { params }),
  updateContactMessage: (id: string, status: string) => adminApi.patch(`/contact-messages/${id}`, { status }),
  getReturns: () => adminApi.get('/orders/returns'),
  resolveReturn: (id: string, data: { status: 'APPROVED' | 'REJECTED'; resolutionNote: string; manualRefundCompleted?: true }) =>
    adminApi.patch(`/orders/returns/${id}`, data),
};

export const contactAPI = {
  submit: (data: ContactPayload) => api.post('/contact', data),
  mine: () => api.get('/contact/mine'),
};

export interface SavedAddress {
  id: string;
  label?: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
}

export const wishlistAPI = {
  get: () => api.get<ApiSuccess<Product[]>>('/wishlist'),
  add: (productId: string) => api.post('/wishlist', { productId }),
  remove: (productId: string) => api.delete(`/wishlist/${productId}`),
};

export const addressesAPI = {
  get: () => api.get<ApiSuccess<SavedAddress[]>>('/addresses'),
  create: (data: Omit<SavedAddress, 'id'>) => api.post('/addresses', data),
  update: (id: string, data: Partial<Omit<SavedAddress, 'id'>>) => api.patch(`/addresses/${id}`, data),
  remove: (id: string) => api.delete(`/addresses/${id}`),
};

export default api;
