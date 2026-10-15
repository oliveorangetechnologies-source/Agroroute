import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Clock,
  DollarSign,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Cpu,
  Save,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { BusinessType } from '../types/index.ts';

export const SettingsPage: React.FC = () => {
  const { company, updateCompany } = useAuth();
  const [formData, setFormData] = useState({
    companyName: company?.companyName || '',
    businessType: (company?.businessType || 'distributor') as BusinessType,
    operatingRegion: company?.operatingRegion || '',
    contactEmail: company?.contactEmail || '',
    defaultCurrency: company?.defaultCurrency || '$',
    measurementUnit: (company?.measurementUnit || 'kg') as 'kg' | 'metric_ton',
    criticalShelfLifeHours: company?.criticalShelfLifeHours || 48,
    warningShelfLifeHours: company?.warningShelfLifeHours || 96,
    defaultTransportCostPerKg: company?.defaultTransportCostPerKg || 0.18,
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const [healthStatus, setHealthStatus] = useState<any>(null);

  useEffect(() => {
    if (company) {
      setFormData({
        companyName: company.companyName,
        businessType: company.businessType,
        operatingRegion: company.operatingRegion,
        contactEmail: company.contactEmail || '',
        defaultCurrency: company.defaultCurrency,
        measurementUnit: company.measurementUnit,
        criticalShelfLifeHours: company.criticalShelfLifeHours,
        warningShelfLifeHours: company.warningShelfLifeHours,
        defaultTransportCostPerKg: company.defaultTransportCostPerKg,
      });
    }

    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealthStatus(data))
      .catch(() => setHealthStatus({ status: 'Local Mock / Server Ready' }));
  }, [company]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaveSuccess(false);

    if (!formData.companyName.trim()) {
      setError('Company name is required');
      return;
    }
    if (formData.criticalShelfLifeHours <= 0) {
      setError('Critical shelf life must be greater than zero hours');
      return;
    }

    setSaving(true);
    try {
      await updateCompany({
        ...formData,
        criticalShelfLifeHours: Number(formData.criticalShelfLifeHours),
        warningShelfLifeHours: Number(formData.warningShelfLifeHours),
        defaultTransportCostPerKg: Number(formData.defaultTransportCostPerKg),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setError(err.message || 'Failed saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDemoData = async () => {
    if (!window.confirm('Restore database to pristine Gujarat APMC agricultural corridor dataset? All temporary modifications will be re-initialized.')) {
      return;
    }
    setIsResetting(true);
    setResetSuccess(null);
    try {
      const res = await api.demo.reset();
      setResetSuccess(res.message);
      setTimeout(() => setResetSuccess(null), 4000);
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-2 border-b border-[#E2E6DC]">
        <h1 className="text-2xl font-heading font-extrabold text-[#243D2B]">
          Logistics System Settings
        </h1>
        <div className="flex items-center gap-2 text-xs text-[#687267] mt-1">
          <span>Operating Hub Profile</span>
          <span aria-hidden="true">·</span>
          <span>Perishable thresholds & regional parameters</span>
          <span aria-hidden="true">·</span>
          <span>Demo Data Seeding</span>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-[#243D2B] text-white rounded-lg text-xs font-semibold flex items-center gap-2 border border-[#355C40]">
          <CheckCircle2 size={16} className="text-[#D8E5C3]" />
          <span>Operational parameters and organization settings saved successfully.</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 text-red-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-red-200">
          <AlertCircle size={16} className="text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Hub Profile */}
        <div className="bg-white p-6 rounded-xl border border-[#E2E6DC] shadow-xs space-y-4">
          <h3 className="font-heading font-bold text-sm text-[#202820] flex items-center gap-2">
            <Building2 className="text-[#355C40]" size={18} />
            <span>Facility & Organization Profile</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#202820] mb-1">
                Company / Facility Name
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#202820] mb-1">
                Business Type
              </label>
              <select
                value={formData.businessType}
                onChange={(e) => setFormData({ ...formData, businessType: e.target.value as BusinessType })}
                className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
              >
                <option value="distributor">Regional Fresh Produce Distributor</option>
                <option value="grower">Commercial Grower / Shipper</option>
                <option value="cooperative">Grower Cooperative</option>
                <option value="wholesaler">Terminal Wholesaler</option>
                <option value="exporter">Cold Chain Exporter</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#202820] mb-1">
                Operating Corridor / Region
              </label>
              <input
                type="text"
                value={formData.operatingRegion}
                onChange={(e) => setFormData({ ...formData, operatingRegion: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#202820] mb-1">
                Dispatch Desk Email
              </label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
              />
            </div>
          </div>
        </div>

        {/* Cold-Chain Freshness Thresholds */}
        <div className="bg-white p-6 rounded-xl border border-[#E2E6DC] shadow-xs space-y-4">
          <h3 className="font-heading font-bold text-sm text-[#202820] flex items-center gap-2">
            <Clock className="text-[#355C40]" size={18} />
            <span>Perishable Shelf-Life Decision Thresholds</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#202820] mb-1">
                Critical Shelf Life (Hours)
              </label>
              <input
                type="number"
                min="6"
                max="168"
                required
                value={formData.criticalShelfLifeHours}
                onChange={(e) => setFormData({ ...formData, criticalShelfLifeHours: parseInt(e.target.value, 10) || 48 })}
                className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
              />
              <span className="text-[10px] text-[#687267] mt-0.5 block">Trigger for At-Risk and Markdown</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202820] mb-1">
                Warning Threshold (Hours)
              </label>
              <input
                type="number"
                min="12"
                max="336"
                required
                value={formData.warningShelfLifeHours}
                onChange={(e) => setFormData({ ...formData, warningShelfLifeHours: parseInt(e.target.value, 10) || 96 })}
                className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
              />
              <span className="text-[10px] text-[#687267] mt-0.5 block">Trigger for early inventory warning</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202820] mb-1">
                Default Freight Cost/kg ({formData.defaultCurrency})
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formData.defaultTransportCostPerKg}
                onChange={(e) => setFormData({ ...formData, defaultTransportCostPerKg: parseFloat(e.target.value) || 0.18 })}
                className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
              />
              <span className="text-[10px] text-[#687267] mt-0.5 block">Default refrigerated route rate</span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-[#243D2B] text-white text-xs font-semibold rounded-lg hover:bg-[#1D3223] transition-colors disabled:opacity-50"
            >
              <Save size={15} />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Synthetic Demonstration Dataset Management */}
      <div className="bg-white p-6 rounded-xl border border-[#E2E6DC] shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-heading font-bold text-sm text-[#202820] flex items-center gap-2">
              <Database className="text-[#355C40]" size={18} />
              <span>Demonstration Dataset Management</span>
            </h3>
            <p className="text-xs text-[#687267] mt-1">
              Reset all inventory batches, destinations, and allocations to the verified Gujarat APMC & Cold-Chain Corridor benchmark dataset.
            </p>
          </div>

          <button
            onClick={handleResetDemoData}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#F4F0E6] hover:bg-[#D8E5C3] text-[#243D2B] border border-[#E2E6DC] rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 shrink-0"
          >
            <RefreshCw size={14} className={isResetting ? 'animate-spin' : ''} />
            <span>Reset Demo Data</span>
          </button>
        </div>

        {resetSuccess && (
          <div className="p-3 bg-[#243D2B] text-white rounded-lg text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={15} className="text-[#D8E5C3]" />
            <span>{resetSuccess}</span>
          </div>
        )}

        {/* Backend Runtime Status */}
        <div className="pt-2 border-t border-[#E2E6DC] flex items-center justify-between text-xs text-[#687267]">
          <div className="flex items-center gap-2">
            <Cpu size={14} className="text-[#355C40]" />
            <span>API Engine: {healthStatus?.status || 'Active'}</span>
            <span aria-hidden="true">·</span>
            <span>{healthStatus?.phase || 'Production Engine'}</span>
          </div>
          <span className="font-mono text-[11px] text-[#687267]">
            Local Port 3000 / SQLite Compatible
          </span>
        </div>
      </div>
    </div>
  );
};
