import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { adminAuthAPI, authAPI, cartAPI, clearGuestCartId } from '../services/api';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { useAuth } from '../contexts/AuthContext';

const GoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const { refreshAdminAuth } = useAdminAuth();
  const [message, setMessage] = useState('Completing Google sign in...');

  useEffect(() => {
    const completeLogin = async () => {
      const code = searchParams.get('code');
      const mode = searchParams.get('state') === 'admin' ? 'admin' : 'customer';

      if (!code) {
        setMessage('Google did not return an authorization code.');
        return;
      }

      try {
        if (mode === 'admin') {
          await adminAuthAPI.googleCallback(code);
          await refreshAdminAuth();
          navigate('/admin/dashboard', { replace: true });
          return;
        }

        await authAPI.googleCallback(code);
        await refreshAuth();
        await cartAPI.mergeGuestCart().catch(() => undefined);
        clearGuestCartId();
        navigate('/', { replace: true });
      } catch {
        setMessage('Google sign in failed. Please try again.');
      }
    };

    void completeLogin();
  }, [navigate, refreshAdminAuth, refreshAuth, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
        <p className="text-gray-700">{message}</p>
      </div>
    </div>
  );
};

export default GoogleCallback;
