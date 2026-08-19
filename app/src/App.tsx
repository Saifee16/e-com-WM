import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { AdminAuthProvider, useAdminAuth } from './contexts/AdminAuthContext';
import { CartProvider } from './contexts/CartContext';
import { ToastProvider } from './contexts/ToastContext';
import { useAuth } from './contexts/AuthContext';

const MainLayout = lazy(() => import('./components/layout/MainLayout'));
const AccountLayout = lazy(() => import('./components/layout/AccountLayout'));
const AdminLayout = lazy(() => import('./components/layout/AdminLayout'));
const Home = lazy(() => import('./pages/Home'));
const Products = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const GoogleCallback = lazy(() => import('./pages/GoogleCallback'));
const About = lazy(() => import('./pages/About'));
const Services = lazy(() => import('./pages/Services'));
const Support = lazy(() => import('./pages/Support'));
const Compare = lazy(() => import('./pages/Compare'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const DataDeletion = lazy(() => import('./pages/DataDeletion'));
const ReturnsPolicy = lazy(() => import('./pages/ReturnsPolicy'));
const Dashboard = lazy(() => import('./pages/account/Dashboard'));
const Orders = lazy(() => import('./pages/account/Orders'));
const OrderDetail = lazy(() => import('./pages/account/OrderDetail'));
const Wishlist = lazy(() => import('./pages/account/Wishlist'));
const Addresses = lazy(() => import('./pages/account/Addresses'));
const Settings = lazy(() => import('./pages/account/Settings'));
const SupportTickets = lazy(() => import('./pages/account/SupportTickets'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AccountManagement = lazy(() => import('./pages/admin/AccountManagement'));
const AdminLogin = lazy(() => import('./pages/admin/Login'));
const ContactMessages = lazy(() => import('./pages/admin/ContactMessages'));
const AdminReturns = lazy(() => import('./pages/admin/Returns'));

const RouteLoading = () => (
  <div className="min-h-[60dvh] bg-slate-50 px-4 py-16" role="status" aria-label="Loading page">
    <div className="mx-auto max-w-7xl animate-pulse space-y-5">
      <div className="h-8 w-56 rounded-lg bg-slate-200" />
      <div className="h-4 max-w-xl rounded bg-slate-200" />
      <div className="h-64 rounded-2xl bg-slate-200" />
    </div>
  </div>
);

// Protected Route Component
const CustomerProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdminAuthenticated, isAdminLoading } = useAdminAuth();

  if (isAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

// Public Route (redirect if authenticated)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AdminAuthProvider>
          <CartProvider>
            <Router>
              <Suspense fallback={<RouteLoading />}>
              <Routes>
              {/* Public Routes */}
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Home />} />
                <Route path="products" element={<Products />} />
                <Route path="phones" element={<Products />} />
                <Route path="phones/:categorySlug" element={<Products />} />
                <Route path="smartphones" element={<Navigate to="/phones" replace />} />
                <Route path="smart-watches" element={<Products />} />
                <Route path="smart-watches/:categorySlug" element={<Products />} />
                <Route path="gadgets" element={<Products />} />
                <Route path="gadgets/:categorySlug" element={<Products />} />
                <Route path="products/:id" element={<ProductDetail />} />
                <Route path="cart" element={<Cart />} />
                <Route path="about" element={<About />} />
                <Route path="services" element={<Services />} />
                <Route path="support" element={<Support />} />
                <Route path="help" element={<Navigate to="/support#faqs" replace />} />
                <Route path="terms" element={<TermsOfService />} />
                <Route path="privacy" element={<PrivacyPolicy />} />
                <Route path="data-deletion" element={<DataDeletion />} />
                <Route path="returns" element={<ReturnsPolicy />} />
                <Route path="compare" element={<Compare />} />
              </Route>

              {/* Auth Routes */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <Register />
                  </PublicRoute>
                }
              />
              <Route path="/auth/google/callback" element={<GoogleCallback />} />
              <Route path="/auth/facebook/callback" element={<GoogleCallback provider="facebook" />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Checkout Route */}
              <Route path="/checkout" element={<Checkout />} />

              {/* Account Routes */}
              <Route
                path="/account"
                element={
                  <CustomerProtectedRoute>
                    <AccountLayout />
                  </CustomerProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/account/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="orders" element={<Orders />} />
                <Route path="orders/:id" element={<OrderDetail />} />
                <Route path="wishlist" element={<Wishlist />} />
                <Route path="addresses" element={<Addresses />} />
                <Route path="settings" element={<Settings />} />
                <Route path="support" element={<SupportTickets />} />
              </Route>

              {/* Admin Routes */}
              <Route
                path="/admin/login"
                element={<AdminLogin />}
              />

              <Route
                path="/admin"
                element={
                  <AdminProtectedRoute>
                    <AdminLayout />
                  </AdminProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="account-management" element={<AccountManagement />} />
                <Route path="contact" element={<ContactMessages />} />
                <Route path="returns" element={<AdminReturns />} />
              </Route>

              {/* 404 Route */}
              <Route
                path="*"
                element={
                  <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                      <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                      <p className="text-gray-600 mb-6">Page not found</p>
                      <a href="/" className="text-blue-600 hover:underline">
                        Go back home
                      </a>
                    </div>
                  </div>
                }
              />
              </Routes>
              </Suspense>
            </Router>
          </CartProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
