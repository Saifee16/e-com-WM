import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Check,
  CreditCard,
  Headphones,
  ListFilter,
  PackageCheck,
  Phone,
  RotateCcw,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { CONTACT_EMAIL, CONTACT_PHONE_NUMBERS } from '../config/contact';

const Services = () => {
  const services = [
    {
      icon: ListFilter,
      title: 'Catalogue details',
      description: 'Published listings use current admin data instead of sample inventory.',
      features: ['Live price', 'Condition filter', 'Storage and color', 'Current stock'],
    },
    {
      icon: ShieldCheck,
      title: 'PTA status by product',
      description: 'PTA approval is shown per listing and is not assumed for every device.',
      features: ['Visible status', 'Product-specific data', 'Admin managed', 'Confirm before purchase'],
    },
    {
      icon: Truck,
      title: 'Checkout options',
      description: 'Choose standard shipping, express shipping or store pickup during checkout.',
      features: ['Standard: Rs. 500', 'Express: Rs. 1,500', 'Store pickup: free', 'Order total shown'],
    },
    {
      icon: RotateCcw,
      title: 'Return requests',
      description: 'Eligible delivered orders can submit a return request within seven days.',
      features: ['Account workflow', 'Guest workflow', 'Admin review', 'Recorded resolution'],
    },
    {
      icon: Headphones,
      title: 'Customer support',
      description: 'Contact the shop directly or use the site support and contact workflows.',
      features: ['Phone contact', 'Email contact', 'Support tickets', 'Contact form'],
    },
    {
      icon: CreditCard,
      title: 'Cash on Delivery',
      description: 'Checkout currently uses Cash on Delivery and does not collect card details.',
      features: ['No card entry', 'No stored payment card', 'Pay on delivery', 'Manual refund records'],
    },
  ];

  const shippingInfo = [
    {
      method: 'Standard Shipping',
      cost: 'Rs. 500',
      detail: 'Free when the standard-shipping subtotal is Rs. 100,000 or more.',
    },
    {
      method: 'Express Shipping',
      cost: 'Rs. 1,500',
      detail: 'The selected charge is included in the checkout total.',
    },
    {
      method: 'Store Pickup',
      cost: 'Free',
      detail: 'Contact the shop to coordinate collection after placing the order.',
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#f7fbff] text-slate-950">
      <section id="services" className="scroll-mt-24 border-b border-sky-100 bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <p className="text-sm font-semibold text-sky-700">Storefront services</p>
            <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">Shop with the details in view</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Browse product-specific information, choose a checkout option and keep support requests tied to your order.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.04 }}
                className="rounded-lg border border-slate-200 bg-white p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-50 text-blue-700">
                  <service.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h2 className="mt-5 text-xl font-bold">{service.title}</h2>
                <p className="mt-3 leading-7 text-slate-600">{service.description}</p>
                <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="shipping" className="scroll-mt-24 bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold">Shipping and pickup charges</h2>
            <p className="mt-3 leading-7 text-slate-600">
              These values match the current checkout calculation. Delivery timing is confirmed separately for each order.
            </p>
          </div>
          <div className="mt-8 overflow-hidden rounded-lg border border-slate-200">
            <div className="hidden grid-cols-[1fr_0.45fr_1.55fr] gap-5 bg-slate-950 px-6 py-4 text-sm font-semibold text-white md:grid">
              <span>Method</span>
              <span>Charge</span>
              <span>Details</span>
            </div>
            {shippingInfo.map((info) => (
              <div key={info.method} className="grid gap-2 border-t border-slate-200 px-6 py-5 first:border-t-0 md:grid-cols-[1fr_0.45fr_1.55fr] md:gap-5">
                <p className="font-semibold text-slate-950">{info.method}</p>
                <p className="text-sm font-medium text-blue-700">{info.cost}</p>
                <p className="text-sm leading-6 text-slate-600">{info.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="returns" className="scroll-mt-24 bg-slate-950 py-14 text-white sm:py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-cyan-300 text-slate-950">
            <RotateCcw className="h-8 w-8" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">How return requests work</h2>
            <p className="mt-4 max-w-3xl leading-7 text-slate-300">
              An eligible delivered order can submit a request within seven days of delivery. The request is reviewed before approval, and submission alone does not confirm a refund or exchange.
            </p>
            <Link to="/returns" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200">
              Read the return process
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <figure className="overflow-hidden rounded-xl border border-sky-100 bg-white p-2 shadow-xl shadow-sky-950/10">
            <img
              src="/assets/wahab-shop.jpg"
              alt="Shelves inside the Wahab Mobiles shop"
              loading="lazy"
              className="aspect-[16/11] w-full rounded-lg object-cover"
            />
          </figure>
          <div>
            <PackageCheck className="h-8 w-8 text-blue-700" aria-hidden="true" />
            <h2 className="mt-5 text-3xl font-bold">Confirm the exact phone</h2>
            <p className="mt-4 leading-7 text-slate-600">
              Before visiting or ordering, contact the shop to confirm current availability, condition, storage, color, price and PTA status.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href={CONTACT_PHONE_NUMBERS[0].href}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                Call the shop
              </a>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center justify-center rounded-lg border border-sky-200 px-5 py-3 text-sm font-semibold text-slate-800 hover:border-sky-300 hover:text-blue-700"
              >
                Email support
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Services;
