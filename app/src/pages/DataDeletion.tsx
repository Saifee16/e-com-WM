import { Link } from 'react-router-dom';
import { ShieldCheck, Trash2 } from 'lucide-react';

const DataDeletion = () => (
  <main className="min-h-[70vh] bg-slate-50 px-4 py-16 sm:px-6">
    <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
        <Trash2 className="h-6 w-6" aria-hidden="true" />
      </div>
      <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-blue-700">Account privacy</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">Data deletion request</h1>
      <p className="mt-4 text-slate-600">
        You can ask Wahab Mobiles to delete your customer account and associated personal data. Order and
        transaction records may be retained only where required for legal, tax, fraud-prevention, or warranty
        obligations.
      </p>

      <section className="mt-8 rounded-xl bg-slate-50 p-5">
        <h2 className="text-lg font-semibold text-slate-950">How to request deletion</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-slate-700">
          <li>Sign in with the account you want deleted.</li>
          <li>Open Support Tickets from your account dashboard.</li>
          <li>Create a ticket with the subject “Delete my account” and confirm the email address on the account.</li>
          <li>Support will verify the request and confirm when deletion is complete.</li>
        </ol>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link to="/account/support" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            Open support tickets
          </Link>
          <Link to="/privacy" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            Read our privacy policy
          </Link>
        </div>
      </section>

      <div className="mt-8 flex gap-3 text-sm text-slate-600">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
        <p>Do not include passwords, payment details, or identity documents in the initial ticket.</p>
      </div>
    </article>
  </main>
);

export default DataDeletion;
