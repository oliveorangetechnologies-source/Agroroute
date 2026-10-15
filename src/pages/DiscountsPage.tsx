import React, { useState, useEffect } from 'react';
import {
  Tag,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingDown,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Percent,
  Sliders,
  Info,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { DiscountScenario, InventoryBatch } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const DiscountsPage: React.FC = () => {
  const { company } = useAuth();
  const [scenarios, setScenarios] = useState<DiscountScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [scenarioMode, setScenarioMode] = useState<'both' | 'elastic' | 'conservative'>('both');
  const [applyingBatchId, setApplyingBatchId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.optimization.getDiscountScenarios();
      setScenarios(data);
    } catch (err) {
      console.error('Failed loading discount scenarios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currency = company?.defaultCurrency || '$';

  const handleApplyDiscount = async (batchId: string, percent: number) => {
    setApplyingBatchId(batchId);
    try {
      await api.discounts.apply(batchId, percent);
      setSuccessToast(`Applied ${percent}% markdown to batch ${batchId}. Synchronized with LP Distribution Optimizer.`);
      await loadData();
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      alert(`Failed to apply discount: ${err.message}`);
    } finally {
      setApplyingBatchId(null);
    }
  };

  const totalAtRiskVolume = scenarios.reduce((sum, s) => sum + s.availableQuantityKg, 0);
  const totalConservativeSalvage = scenarios.reduce((sum, s) => sum + s.withoutElasticity.netSalvageValue, 0);
  const totalElasticSalvage = scenarios.reduce((sum, s) => sum + s.withElasticity.netSalvageValue, 0);
  const totalAvoidedWaste = scenarios.reduce((sum, s) => sum + s.withElasticity.estimatedSpoilageAvoidedKg, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#E2E6DC]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-extrabold text-[#243D2B]">
              Perishable Markdowns & Spoilage Avoidance
            </h1>
            <span className="text-[10px] font-bold tracking-widest text-[#243D2B] bg-[#D8E5C3] px-2 py-0.5 rounded uppercase">
              Decay Engine
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#687267] mt-1">
            <span>Rule-based perishable salvage optimization</span>
            <span aria-hidden="true">·</span>
            <span>Explicit demand-response elasticity scenarios</span>
            <span aria-hidden="true">·</span>
            <span>Zero Food Waste Directive</span>
          </div>
        </div>

        {/* Scenario Mode Toggle */}
        <div className="flex items-center gap-1 bg-[#F4F0E6] p-1 rounded-lg border border-[#E2E6DC] text-xs">
          <button
            onClick={() => setScenarioMode('both')}
            className={`px-3 py-1 font-medium rounded transition-colors ${
              scenarioMode === 'both' ? 'bg-white text-[#243D2B] font-bold shadow-xs' : 'text-[#687267] hover:text-[#202820]'
            }`}
          >
            Comparative View
          </button>
          <button
            onClick={() => setScenarioMode('conservative')}
            className={`px-3 py-1 font-medium rounded transition-colors ${
              scenarioMode === 'conservative' ? 'bg-white text-[#243D2B] font-bold shadow-xs' : 'text-[#687267] hover:text-[#202820]'
            }`}
          >
            Fixed Demand (Conservative)
          </button>
          <button
            onClick={() => setScenarioMode('elastic')}
            className={`px-3 py-1 font-medium rounded transition-colors ${
              scenarioMode === 'elastic' ? 'bg-white text-[#243D2B] font-bold shadow-xs' : 'text-[#687267] hover:text-[#202820]'
            }`}
          >
            Elastic Demand (ε = -1.2)
          </button>
        </div>
      </div>

      {/* Assumptions & Methodology Callout */}
      <div className="bg-[#F8FAF7] border border-[#E2E6DC] rounded-xl p-4 text-xs text-[#202820] space-y-2">
        <div className="flex items-center gap-2 font-heading font-bold text-xs text-[#243D2B]">
          <Info size={16} className="text-[#355C40]" />
          <span>Economic Methodology & Scenario Assumptions:</span>
        </div>
        <p className="text-[#687267] text-[11px] leading-relaxed">
          Discounts do not automatically generate new sales. AgroRoute models two transparent, documented pathways:
          <strong> (1) Conservative Scenario:</strong> Assumes fixed wholesale demand capacity and calculates recovery strictly from liquidation within existing partner channels.
          <strong> (2) Demand-Responsive Scenario:</strong> Applies an empirical price elasticity coefficient (<span className="font-mono text-[#243D2B]">ε = -1.2</span>) to simulate accelerated clearance through price-sensitive institutional commissaries and regional food relief banks.
        </p>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E2E6DC] shadow-xs">
          <span className="text-[11px] font-semibold uppercase text-[#687267]">At-Risk Produce Volume</span>
          <div className="text-xl font-heading font-bold text-[#202820] mt-1 tabular-nums">
            {totalAtRiskVolume.toLocaleString()} <span className="text-xs font-normal text-[#687267]">kg</span>
          </div>
          <div className="text-[11px] text-[#E78B45] font-medium mt-0.5">
            {scenarios.length} batches &lt; threshold
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E6DC] shadow-xs">
          <span className="text-[11px] font-semibold uppercase text-[#687267]">Conservative Salvage</span>
          <div className="text-xl font-heading font-bold text-[#243D2B] mt-1 tabular-nums">
            {currency}{totalConservativeSalvage.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#687267] mt-0.5">
            Fixed demand scenario
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E6DC] shadow-xs">
          <span className="text-[11px] font-semibold uppercase text-[#687267]">Elastic Market Salvage</span>
          <div className="text-xl font-heading font-bold text-[#355C40] mt-1 tabular-nums">
            {currency}{totalElasticSalvage.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#355C40] font-medium mt-0.5">
            +{currency}{(totalElasticSalvage - totalConservativeSalvage).toLocaleString()} potential lift
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E6DC] shadow-xs">
          <span className="text-[11px] font-semibold uppercase text-[#687267]">Projected Waste Prevented</span>
          <div className="text-xl font-heading font-bold text-[#355C40] mt-1 tabular-nums">
            {totalAvoidedWaste.toLocaleString()} <span className="text-xs font-normal text-[#687267]">kg</span>
          </div>
          <div className="text-[11px] text-[#355C40] font-medium mt-0.5">
            Diverted from landfill disposal
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="p-3 bg-[#243D2B] text-white rounded-lg text-xs font-semibold flex items-center gap-2 border border-[#355C40] animate-in fade-in">
          <CheckCircle2 size={16} className="text-[#D8E5C3]" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Scenarios Cards List */}
      <div className="space-y-4">
        {scenarios.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-[#E2E6DC] text-xs text-[#687267]">
            <CheckCircle2 size={36} className="mx-auto mb-2 text-[#355C40]" />
            <div className="font-heading font-bold text-sm text-[#202820]">
              Zero Perishable Batches Require Markdown
            </div>
            <div className="mt-1">
              All warehouse inventory is above the {company?.criticalShelfLifeHours || 48}h shelf-life threshold.
            </div>
          </div>
        ) : (
          scenarios.map((item) => {
            const isUrgent = item.urgency === 'critical';

            return (
              <div
                key={item.batchId}
                className={`bg-white rounded-xl border p-5 shadow-xs transition-colors ${
                  isUrgent ? 'border-[#E78B45]/50' : 'border-[#E2E6DC]'
                }`}
              >
                {/* Header Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E6DC]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isUrgent
                          ? 'bg-[#E78B45]/15 text-[#E78B45] border border-[#E78B45]/30'
                          : 'bg-[#D8E5C3] text-[#243D2B]'
                      }`}>
                        {item.urgency.toUpperCase()}
                      </span>
                      <span className="font-heading font-bold text-base text-[#202820]">
                        {item.commodityName}
                      </span>
                      <span className="text-[11px] font-mono text-[#687267]">{item.batchId}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#687267] mt-1">
                      <span>{item.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-[#202820] tabular-nums">{item.availableQuantityKg.toLocaleString()} kg available</span>
                      <span aria-hidden="true">·</span>
                      <span className={`font-semibold tabular-nums ${isUrgent ? 'text-[#E78B45]' : 'text-[#355C40]'}`}>
                        {item.remainingShelfLifeHours} hours remaining
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-start sm:self-auto">
                    <div className="text-right">
                      <div className="text-xs text-[#687267]">Recommended Markdown:</div>
                      <div className="font-heading font-extrabold text-base text-[#E78B45] tabular-nums">
                        {item.suggestedDiscountPercent}% OFF
                      </div>
                    </div>

                    <button
                      onClick={() => handleApplyDiscount(item.batchId, item.suggestedDiscountPercent)}
                      disabled={applyingBatchId === item.batchId}
                      className="px-4 py-2 bg-[#243D2B] hover:bg-[#1D3223] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors whitespace-nowrap disabled:opacity-50"
                    >
                      {applyingBatchId === item.batchId ? 'Applying...' : 'Apply Markdown'}
                    </button>
                  </div>
                </div>

                {/* Pricing Equation Strip */}
                <div className="py-3 border-b border-[#E2E6DC] flex flex-wrap items-center justify-between gap-3 text-xs bg-[#F8FAF7] px-4 rounded-lg my-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[#687267]">Standard Wholesale:</span>
                    <span className="font-semibold text-[#202820] tabular-nums">{currency}{item.normalSellingPrice.toFixed(2)}/kg</span>
                    <span className="text-[#687267]">→ Markdown Price:</span>
                    <span className="font-bold text-[#E78B45] tabular-nums">{currency}{item.discountedSellingPrice.toFixed(2)}/kg</span>
                  </div>
                  <div className="text-[#687267] text-[11px]">
                    Acquisition Unit Cost: <strong className="text-[#202820]">{currency}{item.unitCost.toFixed(2)}/kg</strong>
                  </div>
                </div>

                {/* Scenario Comparison Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                  {/* Scenario A: Conservative */}
                  {(scenarioMode === 'both' || scenarioMode === 'conservative') && (
                    <div className="p-4 bg-white rounded-lg border border-[#E2E6DC] space-y-2">
                      <div className="flex items-center justify-between font-semibold text-[#202820]">
                        <span>Scenario A: Fixed Demand (Conservative)</span>
                        <span className="text-[10px] text-[#687267] bg-[#F4F0E6] px-1.5 py-0.5 rounded">No Elasticity</span>
                      </div>
                      <div className="space-y-1 text-[#687267]">
                        <div className="flex justify-between">
                          <span>Projected Sell-Through:</span>
                          <span className="font-mono text-[#202820] font-semibold">{item.withoutElasticity.projectedSellThroughKg.toLocaleString()} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Gross Clearance Revenue:</span>
                          <span className="font-mono text-[#202820]">+{currency}{item.withoutElasticity.estimatedRevenue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Net Salvage Capital:</span>
                          <span className="font-mono text-[#243D2B] font-bold">+{currency}{item.withoutElasticity.netSalvageValue.toLocaleString()}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-[#687267] pt-1 border-t border-[#E2E6DC]">
                        {item.withoutElasticity.interpretation}
                      </p>
                    </div>
                  )}

                  {/* Scenario B: Elastic Demand */}
                  {(scenarioMode === 'both' || scenarioMode === 'elastic') && (
                    <div className="p-4 bg-[#F8FAF7] rounded-lg border border-[#355C40]/30 space-y-2">
                      <div className="flex items-center justify-between font-semibold text-[#202820]">
                        <span>Scenario B: Demand-Responsive (Elasticity)</span>
                        <span className="text-[10px] font-mono text-[#355C40] bg-[#D8E5C3] px-1.5 py-0.5 rounded font-bold">ε = -1.2</span>
                      </div>
                      <div className="space-y-1 text-[#687267]">
                        <div className="flex justify-between">
                          <span>Projected Sell-Through:</span>
                          <span className="font-mono text-[#355C40] font-bold">{item.withElasticity.projectedSellThroughKg.toLocaleString()} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Waste Avoided:</span>
                          <span className="font-mono text-[#355C40] font-semibold">+{item.withElasticity.estimatedSpoilageAvoidedKg.toLocaleString()} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Net Salvage Capital:</span>
                          <span className="font-mono text-[#355C40] font-bold">+{currency}{item.withElasticity.netSalvageValue.toLocaleString()}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-[#355C40] font-medium pt-1 border-t border-[#E2E6DC]">
                        {item.withElasticity.demandNote}
                      </p>
                    </div>
                  )}
                </div>

                {/* Reason & Audit Trail */}
                <div className="mt-3 pt-3 border-t border-[#E2E6DC] text-[11px] text-[#687267] flex items-center justify-between">
                  <div>
                    <strong className="text-[#202820]">Rule Trigger: </strong>
                    <span>{item.reason}</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#687267]">
                    Calculated against cold storage decay rate
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
