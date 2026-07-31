import React, { createContext, useCallback, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, LoginCredentials, RegisterData } from '../types';
import { authAPI, cartAPI, clearGuestCartId, GUEST_CART_ID_KEY } from '../services/api';
import { getApiErrorMessage } from '../utils/api-error';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
  refreshAuth: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    try {
      const response = await authAPI.getProfile();
      const authenticatedUser = response.data.data as User;
      setUser(authenticatedUser);
      return authenticatedUser;
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      await refreshAuth();
      setIsLoading(false);
    };

    initAuth();
  }, [refreshAuth]);

  const login = async (credentials: LoginCredentials) => {
    try {
      const guestId = localStorage.getItem(GUEST_CART_ID_KEY);
      const response = await authAPI.login(credentials.email, credentials.password);
      const { data } = response.data;
      
      setUser(data);
      await cartAPI.mergeGuestCart(guestId).catch(() => undefined);
      clearGuestCartId();
    } catch (error: unknown) {
      throw new Error(getApiErrorMessage(error, 'Login failed'));
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const guestId = localStorage.getItem(GUEST_CART_ID_KEY);
      const response = await authAPI.register(data);
      const { data: userData } = response.data;
      
      setUser(userData);
      await cartAPI.mergeGuestCart(guestId).catch(() => undefined);
      clearGuestCartId();
    } catch (error: unknown) {
      throw new Error(getApiErrorMessage(error, 'Registration failed'));
    }
  };

  const logout = () => {
    void authAPI.logout?.();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = async (data: Partial<User>) => {
    try {
      const response = await authAPI.updateProfile(data);
      const updatedUser = response.data.data;
      
      setUser(updatedUser);
    } catch (error: unknown) {
      throw new Error(getApiErrorMessage(error, 'Update failed'));
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
