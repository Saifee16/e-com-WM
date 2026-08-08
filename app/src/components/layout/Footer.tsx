import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Shield,
  Truck,
  RotateCcw,
} from 'lucide-react';
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_NUMBERS,
  SHOP_ADDRESS,
  SHOP_LOCATION_LABEL,
  SHOP_MAPS_URL,
} from '../../config/contact';

const Footer = () => {
  const footerLinks = {
    shop: [
      { name: 'All Products', path: '/products' },
      { name: 'New Arrivals', path: '/products?sort=newest' },
      { name: 'Best Sellers', path: '/products?featured=true' },
      { name: 'Deals', path: '/products' },
    ],
    brands: [
      { name: 'Apple', path: '/products?brand=Apple' },
      { name: 'Samsung', path: '/products?brand=Samsung' },
      { name: 'Google', path: '/products?brand=Google' },
      { name: 'OnePlus', path: '/products?brand=OnePlus' },
    ],
    support: [
      { name: 'Contact Us', path: '/support#contact' },
      { name: 'Support Tickets', path: '/account/support' },
      { name: 'Help & FAQs', path: '/help' },
      { name: 'Shipping Info', path: '/services#shipping' },
      { name: 'Returns & Refunds', path: '/returns' },
    ],
    company: [
      { name: 'About Us', path: '/about#about-us' },
      { name: 'Our Services', path: '/services#services' },
      { name: 'Careers', path: '/about#careers' },
      { name: 'Terms of Service', path: '/terms' },
      { name: 'Privacy Policy', path: '/privacy' },
      { name: 'Data Deletion', path: '/data-deletion' },
    ],
  };

  const features = [
    { icon: Shield, title: 'PTA Approved', description: 'All devices are PTA approved' },
    { icon: Truck, title: 'Free Shipping', description: 'On orders over Rs. 100,000' },
    { icon: RotateCcw, title: 'Easy Returns', description: '7-day return policy' },
    { icon: CreditCard, title: 'Cash on Delivery', description: 'Pay when it arrives' },
  ];

  return (
    <footer className="bg-gray-900 text-white">
      {/* Features Bar */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{feature.title}</h4>
                  <p className="text-gray-400 text-xs mt-0.5">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link to="/" className="text-2xl font-bold">
              Wahab<span className="text-blue-400">Mobiles</span>
            </Link>
            <p className="text-gray-400 text-sm mt-4 max-w-xs">
              Your trusted destination for premium PTA-approved smartphones in Pakistan. 
              Quality guaranteed, prices unmatched.
            </p>
            
            {/* Contact Info */}
            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-3 text-sm text-gray-400">
                <Phone className="w-4 h-4 text-blue-400" />
                <div className="flex flex-col gap-1">
                  {CONTACT_PHONE_NUMBERS.map((phone) => (
                    <a key={phone.href} href={phone.href} className="hover:text-white transition-colors">
                      {phone.label}
                    </a>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <Mail className="w-4 h-4 text-blue-400" />
                <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white transition-colors">
                  {CONTACT_EMAIL}
                </a>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-400">
                <MapPin className="mt-0.5 w-4 h-4 shrink-0 text-blue-400" />
                <div>
                  <p>{SHOP_ADDRESS}</p>
                  <a
                    href={SHOP_MAPS_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {SHOP_LOCATION_LABEL}
                  </a>
                </div>
              </div>
            </div>

          </div>

          {/* Links Columns */}
          <div>
            <h4 className="font-semibold mb-4">Shop</h4>
            <ul className="space-y-2">
              {footerLinks.shop.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="text-gray-400 text-sm hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Brands</h4>
            <ul className="space-y-2">
              {footerLinks.brands.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="text-gray-400 text-sm hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="text-gray-400 text-sm hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="text-gray-400 text-sm hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm text-center md:text-left">
              © 2026 Wahab Mobiles. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-gray-500 text-sm">We accept:</span>
              <div className="flex gap-2">
                {['Cash on Delivery'].map((method) => (
                  <span
                    key={method}
                    className="px-3 py-1 bg-gray-800 rounded text-xs text-gray-400"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
