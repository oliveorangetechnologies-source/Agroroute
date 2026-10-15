import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, CompanySettings } from '../types/index.ts';
import { api } from '../services/api.ts';

interface AuthContextType {
  user: UserProfile | null;
  company: CompanySettings | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<UserProfile | void>;
  signup: (data: { name: string; email: string; companyName: string; businessType?: string }) => Promise<UserProfile | void>;
  logout: () => Promise<void>;
  updateCompany: (updates: Partial<CompanySettings>) => Promise<void>;
  refreshCompany: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = async () => {
    try {
      const isLoggedOut = localStorage.getItem('agroroute_logged_out') === 'true';
      const cachedUserStr = localStorage.getItem('agroroute_user');

      const comp = await api.company.get().catch(() => null);
      if (comp) setCompany(comp);

      if (isLoggedOut) {
        setUser(null);
      } else if (cachedUserStr) {
        try {
          setUser(JSON.parse(cachedUserStr));
        } catch {
          const data = await api.auth.getMe();
          if (data && data.user) {
            setUser(data.user);
            if (data.company) setCompany(data.company);
          }
        }
      } else {
        const data = await api.auth.getMe();
        if (data && data.user) {
          setUser(data.user);
          if (data.company) setCompany(data.company);
        }
      }
    } catch (err) {
      console.warn('Initial auth check:', err);
      if (localStorage.getItem('agroroute_logged_out') !== 'true') {
        setUser({
          id: 'USR-001',
          name: 'Rajesh Patel',
          email: 'rajesh.patel@gujaratagrofresh.in',
          role: 'Director of Distribution & Cold-Chain Operations',
          companyId: 'COMP-001',
        });
        setCompany({
          id: 'COMP-001',
          companyName: 'Gujarat Agro Fresh Logistics Ltd.',
          businessType: 'distributor',
          operatingRegion: 'Gujarat State APMC & Cold-Chain Corridor (Ahmedabad Hub)',
          defaultCurrency: '₹',
          measurementUnit: 'kg',
          criticalShelfLifeHours: 48,
          warningShelfLifeHours: 96,
          defaultTransportCostPerKg: 2.20,
          contactEmail: 'dispatch@gujaratagrofresh.in',
          onboardingCompleted: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email: string, password: string = 'demo123') => {
    try {
      const res = await api.auth.login(email, password);
      localStorage.removeItem('agroroute_logged_out');
      localStorage.setItem('agroroute_token', res.token);
      localStorage.setItem('agroroute_user', JSON.stringify(res.user));
      setUser(res.user);
      const comp = await api.company.get().catch(() => null);
      if (comp) setCompany(comp);
      return res.user;
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };

  const signup = async (data: { name: string; email: string; companyName: string; businessType?: string }) => {
    try {
      const res = await api.auth.signup(data);
      localStorage.removeItem('agroroute_logged_out');
      localStorage.setItem('agroroute_token', res.token);
      localStorage.setItem('agroroute_user', JSON.stringify(res.user));
      setUser(res.user);
      const comp = await api.company.get().catch(() => null);
      if (comp) setCompany(comp);
      return res.user;
    } catch (err) {
      console.error('Signup error:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore
    }
    localStorage.setItem('agroroute_logged_out', 'true');
    localStorage.removeItem('agroroute_user');
    localStorage.removeItem('agroroute_token');
    setUser(null);
  };

  const updateCompany = async (updates: Partial<CompanySettings>) => {
    const updated = await api.company.update(updates);
    setCompany(updated);
  };

  const refreshCompany = async () => {
    try {
      const comp = await api.company.get();
      setCompany(comp);
    } catch (err) {
      console.error('Failed refreshing company:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        updateCompany,
        refreshCompany,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
