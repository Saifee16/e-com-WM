import { useState, type FormEvent } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Mail,
  LogOut,
  ArrowLeft,
  BarChart3,
  RotateCcw,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useToast } from '../../contexts/ToastContext';
import { adminAuthAPI } from '../../services/api';
import { getApiErrorMessage } from '../../utils/api-error';

const AdminLayout = () => {
  const { adminUser, adminLogout, refreshAdminAuth } = useAdminAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const menuItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Products', path: '/admin/products', icon: Package },
    { name: 'Orders', path: '/admin/orders', icon: ShoppingCart },
    { name: 'Users', path: '/admin/users', icon: Users },
    ...(adminUser?.role === 'SUPER_ADMIN' ? [{ name: 'Admin Accounts', path: '/admin/account-management', icon: ShieldCheck }] : []),
    { name: 'Messages', path: '/admin/contact', icon: Mail },
    { name: 'Returns', path: '/admin/returns', icon: RotateCcw },
  ];

  const handleLogout = () => {
    adminLogout();
    navigate('/admin/login');
  };

  const handlePasswordChange = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    try {
      setIsChangingPassword(true);
      await adminAuthAPI.changePassword(currentPassword, newPassword);
      await refreshAdminAuth();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Administrator password changed.', 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Password could not be changed.'), 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      {/* Header */}
      <div className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-slate-300 transition-colors hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Store
              </button>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden text-sm text-slate-300 sm:inline">
                Admin: {adminUser?.firstName} {adminUser?.lastName}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-red-300 transition-colors hover:text-red-200"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Sidebar */}
          <div className="lg:w-60 lg:flex-shrink-0">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-24">
              <div className="border-b border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-950">Admin panel</h2>
                    <p className="text-xs text-slate-500">Manage your store</p>
                  </div>
                </div>
              </div>
              <nav className="flex gap-1 overflow-x-auto p-2 lg:block">
                {menuItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <Outlet />
          </div>
        </div>
      </div>

      {adminUser?.mustChangePassword && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4">
        <form onSubmit={handlePasswordChange} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-5 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><KeyRound className="h-5 w-5" /></div><div><h2 className="text-xl font-bold text-slate-950">Change your password</h2><p className="text-sm text-slate-500">A password change is required before using the admin panel.</p></div></div>
          <div className="space-y-4">
            <PasswordField label="Current temporary password" value={currentPassword} onChange={setCurrentPassword} />
            <PasswordField label="New strong password" value={newPassword} onChange={setNewPassword} />
            <PasswordField label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} />
            <p className="text-xs text-slate-500">Use at least 12 characters with upper/lowercase letters, a number, and a special character.</p>
          </div>
          <button type="submit" disabled={isChangingPassword} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white disabled:opacity-50">{isChangingPassword && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}{isChangingPassword ? 'Changing password…' : 'Change password'}</button>
        </form>
      </div>}
    </div>
  );
};

const PasswordField = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
  <label className="block text-sm font-medium text-slate-700">{label}<input type="password" required value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600" /></label>
);

export default AdminLayout;
