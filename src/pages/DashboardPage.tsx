import React, { useState, useEffect } from 'react';
import {
  Boxes,
  MapPin,
  AlertTriangle,
  Truck,
  ArrowUpRight,
  Plus,
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldAlert,
  ChevronRight,
  PackageCheck,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { DashboardStats, InventoryBatch, Allocation, Destination } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
  onOpenAddBatch?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { company } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, batchesData, allocsData, destsData] = await Promise.all([
        api.dashboard.getStats(),
        api.inventory.getAll(),
        api.allocations.getAll(),
        api.destinations.getAll(),
      ]);
      setStats(statsData);
      setBatches(batchesData);
      setAllocations(allocsData);
      setDestinations(destsData);
    } catch (err) {
      console.error('Failed loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Commodity Distribution for Recharts
  const commodityTotals: Record<string, { available: number; allocated: number }> = {};
  batches.forEach((b) => {
    const key = b.category || 'Other';
    if (!commodityTotals[key]) {
      commodityTotals[key] = { available: 0, allocated: 0 };
    }
    commodityTotals[key].available += b.availableQuantityKg;
    commodityTotals[key].allocated += b.allocatedQuantityKg;
  });

  const categoryBarData = Object.entries(commodityTotals).map(([name, vals]) => ({
    category: name,
    Available: vals.available,
    Allocated: vals.allocated,
  }));

  // Compute Shelf-Life Risk Distribution
  const criticalThreshold = company?.criticalShelfLifeHours || 48;
  const warningThreshold = company?.warningShelfLifeHours || 96;

  let criticalKg = 0;
  let warningKg = 0;
  let healthyKg = 0;

  batches.forEach((b) => {
    if (b.availableQuantityKg <= 0) return;
    if (b.remainingShelfLifeHours <= criticalThreshold) {
      criticalKg += b.availableQuantityKg;
    } else if (b.remainingShelfLifeHours <= warningThreshold) {
      warningKg += b.availableQuantityKg;
    } else {
      healthyKg += b.availableQuantityKg;
    }
  });

  const shelfLifePieData = [
    { name: `Critical (< ${criticalThreshold}h)`, value: criticalKg, color: '#E78B45' },
    { name: `Warning (${criticalThreshold}-${warningThreshold}h)`, value: warningKg, color: '#D8E5C3' },
    { name: `Stable (> ${warningThreshold}h)`, value: healthyKg, color: '#355C40' },
  ].filter(d => d.value > 0);

  // Recent 5 batches
  const recentBatches = batches.slice(0, 5);
  // Recent 5 allocations
  const recentAllocations = allocations.slice(0, 5);

  const currency = company?.defaultCurrency || '$';

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#E2E6DC]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-[#243D2B]">
            Operational Distribution Overview
          </h1>
          <div className="flex items-center gap-2 text-xs text-[#687267] mt-1">
            <span>{company?.companyName || 'Gujarat Agro Fresh Logistics Ltd.'}</span>
            <span aria-hidden="true">·</span>
            <span>{company?.operatingRegion || 'Gujarat State APMC Network'}</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#355C40] font-semibold">Live Enterprise Operations</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('/inventory')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#243D2B] bg-[#F4F0E6] hover:bg-[#D8E5C3] border border-[#E2E6DC] rounded-lg transition-colors whitespace-nowrap"
          >
            <Boxes size={15} />
            <span>Manage Inventory</span>
          </button>
          <button
            onClick={() => onNavigate('/distribution')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#243D2B] hover:bg-[#1D3223] rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            <Truck size={15} />
            <span>Plan Dispatches</span>
          </button>
        </div>
      </div>

      {/* Urgent Freshness Alert Callout if At-Risk Inventory Exists */}
      {stats && stats.atRiskInventoryKg > 0 && (
        <div className="bg-[#FFF9F3] border border-[#E78B45]/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[#E78B45]/15 text-[#E78B45] rounded-lg shrink-0 mt-0.5 sm:mt-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="text-sm font-heading font-bold text-[#202820]">
                Freshness Action Required: {stats.atRiskInventoryKg.toLocaleString()} kg Perishable Produce Under {criticalThreshold}h Shelf Life
              </div>
              <div className="text-xs text-[#687267] mt-0.5">
                {stats.criticalBatchesCount} batches risk spoilage unless routed to high-velocity destinations or discounted for immediate clearance.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('/discounts')}
              className="px-3 py-1.5 text-xs font-semibold text-[#E78B45] hover:bg-[#E78B45]/10 border border-[#E78B45]/40 rounded-lg transition-colors whitespace-nowrap"
            >
              Review Markdowns
            </button>
            <button
              onClick={() => onNavigate('/distribution')}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#243D2B] hover:bg-[#1D3223] rounded-lg transition-colors whitespace-nowrap"
            >
              Priority Dispatch →
            </button>
          </div>
        </div>
      )}

      {/* 4 Core Operational KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Available Inventory */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E6DC] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#687267]">
            <span className="text-xs font-semibold uppercase tracking-wider">Available Stock</span>
            <Boxes size={18} className="text-[#355C40]" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-heading font-bold text-[#202820] tabular-nums">
              {stats ? stats.totalAvailableInventoryKg.toLocaleString() : '—'} <span className="text-sm font-normal text-[#687267]">kg</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-[#687267]">
              <span>{stats?.totalBatchesCount || 0} active batches</span>
              <span aria-hidden="true">·</span>
              <span>Across 6 categories</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Destination Demand */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E6DC] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#687267]">
            <span className="text-xs font-semibold uppercase tracking-wider">Recorded Demand</span>
            <MapPin size={18} className="text-[#355C40]" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-heading font-bold text-[#202820] tabular-nums">
              {stats ? stats.totalDestinationDemandKg.toLocaleString() : '—'} <span className="text-sm font-normal text-[#687267]">kg</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-[#687267]">
              <span>{stats?.totalDestinationsCount || 0} terminal markets</span>
              <span aria-hidden="true">·</span>
              <span>Regional network</span>
            </div>
          </div>
        </div>

        {/* KPI 3: At-Risk Inventory */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E6DC] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#687267]">
            <span className="text-xs font-semibold uppercase tracking-wider">At-Risk Freshness</span>
            <AlertTriangle size={18} className="text-[#E78B45]" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-heading font-bold text-[#E78B45] tabular-nums">
              {stats ? stats.atRiskInventoryKg.toLocaleString() : '—'} <span className="text-sm font-normal text-[#687267]">kg</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-[#687267]">
              <span>Shelf life &lt; {criticalThreshold}h</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#E78B45] font-medium">{stats?.criticalBatchesCount || 0} batches urgent</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Pending Allocations & Dispatches */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E6DC] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#687267]">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Dispatches</span>
            <Truck size={18} className="text-[#355C40]" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-heading font-bold text-[#202820] tabular-nums">
              {stats ? stats.pendingAllocationsKg.toLocaleString() : '—'} <span className="text-sm font-normal text-[#687267]">kg</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-[#687267]">
              <span>{currency}{stats ? stats.projectedRevenue.toLocaleString() : '0'} planned rev</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#355C40] font-medium">{currency}{stats ? stats.projectedMargin.toLocaleString() : '0'} margin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Commodity Inventory Volume Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-[#E2E6DC] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-bold text-sm text-[#202820]">
                Inventory by Commodity Category
              </h3>
              <p className="text-xs text-[#687267]">
                Available warehouse stock vs. allocated dispatch volumes (kg)
              </p>
            </div>
            <span className="text-xs text-[#687267] font-medium">Real-Time</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBarData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="category" tick={{ fill: '#687267', fontSize: 11 }} axisLine={{ stroke: '#E2E6DC' }} tickLine={false} />
                <YAxis tick={{ fill: '#687267', fontSize: 11 }} axisLine={{ stroke: '#E2E6DC' }} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => [typeof val === 'number' ? `${val.toLocaleString()} kg` : `${val} kg`, '']}
                  contentStyle={{ backgroundColor: '#243D2B', color: '#FFFFFF', borderRadius: 8, fontSize: 12, border: 'none' }}
                  labelStyle={{ color: '#D8E5C3', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar dataKey="Available" fill="#355C40" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Allocated" fill="#D8E5C3" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Shelf-Life Risk Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-[#E2E6DC] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-heading font-bold text-sm text-[#202820]">
                Shelf-Life Freshness Risk
              </h3>
              <Clock size={16} className="text-[#687267]" />
            </div>
            <p className="text-xs text-[#687267]">
              Total produce volume grouped by remaining hours until spoilage
            </p>
          </div>

          <div className="h-52 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={shelfLifePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {shelfLifePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [typeof val === 'number' ? `${val.toLocaleString()} kg` : `${val} kg`, 'Volume']}
                  contentStyle={{ backgroundColor: '#243D2B', color: '#FFFFFF', borderRadius: 8, fontSize: 12, border: 'none' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[#E2E6DC] text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E78B45]"></span>
                <span className="text-[#202820]">Critical (&lt; {criticalThreshold}h)</span>
              </div>
              <span className="font-semibold text-[#202820] tabular-nums">{criticalKg.toLocaleString()} kg</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D8E5C3]"></span>
                <span className="text-[#202820]">Warning ({criticalThreshold}-{warningThreshold}h)</span>
              </div>
              <span className="font-semibold text-[#202820] tabular-nums">{warningKg.toLocaleString()} kg</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#355C40]"></span>
                <span className="text-[#202820]">Stable (&gt; {warningThreshold}h)</span>
              </div>
              <span className="font-semibold text-[#202820] tabular-nums">{healthyKg.toLocaleString()} kg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Recent Batches & Recent Allocations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Produce Batches */}
        <div className="bg-white rounded-xl border border-[#E2E6DC] shadow-xs overflow-hidden">
          <div className="p-4 px-6 border-b border-[#E2E6DC] flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-sm text-[#202820]">
                Active Inventory Batches
              </h3>
              <p className="text-xs text-[#687267]">
                Live batch status, remaining shelf-life, and cold-chain hold temps
              </p>
            </div>
            <button
              onClick={() => onNavigate('/inventory')}
              className="text-xs font-semibold text-[#355C40] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-[#E2E6DC]">
            {recentBatches.map((batch) => {
              const isCritical = batch.remainingShelfLifeHours <= criticalThreshold;
              return (
                <div key={batch.id} className="p-4 px-6 hover:bg-[#F8FAF7] transition-colors flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-[#202820]">{batch.commodityName}</span>
                      <span className="text-[11px] font-mono text-[#687267]">{batch.id}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#687267]">
                      <span>{batch.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{batch.storageTempC}°C Cold Storage</span>
                      <span aria-hidden="true">·</span>
                      <span>Grade: {batch.qualityGrade.split(' ')[1] || 'A'}</span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-xs font-bold text-[#202820] tabular-nums">
                      {batch.availableQuantityKg.toLocaleString()} <span className="font-normal text-[#687267]">/ {batch.initialQuantityKg.toLocaleString()} kg</span>
                    </div>
                    <div className={`text-[11px] font-semibold tabular-nums ${isCritical ? 'text-[#E78B45]' : 'text-[#355C40]'}`}>
                      {batch.remainingShelfLifeHours}h shelf life
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Distribution Planning Allocations */}
        <div className="bg-white rounded-xl border border-[#E2E6DC] shadow-xs overflow-hidden">
          <div className="p-4 px-6 border-b border-[#E2E6DC] flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-sm text-[#202820]">
                Recent Allocation Activity
              </h3>
              <p className="text-xs text-[#687267]">
                Route allocations and projected net margins
              </p>
            </div>
            <button
              onClick={() => onNavigate('/distribution')}
              className="text-xs font-semibold text-[#355C40] hover:underline flex items-center gap-1"
            >
              <span>Dispatch Planning</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-[#E2E6DC]">
            {recentAllocations.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#687267]">
                No dispatch allocations created yet. Use Distribution Planning to route batches.
              </div>
            ) : (
              recentAllocations.map((alloc) => (
                <div key={alloc.id} className="p-4 px-6 hover:bg-[#F8FAF7] transition-colors flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-[#202820]">{alloc.commodityName}</span>
                      <span className="text-[11px] font-mono text-[#687267]">{alloc.id}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#687267]">
                      <span className="truncate max-w-[200px]">{alloc.destinationName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{alloc.transitHours}h transit</span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-xs font-bold text-[#202820] tabular-nums">
                      {alloc.quantityKg.toLocaleString()} kg
                    </div>
                    <div className="flex items-center justify-end gap-2 text-[11px]">
                      <span className="text-[#355C40] font-semibold tabular-nums">
                        +{currency}{alloc.netMargin.toLocaleString()}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className={`font-medium ${
                        alloc.status === 'Dispatched' ? 'text-[#355C40]' : 'text-[#687267]'
                      }`}>
                        {alloc.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
