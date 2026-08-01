import { Link } from 'react-router-dom';
import { ClipboardList, MessageCircleQuestion, RotateCcw } from 'lucide-react';

const ReturnsPolicy = () => (
  <div className="bg-slate-50 py-12 sm:py-16">
    <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <header className="rounded-3xl bg-blue-700 px-6 py-10 text-white sm:px-10">
        <RotateCcw className="mb-4 h-9 w-9 text-blue-100" />
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-100">Returns &amp; refunds</p>
        <h1 className="mt-2 text-4xl font-bold">Returns &amp; Refund Policy</h1>
        <p className="mt-4 max-w-2xl text-blue-100">Start a return from the actual order workflow so the request, decision, and refund status stay together.</p>
      </header>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Link to="/account/orders" className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm transition hover:border-blue-400 hover:shadow-md">
          <ClipboardList className="h-7 w-7 text-blue-700" />
          <h2 className="mt-4 text-lg font-bold text-slate-950">Signed-in customer</h2>
          <p className="mt-2 text-sm text-slate-600">Open the delivered order, then choose “Request a return.”</p>
        </Link>
        <Link to="/support#guest-return" className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm transition hover:border-blue-400 hover:shadow-md">
          <MessageCircleQuestion className="h-7 w-7 text-blue-700" />
          <h2 className="mt-4 text-lg font-bold text-slate-950">Guest checkout</h2>
          <p className="mt-2 text-sm text-slate-600">Use your order number and checkout email to submit a guest return request.</p>
        </Link>
      </div>

      <div className="mt-8 space-y-7 rounded-3xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm sm:p-10">
        <section><h2 className="text-xl font-bold text-slate-950">Eligibility</h2><p className="mt-3">Eligible delivered orders can be submitted through the return workflow within seven days of delivery. The request is reviewed before approval; submitting one does not by itself confirm a refund.</p></section>
        <section><h2 className="text-xl font-bold text-slate-950">Review and refund</h2><p className="mt-3">Provide a clear reason and any useful details. If approved, the support team records the resolution and confirms the manual refund only after it has actually been completed.</p></section>
        <section><h2 className="text-xl font-bold text-slate-950">Need help or want to make a complaint?</h2><p className="mt-3">Use the unified <Link className="font-medium text-blue-700 underline" to="/account/support">Support Tickets</Link> queue. Complaints are not sent to a separate page, so your updates remain in one trackable conversation.</p></section>
      </div>
    </article>
  </div>
);

export default ReturnsPolicy;
