import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { adminAuthAPI, authAPI, cartAPI, clearGuestCartId } from '../services/api';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { useAuth } from '../contexts/AuthContext';

interface OAuthCallbackProps {
  provider?: 'google' | 'facebook';
}

const GoogleCallback = ({ provider = 'google' }: OAuthCallbackProps) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const { refreshAdminAuth } = useAdminAuth();
  const providerLabel = provider === 'google' ? 'Google' : 'Facebook';
  const [message, setMessage] = useState(`Completing ${providerLabel} sign in...`);

  useEffect(() => {
    const completeLogin = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const mode = state?.startsWith(`${provider}:admin:`) ? 'admin' : 'customer';

      if (!code || !state || !state.startsWith(`${provider}:${mode}:`)) {
        setMessage(`${providerLabel} did not return a valid authorization response.`);
        return;
      }

      try {
        if (mode === 'admin') {
          if (provider === 'google') await adminAuthAPI.googleCallback(code, state);
          else await adminAuthAPI.facebookCallback(code, state);
          await refreshAdminAuth();
          navigate('/admin/dashboard', { replace: true });
          return;
        }

        if (provider === 'google') await authAPI.googleCallback(code, state);
        else await authAPI.facebookCallback(code, state);
        await refreshAuth();
        await cartAPI.mergeGuestCart().catch(() => undefined);
        clearGuestCartId();
        navigate('/', { replace: true });
      } catch {
        setMessage(`${providerLabel} sign in failed. Please try again.`);
      }
    };

    void completeLogin();
  }, [navigate, provider, providerLabel, refreshAdminAuth, refreshAuth, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
        <p className="text-gray-700">{message}</p>
      </div>
    </div>
  );
};

export default GoogleCallback;
