import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  Wrench,
} from 'lucide-react';
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_NUMBERS,
  SHOP_ADDRESS,
  SHOP_MAPS_URL,
  SHOP_WHATSAPP_URL,
} from '../config/contact';
import { NATIONWIDE_SHIPPING_COPY } from '../config/order-policy';
import Seo, {
  buildBreadcrumbJsonLd,
  buildLocalBusinessJsonLd,
  buildStaticMetadata,
} from '../seo/seo';

const metadata = buildStaticMetadata(
  'Wahab Mobiles Hyderabad | Mobile Phones & Accessories',
  'Visit Wahab Mobiles in Saddar Cantt Hyderabad for new and used phones, tablets, accessories, local pickup and same-day Hyderabad delivery.',
  '/hyderabad',
);

const brands = [
  { name: 'Apple / iPhone', path: '/phones/iphone' },
  { name: 'Samsung', path: '/phones/samsung' },
  { name: 'Xiaomi / Redmi', path: '/phones/xiaomi' },
  { name: 'Google Pixel', path: '/phones/google-pixel' },
  { name: 'realme', path: '/phones/realme' },
  { name: 'OPPO' },
  { name: 'vivo' },
  { name: 'Infinix' },
  { name: 'TECNO', path: '/phones/tecno' },
  { name: 'itel' },
  { name: 'Nokia / HMD' },
  { name: 'HONOR', path: '/phones/honor' },
] as const;

const payments = ['Cash', 'Card', 'Bank transfer', 'Raast', 'Easypaisa'];

