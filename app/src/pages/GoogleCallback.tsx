import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI, cartAPI, clearGuestCartId, GUEST_CART_ID_KEY } from '../services/api';

const GoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Completing Google sign in...');

  useEffect(() => {
    const completeLogin = async () => {
      const code = searchParams.get('code');
      const mode = searchParams.get('state') === 'admin' ? 'admin' : 'customer';
      const guestId = localStorage.getItem(GUEST_CART_ID_KEY);

      if (!code) {
        setMessage('Google did not return an authorization code.');
        return;
      }

      try {
        const response = await authAPI.googleCallback(code, mode);
        const { data } = response.data;
        if (mode === 'customer') {
          await cartAPI.mergeGuestCart(guestId).catch(() => undefined);
          clearGuestCartId();
        }
        navigate(data.isAdmin ? '/admin/dashboard' : '/', { replace: true });
      } catch {
        setMessage('Google sign in failed. Please try again.');
      }
    };

    completeLogin();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
        <p className="text-gray-700">{message}</p>
      </div>
    </div>
  );
};

export default GoogleCallback;
