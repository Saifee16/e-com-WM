import { Link } from 'react-router-dom';
import { AlertTriangle, FileText } from 'lucide-react';

const TermsOfService = () => (
  <div className="bg-slate-50 py-12 sm:py-16">
    <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <header className="rounded-3xl bg-slate-900 px-6 py-10 text-white sm:px-10">
        <FileText className="mb-4 h-9 w-9 text-blue-300" />
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">Legal draft</p>
        <h1 className="mt-2 text-4xl font-bold">Terms of Service</h1>
        <p className="mt-4 max-w-2xl text-slate-300">Please read the terms that govern use of this store and its support services.</p>
      </header>

      <div role="note" className="mt-8 flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <p><strong>Placeholder copy — legal review required.</strong> This page is a product draft, not final legal advice or enforceable terms. Obtain review and approval from qualified counsel before publishing it as final.</p>
      </div>

      <div className="mt-8 space-y-8 rounded-3xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm sm:p-10">
        <section><h2 className="text-xl font-bold text-slate-950">1. Store use</h2><p className="mt-3">You may use this store to browse products, place legitimate orders, manage your account, and contact support. You must provide accurate information and must not misuse the site, interfere with its operation, or attempt unauthorized access.</p></section>
        <section><h2 className="text-xl font-bold text-slate-950">2. Orders and availability</h2><p className="mt-3">Product listings, prices, availability, and order acceptance remain subject to confirmation. We may correct obvious errors, decline an order where permitted by law, and contact you when an order cannot be fulfilled.</p></section>
        <section><h2 className="text-xl font-bold text-slate-950">3. Delivery, returns, and refunds</h2><p className="mt-3">Delivery and eligibility depend on the order and applicable policy. For the current return-request process, see the <Link className="font-medium text-blue-700 underline" to="/returns">Returns &amp; Refund Policy</Link>. Refund outcomes are handled through the recorded return request and support process.</p></section>
        <section><h2 className="text-xl font-bold text-slate-950">4. Accounts and support</h2><p className="mt-3">Keep your account credentials confidential. Questions, complaints, and service issues are handled through the unified <Link className="font-medium text-blue-700 underline" to="/account/support">Support Tickets</Link> system; there is no separate complaint process.</p></section>
        <section><h2 className="text-xl font-bold text-slate-950">5. Changes and contact</h2><p className="mt-3">These draft terms may change before final legal approval. For assistance, use <Link className="font-medium text-blue-700 underline" to="/support#contact">Support</Link>.</p></section>
      </div>
    </article>
  </div>
);

export default TermsOfService;