const Hyderabad = () => (
  <div className="min-h-[100dvh] bg-[#f5f8fc] text-slate-950">
    <Seo
      metadata={metadata}
      structuredData={[
        buildLocalBusinessJsonLd(),
        buildBreadcrumbJsonLd([
          { name: 'Home', url: 'https://wahabmobiles.com/' },
          { name: 'Wahab Mobiles Hyderabad', url: metadata.canonical },
        ]),
      ]}
    />

    <section className="bg-[#082f63] text-white">
      <div className="mx-auto grid max-w-[1400px] items-center gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_.95fr] lg:px-8">
        <div>
          <p className="text-sm font-bold text-blue-200">Serving Hyderabad since 2009</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            Wahab Mobiles in Hyderabad
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-blue-100 sm:text-lg">
            A family-run mobile-phone shop in Saddar Cantt for new and used phones, tablets,
            smart watches, accessories and repairs. More than 20,000 customers served.
          </p>
          <div className="mt-7 grid gap-3 min-[430px]:grid-cols-2 sm:flex sm:flex-wrap">
            <Link to="/phones" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-[#0b3f82] hover:bg-blue-50">
              Browse phones <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a href={SHOP_WHATSAPP_URL} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 text-sm font-bold text-white hover:bg-emerald-600">
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp us
            </a>
            <a href={SHOP_MAPS_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/30 px-5 text-sm font-bold hover:bg-white/10">
              <MapPin className="h-4 w-4" aria-hidden="true" /> Get directions
            </a>
            <a href={CONTACT_PHONE_NUMBERS[0].href} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/30 px-5 text-sm font-bold hover:bg-white/10">
              <Phone className="h-4 w-4" aria-hidden="true" /> Call store
            </a>
          </div>
        </div>
        <figure className="overflow-hidden rounded-xl border border-white/15 bg-white/5 p-2 shadow-2xl">
          <img
            src="/assets/wahab-shop.jpg"
            width="1200"
            height="825"
            alt="Interior of the Wahab Mobiles shop in Hyderabad"
            className="aspect-[16/11] w-full rounded-lg object-cover"
          />
        </figure>
      </div>
    </section>

    <section className="border-b border-slate-200 bg-white py-11 sm:py-14">
      <div className="mx-auto grid max-w-[1400px] gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <div className="flex items-center gap-3 text-blue-700">
            <Store className="h-6 w-6" aria-hidden="true" />
            <h2 className="text-2xl font-extrabold text-slate-950">Visit the store</h2>
          </div>
          <address className="mt-5 max-w-xl not-italic leading-7 text-slate-600">{SHOP_ADDRESS}</address>
          <p className="mt-3 text-sm font-semibold text-slate-700">Landmark: opposite Soghat-e-Sheerin.</p>
          <a href={SHOP_MAPS_URL} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-bold text-white hover:bg-blue-800">
            <MapPin className="h-4 w-4" aria-hidden="true" /> Open in Google Maps
          </a>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-blue-700" aria-hidden="true" />
            <h2 className="text-2xl font-extrabold">Opening hours</h2>
          </div>
          <dl className="mt-5 grid grid-cols-[1fr_auto] gap-x-6 gap-y-3 text-sm">
            <dt className="text-slate-600">Monday–Thursday</dt><dd className="font-bold">2:00 PM–12:00 AM</dd>
            <dt className="text-slate-600">Friday</dt><dd className="font-bold text-red-700">Closed</dd>
            <dt className="text-slate-600">Saturday–Sunday</dt><dd className="font-bold">2:00 PM–12:00 AM</dd>
            <dt className="text-slate-600">Public holidays</dt><dd className="font-bold">Hours vary</dd>
          </dl>
        </div>
      </div>
    </section>

    <section className="py-11 sm:py-14">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <ShoppingBag className="h-7 w-7 text-blue-700" aria-hidden="true" />
          <h2 className="mt-3 text-3xl font-extrabold">Phones, devices and major brands</h2>
          <p className="mt-3 leading-7 text-slate-600">
            The physical shop carries new and used phones and tablets, smart watches and everyday
            mobile accessories. Availability varies, so confirm a specific model before visiting.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
            <Link to="/phones" className="text-blue-700 hover:text-blue-800">All phones</Link>
            <Link to="/phones/iphone" className="text-blue-700 hover:text-blue-800">iPhone</Link>
            <Link to="/phones/android" className="text-blue-700 hover:text-blue-800">Android phones</Link>
          </div>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {brands.map((brand) => ("path" in brand) ? (
            <Link key={brand.name} to={brand.path} className="rounded-lg border border-slate-200 bg-white px-4 py-4 font-bold hover:border-blue-300 hover:text-blue-700">
              {brand.name}
            </Link>
          ) : (
            <div key={brand.name} className="rounded-lg border border-slate-200 bg-white px-4 py-4 font-bold">
              {brand.name}
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="border-y border-slate-200 bg-white py-11 sm:py-14">
      <div className="mx-auto grid max-w-[1400px] gap-5 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8">
        <article className="rounded-xl border border-slate-200 p-6">
          <ShieldCheck className="h-6 w-6 text-blue-700" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-extrabold">PTA status</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            PTA-approved phones and devices are available for customers across Pakistan, with PTA
            status shown on individual products.
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 p-6">
          <Truck className="h-6 w-6 text-blue-700" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-extrabold">Pickup and delivery</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Store pickup is available from 5 PM onward. Same-day delivery is available in Hyderabad
            where applicable.
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {NATIONWIDE_SHIPPING_COPY}
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 p-6">
          <CreditCard className="h-6 w-6 text-blue-700" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-extrabold">In-store payments</h2>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
            {payments.map((payment) => <li key={payment} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />{payment}</li>)}
          </ul>
          <p className="mt-4 text-xs leading-5 text-slate-500">These are physical-store methods, not a list of online checkout integrations.</p>
        </article>
      </div>
    </section>

    <section className="py-11 sm:py-14">
      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <article className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-extrabold">Warranty and returns</h2>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Warranty varies by product and brand. New devices may include official manufacturer or
            distributor warranty. Selected used phones may include a 2–3 day checking warranty.
            Confirm exact terms for each product before purchase.
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Return or exchange eligibility is generally limited to unopened, unactivated box-pack
            products within 2–3 working days. Defective-product claims may require video proof.
            Refund and exchange eligibility depends on the product and condition.
          </p>
          <Link to="/returns" className="mt-5 inline-flex font-bold text-blue-700 hover:text-blue-800">Read the returns policy</Link>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-6">
          <Wrench className="h-6 w-6 text-blue-700" aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-extrabold">Repairs and accessories</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Ask about mobile hardware and software repairs, screen protectors, chargers, cases,
            headphones, earbuds, handsfree products, power banks and other mobile accessories.
          </p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="mt-5 inline-flex font-bold text-blue-700 hover:text-blue-800">Email the store</a>
        </article>
      </div>
    </section>
  </div>
);

export default Hyderabad;
