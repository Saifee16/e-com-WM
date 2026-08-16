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
  SHOP_MAPS_URL,
} from '../config/contact';

const businessFacts = [
  { value: 'March 2009', label: 'Established' },
  { value: '20,000+', label: 'Customers served' },
  { value: '95%', label: 'Customer satisfaction' },
];

const catalogueFeatures = [
  {
    icon: Smartphone,
    title: 'Condition-aware browsing',
    description: 'Filter the live catalogue for new, used and refurbished phones.',
  },
  {
    icon: ShieldCheck,
    title: 'Product-specific PTA status',
    description: 'Each published listing shows its own PTA status.',
  },
  {
    icon: Boxes,
    title: 'Current catalogue details',
    description: 'See real price, storage, color and stock information when provided.',
  },
  {
    icon: HeartHandshake,
    title: 'Customer tools',
    description: 'Use accounts, orders, wishlists, comparisons and support requests.',
  },
];

const About = () => (
  <div className="min-h-[100dvh] bg-[#f5f8fc] text-slate-950">
    <section id="about-us" className="scroll-mt-36 border-b border-slate-200 bg-white">
      <div className="mx-auto grid max-w-[1400px] items-center gap-8 px-4 py-11 sm:px-6 lg:grid-cols-[1fr_.8fr] lg:px-8 lg:py-16">
        <div className="max-w-2xl">
          <p className="text-sm font-bold text-blue-700">About Wahab Mobiles</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-[1.08] tracking-[-0.035em] sm:text-5xl">
            A Hyderabad mobile shop built on real customer relationships.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            Wahab Mobiles combines a physical Saddar Cantt store with an online catalogue for new, used and refurbished phones.
          </p>
          <div className="mt-7 flex flex-col gap-3 min-[430px]:flex-row">
            <Link to="/products" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-bold text-white hover:bg-blue-800">
              Shop phones
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a href={SHOP_MAPS_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              Open map
            </a>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-blue-800 bg-[#082f63] text-white shadow-[0_22px_60px_rgba(15,46,82,0.2)]">
          {businessFacts.map((fact, index) => (
            <div key={fact.label} className={`flex items-baseline justify-between gap-4 px-6 py-5 ${index > 0 ? 'border-t border-white/15' : ''}`}>
              <span className="text-2xl font-extrabold tracking-tight sm:text-3xl">{fact.value}</span>
              <span className="text-sm font-semibold text-blue-100">{fact.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="py-11 sm:py-14">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">Visit the Saddar Cantt store</h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Browse catalogue details online, then call or visit the shop to confirm the right device.
          </p>
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-2 lg:gap-8">
          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-[0_18px_50px_rgba(15,46,82,0.1)]">
            <img src="/assets/wahab-shop.jpg" alt="Wahab Mobiles shop interior in Hyderabad" className="aspect-[16/10] w-full rounded-lg object-cover" />
          </figure>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-[0_18px_50px_rgba(15,46,82,0.1)]">
            <iframe
              title="Wahab Mobiles location in Hyderabad"
              src={`https://www.google.com/maps?q=${encodeURIComponent(SHOP_ADDRESS)}&output=embed`}
              className="aspect-[16/10] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-6 text-sm text-slate-700 sm:flex-row sm:items-start sm:justify-between">
          <a href={SHOP_MAPS_URL} target="_blank" rel="noreferrer" className="flex items-start gap-3 hover:text-blue-700">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" aria-hidden="true" />
            <span><strong className="block text-slate-950">Shop address</strong>{SHOP_ADDRESS}</span>
          </a>
          <div className="flex flex-wrap gap-3">
            {CONTACT_PHONE_NUMBERS.map((phone, index) => (
              <a
                key={phone.href}
                href={phone.href}
                className={index === 0
                  ? 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 font-bold text-white hover:bg-blue-800'
                  : 'inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-4 font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700'}
              >
                {index === 0 && <Phone className="h-4 w-4" aria-hidden="true" />}
                {index === 0 ? `Call the shop (${phone.label})` : phone.label}
              </a>
            ))}
            <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">
              <Mail className="h-4 w-4" aria-hidden="true" />
              Email support
            </a>
            <a href={SHOP_MAPS_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              Open in Google Maps
            </a>
          </div>
        </div>
      </div>
    </section>

    <section className="border-y border-slate-200 bg-white py-11 sm:py-14">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">What you can check online</h2>
          <p className="mt-3 text-base leading-7 text-slate-600">The storefront is built around live catalogue data and practical shopping tools.</p>
        </div>
        <div className="mt-8 grid border-y border-slate-200 sm:grid-cols-2">
          {catalogueFeatures.map((feature, index) => (
            <div key={feature.title} className={`flex gap-4 py-6 sm:p-6 ${index % 2 === 1 ? 'sm:border-l sm:border-slate-200' : ''} ${index > 1 ? 'border-t border-slate-200' : index === 1 ? 'border-t border-slate-200 sm:border-t-0' : ''}`}>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <feature.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-950">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section id="careers" className="scroll-mt-36 py-11 sm:py-14">
      <div className="mx-auto grid max-w-[1400px] gap-5 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-extrabold text-slate-950">Careers and store updates</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">No openings are advertised on this site right now. Use the verified store contact channels for current information.</p>
          <Link to="/support#contact" className="mt-5 inline-flex text-sm font-bold text-blue-700 hover:text-blue-800">Contact the store</Link>
        </div>
        <div id="privacy-policy" className="scroll-mt-36 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-extrabold text-slate-950">Privacy and customer support</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">Customer information supports account access, orders, delivery coordination and support.</p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm font-bold">
            <Link to="/privacy" className="text-blue-700 hover:text-blue-800">Privacy policy</Link>
            <Link to="/support#contact" className="text-blue-700 hover:text-blue-800">Contact support</Link>
          </div>
        </div>
      </div>
    </section>

    <section id="contact" className="scroll-mt-36 bg-[#082f63] py-10 text-white">
      <div className="mx-auto flex max-w-[1400px] flex-col justify-between gap-5 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
        <div>
          <h2 className="text-2xl font-extrabold">Confirm a phone before you visit</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">Ask about current stock, condition, storage, color, price and PTA status.</p>
        </div>
        <a href={CONTACT_PHONE_NUMBERS[0].href} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-[#0b3f82] hover:bg-blue-50">
          <Phone className="h-4 w-4" aria-hidden="true" />
          Call the shop
        </a>
      </div>
    </section>
  </div>
);

export default About;
