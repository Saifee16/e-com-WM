import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
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
import { priceRanges } from '../../data/products';
import type { Category, Product } from '../../types';
import { productsAPI } from '../../services/api';
import { calculateDiscount, formatPrice } from '../../utils/format';
import {
  getActiveCategoryDescendants,
  getCategoryBySlug,
  getCategoryHref,
  getFeaturedProduct,
  getFeaturedVariantLabel,
  getGadgetGroups,
  getNavigationBrands,
  hasProductDiscount,
  type NavigationMenuId,
} from './navigation-data';

type NavigationData = {
  categories: Category[];
  phoneProducts: Product[];
  watchProducts: Product[];
  gadgetProducts: Product[];
  featuredPhone?: Product;
};

const emptyNavigationData: NavigationData = {
  categories: [],
  phoneProducts: [],
  watchProducts: [],
  gadgetProducts: [],
};

const primaryLinks = [
  { name: 'Compare', path: '/compare' },
  { name: 'Services', path: '/services#services' },
  { name: 'Support', path: '/support#contact' },
];

const emptyProductPage = { items: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false } };

const getSettledData = <T,>(result: PromiseSettledResult<{ data: { data: T } }>, fallback: T): T => (
  result.status === 'fulfilled' ? result.value.data.data : fallback
);

const menuLabels: Record<NavigationMenuId, string> = {
  phones: 'Phones',
  'smart-watches': 'Smart Watches',
  gadgets: 'Gadgets',
};

const NavigationLink = ({ to, label, onNavigate }: { to: string; label: string; onNavigate: () => void }) => (
  <Link to={to} onClick={onNavigate} className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">{label}</Link>
);

const NavigationGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section><h3 className="px-3 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">{title}</h3><div className="mt-2 space-y-0.5">{children}</div></section>
);

