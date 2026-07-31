import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { authAPI } from '../services/api';
import { getApiErrorMessage } from '../utils/api-error';

const ResetPassword = () => {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [changed, setChanged] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirm) return setError('Passwords do not match');
    setLoading(true);
    setError('');
    try {
      await authAPI.consumePasswordReset(token, password);
      setChanged(true);
    } catch (resetError) {
      setError(getApiErrorMessage(resetError, 'Unable to reset password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600"><KeyRound /></div>
        <h1 className="text-2xl font-bold text-gray-900">Choose a new password</h1>
        {!token ? <p className="mt-4 text-red-600">This reset link is missing its token.</p> : changed ? (
          <div className="mt-6"><p className="rounded-xl bg-green-50 p-4 text-green-800">Password changed. All previous sessions have been signed out.</p><Link to="/login" className="mt-5 inline-block font-medium text-blue-600">Sign in</Link></div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <input aria-label="New password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" className="w-full rounded-xl border border-gray-200 px-4 py-3" />
            <input aria-label="Confirm password" type="password" minLength={8} required value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Confirm password" className="w-full rounded-xl border border-gray-200 px-4 py-3" />
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button disabled={loading} className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white disabled:opacity-50">{loading ? 'Saving…' : 'Save new password'}</button>
          </form>
        )}
      </section>
    </main>
  );
};

export default ResetPassword;
