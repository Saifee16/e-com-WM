import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  Heart,
  LogOut,
  MapPin,
  Menu,
  Phone,
  Search,
  ShoppingCart,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import CartDrawer from '../cart/CartDrawer';
import { CONTACT_PHONE_NUMBERS, SHOP_LOCATION_LABEL } from '../../config/contact';

const primaryLinks = [
  { name: 'Home', path: '/' },
  { name: 'All phones', path: '/products' },
  { name: 'New', path: '/products?condition=new' },
  { name: 'Used', path: '/products?condition=used' },
  { name: 'Refurbished', path: '/products?condition=refurbished' },
  { name: 'Compare', path: '/compare' },
  { name: 'Services', path: '/services#services' },
  { name: 'About', path: '/about#about-us' },
  { name: 'Support', path: '/support#contact' },
];

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const { totals } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    navigate(`/products?search=${encodeURIComponent(query)}`);
    setSearchQuery('');
    setIsMobileMenuOpen(false);
  };

  const isLinkActive = (path: string) => {
    const [pathname, query] = path.split('?');
    if (location.pathname !== pathname) return false;
    return query ? location.search.includes(query) : !location.search || path === '/products';
  };

  const closeMenus = () => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  return (
    <>
      <div className="hidden bg-[#082f63] text-white md:block">
        <div className="mx-auto flex h-8 max-w-[1400px] items-center justify-between px-6 text-xs lg:px-8">
          <div className="flex items-center gap-5">
            {CONTACT_PHONE_NUMBERS.map((phone) => (
              <a key={phone.href} href={phone.href} className="inline-flex items-center gap-1.5 text-blue-50 hover:text-white">
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                {phone.label}
              </a>
            ))}
          </div>
          <span className="inline-flex items-center gap-1.5 text-blue-100">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {SHOP_LOCATION_LABEL}
          </span>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-[0_4px_20px_rgba(15,46,82,0.06)] backdrop-blur-xl">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-3 md:h-[74px] md:gap-5">
            <Link to="/" onClick={closeMenus} className="flex shrink-0 items-center gap-2.5" aria-label="Wahab Mobiles home">
              <img
                src="/assets/wahab-logo.jpg"
                alt="Wahab Mobiles logo"
                className="h-10 w-10 rounded-xl border border-blue-100 object-cover sm:h-11 sm:w-11"
              />
              <div className="hidden min-[360px]:block">
                <p className="text-[17px] font-extrabold leading-5 tracking-tight text-[#0b3f82] sm:text-lg">
                  Wahab <span className="text-slate-950">Mobiles</span>
                </p>
                <p className="hidden text-[10px] font-semibold text-slate-500 sm:block">Cell phones in Hyderabad</p>
              </div>
            </Link>

            <SearchForm
              query={searchQuery}
              onChange={setSearchQuery}
              onSubmit={handleSearch}
              className="hidden min-w-0 flex-1 md:block"
            />

            <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-2">
              <Link
                to={isAuthenticated ? '/account/dashboard' : '/login'}
                aria-label={isAuthenticated ? 'My account' : 'Sign in'}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 md:hidden"
              >
                <User className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                to={isAuthenticated ? '/account/wishlist' : '/login'}
                aria-label="Wishlist"
                className="hidden h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 lg:flex"
              >
                <Heart className="h-5 w-5" aria-hidden="true" />
                <span className="hidden xl:inline">Wishlist</span>
              </Link>

              {isAuthenticated ? (
                <div className="relative hidden md:block">
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen((open) => !open)}
                    aria-label="Open account menu"
                    aria-expanded={isUserMenuOpen}
                    className="flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-xs font-bold text-white">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                    <span className="hidden xl:inline">Account</span>
                    <ChevronDown className="hidden h-4 w-4 xl:block" aria-hidden="true" />
                  </button>
                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute right-0 top-[calc(100%+8px)] w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,46,82,0.16)]"
                      >
                        <div className="border-b border-slate-100 px-4 py-3">
                          <p className="truncate text-sm font-bold text-slate-950">{user?.firstName} {user?.lastName}</p>
                          <p className="truncate text-xs text-slate-500">{user?.email}</p>
                        </div>
                        <div className="p-2 text-sm">
                          <AccountLink to="/account/dashboard" label="Dashboard" onClick={closeMenus} />
                          <AccountLink to="/account/orders" label="My orders" onClick={closeMenus} />
                          <AccountLink to="/account/wishlist" label="Wishlist" onClick={closeMenus} />
                          <button
                            type="button"
                            onClick={() => {
                              logout();
                              closeMenus();
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left font-semibold text-red-600 hover:bg-red-50"
                          >
                            <LogOut className="h-4 w-4" aria-hidden="true" />
                            Log out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="hidden h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 md:flex"
                >
                  <User className="h-5 w-5" aria-hidden="true" />
                  <span className="hidden xl:inline">Sign in</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                aria-label={`Open cart with ${totals.itemCount} items`}
                className="relative flex h-11 items-center gap-2 rounded-lg px-2.5 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 md:px-3"
              >
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                <span className="hidden xl:inline">Cart</span>
                {totals.itemCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-700 px-1 text-[10px] font-bold text-white">
                    {totals.itemCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen((open) => !open)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 lg:hidden"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          <SearchForm
            query={searchQuery}
            onChange={setSearchQuery}
            onSubmit={handleSearch}
            className="pb-3 md:hidden"
          />
        </div>

        <nav className="hidden border-t border-slate-100 lg:block" aria-label="Store categories">
          <div className="mx-auto flex h-11 max-w-[1400px] items-center gap-1 px-6 lg:px-8">
            {primaryLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex h-full items-center whitespace-nowrap border-b-2 px-3 text-[13px] font-bold transition ${
                  isLinkActive(link.path)
                    ? 'border-blue-700 text-blue-700'
                    : 'border-transparent text-slate-600 hover:text-blue-700'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </nav>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-slate-100 bg-white lg:hidden"
            >
              <nav className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6" aria-label="Mobile navigation">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {primaryLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={closeMenus}
                      className={`rounded-lg px-3 py-3 text-sm font-bold ${
                        isLinkActive(link.path) ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-700'
                      }`}
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
                  <Link
                    to={isAuthenticated ? '/account/dashboard' : '/login'}
                    onClick={closeMenus}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-bold text-white"
                  >
                    <User className="h-4 w-4" aria-hidden="true" />
                    {isAuthenticated ? 'My account' : 'Sign in'}
                  </Link>
                  <Link
                    to={isAuthenticated ? '/account/wishlist' : '/login'}
                    onClick={closeMenus}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700"
                  >
                    <Heart className="h-4 w-4" aria-hidden="true" />
                    Wishlist
                  </Link>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <CartDrawer open={isCartOpen} onOpenChange={setIsCartOpen} />
    </>
  );
};

const SearchForm = ({
  query,
  onChange,
  onSubmit,
  className = '',
}: {
  query: string;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  className?: string;
}) => (
  <form onSubmit={onSubmit} role="search" className={className}>
    <label className="relative block">
      <span className="sr-only">Search phones</span>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        type="search"
        value={query}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search phones, brands or storage"
        className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-11 pr-24 text-sm text-slate-950 placeholder:text-slate-500 focus:border-blue-600 focus:bg-white focus:ring-blue-600"
      />
      <button
        type="submit"
        className="absolute right-1.5 top-1.5 h-8 rounded-md bg-blue-700 px-4 text-xs font-bold text-white transition hover:bg-blue-800"
      >
        Search
      </button>
    </label>
  </form>
);

const AccountLink = ({ to, label, onClick }: { to: string; label: string; onClick: () => void }) => (
  <Link to={to} onClick={onClick} className="block rounded-lg px-3 py-2.5 font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700">
    {label}
  </Link>
);

export default Navbar;
