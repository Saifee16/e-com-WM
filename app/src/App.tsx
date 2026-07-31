import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AdminAuthProvider, useAdminAuth } from './contexts/AdminAuthContext';
import { CartProvider } from './contexts/CartContext';
import { ToastProvider } from './contexts/ToastContext';
import { useAuth } from './contexts/AuthContext';

// Layouts
import MainLayout from './components/layout/MainLayout';
import AccountLayout from './components/layout/AccountLayout';
import AdminLayout from './components/layout/AdminLayout';

// Pages
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import GoogleCallback from './pages/GoogleCallback';
import About from './pages/About';
import Services from './pages/Services';
import Support from './pages/Support';
import Compare from './pages/Compare';

// Account Pages
import Dashboard from './pages/account/Dashboard';
import Orders from './pages/account/Orders';
import OrderDetail from './pages/account/OrderDetail';
import Wishlist from './pages/account/Wishlist';
import Addresses from './pages/account/Addresses';
import Settings from './pages/account/Settings';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import AdminUsers from './pages/admin/Users';
import AdminLogin from './pages/admin/Login';
import ContactMessages from './pages/admin/ContactMessages';

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
              <Routes>
              {/* Public Routes */}
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Home />} />
                <Route path="products" element={<Products />} />
                <Route path="products/:id" element={<ProductDetail />} />
                <Route path="cart" element={<Cart />} />
                <Route path="about" element={<About />} />
                <Route path="services" element={<Services />} />
                <Route path="support" element={<Support />} />
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
                <Route path="contact" element={<ContactMessages />} />
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
            </Router>
          </CartProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
