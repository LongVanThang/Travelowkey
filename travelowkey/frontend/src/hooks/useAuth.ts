'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthState } from '@/types';
import { authApi } from '@/utils/api';
import { getFromStorage, setToStorage, removeFromStorage } from '@/utils/helpers';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: any) => Promise<boolean>;
  logout: () => void;
  updateProfile: (userData: any) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = getFromStorage('token');
        const user = getFromStorage('user');

        if (token && user) {
          const response = await authApi.getProfile();
          if (response.success && response.data) {
            setAuthState({
              user: response.data,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
            setToStorage('user', response.data);
          } else {
            removeFromStorage('token');
            removeFromStorage('user');
            setAuthState({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } else {
          setAuthState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setAuthState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const response = await authApi.login(email, password);
      
      if (response.success && response.data) {
        const { user, token } = response.data;
        
        setToStorage('token', token);
        setToStorage('user', user);
        
        setAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
        
        return true;
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  const register = async (userData: any): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const response = await authApi.register(userData);
      
      if (response.success && response.data) {
        const { user, token } = response.data;
        
        setToStorage('token', token);
        setToStorage('user', user);
        
        setAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
        
        return true;
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return false;
      }
    } catch (error) {
      console.error('Register error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      removeFromStorage('token');
      removeFromStorage('user');
      
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  };

  const updateProfile = async (userData: any): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const response = await authApi.updateProfile(userData);
      
      if (response.success && response.data) {
        const updatedUser = response.data;
        
        setToStorage('user', updatedUser);
        
        setAuthState(prev => ({
          ...prev,
          user: updatedUser,
          isLoading: false,
        }));
        
        return true;
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return false;
      }
    } catch (error) {
      console.error('Update profile error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  const value: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    updateProfile,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};