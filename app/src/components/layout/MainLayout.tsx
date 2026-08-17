import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import Seo, { buildStaticMetadata } from '../../seo/seo';

const staticMetadataByPath: Record<string, ReturnType<typeof buildStaticMetadata>> = {
  '/': buildStaticMetadata(
    'Wahab Mobiles - New and Used Phones in Hyderabad',
    'Browse new, used and refurbished phones from Wahab Mobiles in Hyderabad.',
    '/',
  ),
  '/products': buildStaticMetadata(
    'Shop Phones and Mobile Accessories | Wahab Mobiles',
    'Browse the live Wahab Mobiles catalogue of phones, smart watches and gadgets.',
    '/products',
  ),
  '/about': buildStaticMetadata(
    'About Wahab Mobiles | Hyderabad Mobile Store',
    'Learn about Wahab Mobiles, a mobile phone store serving customers in Hyderabad.',
    '/about',
  ),
  '/services': buildStaticMetadata(
    'Services | Wahab Mobiles',
    'See the current services and support information from Wahab Mobiles.',
    '/services',
  ),
  '/support': buildStaticMetadata(
    'Support | Wahab Mobiles',
    'Find support answers and contact options for Wahab Mobiles orders and products.',
    '/support',
  ),
  '/returns': buildStaticMetadata(
    'Returns Policy | Wahab Mobiles',
    'Review the current return request policy for eligible Wahab Mobiles orders.',
    '/returns',
  ),
  '/privacy': buildStaticMetadata(
    'Privacy Policy | Wahab Mobiles',
    'Read the Wahab Mobiles privacy policy and customer data practices.',
    '/privacy',
  ),
  '/terms': buildStaticMetadata(
    'Terms of Service | Wahab Mobiles',
    'Read the terms that apply to using the Wahab Mobiles storefront.',
    '/terms',
  ),
  '/data-deletion': buildStaticMetadata(
    'Data Deletion | Wahab Mobiles',
    'Learn how to request deletion of your Wahab Mobiles customer data.',
    '/data-deletion',
  ),
  '/compare': {
    ...buildStaticMetadata(
      'Compare Products | Wahab Mobiles',
      'Compare products from the Wahab Mobiles catalogue.',
      '/compare',
    ),
    robots: 'noindex,follow',
  },
  '/cart': {
    ...buildStaticMetadata(
      'Shopping Cart | Wahab Mobiles',
      'Review your Wahab Mobiles shopping cart before checkout.',
      '/cart',
    ),
    robots: 'noindex,follow',
  },
};

const isPageManagedSeoRoute = (pathname: string) =>
  pathname === '/'
  || pathname.startsWith('/products')
  || pathname.startsWith('/phones')
  || pathname.startsWith('/smart-watches')
  || pathname.startsWith('/gadgets');

const MainLayout = () => {
  const location = useLocation();
  const layoutMetadata = isPageManagedSeoRoute(location.pathname)
    ? undefined
    : staticMetadataByPath[location.pathname];

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const id = location.hash.slice(1);
    window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [location.pathname, location.hash]);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      {layoutMetadata && <Seo metadata={layoutMetadata} />}
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
