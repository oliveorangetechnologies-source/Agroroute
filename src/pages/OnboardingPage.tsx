import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { BusinessType } from '../types/index.ts';
import { Building2, Globe, Scale, Clock, Check, ArrowRight, ShieldCheck } from 'lucide-react';

interface OnboardingPageProps {
  onComplete: () => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete }) => {
  const { company, updateCompany } = useAuth();
  const [step, setStep] = useState<number>(1);
  const [companyName, setCompanyName] = useState(company?.companyName || 'Gujarat Agro Fresh Logistics Ltd.');
  const [businessType, setBusinessType] = useState<BusinessType>(company?.businessType || 'distributor');
  const [operatingRegion, setOperatingRegion] = useState(company?.operatingRegion || 'Gujarat State APMC & Cold-Chain Corridor (Ahmedabad Hub)');
  const [defaultCurrency, setDefaultCurrency] = useState(company?.defaultCurrency || '₹');
  const [measurementUnit, setMeasurementUnit] = useState<'kg' | 'metric_ton'>(company?.measurementUnit || 'kg');
  const [criticalShelfLifeHours, setCriticalShelfLifeHours] = useState(company?.criticalShelfLifeHours || 48);
  const [warningShelfLifeHours, setWarningShelfLifeHours] = useState(company?.warningShelfLifeHours || 96);
  const [defaultTransportCostPerKg, setDefaultTransportCostPerKg] = useState(company?.defaultTransportCostPerKg || 2.20);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    setError(null);
    if (!companyName.trim()) {
      setError('Company name is required');
      return;
    }
    if (!operatingRegion.trim()) {
      setError('Operating region is required');
      return;
    }
    if (criticalShelfLifeHours <= 0) {
      setError('Critical shelf life threshold must be greater than zero');
      return;
    }

    setSaving(true);
    try {
      await updateCompany({
        companyName: companyName.trim(),
        businessType,
        operatingRegion: operatingRegion.trim(),
        defaultCurrency,
        measurementUnit,
        criticalShelfLifeHours: Number(criticalShelfLifeHours),
        warningShelfLifeHours: Number(warningShelfLifeHours),
        defaultTransportCostPerKg: Number(defaultTransportCostPerKg),
        onboardingCompleted: true,
      });
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed saving company settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F0E6] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-[#355C40] bg-[#D8E5C3] px-3 py-1 rounded">
            Enterprise Hub Setup
          </span>
          <h1 className="mt-3 text-3xl font-heading font-extrabold text-[#243D2B]">
            Configure Your Perishable Logistics Hub
          </h1>
          <p className="mt-2 text-sm text-[#687267]">
            Set up cold-chain operating parameters, shelf-life alert thresholds, and regional units for AgroRoute.
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-between mb-8 bg-white p-4 rounded-xl border border-[#E2E6DC]">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 1 ? 'bg-[#243D2B] text-white' : 'bg-[#E2E6DC] text-[#687267]'
            }`}>
              1
            </div>
            <div>
              <div className="text-xs font-bold text-[#202820]">Organization</div>
              <div className="text-[11px] text-[#687267]">Entity & Business Model</div>
            </div>
          </div>
          <div className="w-12 h-0.5 bg-[#E2E6DC]" />
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 2 ? 'bg-[#243D2B] text-white' : 'bg-[#E2E6DC] text-[#687267]'
            }`}>
              2
            </div>
            <div>
              <div className="text-xs font-bold text-[#202820]">Units & Region</div>
              <div className="text-[11px] text-[#687267]">Currency & Weight Scale</div>
            </div>
          </div>
          <div className="w-12 h-0.5 bg-[#E2E6DC]" />
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 3 ? 'bg-[#243D2B] text-white' : 'bg-[#E2E6DC] text-[#687267]'
            }`}>
              3
            </div>
            <div>
              <div className="text-xs font-bold text-[#202820]">Freshness Limits</div>
              <div className="text-[11px] text-[#687267]">Shelf-Life Thresholds</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-medium">
            {error}
          </div>
        )}

        {/* Form Container */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-[#E2E6DC]">
          {step === 1 && (
            <div className="space-y-5">
              <h3 className="font-heading font-bold text-lg text-[#202820] flex items-center gap-2">
                <Building2 className="text-[#355C40]" size={20} />
                <span>Company & Entity Profile</span>
              </h3>

              <div>
                <label className="block text-xs font-semibold text-[#202820] mb-1">
                  Distribution Hub / Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202820] mb-1">
                  Primary Operation Type
                </label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                  className="w-full px-3 py-2 text-sm bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                >
                  <option value="distributor">Regional Fresh Produce Distributor</option>
                  <option value="grower">Commercial Grower / Shipper</option>
                  <option value="cooperative">Grower Cooperative</option>
                  <option value="wholesaler">Terminal Market Wholesaler</option>
                  <option value="exporter">Cold Chain Exporter</option>
                </select>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#243D2B] text-white text-xs font-semibold rounded-lg hover:bg-[#1D3223]"
                >
                  <span>Next: Units & Geography</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h3 className="font-heading font-bold text-lg text-[#202820] flex items-center gap-2">
                <Globe className="text-[#355C40]" size={20} />
                <span>Geographic Network & Units</span>
              </h3>

              <div>
                <label className="block text-xs font-semibold text-[#202820] mb-1">
                  Primary Operating Region & Corridors
                </label>
                <input
                  type="text"
                  value={operatingRegion}
                  onChange={(e) => setOperatingRegion(e.target.value)}
                  placeholder="e.g. Gujarat State APMC Corridor & Golden Expressway Network"
                  className="w-full px-3 py-2 text-sm bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#202820] mb-1">
                    Default Currency Symbol
                  </label>
                  <select
                    value={defaultCurrency}
                    onChange={(e) => setDefaultCurrency(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                  >
                    <option value="₹">INR (₹)</option>
                    <option value="$">USD ($)</option>
                    <option value="€">EUR (€)</option>
                    <option value="£">GBP (£)</option>
                    <option value="C$">CAD (C$)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202820] mb-1">
                    Standard Weight Measure
                  </label>
                  <select
                    value={measurementUnit}
                    onChange={(e) => setMeasurementUnit(e.target.value as 'kg' | 'metric_ton')}
                    className="w-full px-3 py-2 text-sm bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="metric_ton">Metric Tons (MT)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202820] mb-1">
                  Baseline Transport Cost per Kilogram ({defaultCurrency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={defaultTransportCostPerKg}
                  onChange={(e) => setDefaultTransportCostPerKg(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                />
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-[#E2E6DC] text-xs font-semibold text-[#687267] rounded-lg hover:bg-[#F4F0E6]"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#243D2B] text-white text-xs font-semibold rounded-lg hover:bg-[#1D3223]"
                >
                  <span>Next: Freshness Rules</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h3 className="font-heading font-bold text-lg text-[#202820] flex items-center gap-2">
                <Clock className="text-[#355C40]" size={20} />
                <span>Perishable Freshness & Spoilage Thresholds</span>
              </h3>

              <div className="p-4 bg-[#FFF9F3] border border-[#E78B45]/30 rounded-lg text-xs text-[#202820]">
                <div className="font-semibold text-[#E78B45] mb-1">Decision Support Logic:</div>
                When produce remaining shelf life dips below the Critical Threshold, AgroRoute flags batches as <strong>At-Risk</strong>, triggers dynamic markdown recommendations, and elevates allocation urgency.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#202820] mb-1">
                    Critical Shelf Life (Hours)
                  </label>
                  <input
                    type="number"
                    min="6"
                    max="168"
                    value={criticalShelfLifeHours}
                    onChange={(e) => setCriticalShelfLifeHours(parseInt(e.target.value, 10) || 48)}
                    className="w-full px-3 py-2 text-sm bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                  />
                  <span className="text-[11px] text-[#687267] mt-1 block">Recommended: 48h (2 days)</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202820] mb-1">
                    Warning Shelf Life (Hours)
                  </label>
                  <input
                    type="number"
                    min="12"
                    max="336"
                    value={warningShelfLifeHours}
                    onChange={(e) => setWarningShelfLifeHours(parseInt(e.target.value, 10) || 96)}
                    className="w-full px-3 py-2 text-sm bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                  />
                  <span className="text-[11px] text-[#687267] mt-1 block">Recommended: 96h (4 days)</span>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 border border-[#E2E6DC] text-xs font-semibold text-[#687267] rounded-lg hover:bg-[#F4F0E6]"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleFinish}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#243D2B] text-white text-xs font-semibold rounded-lg hover:bg-[#1D3223] disabled:opacity-50"
                >
                  <Check size={16} />
                  <span>{saving ? 'Initializing Hub...' : 'Complete Setup & Launch Dashboard'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
