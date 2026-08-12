import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ShoppingCart,
  User,
  Menu,
  X,
  Heart,
  ChevronDown,
  Phone,
  MapPin,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import CartDrawer from '../cart/CartDrawer';
import { CONTACT_PHONE_NUMBERS, SHOP_LOCATION_LABEL } from '../../config/contact';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const { isAuthenticated, user, logout } = useAuth();
  const { totals } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/products' },
    { name: 'Compare', path: '/compare' },
    { name: 'About', path: '/about#about-us' },
    { name: 'Services', path: '/services#services' },
    { name: 'Support', path: '/support#contact' },
  ];
  const isLinkActive = (path: string) => location.pathname === path.split('#')[0];

  const userMenuItems = [
    { name: 'Dashboard', path: '/account/dashboard', icon: User },
    { name: 'My Orders', path: '/account/orders', icon: ShoppingCart },
    { name: 'Wishlist', path: '/account/wishlist', icon: Heart },
    { name: 'Settings', path: '/account/settings', icon: ChevronDown },
  ];

  return (
    <>
      {/* Top Bar */}
      <div className="bg-slate-950 px-4 py-2 text-white">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-sm">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Phone className="w-4 h-4" />
            {CONTACT_PHONE_NUMBERS.map((phone, index) => (
              <span key={phone.href} className="flex items-center gap-3">
                {index > 0 && <span className="text-slate-500" aria-hidden="true">•</span>}
                <a href={phone.href} className="transition-colors hover:text-blue-300">
                  {phone.label}
                </a>
              </span>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-6">
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {SHOP_LOCATION_LABEL}
            </span>
            <span>Trusted Cell Phones Outlet</span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <header
        className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 shadow-sm backdrop-blur-md"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link to="/" className="flex min-w-0 items-center gap-3">
              <img
                src="/assets/wahab-logo.jpg"
                alt="Wahab Mobiles logo"
                className="h-11 w-11 shrink-0 rounded-full border border-sky-100 object-cover shadow-sm"
              />
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="min-w-0"
              >
                <p className="text-lg font-bold leading-tight text-blue-700 lg:text-xl">
                  Wahab<span className="text-slate-900">Mobiles</span>
                </p>
                <p className="hidden text-xs font-medium text-slate-500 sm:block">Trusted Cell Phones Outlet</p>
              </motion.div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative text-sm font-medium transition-colors hover:text-blue-700 ${
                    isLinkActive(link.path) ? 'text-blue-700' : 'text-slate-700'
                  }`}
                >
                  {link.name}
                  {isLinkActive(link.path) && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-700"
                    />
                  )}
                </Link>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2 lg:gap-4">
              {/* Search Button */}
              <motion.button
                type="button"
                aria-label="Search products"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsSearchOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Search className="w-5 h-5 text-gray-700" />
              </motion.button>

              {/* Cart */}
              <button type="button" aria-label="Open shopping cart" onClick={() => setIsCartOpen(true)} className="relative">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ShoppingCart className="w-5 h-5 text-gray-700" />
                  {totals.itemCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center"
                    >
                      {totals.itemCount}
                    </motion.span>
                  )}
                </motion.div>
              </button>

              {/* User Menu */}
              {isAuthenticated ? (
                <div className="relative">
                  <motion.button
                    type="button"
                    aria-label="Open account menu"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-500 hidden lg:block" />
                  </motion.button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
                      >
                        <div className="p-4 border-b border-gray-100">
                          <p className="font-medium text-gray-900">
                            {user?.firstName} {user?.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{user?.email}</p>
                        </div>
                        <div className="py-2">
                          {userMenuItems.map((item) => (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <item.icon className="w-4 h-4" />
                              {item.name}
                            </Link>
                          ))}
                          <button
                            onClick={() => {
                              logout();
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Logout
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link to="/login" aria-label="Sign in">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="hidden lg:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Sign In
                  </motion.button>
                </Link>
              )}

              {/* Mobile Menu Button */}
              <motion.button
                type="button"
                aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={isMobileMenuOpen}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6 text-gray-700" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-700" />
                )}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white border-t border-gray-100"
            >
              <nav className="px-4 py-4 space-y-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isLinkActive(link.path)
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
                {!isAuthenticated && (
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium text-center"
                  >
                    Sign In
                  </Link>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for smartphones, brands, accessories..."
                  className="w-full px-6 py-4 pr-14 bg-white rounded-2xl shadow-2xl text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  type="submit"
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <Search className="w-5 h-5" />
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <CartDrawer open={isCartOpen} onOpenChange={setIsCartOpen} />
    </>
  );
};

export default Navbar;