const MobileNavigationGroup = ({ id, title, open, onToggle, children }: { id: string; title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) => (
  <div className="border-t border-slate-100 pt-2 first:border-t-0 first:pt-0">
    <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={id} className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-extrabold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">{title}<ChevronRight className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden="true" /></button>
    {open && <div id={id} className="mt-1 space-y-0.5 pl-2">{children}</div>}
  </div>
);

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDesktopMenu, setOpenDesktopMenu] = useState<NavigationMenuId | null>(null);
  const [openMobileSection, setOpenMobileSection] = useState<NavigationMenuId | null>(null);
  const [openMobileGroups, setOpenMobileGroups] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [navigationData, setNavigationData] = useState<NavigationData>(emptyNavigationData);
  const { isAuthenticated, user, logout } = useAuth();
  const { totals } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let isActive = true;
    const loadNavigationData = async () => {
      const results = await Promise.allSettled([
        productsAPI.getCategories(),
        productsAPI.getProducts({ category: 'phones', limit: 100 }),
        productsAPI.getProducts({ category: 'smart-watches', limit: 100 }),
        productsAPI.getProducts({ category: 'gadgets', limit: 100 }),
        productsAPI.getProducts({ category: 'phones', featured: true, limit: 1 }),
      ]);
      if (!isActive) return;
      const phonePage = getSettledData(results[1], emptyProductPage);
      const watchPage = getSettledData(results[2], emptyProductPage);
      const gadgetPage = getSettledData(results[3], emptyProductPage);
      const featuredPage = getSettledData(results[4], { ...emptyProductPage, pagination: { ...emptyProductPage.pagination, limit: 1 } });
      setNavigationData({ categories: getSettledData(results[0], []), phoneProducts: phonePage.items, watchProducts: watchPage.items, gadgetProducts: gadgetPage.items, featuredPhone: getFeaturedProduct(featuredPage.items) });
    };
    void loadNavigationData();
    return () => { isActive = false; };
  }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!navigationRef.current?.contains(event.target as Node)) {
        setOpenDesktopMenu(null);
        setIsUserMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpenDesktopMenu(null);
      setIsUserMenuOpen(false);
      setIsMobileMenuOpen(false);
      setOpenMobileSection(null);
      setOpenMobileGroups({});
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const closeMenus = () => {
    setIsMobileMenuOpen(false);
    setOpenDesktopMenu(null);
    setOpenMobileSection(null);
    setOpenMobileGroups({});
    setIsUserMenuOpen(false);
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    navigate(`/products?search=${encodeURIComponent(query)}`);
    setSearchQuery('');
    closeMenus();
  };

  const isLinkActive = (path: string) => {
    const [pathname, query] = path.split('?');
    if (location.pathname !== pathname) return false;
    return query ? location.search.includes(query) : !location.search || path === '/products';
  };

  const toggleMobileSection = (menu: NavigationMenuId) => {
    setOpenMobileSection((current) => (current === menu ? null : menu));
    setOpenMobileGroups((current) => ({ ...current, [`${menu}:discover`]: true }));
  };

  const toggleMobileGroup = (id: string) => setOpenMobileGroups((current) => ({ ...current, [id]: !current[id] }));

  const phoneRoot = getCategoryBySlug(navigationData.categories, 'phones');
  const watchRoot = getCategoryBySlug(navigationData.categories, 'smart-watches');
  const gadgetRoot = getCategoryBySlug(navigationData.categories, 'gadgets');
  const phoneBrands = getNavigationBrands(navigationData.phoneProducts);
  const watchBrands = getNavigationBrands(navigationData.watchProducts);
  const gadgetBrands = getNavigationBrands(navigationData.gadgetProducts);
  const phoneCategories = phoneRoot ? getActiveCategoryDescendants(phoneRoot) : [];
  const watchCategories = watchRoot ? getActiveCategoryDescendants(watchRoot) : [];
  const gadgetCategories = gadgetRoot ? getActiveCategoryDescendants(gadgetRoot) : [];

  const renderMobileCategory = (menu: NavigationMenuId) => {
    const categoryLinks = menu === 'phones' ? phoneCategories : menu === 'smart-watches' ? watchCategories : gadgetCategories;
    const brands = menu === 'phones' ? phoneBrands : menu === 'smart-watches' ? watchBrands : gadgetBrands;
    const groups = menu === 'gadgets' ? getGadgetGroups(categoryLinks) : [];
    return (
      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <MobileNavigationGroup id={`mobile-${menu}-discover`} title="Discover" open={Boolean(openMobileGroups[`${menu}:discover`])} onToggle={() => toggleMobileGroup(`${menu}:discover`)}>
          {menu === 'phones' && <NavigationLink to="/phones?featured=true" label="Featured Phones" onNavigate={closeMenus} />}
          {menu !== 'phones' && <NavigationLink to={`/${menu}?featured=true`} label="Featured" onNavigate={closeMenus} />}
          <NavigationLink to={`/${menu}?sort=newest`} label="New Arrivals" onNavigate={closeMenus} />
          <NavigationLink to={`/${menu}?discounted=true`} label="Discounted" onNavigate={closeMenus} />
          {menu === 'phones' && <NavigationLink to="/phones?ptaApproved=true" label="PTA Approved" onNavigate={closeMenus} />}
          <NavigationLink to={`/${menu}`} label={menu === 'phones' ? 'All Phones' : menu === 'smart-watches' ? 'All Watches' : 'All Gadgets'} onNavigate={closeMenus} />
        </MobileNavigationGroup>
        {menu === 'phones' && <MobileNavigationGroup id="mobile-phones-condition" title="Condition" open={Boolean(openMobileGroups['phones:condition'])} onToggle={() => toggleMobileGroup('phones:condition')}><NavigationLink to="/phones?condition=new" label="New Phones" onNavigate={closeMenus} /><NavigationLink to="/phones?condition=used" label="Used Phones" onNavigate={closeMenus} /><NavigationLink to="/phones?condition=refurbished" label="Refurbished Phones" onNavigate={closeMenus} /></MobileNavigationGroup>}
        {menu !== 'gadgets' && categoryLinks.length > 0 && <MobileNavigationGroup id={`mobile-${menu}-categories`} title="Categories" open={Boolean(openMobileGroups[`${menu}:categories`])} onToggle={() => toggleMobileGroup(`${menu}:categories`)}>{categoryLinks.map((category) => <NavigationLink key={category.id} to={getCategoryHref(category, menu)} label={category.name} onNavigate={closeMenus} />)}</MobileNavigationGroup>}
        {menu === 'gadgets' && groups.map((group) => <MobileNavigationGroup key={group.label} id={`mobile-gadgets-${group.label.toLowerCase().replaceAll(' ', '-')}`} title={group.label} open={Boolean(openMobileGroups[`gadgets:${group.label}`])} onToggle={() => toggleMobileGroup(`gadgets:${group.label}`)}>{group.categories.map((category) => <NavigationLink key={category.id} to={getCategoryHref(category, menu)} label={category.name} onNavigate={closeMenus} />)}</MobileNavigationGroup>)}
        {brands.length > 0 && <MobileNavigationGroup id={`mobile-${menu}-brands`} title="Brands" open={Boolean(openMobileGroups[`${menu}:brands`])} onToggle={() => toggleMobileGroup(`${menu}:brands`)}>{brands.map((brand) => <NavigationLink key={brand} to={`/${menu}?brand=${encodeURIComponent(brand)}`} label={brand} onNavigate={closeMenus} />)}</MobileNavigationGroup>}
        {menu === 'phones' && <MobileNavigationGroup id="mobile-phones-price" title="Price" open={Boolean(openMobileGroups['phones:price'])} onToggle={() => toggleMobileGroup('phones:price')}>{priceRanges.map((range) => <NavigationLink key={range.label} to={`/phones?price=${encodeURIComponent(range.label)}`} label={range.label} onNavigate={closeMenus} />)}</MobileNavigationGroup>}
      </div>
    );
  };

  return (
    <>
      <div className="hidden bg-[#082f63] text-white md:block"><div className="mx-auto flex h-8 max-w-[1400px] items-center justify-between px-6 text-xs lg:px-8"><div className="flex items-center gap-5">{CONTACT_PHONE_NUMBERS.map((phone) => <a key={phone.href} href={phone.href} className="inline-flex items-center gap-1.5 text-blue-50 hover:text-white"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{phone.label}</a>)}</div><span className="inline-flex items-center gap-1.5 text-blue-100"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{SHOP_LOCATION_LABEL}</span></div></div>
      <header ref={navigationRef} className="relative sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-[0_4px_20px_rgba(15,46,82,0.06)] backdrop-blur-xl">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8"><div className="flex h-16 items-center gap-3 md:h-[74px] md:gap-5">
          <Link to="/" onClick={closeMenus} className="flex shrink-0 items-center gap-2.5" aria-label="Wahab Mobiles home"><img src="/assets/wahab-logo.jpg" alt="Wahab Mobiles logo" className="h-10 w-10 rounded-xl border border-blue-100 object-cover sm:h-11 sm:w-11" /><div className="hidden min-[360px]:block"><p className="text-[17px] font-extrabold leading-5 tracking-tight text-[#0b3f82] sm:text-lg">Wahab <span className="text-slate-950">Mobiles</span></p><p className="hidden text-[10px] font-semibold text-slate-500 sm:block">Cell phones in Hyderabad</p></div></Link>
          <SearchForm query={searchQuery} onChange={setSearchQuery} onSubmit={handleSearch} className="hidden min-w-0 flex-1 md:block" />
          <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-2">
            <Link to={isAuthenticated ? '/account/dashboard' : '/login'} aria-label={isAuthenticated ? 'My account' : 'Sign in'} className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 md:hidden"><User className="h-5 w-5" aria-hidden="true" /></Link>
            <Link to={isAuthenticated ? '/account/wishlist' : '/login'} aria-label="Wishlist" className="hidden h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 lg:flex"><Heart className="h-5 w-5" aria-hidden="true" /><span className="hidden xl:inline">Wishlist</span></Link>
            {isAuthenticated ? <div className="relative hidden md:block"><button type="button" onClick={() => setIsUserMenuOpen((open) => !open)} aria-label="Open account menu" aria-expanded={isUserMenuOpen} className="flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-xs font-bold text-white">{user?.firstName?.[0]}{user?.lastName?.[0]}</span><span className="hidden xl:inline">Account</span><ChevronDown className="hidden h-4 w-4 xl:block" aria-hidden="true" /></button><AnimatePresence>{isUserMenuOpen && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute right-0 top-[calc(100%+8px)] w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,46,82,0.16)]"><div className="border-b border-slate-100 px-4 py-3"><p className="truncate text-sm font-bold text-slate-950">{user?.firstName} {user?.lastName}</p><p className="truncate text-xs text-slate-500">{user?.email}</p></div><div className="p-2 text-sm"><AccountLink to="/account/dashboard" label="Dashboard" onClick={closeMenus} /><AccountLink to="/account/orders" label="My orders" onClick={closeMenus} /><AccountLink to="/account/wishlist" label="Wishlist" onClick={closeMenus} /><button type="button" onClick={() => { logout(); closeMenus(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left font-semibold text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" aria-hidden="true" />Log out</button></div></motion.div>}</AnimatePresence></div> : <Link to="/login" className="hidden h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 md:flex"><User className="h-5 w-5" aria-hidden="true" /><span className="hidden xl:inline">Sign in</span></Link>}
            <button type="button" onClick={() => setIsCartOpen(true)} aria-label={`Open cart with ${totals.itemCount} items`} className="relative flex h-11 items-center gap-2 rounded-lg px-2.5 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 md:px-3"><ShoppingCart className="h-5 w-5" aria-hidden="true" /><span className="hidden xl:inline">Cart</span>{totals.itemCount > 0 && <span className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-700 px-1 text-[10px] font-bold text-white">{totals.itemCount}</span>}</button>
            <button type="button" aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen((open) => !open)} className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 lg:hidden">{isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</button>
          </div></div><SearchForm query={searchQuery} onChange={setSearchQuery} onSubmit={handleSearch} className="pb-3 md:hidden" /></div>
        <nav className="hidden border-t border-slate-100 lg:block" aria-label="Store categories"><div className="mx-auto flex h-11 max-w-[1400px] items-center gap-0 px-6 lg:px-8">{(['phones', 'smart-watches', 'gadgets'] as NavigationMenuId[]).map((menu) => <button key={menu} type="button" onMouseEnter={() => setOpenDesktopMenu(menu)} onClick={() => setOpenDesktopMenu(menu)} aria-expanded={openDesktopMenu === menu} aria-controls={`desktop-menu-${menu}`} className="flex h-full items-center gap-1 whitespace-nowrap border-b-2 border-transparent px-2.5 text-[13px] font-bold text-slate-600 transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-inset">{menuLabels[menu]}<ChevronDown className={`h-3.5 w-3.5 transition-transform ${openDesktopMenu === menu ? 'rotate-180' : ''}`} aria-hidden="true" /></button>)}{primaryLinks.map((link) => <Link key={link.path} to={link.path} onClick={closeMenus} className={`flex h-full items-center whitespace-nowrap border-b-2 px-2.5 text-[13px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-inset ${isLinkActive(link.path) ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-600 hover:text-blue-700'}`}>{link.name}</Link>)}</div></nav>
        <AnimatePresence>{openDesktopMenu && <motion.div id={`desktop-menu-${openDesktopMenu}`} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute left-0 right-0 top-full hidden border-t border-slate-200 bg-white shadow-[0_20px_40px_rgba(15,46,82,0.12)] lg:block"><MegaMenu menu={openDesktopMenu} categories={navigationData.categories} phoneProducts={navigationData.phoneProducts} watchProducts={navigationData.watchProducts} gadgetProducts={navigationData.gadgetProducts} featuredPhone={navigationData.featuredPhone} onNavigate={closeMenus} /></motion.div>}</AnimatePresence>
        <AnimatePresence>{isMobileMenuOpen && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-t border-slate-100 bg-white lg:hidden"><nav className="mx-auto max-w-[1400px] space-y-2 px-4 py-4 sm:px-6" aria-label="Mobile navigation">{(['phones', 'smart-watches', 'gadgets'] as NavigationMenuId[]).map((menu) => <div key={menu} className="border-b border-slate-100 pb-2"><button type="button" onClick={() => toggleMobileSection(menu)} aria-expanded={openMobileSection === menu} aria-controls={`mobile-menu-${menu}`} className="flex min-h-12 w-full items-center justify-between rounded-lg px-3 text-left text-base font-extrabold text-slate-900 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">{menuLabels[menu]}<ChevronRight className={`h-5 w-5 transition-transform ${openMobileSection === menu ? 'rotate-90 text-blue-700' : ''}`} aria-hidden="true" /></button>{openMobileSection === menu && <div id={`mobile-menu-${menu}`} className="mt-2">{renderMobileCategory(menu)}</div>}</div>)}<div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-3">{primaryLinks.map((link) => <Link key={link.path} to={link.path} onClick={closeMenus} className="rounded-lg bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700">{link.name}</Link>)}</div><div className="flex items-center gap-2 border-t border-slate-100 pt-4"><Link to={isAuthenticated ? '/account/dashboard' : '/login'} onClick={closeMenus} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-bold text-white"><User className="h-4 w-4" aria-hidden="true" />{isAuthenticated ? 'My account' : 'Sign in'}</Link><Link to={isAuthenticated ? '/account/wishlist' : '/login'} onClick={closeMenus} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700"><Heart className="h-4 w-4" aria-hidden="true" />Wishlist</Link></div></nav></motion.div>}</AnimatePresence>
      </header>
      <CartDrawer open={isCartOpen} onOpenChange={setIsCartOpen} />
    </>
  );
};

