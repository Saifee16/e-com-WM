import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_NUMBERS,
  SHOP_ADDRESS,
  SHOP_MAPS_URL,
  SHOP_WHATSAPP_URL,
} from '../../config/contact';

const shopLinks = [
  { name: 'All phones', path: '/products' },
  { name: 'New phones', path: '/products?condition=new' },
  { name: 'Used phones', path: '/products?condition=used' },
  { name: 'Refurbished phones', path: '/products?condition=refurbished' },
  { name: 'Compare phones', path: '/compare' },
];

const customerLinks = [
  { name: 'My account', path: '/account/dashboard' },
  { name: 'My orders', path: '/account/orders' },
  { name: 'Wishlist', path: '/account/wishlist' },
  { name: 'Shopping cart', path: '/cart' },
  { name: 'Returns policy', path: '/returns' },
];

const supportLinks = [
  { name: 'Contact support', path: '/support#contact' },
  { name: 'Help and FAQs', path: '/support' },
  { name: 'Services', path: '/services#services' },
  { name: 'About Wahab Mobiles', path: '/about#about-us' },
  { name: 'Terms of service', path: '/terms' },
  { name: 'Privacy policy', path: '/privacy' },
];

const Footer = () => (
  <footer className="bg-[#061f43] text-white">
    <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-11 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.45fr_.8fr_.8fr_1fr] lg:px-8 lg:py-14">
      <div>
        <Link to="/" className="inline-flex items-center gap-3">
          <img src="/assets/wahab-logo.jpg" alt="Wahab Mobiles logo" className="h-12 w-12 rounded-xl border border-white/15 object-cover" />
          <div>
            <p className="text-xl font-extrabold tracking-tight">Wahab Mobiles</p>
            <p className="mt-0.5 text-xs font-semibold text-blue-200">Cell phones in Hyderabad</p>
          </div>
        </Link>
        <p className="mt-5 max-w-sm text-sm leading-6 text-blue-100">
          Shop new, used and refurbished phones online from a physical mobile store in Saddar Cantt Hyderabad.
        </p>
        <div className="mt-6 space-y-3 text-sm text-blue-100">
          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              {CONTACT_PHONE_NUMBERS.map((phone) => (
                <a key={phone.href} href={phone.href} className="hover:text-white">{phone.label}</a>
              ))}
            </div>
          </div>
          <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-3 hover:text-white">
            <Mail className="h-4 w-4 shrink-0 text-blue-300" aria-hidden="true" />
            {CONTACT_EMAIL}
          </a>
          <a href={SHOP_MAPS_URL} target="_blank" rel="noreferrer" className="flex max-w-sm items-start gap-3 hover:text-white">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" aria-hidden="true" />
            {SHOP_ADDRESS}
          </a>
        </div>
        <a href={SHOP_WHATSAPP_URL} className="mt-6 inline-flex min-h-10 items-center justify-center rounded-lg bg-white px-4 text-sm font-bold text-[#0b3f82] hover:bg-blue-50">
          Message on WhatsApp
        </a>
      </div>

      <FooterColumn title="Shop" links={shopLinks} />
      <FooterColumn title="Customer" links={customerLinks} />
      <FooterColumn title="Support" links={supportLinks} />
    </div>

    <div className="border-t border-white/10">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-5 text-xs text-blue-200 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <p>© {new Date().getFullYear()} Wahab Mobiles. All rights reserved.</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link to="/terms" className="hover:text-white">Terms</Link>
          <Link to="/privacy" className="hover:text-white">Privacy</Link>
          <Link to="/data-deletion" className="hover:text-white">Data deletion</Link>
        </div>
      </div>
    </div>
  </footer>
);

const FooterColumn = ({ title, links }: { title: string; links: Array<{ name: string; path: string }> }) => (
  <div>
    <h2 className="text-sm font-extrabold text-white">{title}</h2>
    <ul className="mt-4 space-y-2.5">
      {links.map((link) => (
        <li key={link.path}>
          <Link to={link.path} className="text-sm text-blue-100 transition hover:text-white">{link.name}</Link>
        </li>
      ))}
    </ul>
  </div>
);

export default Footer;
