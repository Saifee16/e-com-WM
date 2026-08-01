import { Link } from 'react-router-dom';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

const PrivacyPolicy = () => (
  <div className="bg-slate-50 py-12 sm:py-16">
    <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <header className="rounded-3xl bg-blue-950 px-6 py-10 text-white sm:px-10">
        <ShieldCheck className="mb-4 h-9 w-9 text-blue-300" />
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">Legal draft</p>
        <h1 className="mt-2 text-4xl font-bold">Privacy Policy</h1>
        <p className="mt-4 max-w-2xl text-blue-100">A plain-language draft describing how store and support information may be handled.</p>
      </header>

      <div role="note" className="mt-8 flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <p><strong>Placeholder copy — legal review required.</strong> This is not the final privacy notice. It must be reviewed for the business, jurisdictions served, analytics, processors, retention, and applicable law before publication.</p>
      </div>

      <div className="mt-8 space-y-8 rounded-3xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm sm:p-10">
        <section><h2 className="text-xl font-bold text-slate-950">Information we collect</h2><p className="mt-3">This draft contemplates account details, contact details, order and delivery details, support messages, and technical information needed to operate the store and protect it from abuse.</p></section>
        <section><h2 className="text-xl font-bold text-slate-950">How information is used</h2><p className="mt-3">Information may be used to provide accounts, fulfil orders, process return requests, respond to Support Tickets, secure the service, and meet legal obligations. The final policy must identify the precise lawful bases and any optional uses.</p></section>
        <section><h2 className="text-xl font-bold text-slate-950">Sharing and retention</h2><p className="mt-3">The final notice should name the categories of service providers and define retention periods. This draft does not authorize undisclosed sharing or indefinite retention.</p></section>
        <section><h2 className="text-xl font-bold text-slate-950">Your choices</h2><p className="mt-3">Depending on applicable law, you may have rights to access, correct, delete, or object to certain processing. For account or order help, open a <Link className="font-medium text-blue-700 underline" to="/account/support">Support Ticket</Link>.</p></section>
        <section><h2 className="text-xl font-bold text-slate-950">Contact</h2><p className="mt-3">Privacy contact details, representative information, and regulator-contact information must be added during legal review. General help remains available through <Link className="font-medium text-blue-700 underline" to="/support#contact">Support</Link>.</p></section>
      </div>
    </article>
  </div>
);

export default PrivacyPolicy;
