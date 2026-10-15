import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, CompanySettings } from '../types/index.ts';
import { api } from '../services/api.ts';

interface AuthContextType {
  user: UserProfile | null;
  company: CompanySettings | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  signup: (data: { name: string; email: string; companyName: string; businessType?: string }) => Promise<void>;
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
      const data = await api.auth.getMe();
      if (data && data.user) {
        setUser(data.user);
        setCompany(data.company);
      }
    } catch (err) {
      console.warn('Initial auth check:', err);
      // Fallback default for demo if server is starting
      setUser({
        id: 'USR-001',
        name: 'Rajesh Patel',
        email: 'rajesh@gujaratagrofresh.com',
        role: 'Director of Perishable Distribution & Logistics',
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
        contactEmail: 'dispatch@gujaratagrofresh.com',
        onboardingCompleted: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email: string, password: string = 'password') => {
    setIsLoading(true);
    try {
      const res = await api.auth.login(email, password);
      setUser(res.user);
      const comp = await api.company.get();
      setCompany(comp);
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: { name: string; email: string; companyName: string; businessType?: string }) => {
    setIsLoading(true);
    try {
      const res = await api.auth.signup(data);
      setUser(res.user);
      const comp = await api.company.get();
      setCompany(comp);
    } catch (err) {
      console.error('Signup error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore
    }
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
