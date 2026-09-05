import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { LoginCredentials, User } from '../types';
import { adminAuthAPI } from '../services/api';
import { getApiErrorMessage } from '../utils/api-error';
import { useToast } from './ToastContext';

interface AdminAuthContextType {
  adminUser: User | null;
  isAdminAuthenticated: boolean;
  isAdminLoading: boolean;
  adminLogin: (credentials: LoginCredentials) => Promise<void>;
  adminLogout: () => Promise<boolean>;
  refreshAdminAuth: () => Promise<User | null>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

export const AdminAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  const refreshAdminAuth = useCallback(async () => {
    try {
      const response = await adminAuthAPI.getProfile();
      const authenticatedAdmin = response.data.data as User;
      setAdminUser(authenticatedAdmin);
      return authenticatedAdmin;
    } catch {
      setAdminUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const initAdminAuth = async () => {
      await refreshAdminAuth();
      setIsAdminLoading(false);
    };

    void initAdminAuth();
  }, [refreshAdminAuth]);

  const adminLogin = async (credentials: LoginCredentials) => {
    try {
      const response = await adminAuthAPI.login(credentials.email, credentials.password);
      setAdminUser(response.data.data);
    } catch (error: unknown) {
      throw new Error(getApiErrorMessage(error, 'Admin login failed'));
    }
  };

  const adminLogout = async () => {
    try {
      await adminAuthAPI.logout();
      setAdminUser(null);
      return true;
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Admin logout failed. Please try again.'), 'error');
      return false;
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        isAdminAuthenticated: !!adminUser,
        isAdminLoading,
        adminLogin,
        adminLogout,
        refreshAdminAuth,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};
