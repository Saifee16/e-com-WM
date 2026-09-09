import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

const PrivacyPolicy = () => (
  <div className="bg-slate-50 py-12 sm:py-16">
    <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <header className="rounded-3xl bg-blue-950 px-6 py-10 text-white sm:px-10">
        <ShieldCheck className="mb-4 h-9 w-9 text-blue-300" />
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">Privacy and data</p>
        <h1 className="mt-2 text-4xl font-bold">Privacy Policy</h1>
        <p className="mt-4 max-w-2xl text-blue-100">How Wahab Mobiles handles information used for shopping, accounts, orders, deliveries, returns, and support.</p>
      </header>

      <div className="mt-8 space-y-8 rounded-3xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm sm:p-10">
        <section><h2 className="text-xl font-bold text-slate-950">Information we collect</h2><p className="mt-3">When you create an account, place an order, save a delivery address, request a return, or contact support, we collect the information you provide. This can include your name, email address, phone number, account details, delivery address, order information, and support messages.</p></section>
        <section><h2 className="text-xl font-bold text-slate-950">How we use information</h2><p className="mt-3">We use this information to provide and manage customer accounts, process and fulfil orders, arrange delivery, handle return requests, respond to support enquiries, communicate about orders and services, and protect the storefront from misuse.</p></section>
        <section><h2 className="text-xl font-bold text-slate-950">Sharing and retention</h2><p className="mt-3">Information may be shared with service providers when needed to operate the storefront, communicate with customers, fulfil orders, or meet legal obligations. We retain information for legitimate business, transaction, support, security, dispute-handling, and legal purposes.</p></section>
        <section><h2 className="text-xl font-bold text-slate-950">Your choices</h2><p className="mt-3">You can update available profile information through your account settings. For help with account information, orders, or deletion requests, open a <Link className="font-medium text-blue-700 underline" to="/account/support">Support Ticket</Link> or use the public support options below.</p></section>
        <section><h2 className="text-xl font-bold text-slate-950">Contact</h2><p className="mt-3">Questions about this policy or your information can be sent through <Link className="font-medium text-blue-700 underline" to="/support#contact">Support</Link>.</p></section>
      </div>
    </article>
  </div>
);

export default PrivacyPolicy;
