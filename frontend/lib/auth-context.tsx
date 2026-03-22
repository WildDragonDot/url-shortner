'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from './api';
import toast from 'react-hot-toast';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await authAPI.login(email, password);
      const { token } = res.data;
      localStorage.setItem('token', token);
      setToken(token);
      setIsAuthenticated(true);
      toast.success('Login successful!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed');
      throw err;
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const res = await authAPI.register(email, password);
      const { token } = res.data;
      localStorage.setItem('token', token);
      setToken(token);
      setIsAuthenticated(true);
      toast.success('Account created!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setIsAuthenticated(false);
    toast.success('Logged out');
  };

  const forgotPassword = async (email: string) => {
    try {
      await authAPI.forgotPassword(email);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send reset email');
      throw err;
    }
  };

  const resetPassword = async (token: string, password: string) => {
    try {
      await authAPI.resetPassword(token, password);
      toast.success('Password reset successful!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reset password');
      throw err;
    }
  };

  const deleteAccount = async () => {
    try {
      await authAPI.deleteAccount();
      localStorage.removeItem('token');
      setToken(null);
      setIsAuthenticated(false);
      toast.success('Account deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete account');
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, isLoading, login, register, logout, forgotPassword, resetPassword, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
