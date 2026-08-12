// User Types
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: Address;
  isAdmin: boolean;
  preferences?: UserPreferences;
  createdAt?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface UserPreferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
  twoFactorAuth: boolean;
}

// Product Types
export interface Product {
  _id: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string;
  categoryName?: string;
  brandSlug?: string;
  slug?: string;
  specifications: ProductSpecs;
  condition: 'new' | 'used' | 'refurbished';
  conditionDetails?: 'excellent' | 'good' | 'fair';
  ptaApproved: boolean;
  countInStock: number;
  rating: number | null;
  numReviews: number;
  reviews: Review[];
  isFeatured: boolean;
  tags: string[];
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  createdAt?: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  productCount: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  customerId?: string;
  isGuest?: boolean;
  statusUpdatedAt: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface ProductSpecs {
  storage?: string;
  color?: string;
  display?: string;
  processor?: string;
  ram?: string;
  battery?: string;
  camera?: string;
  os?: string;
  network?: string;
}

export interface Review {
  _id: string;
  user: string | User;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
}

// Cart Types
export interface CartItem {
  product: string | Product;
  name: string;
  image: string;
  price: number;
  quantity: number;
  brand?: string;
  specs?: string;
  ptaApproved?: boolean;
}

export interface Cart {
  items: CartItem[];
  totals: CartTotals;
}

export interface CartTotals {
  subtotal: number;
  itemCount: number;
  shipping: number;
  tax: number;
  discount: number;
  freeShipping: boolean;
  promoCode?: string;
  total: number;
}

// Order Types
export interface Order {
  _id: string;
  user: string | User;
  orderNumber: string;
  items: OrderItem[];
  shippingAddress: Address;
  contactInfo: ContactInfo;
  paymentMethod: 'cod';
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  shippingMethod: 'standard' | 'express' | 'pickup';
  shippingCost: number;
  subtotal: number;
  tax: number;
  discount: number;
  discountCode?: string;
  total: number;
  status: OrderStatus;
  statusHistory: StatusHistoryItem[];
  trackingNumber?: string;
  deliveredAt?: string;
  notes?: string;
  createdAt: string;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export interface OrderItem {
  product: string | Product;
  name: string;
  image: string;
  price: number;
  quantity: number;
  brand?: string;
  specs?: string;
}

export interface ContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface StatusHistoryItem {
  status: OrderStatus;
  timestamp: string;
  note: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

// Filter Types
export interface ProductFilters {
  brand?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  ptaApproved?: boolean;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
