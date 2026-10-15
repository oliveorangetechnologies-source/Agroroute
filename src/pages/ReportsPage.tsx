import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  TrendingUp,
  ShieldCheck,
  Truck,
  Leaf,
  CheckCircle2,
  FileText,
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  HelpCircle,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  ArrowRight,
  Sparkles,
  Scale,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { api } from '../services/api.ts';
import {
  OperationalReport,
  TestSuiteResult,
  OptimizationPlanResult,
  SavedPlanRun,
  ProposedDispatch,
} from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { ExplainabilityDrawer } from '../components/ExplainabilityDrawer.tsx';

export const ReportsPage: React.FC = () => {
  const { company } = useAuth();
  const [report, setReport] = useState<OperationalReport | null>(null);
  const [loading, setLoading] = useState(true);

  // Saved Plans
  const [savedPlans, setSavedPlans] = useState<SavedPlanRun[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [activePlan, setActivePlan] = useState<OptimizationPlanResult | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // Tabs: 'benchmark' | 'ledger' | 'test_suite'
  const [activeTab, setActiveTab] = useState<'benchmark' | 'ledger' | 'test_suite'>('benchmark');

  // Test Suite State
  const [testResult, setTestResult] = useState<TestSuiteResult | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testCategoryFilter, setTestCategoryFilter] = useState<string>('All');

  // Explainability Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState<ProposedDispatch | null>(null);
  const [selectedInfeasible, setSelectedInfeasible] = useState<{
    batchId: string;
    commodityName: string;
    destinationId: string;
    destinationName: string;
    reason: string;
  } | null>(null);

  const currency = company?.defaultCurrency || '$';

  // Load plans and report
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [reportData, plansData] = await Promise.all([
        api.reports.get(),
        api.optimization.getSavedPlans(),
      ]);
      setReport(reportData);
      setSavedPlans(plansData);

      if (plansData.length > 0) {
        setSelectedPlanId(plansData[0].id);
        setActivePlan(plansData[0].planResult);
      } else {
        // Generate on-the-fly plan if none saved yet
        const generated = await api.optimization.generatePlan();
        setActivePlan(generated);
      }
    } catch (err) {
      console.error('Failed loading reports & plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    const found = savedPlans.find((p) => p.id === planId);
    if (found) {
      setActivePlan(found.planResult);
    }
  };

  const handleRunLiveBenchmark = async () => {
    setIsGeneratingPlan(true);
    try {
      const generated = await api.optimization.generatePlan();
      setActivePlan(generated);
      // Auto-save this run
      const saved = await api.optimization.savePlan(
        `Benchmark Run (${new Date().toLocaleTimeString()})`,
        generated
      );
      setSavedPlans((prev) => [saved, ...prev]);
      setSelectedPlanId(saved.id);
    } catch (err: any) {
      alert(`Benchmark calculation failed: ${err.message}`);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleRunTests = async () => {
    setIsRunningTests(true);
    try {
      const res = await api.optimization.runTests();
      setTestResult(res);
    } catch (err: any) {
      alert(`Test run error: ${err.message}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  // Run tests automatically if user switches to test_suite tab and no results yet
  useEffect(() => {
    if (activeTab === 'test_suite' && !testResult && !isRunningTests) {
      handleRunTests();
    }
  }, [activeTab]);

  const openExplainDispatch = (dispatch: ProposedDispatch) => {
    setSelectedDispatch(dispatch);
    setSelectedInfeasible(null);
    setDrawerOpen(true);
  };

  const openExplainInfeasible = (item: {
    batchId: string;
    commodityName: string;
    destinationId: string;
    destinationName: string;
    reason: string;
  }) => {
    setSelectedDispatch(null);
    setSelectedInfeasible(item);
    setDrawerOpen(true);
  };

  // Export CSV comparing Baseline vs. FreshRoute
  const exportBenchmarkCSV = () => {
    if (!activePlan) return;

    const opt = activePlan.optimized;
    const base = activePlan.baseline;
    const imp = activePlan.improvement;

    let csv = `AGROROUTE BENCHMARK COMPARISON REPORT\n`;
    csv += `Plan ID: ${activePlan.planId}\n`;
    csv += `Generated At: ${activePlan.createdAt}\n`;
    csv += `Company: ${company?.companyName || 'Gujarat Agro Fresh Logistics Ltd.'}\n\n`;

    csv += `EXECUTIVE METRICS COMPARISON\n`;
    csv += `Metric,Baseline (FIFO),FreshRoute (LP Optimizer),Variance / Gain\n`;
    csv += `Modeled Spoilage (kg),${base.spoiledQuantityKg},${opt.spoiledQuantityKg},-${imp.wasteAvoidedKg} kg (${imp.spoilageReductionPercent}% reduction)\n`;
    csv += `Demand Fulfillment (%),${base.demandFulfillmentPercent}%,${opt.demandFulfillmentPercent}%,+${imp.fulfillmentGainPercent}%\n`;
    csv += `Total Allocated Volume (kg),${base.totalAllocatedKg},${opt.totalAllocatedKg},+${opt.totalAllocatedKg - base.totalAllocatedKg} kg\n`;
    csv += `Unmet Demand (kg),${base.unmetDemandKg},${opt.unmetDemandKg},-${base.unmetDemandKg - opt.unmetDemandKg} kg\n`;
    csv += `Gross Contract Revenue (${currency}),${base.grossRevenue},${opt.grossRevenue},+${currency}${opt.grossRevenue - base.grossRevenue}\n`;
    csv += `Refrigerated Transport Freight (${currency}),${base.totalTransportCosts},${opt.totalTransportCosts},${currency}${opt.totalTransportCosts - base.totalTransportCosts}\n`;
    csv += `Warehouse Handling (${currency}),${base.totalHandlingCosts},${opt.totalHandlingCosts},${currency}${opt.totalHandlingCosts - base.totalHandlingCosts}\n`;
    csv += `Grower Batch Acquisition Cost (${currency}),${base.totalBatchAcquisitionCosts},${opt.totalBatchAcquisitionCosts},${currency}${opt.totalBatchAcquisitionCosts - base.totalBatchAcquisitionCosts}\n`;
    csv += `Disposal Cost of Spoiled Produce (${currency}),${base.spoilageCost},${opt.spoilageCost},-${currency}${base.spoilageCost - opt.spoilageCost}\n`;
    csv += `NET OPERATING REVENUE (${currency}),${base.netRevenue},${opt.netRevenue},+${currency}${imp.netRevenueGain} net margin\n\n`;

    csv += `FRESHROUTE ALLOCATED DISPATCHES\n`;
    csv += `Dispatch ID,Batch ID,Commodity,Destination,Volume (kg),Selling Price (${currency}/kg),Net Margin (${currency}),Remaining Dock Shelf Life (h),Priority\n`;
    opt.dispatches.forEach((d) => {
      csv += `"${d.id}","${d.batchId}","${d.commodityName}","${d.destinationName}",${d.allocatedQuantityKg},${d.sellingPricePerKg},${d.netMargin},${d.remainingShelfLifeAtArrivalHours},"${d.priorityLevel}"\n`;
    });
    csv += `\n`;

    csv += `INFEASIBLE CANDIDATE AUDIT\n`;
    csv += `Batch ID,Commodity,Destination,Rejection Reason\n`;
    activePlan.infeasibleCombinations.forEach((inf) => {
      csv += `"${inf.batchId}","${inf.commodityName}","${inf.destinationName}","${inf.reason.replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `agroroute_benchmark_comparison_${activePlan.planId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Recharts Data Prep
  const comparisonChartData = activePlan
    ? [
        {
          metric: 'Net Revenue ($)',
          Baseline: activePlan.baseline.netRevenue,
          FreshRoute: activePlan.optimized.netRevenue,
        },
        {
          metric: 'Transport Cost ($)',
          Baseline: activePlan.baseline.totalTransportCosts,
          FreshRoute: activePlan.optimized.totalTransportCosts,
        },
        {
          metric: 'Handling Cost ($)',
          Baseline: activePlan.baseline.totalHandlingCosts,
          FreshRoute: activePlan.optimized.totalHandlingCosts,
        },
        {
          metric: 'Spoilage Loss ($)',
          Baseline: activePlan.baseline.spoilageCost,
          FreshRoute: activePlan.optimized.spoilageCost,
        },
      ]
    : [];

  const volumeChartData = activePlan
    ? [
        {
          metric: 'Fulfillment (%)',
          Baseline: activePlan.baseline.demandFulfillmentPercent,
          FreshRoute: activePlan.optimized.demandFulfillmentPercent,
        },
        {
          metric: 'Spoilage Rate (%)',
          Baseline:
            Math.round(
              (activePlan.baseline.spoiledQuantityKg /
                (activePlan.baseline.totalAllocatedKg + activePlan.baseline.spoiledQuantityKg || 1)) *
                1000
            ) / 10,
          FreshRoute:
            Math.round(
              (activePlan.optimized.spoiledQuantityKg /
                (activePlan.optimized.totalAllocatedKg + activePlan.optimized.spoiledQuantityKg || 1)) *
                1000
            ) / 10,
        },
      ]
    : [];

  // Capacity Utilization Data
  const capacityChartData = activePlan
    ? activePlan.optimized.capacityUtilization.map((c) => ({
        name: c.destinationName.split(' ')[0],
        Used: c.usedKg,
        Remaining: Math.max(0, c.capacityKg - c.usedKg),
        utilization: c.utilizationPercent,
      }))
    : [];

  const filteredTests = testResult
    ? testResult.results.filter(
        (t) => testCategoryFilter === 'All' || t.category === testCategoryFilter
      )
    : [];

  const testCategories = testResult
    ? ['All', ...Array.from(new Set(testResult.results.map((r) => r.category)))]
    : ['All'];

  return (
    <div className="space-y-6">
      {/* Explainability Drawer */}
      <ExplainabilityDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        dispatch={selectedDispatch}
        infeasibleItem={selectedInfeasible}
        currency={currency}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#E2E6DC]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-extrabold text-[#243D2B]">
              Analytical Reports & Benchmark Evaluation
            </h1>
            <span className="text-[10px] font-bold tracking-widest text-[#243D2B] bg-[#D8E5C3] px-2 py-0.5 rounded uppercase">
              OR-Engine Verified
            </span>
          </div>
          <p className="text-xs text-[#687267] mt-1">
            Empirical baseline vs. FreshRoute LP strategy comparison, audited cold-chain financials, and mathematical proof suite.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {activeTab === 'benchmark' && (
            <>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#202820] bg-white hover:bg-[#F4F0E6] border border-[#E2E6DC] rounded-lg transition-colors shadow-xs"
              >
                <Printer size={15} />
                <span>Print</span>
              </button>
              <button
                onClick={exportBenchmarkCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#243D2B] hover:bg-[#1D3223] rounded-lg transition-colors shadow-xs"
              >
                <Download size={15} />
                <span>Export CSV</span>
              </button>
            </>
          )}

          {activeTab === 'test_suite' && (
            <button
              onClick={handleRunTests}
              disabled={isRunningTests}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#243D2B] hover:bg-[#1D3223] rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              <RefreshCw size={14} className={isRunningTests ? 'animate-spin' : ''} />
              <span>{isRunningTests ? 'Executing Solver Tests...' : 'Re-run 14-Point Test Suite'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Plan Selector Bar for Benchmark Comparison */}
      {activeTab === 'benchmark' && (
        <div className="bg-white p-3.5 rounded-xl border border-[#E2E6DC] flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Layers size={16} className="text-[#355C40]" />
            <span className="text-xs font-semibold text-[#202820]">Evaluated Planning Run:</span>
            {savedPlans.length > 0 ? (
              <select
                value={selectedPlanId}
                onChange={(e) => handleSelectPlan(e.target.value)}
                className="text-xs font-medium text-[#202820] bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg px-3 py-1.5 focus:outline-hidden focus:border-[#243D2B]"
              >
                {savedPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({new Date(p.createdAt).toLocaleDateString()} {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-[#687267] italic">Active Live In-Memory Plan</span>
            )}
          </div>

          <button
            onClick={handleRunLiveBenchmark}
            disabled={isGeneratingPlan}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#243D2B] bg-[#D8E5C3] hover:bg-[#c9d8b1] rounded-lg transition-colors shadow-xs disabled:opacity-50"
          >
            <RefreshCw size={13} className={isGeneratingPlan ? 'animate-spin' : ''} />
            <span>{isGeneratingPlan ? 'Re-solving LP Model...' : 'Calculate Fresh Benchmark Run'}</span>
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E2E6DC] text-xs">
        <button
          onClick={() => setActiveTab('benchmark')}
          className={`px-4 py-2.5 font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'benchmark'
              ? 'border-[#243D2B] text-[#243D2B]'
              : 'border-transparent text-[#687267] hover:text-[#202820]'
          }`}
        >
          <BarChart3 size={15} />
          <span>Baseline vs. FreshRoute LP Comparison</span>
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2.5 font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'ledger'
              ? 'border-[#243D2B] text-[#243D2B]'
              : 'border-transparent text-[#687267] hover:text-[#202820]'
          }`}
        >
          <FileText size={15} />
          <span>Operational Accounting Ledger</span>
        </button>
        <button
          onClick={() => setActiveTab('test_suite')}
          className={`px-4 py-2.5 font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'test_suite'
              ? 'border-[#243D2B] text-[#243D2B]'
              : 'border-transparent text-[#687267] hover:text-[#202820]'
          }`}
        >
          <ShieldCheck size={15} />
          <span>Automated 14-Point Test Suite & Proofs</span>
          {testResult && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                testResult.allPassed ? 'bg-[#D8E5C3] text-[#243D2B]' : 'bg-red-100 text-red-800'
              }`}
            >
              {testResult.passedTests}/{testResult.totalTests} Passed
            </span>
          )}
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: BASELINE VS FRESHROUTE LP PERFORMANCE COMPARISON        */}
      {/* ============================================================== */}
      {activeTab === 'benchmark' && activePlan && (
        <div className="space-y-6">
          {/* Executive Strategy Comparison Scorecard (Pillar 1 Requirement) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Modeled Spoilage */}
            <div className="bg-white p-5 rounded-xl border border-[#E2E6DC] shadow-xs relative">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#687267]">
                <span>Modeled Spoilage</span>
                <span className="text-[10px] text-[#243D2B] font-bold bg-[#D8E5C3] px-1.5 py-0.5 rounded">
                  {activePlan.improvement.spoilageReductionPercent !== 'N/A'
                    ? `-${activePlan.improvement.spoilageReductionPercent}%`
                    : 'Zero Base'}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-heading font-bold text-[#202820] tabular-nums">
                  {activePlan.optimized.spoiledQuantityKg.toLocaleString()} <span className="text-xs font-normal text-[#687267]">kg</span>
                </span>
                <span className="text-xs text-[#687267] line-through tabular-nums">
                  {activePlan.baseline.spoiledQuantityKg.toLocaleString()} kg
                </span>
              </div>
              <div className="text-xs text-[#355C40] font-medium mt-1">
                {activePlan.improvement.wasteAvoidedKg > 0 ? (
                  `Avoids ${activePlan.improvement.wasteAvoidedKg.toLocaleString()} kg produce decay`
                ) : (
                  'Zero decay under optimal routing'
                )}
              </div>
            </div>

            {/* KPI 2: Net Operating Revenue */}
            <div className="bg-white p-5 rounded-xl border border-[#E2E6DC] shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#687267]">
                <span>Net Revenue (After Costs)</span>
                <span className="text-[10px] text-[#355C40] font-bold bg-[#D8E5C3] px-1.5 py-0.5 rounded">
                  +${activePlan.improvement.netRevenueGain.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-heading font-bold text-[#355C40] tabular-nums">
                  {currency}{activePlan.optimized.netRevenue.toLocaleString()}
                </span>
                <span className="text-xs text-[#687267] line-through tabular-nums">
                  {currency}{activePlan.baseline.netRevenue.toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-[#687267] mt-1">
                Margin gain: +{Math.round(((activePlan.optimized.netRevenue - activePlan.baseline.netRevenue) / (activePlan.baseline.netRevenue || 1)) * 100)}% over FIFO baseline
              </div>
            </div>

            {/* KPI 3: Demand Fulfillment */}
            <div className="bg-white p-5 rounded-xl border border-[#E2E6DC] shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#687267]">
                <span>Demand Fulfillment</span>
                <span className="text-[10px] text-[#243D2B] font-bold bg-[#D8E5C3] px-1.5 py-0.5 rounded">
                  +{activePlan.improvement.fulfillmentGainPercent}%
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-heading font-bold text-[#202820] tabular-nums">
                  {activePlan.optimized.demandFulfillmentPercent}%
                </span>
                <span className="text-xs text-[#687267] line-through tabular-nums">
                  {activePlan.baseline.demandFulfillmentPercent}%
                </span>
              </div>
              <div className="text-xs text-[#687267] mt-1">
                Unmet demand: {activePlan.optimized.unmetDemandKg.toLocaleString()} kg
              </div>
            </div>

            {/* KPI 4: Logistics Feasibility Ratio */}
            <div className="bg-white p-5 rounded-xl border border-[#E2E6DC] shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#687267]">
                <span>Feasibility Audit</span>
                <span className="text-[10px] text-[#243D2B] font-bold bg-[#F4F0E6] px-1.5 py-0.5 rounded">
                  {activePlan.optimized.dispatches.length} Feasible
                </span>
              </div>
              <div className="mt-2 text-2xl font-heading font-bold text-[#202820] tabular-nums">
                {activePlan.optimized.dispatches.length}{' '}
                <span className="text-sm font-normal text-[#687267]">
                  / {activePlan.optimized.dispatches.length + activePlan.infeasibleCombinations.length} pairs
                </span>
              </div>
              <div className="text-xs text-amber-700 font-medium mt-1">
                {activePlan.infeasibleCombinations.length} pairs rejected (decay & buffer limits)
              </div>
            </div>
          </div>

          {/* Side-by-Side Comprehensive Cost & Accounting Ledger Breakdown */}
          <div className="bg-white rounded-xl border border-[#E2E6DC] overflow-hidden shadow-xs">
            <div className="p-4 bg-[#F8FAF7] border-b border-[#E2E6DC] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-heading font-bold text-[#202820]">
                  Reconciled Strategy Accounting & Variance Ledger
                </h3>
                <p className="text-xs text-[#687267]">
                  No double-counting: Discloses Gross Sales, Freight Transport, Cross-Dock Handling, Batch Procurement, and Spoilage Disposal.
                </p>
              </div>
              <span className="text-[11px] font-mono text-[#687267] bg-[#F4F0E6] px-2 py-1 rounded">
                Simplex LP Revised Method
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAF7] border-b border-[#E2E6DC] text-[#687267]">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Cost / Revenue Element</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Baseline (FIFO Rule)</th>
                    <th className="py-2.5 px-4 font-semibold text-right">FreshRoute (LP Optimizer)</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Strategic Variance</th>
                    <th className="py-2.5 px-4 font-semibold">Operations Research Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6DC]">
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-[#202820]">Allocated Volume (kg)</td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-[#687267]">
                      {activePlan.baseline.totalAllocatedKg.toLocaleString()} kg
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums font-bold text-[#202820]">
                      {activePlan.optimized.totalAllocatedKg.toLocaleString()} kg
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums font-semibold text-[#355C40]">
                      +{activePlan.optimized.totalAllocatedKg - activePlan.baseline.totalAllocatedKg} kg
                    </td>
                    <td className="py-2.5 px-4 text-[#687267]">
                      FreshRoute unlocks additional volume by fitting produce within arrival shelf-life margins.
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-4 font-medium text-[#202820]">Gross Market Revenue</td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-[#687267]">
                      {currency}{activePlan.baseline.grossRevenue.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums font-bold text-[#202820]">
                      {currency}{activePlan.optimized.grossRevenue.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums font-semibold text-[#355C40]">
                      +{currency}{(activePlan.optimized.grossRevenue - activePlan.baseline.grossRevenue).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-[#687267]">
                      Higher volume placed into premium wholesale contract prices.
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-4 font-medium text-[#202820]">Refrigerated Freight Costs</td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-red-600">
                      -{currency}{activePlan.baseline.totalTransportCosts.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-red-600 font-bold">
                      -{currency}{activePlan.optimized.totalTransportCosts.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-[#687267]">
                      {currency}{(activePlan.optimized.totalTransportCosts - activePlan.baseline.totalTransportCosts).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-[#687267]">
                      Transport freight scaled with volume; routes prioritized for proximity when shelf-life is tight.
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-4 font-medium text-[#202820]">Cross-Dock Handling Costs</td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-red-600">
                      -{currency}{activePlan.baseline.totalHandlingCosts.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-red-600 font-bold">
                      -{currency}{activePlan.optimized.totalHandlingCosts.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-[#687267]">
                      {currency}{(activePlan.optimized.totalHandlingCosts - activePlan.baseline.totalHandlingCosts).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-[#687267]">
                      $0.05/kg standard warehouse inbound and outbound dock labor.
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-4 font-medium text-[#202820]">Grower Acquisition Costs</td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-red-600">
                      -{currency}{activePlan.baseline.totalBatchAcquisitionCosts.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-red-600 font-bold">
                      -{currency}{activePlan.optimized.totalBatchAcquisitionCosts.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-[#687267]">
                      {currency}{(activePlan.optimized.totalBatchAcquisitionCosts - activePlan.baseline.totalBatchAcquisitionCosts).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-[#687267]">
                      Direct procurement unit cost per batch.
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-4 font-medium text-[#202820]">
                      Spoilage Disposal Fee ($0.20/kg)
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-amber-700">
                      -{currency}{activePlan.baseline.spoilageCost.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-[#355C40] font-bold">
                      -{currency}{activePlan.optimized.spoilageCost.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums font-semibold text-[#355C40]">
                      +${(activePlan.baseline.spoilageCost - activePlan.optimized.spoilageCost).toLocaleString()} saved
                    </td>
                    <td className="py-2.5 px-4 text-[#687267]">
                      Mandatory environmental dumping fees incurred on decayed agricultural stock.
                    </td>
                  </tr>

                  <tr className="bg-[#F4F0E6] font-bold text-[#243D2B]">
                    <td className="py-3 px-4 text-sm">NET OPERATING MARGIN</td>
                    <td className="py-3 px-4 text-right tabular-nums text-sm text-[#202820]">
                      {currency}{activePlan.baseline.netRevenue.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-base text-[#355C40]">
                      {currency}{activePlan.optimized.netRevenue.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-sm text-[#355C40]">
                      +{currency}{activePlan.improvement.netRevenueGain.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-[#243D2B]">
                      Proven economic surplus generated through mathematical shelf-life and demand optimization.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Analytical Charts: Visual Baseline vs. FreshRoute Bar Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Financial Performance */}
            <div className="bg-white p-5 rounded-xl border border-[#E2E6DC] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-heading font-bold text-[#202820]">
                    Financial Comparison by Ledger Metric
                  </h3>
                  <p className="text-xs text-[#687267]">Baseline FIFO vs. FreshRoute LP</p>
                </div>
                <span className="text-[11px] text-[#687267] font-mono">Currency: {currency}</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E6DC" vertical={false} />
                    <XAxis dataKey="metric" tick={{ fontSize: 11, fill: '#687267' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#687267' }} />
                    <Tooltip
                      formatter={(val: any) => [`${currency}${Number(val || 0).toLocaleString()}`, '']}
                      contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E6DC', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="Baseline" fill="#C2C9BD" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="FreshRoute" fill="#355C40" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Fleet Capacity Utilization by Destination */}
            <div className="bg-white p-5 rounded-xl border border-[#E2E6DC] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-heading font-bold text-[#202820]">
                    Destination Vehicle Fleet Capacity Utilization
                  </h3>
                  <p className="text-xs text-[#687267]">Reefer load vs remaining capacity limit</p>
                </div>
                <span className="text-[11px] text-[#687267] font-mono">Unit: Kilograms</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={capacityChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E6DC" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#687267' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#687267' }} />
                    <Tooltip
                      formatter={(val: any) => [`${Number(val || 0).toLocaleString()} kg`, '']}
                      contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E6DC', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="Used" fill="#243D2B" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Remaining" fill="#E2E6DC" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Allocation & Spoilage Decisions Table with Explainability Drill-Down */}
          <div className="bg-white rounded-xl border border-[#E2E6DC] overflow-hidden shadow-xs">
            <div className="p-4 bg-[#F8FAF7] border-b border-[#E2E6DC] flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-heading font-bold text-[#202820]">
                  Optimized Produce Dispatch Allocations ({activePlan.optimized.dispatches.length})
                </h3>
                <p className="text-xs text-[#687267]">
                  Click on any dispatch row to view step-by-step cold-chain math and operations research explainability.
                </p>
              </div>
              <span className="text-xs text-[#355C40] font-semibold bg-[#D8E5C3] px-2.5 py-1 rounded-md">
                100% Shelf-Life Feasible
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAF7] border-b border-[#E2E6DC] text-[#687267]">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Dispatch ID</th>
                    <th className="py-2.5 px-4 font-semibold">Commodity & Batch</th>
                    <th className="py-2.5 px-4 font-semibold">Destination Terminal</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Allocated Qty</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Dock Freshness</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Net Margin</th>
                    <th className="py-2.5 px-4 font-semibold">Strategic Priority</th>
                    <th className="py-2.5 px-4 text-center font-semibold">Explainability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6DC]">
                  {activePlan.optimized.dispatches.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => openExplainDispatch(d)}
                      className="hover:bg-[#F4F0E6]/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#243D2B]">{d.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#202820]">{d.commodityName}</div>
                        <div className="text-[11px] text-[#687267]">Batch {d.batchId}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#202820]">{d.destinationName}</div>
                        <div className="text-[11px] text-[#687267]">{d.travelHours}h transit time</div>
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-bold text-[#202820]">
                        {d.allocatedQuantityKg.toLocaleString()} kg
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        <span className="font-semibold text-[#355C40] bg-[#D8E5C3]/60 px-2 py-0.5 rounded">
                          {d.remainingShelfLifeAtArrivalHours} hrs
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-bold text-[#355C40]">
                        +{currency}{d.netMargin.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          d.priorityLevel.includes('Tier 1')
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-[#D8E5C3] text-[#243D2B]'
                        }`}>
                          {d.priorityLevel}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openExplainDispatch(d);
                          }}
                          className="text-xs text-[#243D2B] hover:text-[#355C40] font-semibold underline decoration-dotted flex items-center justify-center gap-1 mx-auto"
                        >
                          <HelpCircle size={14} />
                          <span>Audit</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Infeasible Candidates Diagnostic Table */}
          <div className="bg-white rounded-xl border border-[#E2E6DC] overflow-hidden shadow-xs">
            <div className="p-4 bg-amber-50/60 border-b border-amber-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-heading font-bold text-amber-900 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-[#E78B45]" />
                  <span>Infeasible Candidate Route Combinations ({activePlan.infeasibleCombinations.length})</span>
                </h3>
                <p className="text-xs text-amber-800 mt-0.5">
                  Audited routes rejected by the solver due to physical cold-chain decay or safety margin violations.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-1 rounded">
                Decay Violations
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAF7] border-b border-[#E2E6DC] text-[#687267]">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Batch ID</th>
                    <th className="py-2.5 px-4 font-semibold">Commodity</th>
                    <th className="py-2.5 px-4 font-semibold">Target Destination</th>
                    <th className="py-2.5 px-4 font-semibold">Rejection Cause</th>
                    <th className="py-2.5 px-4 text-center font-semibold">Diagnostic</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6DC]">
                  {activePlan.infeasibleCombinations.map((inf, i) => (
                    <tr
                      key={i}
                      onClick={() => openExplainInfeasible(inf)}
                      className="hover:bg-amber-50/40 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-4 font-mono font-medium text-[#202820]">{inf.batchId}</td>
                      <td className="py-2.5 px-4 font-medium text-[#202820]">{inf.commodityName}</td>
                      <td className="py-2.5 px-4 text-[#687267]">{inf.destinationName}</td>
                      <td className="py-2.5 px-4 text-red-700 font-medium">
                        {inf.reason}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openExplainInfeasible(inf);
                          }}
                          className="text-xs text-[#243D2B] font-semibold hover:underline"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: OPERATIONAL ACCOUNTING LEDGER                           */}
      {/* ============================================================== */}
      {activeTab === 'ledger' && report && (
        <div className="space-y-6">
          {/* Executive KPI Scoreboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-[#E2E6DC] shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#687267]">
                Total Handled
              </span>
              <div className="text-2xl font-heading font-bold text-[#202820] mt-2 tabular-nums">
                {report.totalVolumeHandledKg.toLocaleString()} <span className="text-sm font-normal text-[#687267]">kg</span>
              </div>
              <div className="text-xs text-[#687267] mt-1">All processed shipments</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#E2E6DC] shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#687267]">
                Net Margin Return
              </span>
              <div className="text-2xl font-heading font-bold text-[#355C40] mt-2 tabular-nums">
                +{currency}{report.netProfit.toLocaleString()}
              </div>
              <div className="text-xs text-[#355C40] font-medium mt-1">
                {report.averageMarginPercent}% return on sales
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#E2E6DC] shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#687267]">
                Produce Spoilage Rate
              </span>
              <div className="text-2xl font-heading font-bold text-[#243D2B] mt-2 tabular-nums">
                {report.spoilageRatePercent}%
              </div>
              <div className="text-xs text-[#355C40] font-medium mt-1">
                {report.wasteAvoidedKg.toLocaleString()} kg food waste avoided
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#E2E6DC] shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#687267]">
                Avg Arrival Freshness
              </span>
              <div className="text-2xl font-heading font-bold text-[#202820] mt-2 tabular-nums">
                {report.averageArrivalFreshnessHours} <span className="text-sm font-normal text-[#687267]">hrs</span>
              </div>
              <div className="text-xs text-[#687267] mt-1">
                Avg transit: {report.averageTransitHours} hours
              </div>
            </div>
          </div>

          {/* Commodity & Destination Breakdown Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-[#E2E6DC] p-5 shadow-xs">
              <h3 className="text-sm font-heading font-bold text-[#202820] mb-3">
                Top Perishable Commodities by Volume
              </h3>
              <div className="space-y-3">
                {report.topCommodities.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs pb-2 border-b border-[#E2E6DC]/60 last:border-0">
                    <span className="font-medium text-[#202820]">{c.name}</span>
                    <div className="flex items-center gap-4 tabular-nums">
                      <span className="text-[#687267]">{c.volumeKg.toLocaleString()} kg</span>
                      <span className="font-bold text-[#243D2B]">{currency}{c.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#E2E6DC] p-5 shadow-xs">
              <h3 className="text-sm font-heading font-bold text-[#202820] mb-3">
                Destination Market Net Margin Performance
              </h3>
              <div className="space-y-3">
                {report.destinationSummary.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs pb-2 border-b border-[#E2E6DC]/60 last:border-0">
                    <span className="font-medium text-[#202820]">{d.name}</span>
                    <div className="flex items-center gap-4 tabular-nums">
                      <span className="text-[#687267]">{d.volumeKg.toLocaleString()} kg</span>
                      <span className="font-bold text-[#355C40]">+{currency}{d.margin.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: AUTOMATED 14-POINT TEST SUITE & PROOFS                  */}
      {/* ============================================================== */}
      {activeTab === 'test_suite' && (
        <div className="space-y-6">
          {/* Test Suite Summary Banner */}
          <div className="bg-white p-5 rounded-xl border border-[#E2E6DC] flex flex-wrap items-center justify-between gap-4 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-[#355C40]" />
                <h3 className="text-base font-heading font-bold text-[#202820]">
                  Operations Research Validation Suite
                </h3>
              </div>
              <p className="text-xs text-[#687267] mt-1">
                14 automated unit, economic, and non-negativity constraint verification proofs.
              </p>
            </div>

            {testResult && (
              <div className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${
                  testResult.allPassed
                    ? 'bg-[#D8E5C3]/50 border-[#D8E5C3] text-[#243D2B]'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {testResult.allPassed ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                  <span className="font-heading font-bold text-sm">
                    {testResult.passedTests} / {testResult.totalTests} Tests Passing
                  </span>
                </div>
                <div className="text-xs text-[#687267]">
                  Executed: {new Date(testResult.timestamp).toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[#687267] font-semibold">Filter:</span>
            {testCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setTestCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  testCategoryFilter === cat
                    ? 'bg-[#243D2B] text-white'
                    : 'bg-white text-[#687267] border border-[#E2E6DC] hover:text-[#202820]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Test Results Table */}
          <div className="bg-white rounded-xl border border-[#E2E6DC] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAF7] border-b border-[#E2E6DC] text-[#687267]">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                    <th className="py-2.5 px-4 font-semibold">Test ID & Name</th>
                    <th className="py-2.5 px-4 font-semibold">Category</th>
                    <th className="py-2.5 px-4 font-semibold">Expected Invariant</th>
                    <th className="py-2.5 px-4 font-semibold">Actual Outcome</th>
                    <th className="py-2.5 px-4 font-semibold">Technical Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6DC]">
                  {filteredTests.map((t) => (
                    <tr key={t.id} className="hover:bg-[#F8FAF7]/60">
                      <td className="py-3 px-4">
                        {t.passed ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#355C40] bg-[#D8E5C3]/70 px-2 py-0.5 rounded-full">
                            <CheckCircle size={12} />
                            PASS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                            <XCircle size={12} />
                            FAIL
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-[11px] font-bold text-[#243D2B]">{t.id}</div>
                        <div className="font-semibold text-[#202820] mt-0.5">{t.name}</div>
                      </td>
                      <td className="py-3 px-4 text-[#687267] font-medium">{t.category}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#687267]">{t.expected}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#202820]">{t.actual}</td>
                      <td className="py-3 px-4 text-[#687267] text-[11px] leading-relaxed max-w-xs">{t.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
