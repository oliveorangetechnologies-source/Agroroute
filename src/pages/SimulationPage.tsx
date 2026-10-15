import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Play,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Truck,
  DollarSign,
  Scale,
  Sparkles,
  HelpCircle,
  History,
  CheckCircle2,
  X,
  Layers,
  ArrowRight,
  ShieldAlert,
  Flame,
  CloudSnow,
  Activity,
  Trash2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { api } from '../services/api.ts';
import {
  Destination,
  ScenarioModification,
  ScenarioSimulationResult,
  SensitivityAnalysisResult,
  SavedPlanRun,
} from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { ExplainabilityDrawer } from '../components/ExplainabilityDrawer.tsx';

export const SimulationPage: React.FC = () => {
  const { company } = useAuth();
  const currency = company?.defaultCurrency || '$';

  // Active view: 'simulator' | 'sensitivity' | 'history'
  const [activeTab, setActiveTab] = useState<'simulator' | 'sensitivity' | 'history'>('simulator');

  // Input Destinations for selective modifier
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [savedPlans, setSavedPlans] = useState<SavedPlanRun[]>([]);
  const [selectedBasePlanId, setSelectedBasePlanId] = useState<string>('');

  // Scenario Input Assumptions
  const [scenarioName, setScenarioName] = useState<string>('Custom Supply Chain Shock');
  const [shelfLifeDeltaHours, setShelfLifeDeltaHours] = useState<number>(0);
  const [routeDelayHours, setRouteDelayHours] = useState<number>(0);
  const [capacityMultiplierPct, setCapacityMultiplierPct] = useState<number>(100); // 100% = normal, 70% = -30%
  const [demandMultiplierPct, setDemandMultiplierPct] = useState<number>(100);
  const [priceMultiplierPct, setPriceMultiplierPct] = useState<number>(100);
  const [safetyBufferHours, setSafetyBufferHours] = useState<number>(4.0);
  const [spoilageCostPerKg, setSpoilageCostPerKg] = useState<number>(0.20);
  const [priceElasticity, setPriceElasticity] = useState<number>(-1.2);

  // Selected Target Destination for localized delay (or 'All')
  const [targetDestinationId, setTargetDestinationId] = useState<string>('ALL');

  // Simulation Execution State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<ScenarioSimulationResult | null>(null);
  const [scenarioHistory, setScenarioHistory] = useState<ScenarioSimulationResult[]>([]);

  // Sensitivity State
  const [sensitivityParam, setSensitivityParam] = useState<'shelf_life' | 'travel_time' | 'demand' | 'price'>('shelf_life');
  const [sensitivityData, setSensitivityData] = useState<SensitivityAnalysisResult | null>(null);
  const [isLoadingSensitivity, setIsLoadingSensitivity] = useState(false);

  // Explainability Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedInfeasible, setSelectedInfeasible] = useState<{
    batchId: string;
    commodityName: string;
    destinationId: string;
    destinationName: string;
    reason: string;
  } | null>(null);

  // Load destinations & base plans
  useEffect(() => {
    const init = async () => {
      try {
        const [dests, plans, history] = await Promise.all([
          api.destinations.getAll(),
          api.optimization.getSavedPlans(),
          api.optimization.getScenarioHistory(),
        ]);
        setDestinations(dests);
        setSavedPlans(plans);
        setScenarioHistory(history);
        if (plans.length > 0) {
          setSelectedBasePlanId(plans[0].id);
        }
      } catch (err) {
        console.error('Failed loading simulation inputs:', err);
      }
    };
    init();
  }, []);

  // Fetch sensitivity data when switching to sensitivity tab or changing param
  useEffect(() => {
    if (activeTab === 'sensitivity') {
      const loadSens = async () => {
        setIsLoadingSensitivity(true);
        try {
          const res = await api.optimization.getSensitivity(sensitivityParam);
          setSensitivityData(res);
        } catch (err) {
          console.error('Failed loading sensitivity:', err);
        } finally {
          setIsLoadingSensitivity(false);
        }
      };
      loadSens();
    }
  }, [activeTab, sensitivityParam]);

  // Pre-configured Presets
  const applyPreset = (presetType: 'heatwave' | 'highway_delay' | 'fleet_shortage' | 'demand_surge' | 'price_drop') => {
    if (presetType === 'heatwave') {
      setScenarioName('Extreme Summer Heat Wave & Accelerated Decay');
      setShelfLifeDeltaHours(-12);
      setRouteDelayHours(1.0);
      setCapacityMultiplierPct(100);
      setDemandMultiplierPct(100);
      setPriceMultiplierPct(100);
      setSafetyBufferHours(6.0);
    } else if (presetType === 'highway_delay') {
      setScenarioName('I-5 Highway Mountain Corridor Closure');
      setShelfLifeDeltaHours(0);
      setRouteDelayHours(4.5);
      setCapacityMultiplierPct(90);
      setDemandMultiplierPct(100);
      setPriceMultiplierPct(100);
      setSafetyBufferHours(4.0);
    } else if (presetType === 'fleet_shortage') {
      setScenarioName('Regional Reefer Truck Driver & Fleet Shortage');
      setShelfLifeDeltaHours(0);
      setRouteDelayHours(1.0);
      setCapacityMultiplierPct(60); // -40% capacity
      setDemandMultiplierPct(100);
      setPriceMultiplierPct(100);
      setSafetyBufferHours(4.0);
    } else if (presetType === 'demand_surge') {
      setScenarioName('Pacific Northwest Wholesale Market Demand Surge');
      setShelfLifeDeltaHours(0);
      setRouteDelayHours(0);
      setCapacityMultiplierPct(110);
      setDemandMultiplierPct(140); // +40% demand
      setPriceMultiplierPct(110); // +10% price premium
      setSafetyBufferHours(4.0);
    } else if (presetType === 'price_drop') {
      setScenarioName('Terminal Market Wholesale Glut & Price Slump');
      setShelfLifeDeltaHours(0);
      setRouteDelayHours(0);
      setCapacityMultiplierPct(100);
      setDemandMultiplierPct(90);
      setPriceMultiplierPct(75); // -25% price
      setSafetyBufferHours(4.0);
    }
  };

  const handleResetInputs = () => {
    setScenarioName('Baseline Conditions (Neutral)');
    setShelfLifeDeltaHours(0);
    setRouteDelayHours(0);
    setCapacityMultiplierPct(100);
    setDemandMultiplierPct(100);
    setPriceMultiplierPct(100);
    setSafetyBufferHours(4.0);
    setSpoilageCostPerKg(0.20);
    setPriceElasticity(-1.2);
    setTargetDestinationId('ALL');
  };

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      // Build route delay, capacity, demand, and price maps
      const routeDelay: Record<string, number> = {};
      const capacityMultiplier: Record<string, number> = {};
      const demandMultiplier: Record<string, number> = {};
      const priceMultiplier: Record<string, number> = {};

      const capMult = capacityMultiplierPct / 100;
      const demMult = demandMultiplierPct / 100;
      const priMult = priceMultiplierPct / 100;

      destinations.forEach((d) => {
        if (targetDestinationId === 'ALL' || targetDestinationId === d.id) {
          if (routeDelayHours !== 0) routeDelay[d.id] = routeDelayHours;
          if (capMult !== 1.0) capacityMultiplier[d.id] = capMult;
          if (demMult !== 1.0) demandMultiplier[d.id] = demMult;
          if (priMult !== 1.0) priceMultiplier[d.id] = priMult;
        }
      });

      const modifications: ScenarioModification = {
        name: scenarioName.trim() || 'Simulated Scenario',
        description: `Shelf Life Δ: ${shelfLifeDeltaHours}h, Delay: +${routeDelayHours}h, Fleet Cap: ${capacityMultiplierPct}%, Demand: ${demandMultiplierPct}%, Price: ${priceMultiplierPct}%`,
        routeDelayHours: Object.keys(routeDelay).length > 0 ? routeDelay : undefined,
        capacityMultiplier: Object.keys(capacityMultiplier).length > 0 ? capacityMultiplier : undefined,
        demandMultiplier: Object.keys(demandMultiplier).length > 0 ? demandMultiplier : undefined,
        priceMultiplier: Object.keys(priceMultiplier).length > 0 ? priceMultiplier : undefined,
        shelfLifeDeltaHours: shelfLifeDeltaHours !== 0 ? shelfLifeDeltaHours : undefined,
        safetyBufferHours,
        spoilageCostPerKg,
        priceElasticity,
      };

      const result = await api.optimization.simulateScenario({
        basePlanId: selectedBasePlanId || undefined,
        modifications,
      });

      setSimulationResult(result);
      setScenarioHistory((prev) => [result, ...prev.filter((h) => h.scenarioId !== result.scenarioId)]);
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.optimization.deleteScenario(id);
      setScenarioHistory((prev) => prev.filter((s) => s.scenarioId !== id));
      if (simulationResult?.scenarioId === id) {
        setSimulationResult(null);
      }
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Recharts Side-by-Side Delta Chart
  const comparisonData = simulationResult
    ? [
        {
          name: 'Allocated Vol (kg)',
          Original: simulationResult.originalPlanSummary.totalVolumeKg,
          Simulated: simulationResult.scenarioOptimized.totalAllocatedKg,
        },
        {
          name: 'Spoilage Loss (kg)',
          Original: simulationResult.originalPlanSummary.spoilageKg,
          Simulated: simulationResult.scenarioOptimized.spoiledQuantityKg,
        },
      ]
    : [];

  const financialComparisonData = simulationResult
    ? [
        {
          name: 'Net Revenue ($)',
          Original: simulationResult.originalPlanSummary.netRevenue,
          Simulated: simulationResult.scenarioOptimized.netRevenue,
        },
        {
          name: 'Transport Costs ($)',
          Original: simulationResult.scenarioBaseline.totalTransportCosts,
          Simulated: simulationResult.scenarioOptimized.totalTransportCosts,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Explainability Drawer */}
      <ExplainabilityDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        infeasibleItem={selectedInfeasible}
        currency={currency}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#E2E6DC]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-extrabold text-[#243D2B]">
              Perishable What-If Scenario Simulator
            </h1>
            <span className="text-[10px] font-bold tracking-widest text-[#243D2B] bg-[#D8E5C3] px-2 py-0.5 rounded uppercase">
              Non-Destructive Sandbox
            </span>
          </div>
          <p className="text-xs text-[#687267] mt-1">
            Simulate climate, route delay, fleet shortage, demand shocks, and wholesale price volatility without altering active inventory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#243D2B] hover:bg-[#1D3223] rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Play size={14} className={isSimulating ? 'animate-spin' : 'fill-white'} />
            <span>{isSimulating ? 'Simulating Non-Destructive LP...' : 'Execute What-If Simulation'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E2E6DC] text-xs">
        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-4 py-2.5 font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'simulator'
              ? 'border-[#243D2B] text-[#243D2B]'
              : 'border-transparent text-[#687267] hover:text-[#202820]'
          }`}
        >
          <SlidersHorizontal size={15} />
          <span>Interactive Parameter Sandbox</span>
        </button>

        <button
          onClick={() => setActiveTab('sensitivity')}
          className={`px-4 py-2.5 font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'sensitivity'
              ? 'border-[#243D2B] text-[#243D2B]'
              : 'border-transparent text-[#687267] hover:text-[#202820]'
          }`}
        >
          <Activity size={15} />
          <span>Deterministic Sensitivity Sweeps</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'history'
              ? 'border-[#243D2B] text-[#243D2B]'
              : 'border-transparent text-[#687267] hover:text-[#202820]'
          }`}
        >
          <History size={15} />
          <span>Simulation History ({scenarioHistory.length})</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: INTERACTIVE PARAMETER SANDBOX                     */}
      {/* ========================================================= */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Simulation Controls (5 Cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Quick Presets */}
            <div className="bg-white p-4 rounded-xl border border-[#E2E6DC] shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#687267] block mb-2.5">
                Evaluator Quick Scenarios
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => applyPreset('heatwave')}
                  className="flex items-center gap-1.5 p-2 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-left text-red-900 transition-colors"
                >
                  <Flame size={14} className="text-red-600 shrink-0" />
                  <div>
                    <div className="font-bold text-[11px]">Heat Wave</div>
                    <div className="text-[10px] text-red-700">-12h Shelf Life</div>
                  </div>
                </button>

                <button
                  onClick={() => applyPreset('highway_delay')}
                  className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-left text-amber-900 transition-colors"
                >
                  <Truck size={14} className="text-amber-600 shrink-0" />
                  <div>
                    <div className="font-bold text-[11px]">Corridor Delay</div>
                    <div className="text-[10px] text-amber-700">+4.5h Transit</div>
                  </div>
                </button>

                <button
                  onClick={() => applyPreset('fleet_shortage')}
                  className="flex items-center gap-1.5 p-2 rounded-lg bg-[#F4F0E6] hover:bg-[#eae3d5] border border-[#E2E6DC] text-left text-[#202820] transition-colors"
                >
                  <AlertTriangle size={14} className="text-[#E78B45] shrink-0" />
                  <div>
                    <div className="font-bold text-[11px]">Fleet Shortage</div>
                    <div className="text-[10px] text-[#687267]">-40% Capacity</div>
                  </div>
                </button>

                <button
                  onClick={() => applyPreset('demand_surge')}
                  className="flex items-center gap-1.5 p-2 rounded-lg bg-[#D8E5C3]/40 hover:bg-[#D8E5C3] border border-[#D8E5C3] text-left text-[#243D2B] transition-colors"
                >
                  <TrendingUp size={14} className="text-[#355C40] shrink-0" />
                  <div>
                    <div className="font-bold text-[11px]">Demand Surge</div>
                    <div className="text-[10px] text-[#355C40]">+40% Volume</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Sandbox Inputs Panel */}
            <div className="bg-white p-5 rounded-xl border border-[#E2E6DC] shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2E6DC]">
                <h3 className="text-xs font-heading font-bold text-[#202820] uppercase tracking-wider">
                  Scenario Parameters
                </h3>
                <button
                  onClick={handleResetInputs}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#687267] hover:text-[#243D2B] transition-colors"
                >
                  <RotateCcw size={12} />
                  <span>Reset Neutral</span>
                </button>
              </div>

              {/* Scenario Name */}
              <div>
                <label className="block text-xs font-semibold text-[#202820] mb-1">
                  Scenario Label
                </label>
                <input
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  className="w-full text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg px-3 py-2 text-[#202820] font-medium focus:outline-hidden focus:border-[#243D2B]"
                />
              </div>

              {/* Base Plan Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#202820] mb-1">
                  Baseline Benchmark Run
                </label>
                <select
                  value={selectedBasePlanId}
                  onChange={(e) => setSelectedBasePlanId(e.target.value)}
                  className="w-full text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg px-3 py-2 text-[#202820] focus:outline-hidden focus:border-[#243D2B]"
                >
                  {savedPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  {savedPlans.length === 0 && <option value="">Live Current State</option>}
                </select>
              </div>

              {/* Target Hub Filter */}
              <div>
                <label className="block text-xs font-semibold text-[#202820] mb-1">
                  Regional Corridor Scope
                </label>
                <select
                  value={targetDestinationId}
                  onChange={(e) => setTargetDestinationId(e.target.value)}
                  className="w-full text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg px-3 py-2 text-[#202820] focus:outline-hidden focus:border-[#243D2B]"
                >
                  <option value="ALL">Network-Wide (All Regional Corridors)</option>
                  {destinations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.location})
                    </option>
                  ))}
                </select>
              </div>

              {/* Slider 1: Shelf Life Decay Shock */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-[#202820]">Shelf-Life Shock (Δ Hours)</span>
                  <span className={`font-mono font-bold tabular-nums ${shelfLifeDeltaHours < 0 ? 'text-red-600' : 'text-[#202820]'}`}>
                    {shelfLifeDeltaHours > 0 ? `+${shelfLifeDeltaHours}` : shelfLifeDeltaHours} hrs
                  </span>
                </div>
                <input
                  type="range"
                  min="-24"
                  max="12"
                  step="1"
                  value={shelfLifeDeltaHours}
                  onChange={(e) => setShelfLifeDeltaHours(Number(e.target.value))}
                  className="w-full accent-[#243D2B] cursor-pointer"
                />
                <span className="text-[10px] text-[#687267]">Negative simulates field heat degradation or broken cold-chain.</span>
              </div>

              {/* Slider 2: Route / Travel Time Delay */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-[#202820]">Corridor Transit Delay (+Hours)</span>
                  <span className={`font-mono font-bold tabular-nums ${routeDelayHours > 0 ? 'text-[#E78B45]' : 'text-[#202820]'}`}>
                    +{routeDelayHours} hrs
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="0.5"
                  value={routeDelayHours}
                  onChange={(e) => setRouteDelayHours(Number(e.target.value))}
                  className="w-full accent-[#243D2B] cursor-pointer"
                />
                <span className="text-[10px] text-[#687267]">Mountain corridor delays, traffic congestion, or highway detours.</span>
              </div>

              {/* Slider 3: Fleet Transport Capacity Multiplier */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-[#202820]">Transport Capacity Multiplier (%)</span>
                  <span className="font-mono font-bold text-[#202820] tabular-nums">
                    {capacityMultiplierPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="160"
                  step="5"
                  value={capacityMultiplierPct}
                  onChange={(e) => setCapacityMultiplierPct(Number(e.target.value))}
                  className="w-full accent-[#243D2B] cursor-pointer"
                />
                <span className="text-[10px] text-[#687267]">Below 100% models reefer truck shortages or driver unavailability.</span>
              </div>

              {/* Slider 4: Destination Demand Multiplier */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-[#202820]">Market Contract Demand (%)</span>
                  <span className="font-mono font-bold text-[#202820] tabular-nums">
                    {demandMultiplierPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="180"
                  step="5"
                  value={demandMultiplierPct}
                  onChange={(e) => setDemandMultiplierPct(Number(e.target.value))}
                  className="w-full accent-[#243D2B] cursor-pointer"
                />
                <span className="text-[10px] text-[#687267]">Retail demand contractions vs holiday or grocery purchase surges.</span>
              </div>

              {/* Slider 5: Market Price Shock */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-[#202820]">Wholesale Price Multiplier (%)</span>
                  <span className={`font-mono font-bold tabular-nums ${priceMultiplierPct < 100 ? 'text-red-600' : 'text-[#355C40]'}`}>
                    {priceMultiplierPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="5"
                  value={priceMultiplierPct}
                  onChange={(e) => setPriceMultiplierPct(Number(e.target.value))}
                  className="w-full accent-[#243D2B] cursor-pointer"
                />
                <span className="text-[10px] text-[#687267]">Terminal wholesale market price elasticity shocks.</span>
              </div>

              <button
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#243D2B] hover:bg-[#1D3223] rounded-lg transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Play size={14} className={isSimulating ? 'animate-spin' : 'fill-white'} />
                <span>{isSimulating ? 'Executing Simulation...' : 'Run What-If Scenario'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Simulation Results & Deltas (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            {simulationResult ? (
              <>
                {/* Result Header & Status */}
                <div className="bg-white p-5 rounded-xl border border-[#E2E6DC] shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#355C40] bg-[#D8E5C3] px-2 py-0.5 rounded">
                        Simulation Completed
                      </span>
                      <h2 className="text-lg font-heading font-bold text-[#202820] mt-1">
                        {simulationResult.scenarioName}
                      </h2>
                    </div>
                    <span className="text-xs text-[#687267] font-mono">
                      {new Date(simulationResult.simulatedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-[#687267]">{simulationResult.description}</p>
                </div>

                {/* KPI Delta Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Delta 1: Spoilage */}
                  <div className="bg-white p-4 rounded-xl border border-[#E2E6DC] shadow-xs">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#687267]">
                      Spoilage Delta
                    </span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className={`text-xl font-heading font-bold tabular-nums ${
                        simulationResult.deltas.spoilageDeltaKg > 0 ? 'text-red-600' : 'text-[#355C40]'
                      }`}>
                        {simulationResult.deltas.spoilageDeltaKg > 0 ? '+' : ''}
                        {simulationResult.deltas.spoilageDeltaKg.toLocaleString()}
                      </span>
                      <span className="text-xs font-normal text-[#687267]">kg</span>
                    </div>
                    <div className="text-[10px] text-[#687267] mt-1">
                      Total: {simulationResult.scenarioOptimized.spoiledQuantityKg.toLocaleString()} kg
                    </div>
                  </div>

                  {/* Delta 2: Net Margin */}
                  <div className="bg-white p-4 rounded-xl border border-[#E2E6DC] shadow-xs">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#687267]">
                      Net Margin Delta
                    </span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className={`text-xl font-heading font-bold tabular-nums ${
                        simulationResult.deltas.netRevenueDelta >= 0 ? 'text-[#355C40]' : 'text-red-600'
                      }`}>
                        {simulationResult.deltas.netRevenueDelta >= 0 ? '+' : ''}
                        {currency}{simulationResult.deltas.netRevenueDelta.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#687267] mt-1">
                      Simulated: {currency}{simulationResult.scenarioOptimized.netRevenue.toLocaleString()}
                    </div>
                  </div>

                  {/* Delta 3: Fulfillment */}
                  <div className="bg-white p-4 rounded-xl border border-[#E2E6DC] shadow-xs">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#687267]">
                      Fulfillment Rate
                    </span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className={`text-xl font-heading font-bold tabular-nums ${
                        simulationResult.deltas.fulfillmentDeltaPercent >= 0 ? 'text-[#355C40]' : 'text-red-600'
                      }`}>
                        {simulationResult.deltas.fulfillmentDeltaPercent >= 0 ? '+' : ''}
                        {simulationResult.deltas.fulfillmentDeltaPercent}%
                      </span>
                    </div>
                    <div className="text-[10px] text-[#687267] mt-1">
                      Fulfillment: {simulationResult.scenarioOptimized.demandFulfillmentPercent}%
                    </div>
                  </div>

                  {/* Delta 4: Dispatches Count */}
                  <div className="bg-white p-4 rounded-xl border border-[#E2E6DC] shadow-xs">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#687267]">
                      Feasible Dispatches
                    </span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-xl font-heading font-bold text-[#202820] tabular-nums">
                        {simulationResult.scenarioOptimized.dispatches.length}
                      </span>
                      <span className="text-xs text-[#687267]">
                        / {simulationResult.scenarioOptimized.dispatches.length + simulationResult.newlyInfeasibleRoutes.length}
                      </span>
                    </div>
                    <div className="text-[10px] text-amber-700 mt-1">
                      {simulationResult.newlyInfeasibleRoutes.length} newly infeasible
                    </div>
                  </div>
                </div>

                {/* Operations Research Domain Observations */}
                {simulationResult.observations.length > 0 && (
                  <div className="bg-[#F8FAF7] border-l-4 border-[#355C40] p-4 rounded-r-xl border border-y-[#E2E6DC] border-r-[#E2E6DC] space-y-1.5 text-xs text-[#202820]">
                    <div className="font-bold text-[#243D2B] flex items-center gap-1.5">
                      <Sparkles size={14} className="text-[#355C40]" />
                      <span>Mathematical & Operational Insights</span>
                    </div>
                    {simulationResult.observations.map((obs, i) => (
                      <p key={i} className="text-xs text-[#687267] leading-relaxed">
                        • {obs}
                      </p>
                    ))}
                  </div>
                )}

                {/* Newly Infeasible Routes Alert Banner */}
                {simulationResult.newlyInfeasibleRoutes.length > 0 && (
                  <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                      <AlertTriangle size={15} className="text-[#E78B45]" />
                      <span>
                        Cold-Chain Decay Breaches Triggered ({simulationResult.newlyInfeasibleRoutes.length})
                      </span>
                    </div>
                    <p className="text-xs text-amber-800">
                      The following routes were previously feasible, but can no longer be serviced under this scenario:
                    </p>
                    <div className="space-y-1.5 pt-1">
                      {simulationResult.newlyInfeasibleRoutes.map((inf, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setSelectedInfeasible(inf);
                            setDrawerOpen(true);
                          }}
                          className="flex items-center justify-between text-xs p-2 bg-white/70 hover:bg-white rounded-lg border border-amber-200/60 cursor-pointer transition-colors"
                        >
                          <div>
                            <span className="font-bold text-[#202820]">Batch {inf.batchId}</span> ({inf.commodityName}) → <span className="font-medium text-[#202820]">{inf.destinationName}</span>
                          </div>
                          <span className="text-[11px] text-red-700 font-medium">Audit Diagnostic →</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Side-by-Side Visual Comparison Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-[#E2E6DC] shadow-xs">
                    <h4 className="text-xs font-heading font-bold text-[#202820] mb-3">
                      Volume & Spoilage Comparison (kg)
                    </h4>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E6DC" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#687267' }} />
                          <YAxis tick={{ fontSize: 10, fill: '#687267' }} />
                          <Tooltip
                            formatter={(val: any) => [`${Number(val || 0).toLocaleString()} kg`, '']}
                            contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E6DC', borderRadius: '8px', fontSize: '11px' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
                          <Bar dataKey="Original" fill="#C2C9BD" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Simulated" fill="#243D2B" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-[#E2E6DC] shadow-xs">
                    <h4 className="text-xs font-heading font-bold text-[#202820] mb-3">
                      Financial Comparison ($)
                    </h4>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={financialComparisonData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E6DC" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#687267' }} />
                          <YAxis tick={{ fontSize: 10, fill: '#687267' }} />
                          <Tooltip
                            formatter={(val: any) => [`${currency}${Number(val || 0).toLocaleString()}`, '']}
                            contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E6DC', borderRadius: '8px', fontSize: '11px' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
                          <Bar dataKey="Original" fill="#C2C9BD" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Simulated" fill="#355C40" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Empty Simulation State */
              <div className="bg-white p-12 rounded-xl border border-[#E2E6DC] text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-xl bg-[#F4F0E6] flex items-center justify-center text-[#243D2B] mx-auto">
                  <SlidersHorizontal size={24} />
                </div>
                <h3 className="text-base font-heading font-bold text-[#202820]">
                  Ready to Run What-If Simulation
                </h3>
                <p className="text-xs text-[#687267] max-w-md mx-auto">
                  Adjust parameter sliders on the left or select an Evaluator Quick Scenario, then click <strong>Execute What-If Simulation</strong> to calculate real-time optimization deltas.
                </p>
                <button
                  onClick={handleRunSimulation}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#243D2B] hover:bg-[#1D3223] rounded-lg transition-colors shadow-xs"
                >
                  Run Baseline Simulation Now
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: DETERMINISTIC SENSITIVITY SWEEPS                   */}
      {/* ========================================================= */}
      {activeTab === 'sensitivity' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-[#E2E6DC] flex flex-wrap items-center justify-between gap-4 shadow-xs">
            <div>
              <h2 className="text-base font-heading font-bold text-[#202820]">
                Systematic Parameter Sensitivity Curves
              </h2>
              <p className="text-xs text-[#687267] mt-0.5">
                Evaluates how continuous variation across operational variables impacts net profit, spoilage, and route feasibility.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#687267]">Parameter Sweep:</span>
              <select
                value={sensitivityParam}
                onChange={(e) => setSensitivityParam(e.target.value as any)}
                className="text-xs font-semibold text-[#243D2B] bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg px-3 py-1.5 focus:outline-hidden"
              >
                <option value="shelf_life">Shelf-Life Decay Shock (-16h to 0h)</option>
                <option value="travel_time">Transit Corridor Delays (0% to +50%)</option>
                <option value="demand">Destination Demand Shift (-25% to +50%)</option>
                <option value="price">Terminal Market Price Shocks (-30% to 0%)</option>
              </select>
            </div>
          </div>

          {isLoadingSensitivity ? (
            <div className="bg-white p-16 rounded-xl border border-[#E2E6DC] text-center">
              <div className="w-8 h-8 border-3 border-[#243D2B] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <div className="text-xs font-medium text-[#687267]">Solving parameter sweep iterations...</div>
            </div>
          ) : sensitivityData ? (
            <div className="space-y-6">
              {/* Sensitivity Description Banner */}
              <div className="bg-[#F8FAF7] border-l-4 border-[#355C40] p-4 rounded-r-xl border border-y-[#E2E6DC] border-r-[#E2E6DC]">
                <h3 className="text-sm font-bold text-[#243D2B]">{sensitivityData.label}</h3>
                <p className="text-xs text-[#687267] mt-1">{sensitivityData.description}</p>
                <div className="text-xs font-medium text-[#355C40] mt-2 bg-white/60 p-2.5 rounded-lg border border-[#E2E6DC]">
                  <strong>Key Finding:</strong> {sensitivityData.interpretation}
                </div>
              </div>

              {/* Sensitivity Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: Profit vs. Spoilage */}
                <div className="bg-white p-5 rounded-xl border border-[#E2E6DC] shadow-xs">
                  <h3 className="text-xs font-heading font-bold text-[#202820] uppercase tracking-wider mb-3">
                    Net Revenue ($) vs. Modeled Spoilage (kg)
                  </h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sensitivityData.dataPoints}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E6DC" vertical={false} />
                        <XAxis dataKey="variationLabel" tick={{ fontSize: 11, fill: '#687267' }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#687267' }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#687267' }} />
                        <Tooltip
                          formatter={(val: any, name: any) => [
                            String(name).includes('Revenue') ? `${currency}${Number(val || 0).toLocaleString()}` : `${Number(val || 0).toLocaleString()} kg`,
                            name,
                          ]}
                          contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E6DC', borderRadius: '8px', fontSize: '11px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Line yAxisId="left" type="monotone" dataKey="netRevenue" name="Net Revenue ($)" stroke="#355C40" strokeWidth={2.5} dot={{ r: 4 }} />
                        <Line yAxisId="right" type="monotone" dataKey="spoilageKg" name="Spoilage Loss (kg)" stroke="#E78B45" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Demand Fulfillment vs Feasible Dispatches */}
                <div className="bg-white p-5 rounded-xl border border-[#E2E6DC] shadow-xs">
                  <h3 className="text-xs font-heading font-bold text-[#202820] uppercase tracking-wider mb-3">
                    Demand Fulfillment (%) vs. Feasible Dispatches
                  </h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sensitivityData.dataPoints}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E6DC" vertical={false} />
                        <XAxis dataKey="variationLabel" tick={{ fontSize: 11, fill: '#687267' }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#687267' }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#687267' }} />
                        <Tooltip
                          formatter={(val: any, name: any) => [
                            String(name).includes('Fulfillment') ? `${val}%` : `${val} routes`,
                            name,
                          ]}
                          contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E6DC', borderRadius: '8px', fontSize: '11px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Line yAxisId="left" type="monotone" dataKey="demandFulfillmentPercent" name="Fulfillment (%)" stroke="#243D2B" strokeWidth={2.5} dot={{ r: 4 }} />
                        <Line yAxisId="right" type="monotone" dataKey="feasibleDispatchesCount" name="Feasible Dispatches" stroke="#718B63" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Sensitivity Data Table */}
              <div className="bg-white rounded-xl border border-[#E2E6DC] overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAF7] border-b border-[#E2E6DC] text-[#687267]">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Sweep Interval</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Net Margin ($)</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Spoilage Loss (kg)</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Fulfillment Rate</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Feasible Routes</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Unmet Demand (kg)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E6DC]">
                    {sensitivityData.dataPoints.map((dp, i) => (
                      <tr key={i} className="hover:bg-[#F8FAF7]/50">
                        <td className="py-2.5 px-4 font-semibold text-[#202820]">{dp.variationLabel}</td>
                        <td className="py-2.5 px-4 text-right tabular-nums font-bold text-[#355C40]">
                          {currency}{dp.netRevenue.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums text-red-600">
                          {dp.spoilageKg.toLocaleString()} kg
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums font-medium text-[#202820]">
                          {dp.demandFulfillmentPercent}%
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums font-mono">
                          {dp.feasibleDispatchesCount}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums text-[#687267]">
                          {dp.unmetDemandKg.toLocaleString()} kg
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: SIMULATION HISTORY                                 */}
      {/* ========================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-[#E2E6DC] flex items-center justify-between shadow-xs">
            <div>
              <h3 className="text-sm font-heading font-bold text-[#202820]">
                Saved Scenario Simulations ({scenarioHistory.length})
              </h3>
              <p className="text-xs text-[#687267]">
                Compare previous what-if scenarios or restore them into the sandbox.
              </p>
            </div>
          </div>

          {scenarioHistory.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-[#E2E6DC] text-center text-xs text-[#687267]">
              No simulations run yet. Execute a what-if scenario in the sandbox tab to save history.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scenarioHistory.map((scen) => (
                <div
                  key={scen.scenarioId}
                  onClick={() => {
                    setSimulationResult(scen);
                    setActiveTab('simulator');
                  }}
                  className="bg-white p-5 rounded-xl border border-[#E2E6DC] hover:border-[#243D2B] transition-all cursor-pointer shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#243D2B]">{scen.scenarioId}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#687267]">
                        {new Date(scen.simulatedAt).toLocaleDateString()} {new Date(scen.simulatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        onClick={(e) => handleDeleteHistory(scen.scenarioId, e)}
                        className="text-red-500 hover:text-red-700 p-1 rounded"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-heading font-bold text-sm text-[#202820]">{scen.scenarioName}</h4>
                    <p className="text-xs text-[#687267] line-clamp-2 mt-0.5">{scen.description}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E2E6DC] text-xs">
                    <div>
                      <div className="text-[10px] text-[#687267] uppercase">Net Margin Δ</div>
                      <div className={`font-bold tabular-nums ${scen.deltas.netRevenueDelta >= 0 ? 'text-[#355C40]' : 'text-red-600'}`}>
                        {scen.deltas.netRevenueDelta >= 0 ? '+' : ''}{currency}{scen.deltas.netRevenueDelta.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#687267] uppercase">Spoilage Δ</div>
                      <div className={`font-bold tabular-nums ${scen.deltas.spoilageDeltaKg > 0 ? 'text-red-600' : 'text-[#355C40]'}`}>
                        {scen.deltas.spoilageDeltaKg > 0 ? '+' : ''}{scen.deltas.spoilageDeltaKg} kg
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#687267] uppercase">Fulfillment Δ</div>
                      <div className="font-bold text-[#202820] tabular-nums">
                        {scen.deltas.fulfillmentDeltaPercent >= 0 ? '+' : ''}{scen.deltas.fulfillmentDeltaPercent}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