const MegaMenu = ({ menu, categories, phoneProducts, watchProducts, gadgetProducts, featuredPhone, onNavigate }: { menu: NavigationMenuId; categories: Category[]; phoneProducts: Product[]; watchProducts: Product[]; gadgetProducts: Product[]; featuredPhone?: Product; onNavigate: () => void }) => {
  const root = getCategoryBySlug(categories, menu);
  const categoryLinks = root ? getActiveCategoryDescendants(root) : [];
  const products = menu === 'phones' ? phoneProducts : menu === 'smart-watches' ? watchProducts : gadgetProducts;
  const brands = getNavigationBrands(products);
  const groups = menu === 'gadgets' ? getGadgetGroups(categoryLinks) : [];
  return <div className="mx-auto grid max-w-[1400px] gap-6 px-6 py-6 lg:grid-cols-4 lg:px-8 xl:grid-cols-5">
    <NavigationGroup title="Discover"><>{menu === 'phones' && <NavigationLink to="/phones?featured=true" label="Featured Phones" onNavigate={onNavigate} />}{menu !== 'phones' && <NavigationLink to={`/${menu}?featured=true`} label="Featured" onNavigate={onNavigate} />}<NavigationLink to={`/${menu}?sort=newest`} label="New Arrivals" onNavigate={onNavigate} /><NavigationLink to={`/${menu}?discounted=true`} label="Discounted" onNavigate={onNavigate} />{menu === 'phones' && <NavigationLink to="/phones?ptaApproved=true" label="PTA Approved" onNavigate={onNavigate} />}<NavigationLink to={`/${menu}`} label={menu === 'phones' ? 'All Phones' : menu === 'smart-watches' ? 'All Watches' : 'All Gadgets'} onNavigate={onNavigate} /></></NavigationGroup>
    {menu === 'phones' && <NavigationGroup title="Condition"><NavigationLink to="/phones?condition=new" label="New Phones" onNavigate={onNavigate} /><NavigationLink to="/phones?condition=used" label="Used Phones" onNavigate={onNavigate} /><NavigationLink to="/phones?condition=refurbished" label="Refurbished Phones" onNavigate={onNavigate} /></NavigationGroup>}
    {menu === 'smart-watches' && categoryLinks.length > 0 && <NavigationGroup title="Categories">{categoryLinks.map((category) => <NavigationLink key={category.id} to={getCategoryHref(category, menu)} label={category.name} onNavigate={onNavigate} />)}</NavigationGroup>}
    {menu === 'gadgets' && groups.map((group) => <NavigationGroup key={group.label} title={group.label}>{group.categories.map((category) => <NavigationLink key={category.id} to={getCategoryHref(category, menu)} label={category.name} onNavigate={onNavigate} />)}</NavigationGroup>)}
    {brands.length > 0 && <NavigationGroup title="Brands">{brands.map((brand) => <NavigationLink key={brand} to={`/${menu}?brand=${encodeURIComponent(brand)}`} label={brand} onNavigate={onNavigate} />)}</NavigationGroup>}
    {menu === 'phones' && <NavigationGroup title="Price">{priceRanges.map((range) => <NavigationLink key={range.label} to={`/phones?price=${encodeURIComponent(range.label)}`} label={range.label} onNavigate={onNavigate} />)}</NavigationGroup>}
    {menu === 'phones' && featuredPhone && <Link data-testid="featured-phone-tile" to={`/products/${featuredPhone.slug ?? featuredPhone._id}`} onClick={onNavigate} className="group overflow-hidden rounded-xl border border-blue-100 bg-blue-50 p-3 transition hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"><img src={featuredPhone.images[0]} alt={featuredPhone.name} className="h-28 w-full rounded-lg bg-white object-contain" /><p className="mt-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-blue-700">Featured phone</p><p className="mt-1 line-clamp-2 text-sm font-extrabold text-slate-950">{featuredPhone.name}</p>{getFeaturedVariantLabel(featuredPhone) && <p className="mt-1 text-xs text-slate-600">{getFeaturedVariantLabel(featuredPhone)}</p>}<div className="mt-2 flex flex-wrap items-baseline gap-2"><span className="font-extrabold text-blue-700">{formatPrice(featuredPhone.price)}</span>{featuredPhone.originalPrice && featuredPhone.originalPrice > featuredPhone.price && <span className="text-xs text-slate-500 line-through">{formatPrice(featuredPhone.originalPrice)}</span>}</div>{hasProductDiscount(featuredPhone) && featuredPhone.originalPrice && featuredPhone.originalPrice > featuredPhone.price && <span className="mt-1 inline-block text-xs font-bold text-emerald-700">{calculateDiscount(featuredPhone.originalPrice, featuredPhone.price)}% off</span>}<span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-blue-700">View Phone <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></span></Link>}
  </div>;
};

const SearchForm = ({ query, onChange, onSubmit, className = '' }: { query: string; onChange: (value: string) => void; onSubmit: (event: React.FormEvent) => void; className?: string }) => <form onSubmit={onSubmit} role="search" className={className}><label className="relative block"><span className="sr-only">Search phones</span><Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input type="search" value={query} onChange={(event) => onChange(event.target.value)} placeholder="Search phones, brands or storage" className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-11 pr-24 text-sm text-slate-950 placeholder:text-slate-500 focus:border-blue-600 focus:bg-white focus:ring-blue-600" /><button type="submit" className="absolute right-1.5 top-1.5 h-8 rounded-md bg-blue-700 px-4 text-xs font-bold text-white transition hover:bg-blue-800">Search</button></label></form>;

const AccountLink = ({ to, label, onClick }: { to: string; label: string; onClick: () => void }) => <Link to={to} onClick={onClick} className="block rounded-lg px-3 py-2.5 font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700">{label}</Link>;

export default Navbar;
