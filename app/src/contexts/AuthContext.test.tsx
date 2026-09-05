import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

const mocks = vi.hoisted(() => ({
  getProfile: vi.fn(),
  logout: vi.fn(),
  mergeGuestCart: vi.fn(),
  clearGuestCartId: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('../services/api', () => ({
  authAPI: { getProfile: mocks.getProfile, logout: mocks.logout },
  cartAPI: { mergeGuestCart: mocks.mergeGuestCart },
  clearGuestCartId: mocks.clearGuestCartId,
}));
vi.mock('./ToastContext', () => ({
  useToast: () => ({ showToast: mocks.showToast }),
}));

const Probe = () => {
  const auth = useAuth();
  return <button onClick={() => void auth.logout()}>{auth.user?.email ?? 'signed out'}</button>;
};

describe('AuthProvider logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProfile.mockResolvedValue({
      data: { data: { email: 'shopper@example.com' } },
    });
  });

  it('keeps the authenticated state when server logout fails', async () => {
    mocks.logout.mockRejectedValue(new Error('Network unavailable'));
    render(<AuthProvider><Probe /></AuthProvider>);

    expect(await screen.findByText('shopper@example.com')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith('Network unavailable', 'error'));
    expect(screen.getByText('shopper@example.com')).toBeInTheDocument();
  });
});
