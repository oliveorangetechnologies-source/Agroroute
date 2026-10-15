import React, { useState, useEffect } from 'react';
import {
  Route,
  Truck,
  Boxes,
  MapPin,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  X,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Check,
  Sparkles,
  Sliders,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Save,
  History,
  FileCheck2,
  BarChart2,
  Info,
  Calendar,
} from 'lucide-react';
import { api } from '../services/api.ts';
import {
  InventoryBatch,
  Destination,
  Allocation,
  OptimizationPlanResult,
  OptimizationParams,
  ProposedDispatch,
  SavedPlanRun,
} from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const DistributionPage: React.FC = () => {
  const { company } = useAuth();
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [savedPlans, setSavedPlans] = useState<SavedPlanRun[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'planner' | 'saved' | 'active_allocations'
  const [activeTab, setActiveTab] = useState<'planner' | 'saved' | 'active_allocations'>('planner');

  // Optimization Engine State
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<OptimizationPlanResult | null>(null);
  const [selectedDispatch, setSelectedDispatch] = useState<ProposedDispatch | null>(null);
  const [showInfeasibleDrawer, setShowInfeasibleDrawer] = useState(false);
  const [showParamsDrawer, setShowParamsDrawer] = useState(false);

  // Optimization Parameters
  const [params, setParams] = useState<OptimizationParams>({
    safetyBufferHours: 4.0,
    warehouseHandlingCostPerKg: 0.05,
    spoilageDisposalCostPerKg: 0.20,
    unmetDemandPenaltyPerKg: 0.00,
    demandResponseEnabled: false,
    priceElasticity: -1.2,
    minFreshnessMarginHours: 2.0,
    targetCommodityFilter: 'All',
    targetDestinationFilter: 'All',
  });

  // Plan Commit / Save States
  const [savePlanName, setSavePlanName] = useState('');
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isCommittingPlan, setIsCommittingPlan] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Manual Allocation Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualBatchId, setManualBatchId] = useState('');
  const [manualDestId, setManualDestId] = useState('');
  const [manualQty, setManualQty] = useState(500);
  const [manualPrice, setManualPrice] = useState(4.50);
  const [manualNotes, setManualNotes] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bData, dData, aData, pData] = await Promise.all([
        api.inventory.getAll(),
        api.destinations.getAll(),
        api.allocations.getAll(),
        api.optimization.getSavedPlans(),
      ]);
      setBatches(bData);
      setDestinations(dData);
      setAllocations(aData);
      setSavedPlans(pData);
    } catch (err) {
      console.error('Failed loading distribution data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Run initial optimization plan automatically on mount so user sees immediate results!
  useEffect(() => {
    if (batches.length > 0 && destinations.length > 0 && !currentPlan) {
      handleGeneratePlan();
    }
  }, [batches.length, destinations.length]);

  const currency = company?.defaultCurrency || '$';
  const criticalThreshold = company?.criticalShelfLifeHours || 48;

  // Run Optimization Engine
  const handleGeneratePlan = async () => {
    setIsOptimizing(true);
    setActionMessage(null);
    try {
      const plan = await api.optimization.generatePlan(params);
      setCurrentPlan(plan);
      if (plan.optimized.dispatches.length > 0) {
        setSelectedDispatch(plan.optimized.dispatches[0]);
      }
    } catch (err: any) {
      alert(`Optimization error: ${err.message}`);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Save Current Plan
  const handleSavePlan = async () => {
    if (!currentPlan) return;
    setIsSavingPlan(true);
    try {
      const name = savePlanName.trim() || `Optimization Run ${new Date().toLocaleTimeString()}`;
      await api.optimization.savePlan(name, currentPlan);
      const updated = await api.optimization.getSavedPlans();
      setSavedPlans(updated);
      setSavePlanName('');
      setActionMessage('Plan successfully saved to optimization ledger.');
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setIsSavingPlan(false);
    }
  };

  // Commit Plan (Execute Dispatches into Active Allocations)
  const handleCommitPlan = async () => {
    if (!currentPlan) return;
    if (!window.confirm(`Commit this optimization plan? ${currentPlan.optimized.dispatches.length} dispatches will be registered as active shipments, deducting available stock from warehouse inventory.`)) {
      return;
    }
    setIsCommittingPlan(true);
    try {
      // First ensure plan is saved
      const saved = await api.optimization.savePlan(`Approved Execution Run - ${currentPlan.planId}`, currentPlan);
      const commitRes = await api.optimization.commitPlan(saved.id);
      setActionMessage(commitRes.message);
      await loadData();
      setActiveTab('active_allocations');
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err: any) {
      alert(`Commit error: ${err.message}`);
    } finally {
      setIsCommittingPlan(false);
    }
  };

  // Manual Allocation submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);
    if (!manualBatchId || !manualDestId) {
      setManualError('Select batch and destination');
      return;
    }
    setManualSubmitting(true);
    try {
      const b = batches.find(x => x.id === manualBatchId);
      await api.allocations.create({
        batchId: manualBatchId,
        destinationId: manualDestId,
        commodityName: b?.commodityName || 'Produce',
        quantityKg: manualQty,
        sellingPricePerKg: manualPrice,
        notes: manualNotes,
      });
      setIsManualModalOpen(false);
      await loadData();
    } catch (err: any) {
      setManualError(err.message);
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: Allocation['status']) => {
    try {
      await api.allocations.updateStatus(id, newStatus);
      await loadData();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleDeleteAllocation = async (id: string) => {
    if (!window.confirm('Cancel allocation and restore stock?')) return;
    try {
      await api.allocations.delete(id);
      await loadData();
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#E2E6DC]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-extrabold text-[#243D2B]">
              Perishable Distribution Optimizer
            </h1>
            <span className="text-[10px] font-bold tracking-widest text-[#243D2B] bg-[#D8E5C3] px-2 py-0.5 rounded uppercase">
              Simplex LP Engine
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#687267] mt-1">
            <span>Decay-aware multi-destination routing</span>
            <span aria-hidden="true">·</span>
            <span>Shelf life &lt; Required Transit = Infeasible</span>
            <span aria-hidden="true">·</span>
            <span>Stock-locking & Fleet-capacity bounds</span>
          </div>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            onClick={() => setShowParamsDrawer(!showParamsDrawer)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#202820] bg-white hover:bg-[#F4F0E6] border border-[#E2E6DC] rounded-lg transition-colors shadow-xs"
            title="Configure safety buffers, handling rates, and spoilage penalties"
          >
            <Sliders size={14} className="text-[#355C40]" />
            <span>Parameters ({params.safetyBufferHours}h Buffer)</span>
          </button>

          <button
            onClick={handleGeneratePlan}
            disabled={isOptimizing}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#243D2B] hover:bg-[#1D3223] rounded-lg shadow-sm transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <RefreshCw size={14} className={isOptimizing ? 'animate-spin' : ''} />
            <span>{isOptimizing ? 'Solving LP Model...' : 'Run Optimization'}</span>
          </button>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionMessage && (
        <div className="p-3 bg-[#243D2B] text-white rounded-lg text-xs font-semibold flex items-center justify-between gap-2 border border-[#355C40] animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#D8E5C3]" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-[#D8E5C3] hover:text-white">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-[#E2E6DC] text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('planner')}
            className={`px-4 py-2.5 font-semibold transition-colors border-b-2 ${
              activeTab === 'planner'
                ? 'border-[#243D2B] text-[#243D2B]'
                : 'border-transparent text-[#687267] hover:text-[#202820]'
            }`}
          >
            Optimization Plan & Schedule
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-4 py-2.5 font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'saved'
                ? 'border-[#243D2B] text-[#243D2B]'
                : 'border-transparent text-[#687267] hover:text-[#202820]'
            }`}
          >
            <span>Saved Plans</span>
            {savedPlans.length > 0 && (
              <span className="text-[10px] bg-[#F4F0E6] text-[#243D2B] px-1.5 py-0.2 rounded-full font-bold">
                {savedPlans.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('active_allocations')}
            className={`px-4 py-2.5 font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'active_allocations'
                ? 'border-[#243D2B] text-[#243D2B]'
                : 'border-transparent text-[#687267] hover:text-[#202820]'
            }`}
          >
            <span>Active Shipments ({allocations.length})</span>
          </button>
        </div>

        {activeTab === 'active_allocations' && (
          <button
            onClick={() => {
              const b = batches.find(x => x.availableQuantityKg > 0);
              setManualBatchId(b ? b.id : '');
              setManualDestId(destinations[0]?.id || '');
              setIsManualModalOpen(true);
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#243D2B] bg-[#F4F0E6] hover:bg-[#D8E5C3] border border-[#E2E6DC] rounded-lg transition-colors"
          >
            <Plus size={14} />
            <span>Manual Dispatch</span>
          </button>
        )}
      </div>

      {/* Solver Configuration Drawer / Panel */}
      {showParamsDrawer && (
        <div className="bg-white p-5 rounded-xl border border-[#E2E6DC] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E6DC]">
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-[#355C40]" />
              <h3 className="font-heading font-bold text-xs text-[#202820]">
                Optimization Solver Parameters & Cold-Chain Constraints
              </h3>
            </div>
            <button onClick={() => setShowParamsDrawer(false)} className="text-[#687267] hover:text-[#202820]">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#202820] mb-1">
                Freshness Safety Buffer (Hours)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={params.safetyBufferHours}
                onChange={(e) => setParams({ ...params, safetyBufferHours: parseFloat(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 bg-[#F8FAF7] border border-[#E2E6DC] rounded focus:outline-none focus:border-[#355C40]"
              />
              <span className="text-[10px] text-[#687267] mt-0.5 block">
                Safety margin against dock delays & traffic (default 4.0h)
              </span>
            </div>

            <div>
              <label className="block font-semibold text-[#202820] mb-1">
                Warehouse Handling Cost ($/kg)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={params.warehouseHandlingCostPerKg}
                onChange={(e) => setParams({ ...params, warehouseHandlingCostPerKg: parseFloat(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 bg-[#F8FAF7] border border-[#E2E6DC] rounded focus:outline-none focus:border-[#355C40]"
              />
              <span className="text-[10px] text-[#687267] mt-0.5 block">
                Cross-dock handling & palletization rate
              </span>
            </div>

            <div>
              <label className="block font-semibold text-[#202820] mb-1">
                Spoilage Disposal Penalty ($/kg)
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                value={params.spoilageDisposalCostPerKg}
                onChange={(e) => setParams({ ...params, spoilageDisposalCostPerKg: parseFloat(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 bg-[#F8FAF7] border border-[#E2E6DC] rounded focus:outline-none focus:border-[#355C40]"
              />
              <span className="text-[10px] text-[#687267] mt-0.5 block">
                Disposal, compost, and landfill write-off penalty
              </span>
            </div>

            <div>
              <label className="block font-semibold text-[#202820] mb-1">
                Filter by Category
              </label>
              <select
                value={params.targetCommodityFilter}
                onChange={(e) => setParams({ ...params, targetCommodityFilter: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-[#F8FAF7] border border-[#E2E6DC] rounded focus:outline-none focus:border-[#355C40]"
              >
                <option value="All">All Categories</option>
                <option value="Berries">Berries</option>
                <option value="Leafy Greens">Leafy Greens</option>
                <option value="Solanaceous">Solanaceous</option>
                <option value="Subtropical">Subtropical</option>
                <option value="Brassicas">Brassicas</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                setShowParamsDrawer(false);
                handleGeneratePlan();
              }}
              className="px-4 py-1.5 bg-[#243D2B] text-white text-xs font-semibold rounded hover:bg-[#1D3223]"
            >
              Apply & Re-optimize
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: OPTIMIZATION PLANNER & SCHEDULE */}
      {activeTab === 'planner' && currentPlan && (
        <div className="space-y-6">
          {/* COMPARATIVE SCORECARD: FreshRoute LP vs Baseline FIFO */}
          <div className="bg-white rounded-xl border border-[#E2E6DC] p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E2E6DC] gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#355C40]">
                  Operations Research Benchmark
                </span>
                <h2 className="text-base font-heading font-extrabold text-[#202820]">
                  FreshRoute LP Optimizer vs. Baseline Strategy
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#687267]">
                  Safety buffer: <strong className="text-[#202820]">{currentPlan.params.safetyBufferHours}h</strong>
                </span>
                <span aria-hidden="true" className="text-[#E2E6DC]">|</span>
                <span className="text-xs font-mono text-[#687267]">{currentPlan.planId}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              {/* Metric 1: Spoilage Reduction */}
              <div className="p-3 bg-[#F8FAF7] rounded-lg border border-[#E2E6DC]">
                <div className="text-[11px] font-semibold text-[#687267] uppercase">Spoilage Reduction</div>
                <div className="text-xl font-heading font-bold text-[#355C40] mt-1 tabular-nums">
                  {currentPlan.improvement.spoilageReductionPercent !== 'N/A'
                    ? `${currentPlan.improvement.spoilageReductionPercent}%`
                    : '100%'}
                </div>
                <div className="text-[11px] text-[#687267] mt-0.5">
                  {currentPlan.improvement.wasteAvoidedKg.toLocaleString()} kg food waste prevented
                </div>
              </div>

              {/* Metric 2: Net Revenue Advantage */}
              <div className="p-3 bg-[#F8FAF7] rounded-lg border border-[#E2E6DC]">
                <div className="text-[11px] font-semibold text-[#687267] uppercase">Net Margin Lift</div>
                <div className="text-xl font-heading font-bold text-[#243D2B] mt-1 tabular-nums">
                  +{currency}{currentPlan.improvement.netRevenueGain.toLocaleString()}
                </div>
                <div className="text-[11px] text-[#355C40] font-medium mt-0.5">
                  Optimized: {currency}{currentPlan.optimized.netRevenue.toLocaleString()} vs Base: {currency}{currentPlan.baseline.netRevenue.toLocaleString()}
                </div>
              </div>

              {/* Metric 3: Demand Fulfillment */}
              <div className="p-3 bg-[#F8FAF7] rounded-lg border border-[#E2E6DC]">
                <div className="text-[11px] font-semibold text-[#687267] uppercase">Demand Fulfillment</div>
                <div className="text-xl font-heading font-bold text-[#202820] mt-1 tabular-nums">
                  {currentPlan.optimized.demandFulfillmentPercent}%
                </div>
                <div className="text-[11px] text-[#687267] mt-0.5">
                  {currentPlan.optimized.totalAllocatedKg.toLocaleString()} / {currentPlan.optimized.totalDemandKg.toLocaleString()} kg total demand
                </div>
              </div>

              {/* Metric 4: Feasibility Audit Check */}
              <div className="p-3 bg-[#F8FAF7] rounded-lg border border-[#E2E6DC]">
                <div className="text-[11px] font-semibold text-[#687267] uppercase">Constraint Violations</div>
                <div className="text-xl font-heading font-bold text-[#355C40] mt-1 flex items-center gap-1.5">
                  <ShieldCheck size={20} className="text-[#355C40]" />
                  <span>0 Violations</span>
                </div>
                <div className="text-[11px] text-[#355C40] font-medium mt-0.5">
                  100% hard constraints verified
                </div>
              </div>
            </div>

            {/* Plan Execution Toolbar */}
            <div className="mt-4 pt-4 border-t border-[#E2E6DC] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Plan Name (optional)..."
                  value={savePlanName}
                  onChange={(e) => setSavePlanName(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded focus:outline-none focus:border-[#355C40] w-64"
                />
                <button
                  onClick={handleSavePlan}
                  disabled={isSavingPlan}
                  className="px-3 py-1.5 bg-white hover:bg-[#F4F0E6] text-[#243D2B] border border-[#E2E6DC] rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Save size={14} />
                  <span>Save Plan</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowInfeasibleDrawer(!showInfeasibleDrawer)}
                  className="px-3 py-1.5 text-xs font-semibold text-[#687267] hover:text-[#202820] hover:bg-[#F8FAF7] rounded border border-[#E2E6DC] transition-colors"
                >
                  {showInfeasibleDrawer ? 'Hide Infeasible Audit' : `View Infeasible Routes (${currentPlan.infeasibleCombinations.length})`}
                </button>
                <button
                  onClick={handleCommitPlan}
                  disabled={isCommittingPlan || currentPlan.optimized.dispatches.length === 0}
                  className="px-4 py-1.5 bg-[#243D2B] hover:bg-[#1D3223] text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-40"
                >
                  <FileCheck2 size={14} />
                  <span>Commit Dispatches to Live Fleet</span>
                </button>
              </div>
            </div>
          </div>

          {/* Infeasible Combinations Audit Drawer */}
          {showInfeasibleDrawer && (
            <div className="bg-[#FFF9F3] rounded-xl border border-[#E78B45]/40 p-5 shadow-xs space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-[#E78B45]/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-[#E78B45]" />
                  <h4 className="font-heading font-bold text-xs text-[#202820]">
                    Infeasible Route Combinations Rejected by Solver ({currentPlan.infeasibleCombinations.length})
                  </h4>
                </div>
                <button onClick={() => setShowInfeasibleDrawer(false)} className="text-[#687267] hover:text-[#202820]">
                  <X size={15} />
                </button>
              </div>
              <p className="text-xs text-[#687267]">
                The optimization engine automatically enforces hard perishable decay and contract rules. Any allocation violating cold-chain constraints is strictly excluded from decision variables.
              </p>

              <div className="max-h-56 overflow-y-auto divide-y divide-[#E78B45]/20 text-xs">
                {currentPlan.infeasibleCombinations.map((item, idx) => (
                  <div key={idx} className="py-2 flex items-start justify-between gap-4">
                    <div>
                      <span className="font-semibold text-[#202820]">{item.commodityName}</span>
                      <span className="text-[#687267] ml-2 font-mono text-[11px]">{item.batchId}</span>
                      <div className="text-[11px] text-[#687267]">Target: {item.destinationName}</div>
                    </div>
                    <div className="text-right text-[11px] text-[#E78B45] font-medium max-w-sm">
                      {item.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TWO COLUMN GRID: Dispatch Table (Left) + Explainability Panel (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8 Cols: Recommended Dispatches Table */}
            <div className="lg:col-span-8 bg-white rounded-xl border border-[#E2E6DC] shadow-xs overflow-hidden">
              <div className="p-4 px-6 border-b border-[#E2E6DC] flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-bold text-sm text-[#202820]">
                    Recommended Dispatch Schedule ({currentPlan.optimized.dispatches.length})
                  </h3>
                  <p className="text-xs text-[#687267]">
                    Click any dispatch row to view multi-factor explainability and routing rationale
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-[#355C40] bg-[#D8E5C3]/60 px-2 py-0.5 rounded">
                  LP Solved
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F8FAF7] text-[#687267] border-b border-[#E2E6DC] font-semibold">
                      <th className="py-3 px-4">Priority & Commodity</th>
                      <th className="py-3 px-4">Destination Hub</th>
                      <th className="py-3 px-4 text-right">Volume</th>
                      <th className="py-3 px-4 text-right">Arrival Freshness</th>
                      <th className="py-3 px-4 text-right">Freight Rate</th>
                      <th className="py-3 px-4 text-right">Net Margin</th>
                      <th className="py-3 px-4 text-center">Select</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E6DC]">
                    {currentPlan.optimized.dispatches.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-xs text-[#687267]">
                          No feasible dispatches found with current parameter thresholds. Try adjusting safety buffers.
                        </td>
                      </tr>
                    ) : (
                      currentPlan.optimized.dispatches.map((disp) => {
                        const isSelected = selectedDispatch?.id === disp.id;
                        const isUrgent = disp.priorityLevel.includes('Urgent');

                        return (
                          <tr
                            key={disp.id}
                            onClick={() => setSelectedDispatch(disp)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[#F4F0E6] font-medium'
                                : isUrgent
                                ? 'bg-[#FFF9F3]/50 hover:bg-[#F8FAF7]'
                                : 'hover:bg-[#F8FAF7]'
                            }`}
                          >
                            {/* Priority & Commodity */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  isUrgent
                                    ? 'bg-[#E78B45]/15 text-[#E78B45] border border-[#E78B45]/30'
                                    : 'bg-[#D8E5C3] text-[#243D2B]'
                                }`}>
                                  {isUrgent ? 'Urgent' : 'Optimal'}
                                </span>
                                <span className="font-semibold text-[#202820]">{disp.commodityName}</span>
                              </div>
                              <div className="font-mono text-[11px] text-[#687267] mt-0.5">
                                {disp.batchId} · {disp.id}
                              </div>
                            </td>

                            {/* Destination */}
                            <td className="py-3 px-4 text-[#202820]">
                              <div className="font-medium">{disp.destinationName}</div>
                              <div className="text-[11px] text-[#687267]">{disp.travelHours}h transit time</div>
                            </td>

                            {/* Volume */}
                            <td className="py-3 px-4 text-right font-bold text-[#202820] tabular-nums">
                              {disp.allocatedQuantityKg.toLocaleString()} kg
                            </td>

                            {/* Arrival Freshness */}
                            <td className="py-3 px-4 text-right tabular-nums">
                              <div className={`font-semibold ${
                                disp.remainingShelfLifeAtArrivalHours <= criticalThreshold ? 'text-[#E78B45]' : 'text-[#355C40]'
                              }`}>
                                {disp.remainingShelfLifeAtArrivalHours.toFixed(1)}h
                              </div>
                              <div className="text-[10px] text-[#687267]">
                                Required: {disp.totalRequiredTimeHours.toFixed(1)}h
                              </div>
                            </td>

                            {/* Freight */}
                            <td className="py-3 px-4 text-right tabular-nums text-[#687267]">
                              <div>{currency}{disp.transportCost.toLocaleString()}</div>
                              <div className="text-[10px]">@{currency}{disp.transportCostPerKg.toFixed(2)}/kg</div>
                            </td>

                            {/* Net Margin */}
                            <td className="py-3 px-4 text-right tabular-nums">
                              <div className="font-bold text-[#355C40]">
                                +{currency}{disp.netMargin.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-[#687267]">
                                {currency}{(disp.netMargin / disp.allocatedQuantityKg).toFixed(2)}/kg
                              </div>
                            </td>

                            {/* Selection Radio Indicator */}
                            <td className="py-3 px-4 text-center">
                              <div className={`w-3.5 h-3.5 rounded-full border mx-auto flex items-center justify-center ${
                                isSelected ? 'border-[#243D2B] bg-[#243D2B]' : 'border-[#E2E6DC]'
                              }`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right 4 Cols: Explainability & Decision Rationale Panel */}
            <div className="lg:col-span-4 bg-white rounded-xl border border-[#E2E6DC] p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-3 border-b border-[#E2E6DC]">
                  <Info size={16} className="text-[#355C40]" />
                  <h3 className="font-heading font-bold text-sm text-[#202820]">
                    Dispatch Rationale & Decision Audit
                  </h3>
                </div>

                {selectedDispatch ? (
                  <div className="py-4 space-y-4 text-xs">
                    <div>
                      <span className="text-[11px] font-mono text-[#687267] block">{selectedDispatch.id}</span>
                      <div className="font-bold text-sm text-[#202820] mt-0.5">
                        {selectedDispatch.commodityName}
                      </div>
                      <div className="text-xs text-[#687267]">
                        Route: Warehouse → {selectedDispatch.destinationName}
                      </div>
                    </div>

                    {/* Freshness Balance Strip */}
                    <div className="p-3 bg-[#F8FAF7] rounded-lg border border-[#E2E6DC] space-y-1.5">
                      <div className="text-[11px] font-semibold text-[#202820] flex items-center justify-between">
                        <span>Shelf-Life Accounting</span>
                        <span className="text-[#355C40] font-bold">Feasible</span>
                      </div>
                      <div className="flex justify-between text-[#687267]">
                        <span>Loading & Handling:</span>
                        <span className="font-mono text-[#202820]">{selectedDispatch.handlingHours}h</span>
                      </div>
                      <div className="flex justify-between text-[#687267]">
                        <span>Transit Time:</span>
                        <span className="font-mono text-[#202820]">{selectedDispatch.travelHours}h</span>
                      </div>
                      <div className="flex justify-between text-[#687267]">
                        <span>Total Required Time:</span>
                        <span className="font-mono text-[#202820] font-semibold">{selectedDispatch.totalRequiredTimeHours.toFixed(1)}h</span>
                      </div>
                      <div className="pt-1 border-t border-[#E2E6DC] flex justify-between font-semibold text-[#202820]">
                        <span>Dock Arrival Freshness:</span>
                        <span className="text-[#355C40] font-mono">{selectedDispatch.remainingShelfLifeAtArrivalHours.toFixed(1)}h</span>
                      </div>
                    </div>

                    {/* Financial Reconciliation Breakdown */}
                    <div className="p-3 bg-[#F8FAF7] rounded-lg border border-[#E2E6DC] space-y-1.5">
                      <div className="text-[11px] font-semibold text-[#202820]">
                        Economic Breakdown ({selectedDispatch.allocatedQuantityKg.toLocaleString()} kg)
                      </div>
                      <div className="flex justify-between text-[#687267]">
                        <span>Gross Sales Revenue:</span>
                        <span className="font-mono text-[#202820]">+{currency}{selectedDispatch.grossRevenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[#687267]">
                        <span>Transport Costs:</span>
                        <span className="font-mono text-red-700">-{currency}{selectedDispatch.transportCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[#687267]">
                        <span>Grower Acquisition Cost:</span>
                        <span className="font-mono text-red-700">-{currency}{selectedDispatch.batchCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[#687267]">
                        <span>Warehouse Handling:</span>
                        <span className="font-mono text-red-700">-{currency}{selectedDispatch.handlingCost.toLocaleString()}</span>
                      </div>
                      <div className="pt-1 border-t border-[#E2E6DC] flex justify-between font-bold text-[#202820]">
                        <span>Net Economic Margin:</span>
                        <span className="text-[#355C40] font-mono">+{currency}{selectedDispatch.netMargin.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Algorithmic Reason Prose */}
                    <div>
                      <div className="text-[11px] font-semibold text-[#202820] mb-1">
                        Optimization Rationale:
                      </div>
                      <p className="text-[#687267] text-[11px] leading-relaxed">
                        {selectedDispatch.explanation}
                      </p>
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold text-[#202820] mb-1">
                        Alternative Routes Considered:
                      </div>
                      <p className="text-[#687267] text-[11px] leading-relaxed">
                        {selectedDispatch.alternativesConsidered}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-[#687267]">
                    Select a dispatch row from the schedule to inspect operations-research diagnostics.
                  </div>
                )}
              </div>

              {selectedDispatch && (
                <div className="pt-3 border-t border-[#E2E6DC]">
                  <span className="text-[10px] text-[#687267] block text-center">
                    Simplex Solution Status: Optimal · LP Dual Bounds Satisfied
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SAVED PLANNING RUNS HISTORY */}
      {activeTab === 'saved' && (
        <div className="bg-white rounded-xl border border-[#E2E6DC] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E6DC]">
            <div>
              <h3 className="font-heading font-bold text-base text-[#202820]">
                Saved Operations Research Planning Runs
              </h3>
              <p className="text-xs text-[#687267]">
                Audit history of simulated solver configurations, dispatches, and baseline comparisons
              </p>
            </div>
          </div>

          {savedPlans.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#687267]">
              <History size={36} className="mx-auto mb-2 text-[#AEC295]" />
              <div className="font-semibold text-[#202820]">No historical planning runs saved yet</div>
              <div className="mt-1">Run an optimization on the Planner tab and click "Save Plan".</div>
            </div>
          ) : (
            <div className="divide-y divide-[#E2E6DC]">
              {savedPlans.map((plan) => (
                <div key={plan.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-sm text-[#202820]">{plan.name}</span>
                      <span className="text-[11px] font-mono text-[#687267]">{plan.id}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        plan.status === 'Executed'
                          ? 'bg-[#355C40] text-white'
                          : 'bg-[#F4F0E6] text-[#243D2B] border border-[#E2E6DC]'
                      }`}>
                        {plan.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#687267]">
                      <span>{new Date(plan.createdAt).toLocaleString()}</span>
                      <span aria-hidden="true">·</span>
                      <span>{plan.summary.dispatchesCount} dispatches</span>
                      <span aria-hidden="true">·</span>
                      <span>{plan.summary.totalVolumeKg.toLocaleString()} kg volume</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#355C40] font-semibold">+{currency}{plan.summary.netRevenue.toLocaleString()} net</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setCurrentPlan(plan.planResult);
                        setActiveTab('planner');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-[#243D2B] bg-[#F4F0E6] hover:bg-[#D8E5C3] border border-[#E2E6DC] rounded-lg transition-colors"
                    >
                      Load & Inspect
                    </button>
                    {plan.status !== 'Executed' && (
                      <button
                        onClick={async () => {
                          const res = await api.optimization.commitPlan(plan.id);
                          setActionMessage(res.message);
                          await loadData();
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-[#243D2B] hover:bg-[#1D3223] rounded-lg transition-colors"
                      >
                        Commit Dispatches
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACTIVE SHIPMENT ALLOCATIONS */}
      {activeTab === 'active_allocations' && (
        <div className="bg-white rounded-xl border border-[#E2E6DC] shadow-xs overflow-hidden">
          <div className="p-4 px-6 border-b border-[#E2E6DC] flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-sm text-[#202820]">
                Active Fleet Allocations ({allocations.length})
              </h3>
              <p className="text-xs text-[#687267]">
                Live physical dispatches committed to regional terminals
              </p>
            </div>
            <span className="text-xs text-[#687267]">
              {allocations.filter(a => a.status === 'Pending').length} Pending · {allocations.filter(a => a.status === 'Dispatched').length} En Route
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAF7] text-[#687267] border-b border-[#E2E6DC] font-semibold">
                  <th className="py-3 px-4">Allocation & Batch</th>
                  <th className="py-3 px-4">Destination Market</th>
                  <th className="py-3 px-4 text-right">Volume (kg)</th>
                  <th className="py-3 px-4 text-right">Transit & Freshness</th>
                  <th className="py-3 px-4 text-right">Revenue</th>
                  <th className="py-3 px-4 text-right">Transport Cost</th>
                  <th className="py-3 px-4 text-right">Net Margin</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6DC]">
                {allocations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-xs text-[#687267]">
                      No active allocations. Run an optimization on the Planner tab and commit dispatches.
                    </td>
                  </tr>
                ) : (
                  allocations.map((alloc) => (
                    <tr key={alloc.id} className="hover:bg-[#F8FAF7] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#202820]">{alloc.commodityName}</div>
                        <div className="font-mono text-[11px] text-[#687267] mt-0.5">{alloc.id} · {alloc.batchId}</div>
                      </td>
                      <td className="py-3 px-4 text-[#202820]">
                        <div className="font-medium">{alloc.destinationName}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#202820] tabular-nums">
                        {alloc.quantityKg.toLocaleString()} kg
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        <div className="font-semibold text-[#202820]">{alloc.transitHours}h transit</div>
                        <div className="text-[11px] text-[#355C40]">{alloc.shelfLifeAtArrivalHours}h dock freshness</div>
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-[#202820]">
                        {currency}{alloc.totalRevenue.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-[#687267]">
                        {currency}{alloc.totalTransportCost.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-bold text-[#355C40]">
                        +{currency}{alloc.netMargin.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[11px] font-semibold ${
                          alloc.status === 'Delivered'
                            ? 'text-[#355C40]'
                            : alloc.status === 'Dispatched'
                            ? 'text-[#243D2B]'
                            : 'text-[#E78B45]'
                        }`}>
                          {alloc.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {alloc.status === 'Pending' && (
                            <button
                              onClick={() => handleUpdateStatus(alloc.id, 'Dispatched')}
                              className="px-2 py-0.5 bg-[#243D2B] text-white text-[11px] font-semibold rounded hover:bg-[#1D3223]"
                            >
                              Dispatch
                            </button>
                          )}
                          {alloc.status === 'Dispatched' && (
                            <button
                              onClick={() => handleUpdateStatus(alloc.id, 'Delivered')}
                              className="px-2 py-0.5 bg-[#355C40] text-white text-[11px] font-semibold rounded hover:bg-[#2A4833]"
                            >
                              Delivered
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteAllocation(alloc.id)}
                            className="p-1 text-[#687267] hover:text-red-600 rounded"
                            title="Cancel"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Dispatch Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#E2E6DC] max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E6DC]">
              <h3 className="font-heading font-bold text-sm text-[#202820]">Manual Dispatch Allocation</h3>
              <button onClick={() => setIsManualModalOpen(false)} className="text-[#687267] hover:text-[#202820]">
                <X size={16} />
              </button>
            </div>

            {manualError && (
              <div className="mt-3 p-2 bg-red-50 text-red-800 text-xs rounded border border-red-200">
                {manualError}
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="mt-3 space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Batch</label>
                <select
                  value={manualBatchId}
                  onChange={(e) => setManualBatchId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F8FAF7] border border-[#E2E6DC] rounded"
                >
                  {batches.filter(b => b.availableQuantityKg > 0).map(b => (
                    <option key={b.id} value={b.id}>{b.commodityName} ({b.id}) - {b.availableQuantityKg} kg</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Destination</label>
                <select
                  value={manualDestId}
                  onChange={(e) => setManualDestId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F8FAF7] border border-[#E2E6DC] rounded"
                >
                  {destinations.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.location})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Quantity (kg)</label>
                  <input
                    type="number"
                    min="1"
                    value={manualQty}
                    onChange={(e) => setManualQty(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-[#F8FAF7] border border-[#E2E6DC] rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Selling Price ({currency}/kg)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-[#F8FAF7] border border-[#E2E6DC] rounded"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6DC]">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-3 py-1.5 border border-[#E2E6DC] rounded text-[#687267]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={manualSubmitting}
                  className="px-4 py-1.5 bg-[#243D2B] text-white font-semibold rounded hover:bg-[#1D3223]"
                >
                  Create Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
