import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Lock,
  Bell,
  Shield,
  Mail,
  Smartphone,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { authAPI } from '../../services/api';
import { getApiErrorMessage } from '../../utils/api-error';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications'>('profile');
  const [isLoading, setIsLoading] = useState(false);

  // Profile form
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  // Password form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: true,
    orderUpdates: true,
    promotions: false,
    newsletter: true,
  });

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await updateUser(profileData);
      showToast('Profile updated successfully', 'success');
    } catch {
      showToast('Failed to update profile', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await authAPI.changePassword(passwordData.currentPassword, passwordData.newPassword);
      showToast('Password changed successfully', 'success');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to change password'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationChange = (key: string) => {
    setNotifications({ ...notifications, [key]: !notifications[key as keyof typeof notifications] });
    showToast('Preferences updated', 'success');
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {([
          { key: 'profile', label: 'Profile', icon: User },
          { key: 'password', label: 'Password', icon: Lock },
          { key: 'notifications', label: 'Notifications', icon: Bell },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-200 p-6"
        >
          <form onSubmit={handleProfileSubmit} className="space-y-6 max-w-lg">
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </motion.div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-200 p-6"
        >
          <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300"
            >
              {isLoading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </motion.div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-200 p-6"
        >
          <div className="space-y-6 max-w-lg">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Email Notifications</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">Order Updates</p>
                      <p className="text-sm text-gray-500">Get notified about your order status</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.emailNotifications}
                    onChange={() => handleNotificationChange('emailNotifications')}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">Promotions</p>
                      <p className="text-sm text-gray-500">Receive deals and special offers</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.promotions}
                    onChange={() => handleNotificationChange('promotions')}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">Newsletter</p>
                      <p className="text-sm text-gray-500">Weekly updates and news</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.newsletter}
                    onChange={() => handleNotificationChange('newsletter')}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </label>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">SMS Notifications</h3>
              <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">SMS Updates</p>
                    <p className="text-sm text-gray-500">Get order updates via SMS</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.smsNotifications}
                  onChange={() => handleNotificationChange('smsNotifications')}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </label>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Settings;
