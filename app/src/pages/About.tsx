import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Boxes,
  HeartHandshake,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_NUMBERS,
  SHOP_ADDRESS,
  SHOP_LOCATION_LABEL,
  SHOP_MAPS_URL,
} from '../config/contact';

const About = () => {
  const catalogueFeatures = [
    {
      icon: Smartphone,
      title: 'Condition-aware browsing',
      description: 'Filter the live catalogue for new, used and refurbished phones.',
    },
    {
      icon: ShieldCheck,
      title: 'Product-specific PTA status',
      description: 'Each listing shows its own PTA status when a product is published.',
    },
    {
      icon: Boxes,
      title: 'Current catalogue details',
      description: 'Published products carry their actual price, storage, color and stock information.',
    },
    {
      icon: HeartHandshake,
      title: 'Customer tools',
      description: 'Accounts support orders, wishlist items, comparisons and support requests.',
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#f7fbff] text-slate-950">
      <section id="about-us" className="scroll-mt-24 border-b border-sky-100 bg-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:py-16">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 text-sm font-semibold text-sky-700">
              <img
                src="/assets/wahab-logo.jpg"
                alt="Wahab Mobiles logo"
                className="h-14 w-14 rounded-full border border-sky-100 object-cover"
              />
              <span>Hyderabad | Trusted Cell Phones Outlet</span>
            </div>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight sm:text-5xl">About Wahab Mobiles</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
              A physical mobile shop in Hyderabad with an online catalogue for new, used and refurbished phones.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/products"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 active:translate-y-px"
              >
                Browse products
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href={SHOP_MAPS_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-sky-300 hover:text-blue-700 active:translate-y-px"
              >
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Open map
              </a>
            </div>
          </motion.div>

          <figure className="overflow-hidden rounded-xl border border-sky-100 bg-white p-2 shadow-xl shadow-sky-950/10">
            <img
              src="/assets/wahab-shop.jpg"
              alt="Wahab Mobiles shop interior in Hyderabad"
              className="aspect-[16/11] w-full rounded-lg object-cover"
            />
          </figure>
        </div>
      </section>

      <section className="bg-slate-950 py-8 text-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" aria-hidden="true" />
            <div>
              <p className="font-semibold">Physical shop</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">{SHOP_ADDRESS}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" aria-hidden="true" />
            <div>
              <p className="font-semibold">Direct phone contact</p>
              <div className="mt-1 flex flex-col gap-1 text-sm text-slate-300">
                {CONTACT_PHONE_NUMBERS.map((phone) => (
                  <a key={phone.href} href={phone.href} className="hover:text-white">
                    {phone.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" aria-hidden="true" />
            <div>
              <p className="font-semibold">Email</p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="mt-1 block text-sm text-slate-300 hover:text-white">
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f7fbff] py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold text-slate-950">What you can verify online</h2>
            <p className="mt-3 text-slate-600">
              The storefront is built around catalogue data and direct contact, without invented inventory or reviews.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {catalogueFeatures.map((feature) => (
              <div key={feature.title} className="rounded-lg border border-slate-200 bg-white p-5">
                <feature.icon className="h-6 w-6 text-blue-700" aria-hidden="true" />
                <h3 className="mt-5 font-semibold text-slate-950">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="careers" className="scroll-mt-24 bg-white py-14 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-950">Careers and shop updates</h2>
            <p className="mt-3 leading-7 text-slate-600">
              No openings are advertised on this site right now. Use the verified store contact channels for current information.
            </p>
          </div>
          <div id="privacy-policy" className="scroll-mt-24 border-l-0 border-slate-200 lg:border-l lg:pl-10">
            <h2 className="text-3xl font-bold text-slate-950">Privacy and support</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Customer information supports account access, orders, delivery coordination and support. Read the full policy or contact the store with a question.
            </p>
            <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold">
              <Link to="/privacy" className="text-blue-700 hover:text-blue-800">Privacy policy</Link>
              <Link to="/support#contact" className="text-blue-700 hover:text-blue-800">Contact support</Link>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="scroll-mt-24 bg-blue-700 py-14 text-white sm:py-16">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div>
            <p className="text-sm font-semibold text-cyan-200">{SHOP_LOCATION_LABEL}</p>
            <h2 className="mt-2 text-3xl font-bold">Confirm a phone before you visit</h2>
            <p className="mt-3 max-w-2xl text-blue-100">
              Ask about current stock, condition, storage, color, price and PTA status for the model you need.
            </p>
          </div>
          <a
            href={CONTACT_PHONE_NUMBERS[0].href}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-blue-800 transition hover:bg-sky-50 active:translate-y-px"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            Call the shop
          </a>
        </div>
      </section>
    </div>
  );
};

export default About;
