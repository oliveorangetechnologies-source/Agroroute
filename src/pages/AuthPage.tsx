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
  const [email, setEmail] = useState('rajesh.patel@gujaratagrofresh.in');
  const [password, setPassword] = useState('demo123');
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
        const cleanEmail = email.trim();
        const cleanPassword = password.trim();
        if (!cleanEmail) {
          throw new Error('Please enter your work email address');
        }
        await login(cleanEmail, cleanPassword || 'demo123');
      } else {
        if (!name.trim() || !email.trim() || !companyName.trim()) {
          throw new Error('Please fill in your name, work email, and company name');
        }
        await signup({ name, email, companyName, businessType });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPass: string = 'demo123') => {
    setError(null);
    setLoading(true);
    setEmail(demoEmail);
    setPassword(demoPass);
    try {
      await login(demoEmail, demoPass);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Demo login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F0E6] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Lockup */}
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 bg-[#243D2B] rounded-2xl flex items-center justify-center text-[#D8E5C3] shadow-lg border border-[#355C40]/60 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#355C40] via-transparent to-[#1B2F21] opacity-70"></div>
            <Leaf size={28} className="relative z-10 text-[#E78B45]" />
          </div>
          <h2 className="mt-4 text-center text-2xl font-heading font-extrabold text-[#243D2B] tracking-tight">
            AGROROUTE
          </h2>
          <p className="mt-1 text-center text-xs text-[#687267] font-medium">
            Gujarat Agricultural Cold-Chain Distribution Engine
          </p>
        </div>

        <div className="mt-7 bg-white py-8 px-6 sm:px-10 rounded-2xl shadow-sm border border-[#E2E6DC]">
          <div className="flex items-center justify-between pb-4 border-b border-[#E2E6DC]">
            <div>
              <h3 className="font-heading font-bold text-lg text-[#202820]">
                {mode === 'login' ? 'Sign In to Console' : 'Create Logistics Account'}
              </h3>
              <p className="text-xs text-[#687267]">
                {mode === 'login' ? 'Access Gujarat APMC distribution network' : 'Register your produce distribution hub'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError(null);
              }}
              className="text-xs font-semibold text-[#355C40] hover:text-[#243D2B] underline cursor-pointer"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-xs text-red-800">
              <AlertCircle size={16} className="shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Demo Credentials Banner */}
          {mode === 'login' && (
            <div className="mt-5 p-3.5 bg-[#F4F0E6]/70 border border-[#D8E5C3] rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#243D2B] flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-[#355C40]" />
                  Verified Demo Credentials
                </span>
                <span className="text-[10px] bg-[#355C40] text-white px-1.5 py-0.5 rounded font-mono font-bold">
                  GUJARAT APMC
                </span>
              </div>
              <div className="text-[11px] text-[#4F594E] space-y-1 font-mono">
                <div className="flex justify-between items-center bg-white/70 px-2 py-1 rounded border border-[#E2E6DC]">
                  <span>Email: <strong className="text-[#202820]">rajesh.patel@gujaratagrofresh.in</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('rajesh.patel@gujaratagrofresh.in');
                      setPassword('demo123');
                    }}
                    className="text-[10px] text-[#355C40] font-sans font-bold hover:underline ml-2"
                  >
                    Use
                  </button>
                </div>
                <div className="flex justify-between items-center bg-white/70 px-2 py-1 rounded border border-[#E2E6DC]">
                  <span>Password: <strong className="text-[#202820]">demo123</strong></span>
                  <span className="text-[10px] text-[#687267] font-sans">(or any password)</span>
                </div>
              </div>
            </div>
          )}

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
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
                    <option value="distributor">Regional Produce Distributor (Gujarat Mandis)</option>
                    <option value="grower">Commercial Grower / Shipper</option>
                    <option value="cooperative">Agricultural Cooperative (APMC)</option>
                    <option value="wholesaler">Wholesale Terminal Merchant</option>
                    <option value="exporter">Export / Cold-Chain Logistics</option>
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
                placeholder="rajesh.patel@gujaratagrofresh.in"
                className="w-full px-3 py-2 text-sm bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40] focus:ring-1 focus:ring-[#355C40]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#202820]">
                  Password
                </label>
                {mode === 'login' && (
                  <span className="text-[11px] text-[#687267]">Demo: <strong>demo123</strong></span>
                )}
              </div>
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
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#243D2B] hover:bg-[#1D3223] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Authenticating...' : mode === 'login' ? 'Sign In to AgroRoute' : 'Register & Continue'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* 1-Click One-Touch Demo Sign In Buttons */}
          <div className="mt-7 pt-5 border-t border-[#E2E6DC]">
            <div className="text-[11px] font-bold text-[#687267] uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>One-Click Evaluator Access</span>
              <span className="text-[10px] text-[#355C40] font-semibold lowercase">click to login instantly</span>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleDemoLogin('rajesh.patel@gujaratagrofresh.in', 'demo123')}
                className="w-full flex items-center justify-between p-2.5 text-xs text-left bg-[#F8FAF7] hover:bg-[#EFF3EA] border border-[#E2E6DC] hover:border-[#355C40]/50 rounded-xl transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#243D2B] text-white flex items-center justify-center font-bold text-xs">
                    RP
                  </div>
                  <div>
                    <div className="font-semibold text-[#243D2B] group-hover:text-[#355C40]">Rajesh Patel</div>
                    <div className="text-[#687267] text-[10px]">Director of Distribution · Ahmedabad APMC Hub</div>
                  </div>
                </div>
                <span className="text-[#355C40] font-bold text-xs group-hover:translate-x-1 transition-transform">
                  1-Click Login →
                </span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleDemoLogin('bhavin.shah@gujaratagrofresh.in', 'demo123')}
                className="w-full flex items-center justify-between p-2.5 text-xs text-left bg-[#F8FAF7] hover:bg-[#EFF3EA] border border-[#E2E6DC] hover:border-[#355C40]/50 rounded-xl transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#355C40] text-white flex items-center justify-center font-bold text-xs">
                    BS
                  </div>
                  <div>
                    <div className="font-semibold text-[#243D2B] group-hover:text-[#355C40]">Bhavin Shah</div>
                    <div className="text-[#687267] text-[10px]">Cold-Chain Logistics Planner · Saurashtra Corridor</div>
                  </div>
                </div>
                <span className="text-[#355C40] font-bold text-xs group-hover:translate-x-1 transition-transform">
                  1-Click Login →
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 text-center text-xs text-[#687267]">
          AgroRoute Cold-Chain Protocol · Gujarat State APMC Mandi Network
        </div>
      </div>
    </div>
  );
};
