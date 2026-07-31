import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useToast } from '../../contexts/ToastContext';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { isAdminAuthenticated, adminLogin } = useAdminAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAdminAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await adminLogin({ email, password });
      navigate('/admin/dashboard', { replace: true });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Admin login failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="bg-gray-900 text-white p-8 text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold">Admin Portal</h1>
          <p className="text-gray-300 mt-2">Password-protected store management</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Admin Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-300"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in to Admin'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
