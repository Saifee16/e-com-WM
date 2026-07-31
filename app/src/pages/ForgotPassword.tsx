import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { authAPI } from '../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await authAPI.requestPasswordReset(email);
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600"><Mail /></div>
        <h1 className="text-2xl font-bold text-gray-900">Reset your password</h1>
        <p className="mt-2 text-gray-500">Enter your customer account email. We’ll send a time-limited reset link if it exists.</p>
        {sent ? (
          <div className="mt-6 rounded-xl bg-green-50 p-4 text-sm text-green-800">Check your email for reset instructions. In local development, the link appears in the backend log.</div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-gray-700">Email
              <input aria-label="Email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-blue-500" />
            </label>
            <button disabled={loading} className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white disabled:opacity-50">{loading ? 'Sending…' : 'Send reset link'}</button>
          </form>
        )}
        <Link to="/login" className="mt-6 inline-block text-sm font-medium text-blue-600">Back to login</Link>
      </section>
    </main>
  );
};

export default ForgotPassword;
