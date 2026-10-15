import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  Bell,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Database,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';

interface TopBarProps {
  currentPath: string;
  isCollapsed: boolean;
  onRefreshData?: () => void;
  onSearchSelect?: (type: 'batch' | 'destination', id: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentPath,
  isCollapsed,
  onRefreshData,
  onSearchSelect,
}) => {
  const { company } = useAuth();
  const [isResetting, setIsResetting] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ type: 'batch' | 'destination'; id: string; label: string; sub: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Compute breadcrumbs
  const getBreadcrumbs = () => {
    const map: Record<string, string> = {
      '/dashboard': 'Operational Overview',
      '/inventory': 'Produce Inventory Management',
      '/destinations': 'Destination Markets & Demands',
      '/distribution': 'Perishable Dispatch Planning',
      '/discounts': 'Dynamic Markdowns & Spoilage Prevention',
      '/reports': 'Executive Logistics Reports',
      '/settings': 'Logistics Configuration',
      '/onboarding': 'Organization Setup',
    };
    return map[currentPath] || 'AgroRoute Logistics';
  };

  const handleResetDemoData = async () => {
    if (!window.confirm('Reset database to pristine Gujarat APMC agricultural corridor dataset? All manual modifications will be re-initialized.')) {
      return;
    }
    setIsResetting(true);
    try {
      const res = await api.demo.reset();
      setResetMessage('Database restored to pristine Gujarat agricultural demonstration dataset.');
      if (onRefreshData) onRefreshData();
      setTimeout(() => setResetMessage(null), 4000);
    } catch (err: any) {
      alert(`Reset error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const [batches, destinations] = await Promise.all([
        api.inventory.getAll({ search: val }),
        api.destinations.getAll(),
      ]);

      const filteredDest = destinations.filter(
        d => d.name.toLowerCase().includes(val.toLowerCase()) || d.location.toLowerCase().includes(val.toLowerCase())
      );

      const results = [
        ...batches.slice(0, 4).map(b => ({
          type: 'batch' as const,
          id: b.id,
          label: `${b.commodityName} (${b.id})`,
          sub: `${b.availableQuantityKg} kg available · ${b.remainingShelfLifeHours}h shelf life remaining`,
        })),
        ...filteredDest.slice(0, 4).map(d => ({
          type: 'destination' as const,
          id: d.id,
          label: d.name,
          sub: `${d.location} · ${d.estimatedTravelHours}h transit time`,
        })),
      ];

      setSearchResults(results);
    } catch {
      // ignore
    }
  };

  return (
    <header
      className={`fixed top-0 right-0 z-20 h-16 bg-[#FFFFFF] border-b border-[#E2E6DC] flex items-center justify-between px-6 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'left-20' : 'left-64'
      }`}
    >
      {/* Left: Breadcrumb Trail */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-heading font-semibold text-[#243D2B]">AgroRoute</span>
        <span className="text-[#687267]">/</span>
        <span className="font-medium text-[#202820]">{getBreadcrumbs()}</span>
      </div>

      {/* Center & Right Actions */}
      <div className="flex items-center gap-4">
        {/* Global Search Bar */}
        <div className="relative hidden md:block w-72">
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3 text-[#687267] pointer-events-none" />
            <input
              type="text"
              placeholder="Search produce batches, hubs..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery && setIsSearching(true)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg text-[#202820] placeholder-[#687267] focus:outline-none focus:border-[#355C40] focus:ring-1 focus:ring-[#355C40]"
            />
          </div>

          {/* Quick search dropdown */}
          {isSearching && searchResults.length > 0 && (
            <div className="absolute top-10 left-0 right-0 bg-white border border-[#E2E6DC] rounded-lg shadow-lg z-50 overflow-hidden py-1">
              <div className="px-3 py-1 text-[11px] font-semibold text-[#687267] bg-[#F4F0E6]/50">
                Quick Results
              </div>
              {searchResults.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => {
                    if (onSearchSelect) onSearchSelect(item.type, item.id);
                    setIsSearching(false);
                    setSearchQuery('');
                  }}
                  className="px-3 py-2 hover:bg-[#F4F0E6] cursor-pointer text-xs transition-colors border-b border-[#E2E6DC]/40 last:border-b-0"
                >
                  <div className="font-medium text-[#202820]">{item.label}</div>
                  <div className="text-[11px] text-[#687267]">{item.sub}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Demo Seed Reset Action */}
        <button
          onClick={handleResetDemoData}
          disabled={isResetting}
          title="Reset to pristine Gujarat APMC agricultural corridor demonstration data"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#243D2B] bg-[#F4F0E6] hover:bg-[#D8E5C3] border border-[#E2E6DC] rounded-lg transition-colors whitespace-nowrap"
        >
          <RefreshCw size={14} className={isResetting ? 'animate-spin' : ''} />
          <span>Reset Demo Data</span>
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotification(!showNotification)}
            className="p-2 text-[#687267] hover:text-[#243D2B] hover:bg-[#F4F0E6] rounded-lg transition-colors relative"
            title="Operational Alerts"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E78B45] rounded-full"></span>
          </button>

          {showNotification && (
            <div className="absolute right-0 top-11 w-80 bg-white border border-[#E2E6DC] rounded-lg shadow-xl z-50 p-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2E6DC]">
                <span className="font-heading font-semibold text-xs text-[#202820]">
                  Logistics Freshness Alerts
                </span>
                <span className="text-[11px] text-[#E78B45] font-medium">Active</span>
              </div>
              <div className="py-2 space-y-2 text-xs">
                <div className="flex items-start gap-2 p-2 bg-[#FFF9F3] border border-[#E78B45]/20 rounded">
                  <AlertTriangle size={15} className="text-[#E78B45] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-[#202820]">Strawberries (BATCH-2026-081)</div>
                    <div className="text-[11px] text-[#687267]">32 hours remaining before spoilage threshold. Priority dispatch required.</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 bg-[#FFF9F3] border border-[#E78B45]/20 rounded">
                  <AlertTriangle size={15} className="text-[#E78B45] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-[#202820]">Blackberries (BATCH-2026-088)</div>
                    <div className="text-[11px] text-[#687267]">26 hours remaining. 25% salvage markdown active.</div>
                  </div>
                </div>
              </div>
              <div className="pt-2 text-[11px] text-center text-[#687267] border-t border-[#E2E6DC]">
                All data refreshed continuously against cold storage sensors.
              </div>
            </div>
          )}
        </div>

        {/* Region & Time Capsule */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-[#687267] border-l border-[#E2E6DC] pl-4">
          <Clock size={14} className="text-[#355C40]" />
          <span>Pacific Logistics Window</span>
        </div>
      </div>

      {/* Floating Toast when Demo Data is Reset */}
      {resetMessage && (
        <div className="absolute top-20 right-6 z-50 flex items-center gap-2 bg-[#243D2B] text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-medium border border-[#355C40] animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={16} className="text-[#D8E5C3]" />
          <span>{resetMessage}</span>
        </div>
      )}
    </header>
  );
};
