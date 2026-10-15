import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Leaf, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { BusinessType } from '../types/index.ts';

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
  onSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login', onSuccess }) => {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('distributor');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          throw new Error('Please enter your email and password');
        }
        await login(email, password);
      } else {
        if (!name.trim() || !email.trim() || !companyName.trim()) {
          throw new Error('Please fill in your name, work email, and company name');
        }
        await signup({ name, email, companyName, businessType });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setError(null);
    setLoading(true);
    try {
      await login(demoEmail, 'demo123');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F0E6] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Lockup */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-[#243D2B] rounded-xl flex items-center justify-center text-[#D8E5C3] shadow-md">
            <Leaf size={26} />
          </div>
          <h2 className="mt-4 text-center text-2xl font-heading font-extrabold text-[#243D2B] tracking-tight">
            AGROROUTE
          </h2>
          <p className="mt-1 text-center text-xs text-[#687267] font-medium">
            Smarter Distribution · Fresher Produce
          </p>
        </div>

        <div className="mt-8 bg-white py-8 px-6 sm:px-10 rounded-xl shadow-sm border border-[#E2E6DC]">
          <div className="flex items-center justify-between pb-5 border-b border-[#E2E6DC]">
            <h3 className="font-heading font-bold text-lg text-[#202820]">
              {mode === 'login' ? 'Sign in to Distribution Console' : 'Create Logistics Account'}
            </h3>
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError(null);
              }}
              className="text-xs font-semibold text-[#355C40] hover:underline"
            >
              {mode === 'login' ? 'New company? Sign up' : 'Already registered? Sign in'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-xs text-red-800">
              <AlertCircle size={16} className="shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#202820] mb-1">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rajesh Patel"
                    className="w-full px-3 py-2 text-sm bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40] focus:ring-1 focus:ring-[#355C40]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202820] mb-1">
                    Company / Organization Name
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Gujarat Agro Fresh Logistics Ltd."
                    className="w-full px-3 py-2 text-sm bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40] focus:ring-1 focus:ring-[#355C40]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202820] mb-1">
                    Operation Type
                  </label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                    className="w-full px-3 py-2 text-sm bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40] focus:ring-1 focus:ring-[#355C40]"
                  >
                    <option value="distributor">Regional Produce Distributor</option>
                    <option value="grower">Commercial Grower / Shipper</option>
                    <option value="cooperative">Agricultural Cooperative</option>
                    <option value="wholesaler">Wholesale Terminal Merchant</option>
                    <option value="exporter">Export / Import Logistics</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#202820] mb-1">
                Work Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rajesh@gujaratagrofresh.com"
                className="w-full px-3 py-2 text-sm bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40] focus:ring-1 focus:ring-[#355C40]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202820] mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 text-sm bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40] focus:ring-1 focus:ring-[#355C40]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#243D2B] hover:bg-[#1D3223] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : mode === 'login' ? 'Sign In to AgroRoute' : 'Register & Continue'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Preset Demo Accounts */}
          <div className="mt-8 pt-6 border-t border-[#E2E6DC]">
            <div className="text-xs font-semibold text-[#687267] uppercase tracking-wider mb-3">
              One-Click Evaluator & Demo Access
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('rajesh@gujaratagrofresh.com')}
                className="w-full flex items-center justify-between p-2.5 text-xs text-left bg-[#F8FAF7] hover:bg-[#F4F0E6] border border-[#E2E6DC] rounded-lg transition-colors group"
              >
                <div>
                  <div className="font-semibold text-[#243D2B]">Rajesh Patel</div>
                  <div className="text-[#687267] text-[11px]">Director of Perishable Distribution · Gujarat APMC Corridor</div>
                </div>
                <span className="text-[#355C40] group-hover:translate-x-0.5 transition-transform font-bold text-xs">
                  Sign in →
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('amit@gujaratagrofresh.com')}
                className="w-full flex items-center justify-between p-2.5 text-xs text-left bg-[#F8FAF7] hover:bg-[#F4F0E6] border border-[#E2E6DC] rounded-lg transition-colors group"
              >
                <div>
                  <div className="font-semibold text-[#243D2B]">Amit Shah</div>
                  <div className="text-[#687267] text-[11px]">Logistics Operations Planner · Saurashtra & Central Gujarat</div>
                </div>
                <span className="text-[#355C40] group-hover:translate-x-0.5 transition-transform font-bold text-xs">
                  Sign in →
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-[#687267]">
          Perishable Freshness Security Protocol · WCAG AA Logistics Design System
        </div>
      </div>
    </div>
  );
};
