import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Edit2,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle2,
  X,
  Clock,
  Thermometer,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { InventoryBatch, CommodityCategory, QualityGrade } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const InventoryPage: React.FC = () => {
  const { company } = useAuth();
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'shelfLifeAsc' | 'shelfLifeDesc' | 'qtyDesc' | 'nameAsc'>('shelfLifeAsc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<InventoryBatch | null>(null);
  const [viewingBatch, setViewingBatch] = useState<InventoryBatch | null>(null);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    commodityName: '',
    category: 'Berries' as CommodityCategory,
    initialQuantityKg: 1000,
    remainingShelfLifeHours: 72,
    harvestOrArrivalDate: new Date().toISOString().split('T')[0],
    estimatedHandlingHours: 2.0,
    storageTempC: 2.0,
    qualityGrade: 'Grade A (Prime)' as QualityGrade,
    qualityNotes: '',
    unitCost: 2.0,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const data = await api.inventory.getAll();
      setBatches(data);
    } catch (err) {
      console.error('Failed loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const criticalThreshold = company?.criticalShelfLifeHours || 48;
  const currency = company?.defaultCurrency || '$';

  // Filter & Sort Logic
  const filteredAndSortedBatches = useMemo(() => {
    let result = [...batches];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        b => b.commodityName.toLowerCase().includes(q) || b.id.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== 'All') {
      result = result.filter(b => b.category === selectedCategory);
    }

    if (selectedStatus !== 'All') {
      result = result.filter(b => b.status === selectedStatus);
    }

    result.sort((a, b) => {
      if (sortBy === 'shelfLifeAsc') return a.remainingShelfLifeHours - b.remainingShelfLifeHours;
      if (sortBy === 'shelfLifeDesc') return b.remainingShelfLifeHours - a.remainingShelfLifeHours;
      if (sortBy === 'qtyDesc') return b.availableQuantityKg - a.availableQuantityKg;
      if (sortBy === 'nameAsc') return a.commodityName.localeCompare(b.commodityName);
      return 0;
    });

    return result;
  }, [batches, search, selectedCategory, selectedStatus, sortBy]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredAndSortedBatches.length / pageSize) || 1;
  const paginatedBatches = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedBatches.slice(start, start + pageSize);
  }, [filteredAndSortedBatches, currentPage]);

  const openAddModal = () => {
    setFormData({
      id: `BATCH-2026-${Math.floor(100 + Math.random() * 900)}`,
      commodityName: '',
      category: 'Berries',
      initialQuantityKg: 1500,
      remainingShelfLifeHours: 72,
      harvestOrArrivalDate: new Date().toISOString().split('T')[0],
      estimatedHandlingHours: 2.0,
      storageTempC: 2.0,
      qualityGrade: 'Grade A (Prime)',
      qualityNotes: '',
      unitCost: 2.50,
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (batch: InventoryBatch) => {
    setEditingBatch(batch);
    setFormData({
      id: batch.id,
      commodityName: batch.commodityName,
      category: batch.category,
      initialQuantityKg: batch.initialQuantityKg,
      remainingShelfLifeHours: batch.remainingShelfLifeHours,
      harvestOrArrivalDate: batch.harvestOrArrivalDate,
      estimatedHandlingHours: batch.estimatedHandlingHours,
      storageTempC: batch.storageTempC,
      qualityGrade: batch.qualityGrade,
      qualityNotes: batch.qualityNotes || '',
      unitCost: batch.unitCost,
    });
    setFormError(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.commodityName.trim()) {
      setFormError('Commodity name is required');
      return;
    }
    if (formData.initialQuantityKg <= 0) {
      setFormError('Initial quantity must be greater than zero kg');
      return;
    }
    if (formData.remainingShelfLifeHours < 0) {
      setFormError('Shelf life cannot be negative');
      return;
    }
    if (formData.unitCost < 0) {
      setFormError('Unit cost cannot be negative');
      return;
    }

    setSubmitting(true);
    try {
      if (editingBatch) {
        await api.inventory.update(editingBatch.id, formData);
        setEditingBatch(null);
      } else {
        await api.inventory.create(formData);
        setIsAddModalOpen(false);
      }
      await loadBatches();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Permanently remove batch ${id}? This action restores unallocated stock records.`)) {
      return;
    }
    try {
      await api.inventory.delete(id);
      await loadBatches();
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#E2E6DC]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-[#243D2B]">
            Perishable Produce Inventory
          </h1>
          <div className="flex items-center gap-2 text-xs text-[#687267] mt-1">
            <span>{batches.length} total recorded batches</span>
            <span aria-hidden="true">·</span>
            <span>{batches.reduce((sum, b) => sum + b.availableQuantityKg, 0).toLocaleString()} kg available</span>
            <span aria-hidden="true">·</span>
            <span>Allocated stock is locked from double-dispatch</span>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#243D2B] hover:bg-[#1D3223] rounded-lg shadow-sm transition-colors whitespace-nowrap self-start md:self-auto"
        >
          <Plus size={16} />
          <span>Add Produce Batch</span>
        </button>
      </div>

      {/* Controls Bar: Search, Category, Status, Sort */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E6DC] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-2.5 text-[#687267]" />
          <input
            type="text"
            placeholder="Search by commodity or Batch ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg text-[#202820] focus:outline-none focus:border-[#355C40]"
          >
            <option value="All">All Categories</option>
            <option value="Berries">Berries</option>
            <option value="Leafy Greens">Leafy Greens</option>
            <option value="Solanaceous">Solanaceous (Tomatoes/Peppers)</option>
            <option value="Subtropical">Subtropical (Avocados/Citrus)</option>
            <option value="Brassicas">Brassicas (Broccoli/Cauliflower)</option>
            <option value="Root Veg">Root Veg</option>
            <option value="Other">Other</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg text-[#202820] focus:outline-none focus:border-[#355C40]"
          >
            <option value="All">All Statuses</option>
            <option value="available">Available</option>
            <option value="low_shelf_life">Low Shelf Life (&lt; {criticalThreshold}h)</option>
            <option value="spoiled">Spoiled</option>
            <option value="depleted">Depleted</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg text-[#202820] focus:outline-none focus:border-[#355C40]"
          >
            <option value="shelfLifeAsc">Sort: Shelf Life (Most Urgent First)</option>
            <option value="shelfLifeDesc">Sort: Shelf Life (Longest First)</option>
            <option value="qtyDesc">Sort: Available Qty (High to Low)</option>
            <option value="nameAsc">Sort: Commodity Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-[#E2E6DC] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAF7] text-[#687267] border-b border-[#E2E6DC] font-semibold">
                <th className="py-3 px-4">Batch ID & Commodity</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Available / Total (kg)</th>
                <th className="py-3 px-4 text-right">Remaining Shelf Life</th>
                <th className="py-3 px-4">Arrival / Harvest</th>
                <th className="py-3 px-4">Storage Temp</th>
                <th className="py-3 px-4">Grade & Cost</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E6DC]">
              {paginatedBatches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-[#687267]">
                    <Boxes size={32} className="mx-auto mb-2 text-[#AEC295]" />
                    <div className="font-semibold text-[#202820]">No produce batches match criteria</div>
                    <div className="mt-1">Try resetting search filters or add a new produce batch.</div>
                  </td>
                </tr>
              ) : (
                paginatedBatches.map((batch) => {
                  const isCritical = batch.remainingShelfLifeHours <= criticalThreshold;
                  return (
                    <tr
                      key={batch.id}
                      className={`hover:bg-[#F8FAF7] transition-colors ${
                        isCritical ? 'bg-[#FFF9F3]/60' : ''
                      }`}
                    >
                      {/* Batch ID & Commodity */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#202820]">{batch.commodityName}</div>
                        <div className="font-mono text-[11px] text-[#687267] mt-0.5">{batch.id}</div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-[#202820]">
                        {batch.category}
                      </td>

                      {/* Quantities */}
                      <td className="py-3 px-4 text-right tabular-nums">
                        <div className="font-bold text-[#202820]">
                          {batch.availableQuantityKg.toLocaleString()} kg
                        </div>
                        <div className="text-[11px] text-[#687267]">
                          {batch.allocatedQuantityKg > 0 && `${batch.allocatedQuantityKg.toLocaleString()} kg alloc · `}
                          {batch.initialQuantityKg.toLocaleString()} kg tot
                        </div>
                      </td>

                      {/* Remaining Shelf Life */}
                      <td className="py-3 px-4 text-right tabular-nums">
                        <div className={`font-bold flex items-center justify-end gap-1 ${
                          isCritical ? 'text-[#E78B45]' : 'text-[#355C40]'
                        }`}>
                          {isCritical && <AlertTriangle size={13} className="text-[#E78B45]" />}
                          <span>{batch.remainingShelfLifeHours} hrs</span>
                        </div>
                        <div className="text-[11px] text-[#687267]">
                          {(batch.remainingShelfLifeHours / 24).toFixed(1)} days
                        </div>
                      </td>

                      {/* Harvest / Arrival */}
                      <td className="py-3 px-4 text-[#687267]">
                        <div>{batch.harvestOrArrivalDate}</div>
                        <div className="text-[11px]">Handling: {batch.estimatedHandlingHours}h</div>
                      </td>

                      {/* Storage Temp */}
                      <td className="py-3 px-4 text-[#202820] tabular-nums">
                        <div className="flex items-center gap-1">
                          <Thermometer size={14} className="text-[#355C40]" />
                          <span>{batch.storageTempC}°C</span>
                        </div>
                      </td>

                      {/* Grade & Cost */}
                      <td className="py-3 px-4">
                        <div className="text-[#202820] font-medium">{batch.qualityGrade}</div>
                        <div className="text-[11px] text-[#687267] tabular-nums">
                          {currency}{batch.unitCost.toFixed(2)}/kg
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[11px] font-semibold tracking-tight ${
                          batch.status === 'low_shelf_life'
                            ? 'text-[#E78B45]'
                            : batch.status === 'spoiled'
                            ? 'text-red-700'
                            : batch.status === 'depleted'
                            ? 'text-[#687267]'
                            : 'text-[#355C40]'
                        }`}>
                          {batch.status === 'low_shelf_life' ? 'Low Shelf Life' : batch.status === 'available' ? 'Available' : batch.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingBatch(batch)}
                            title="Inspect Batch Details"
                            className="p-1.5 text-[#687267] hover:text-[#202820] hover:bg-[#E2E6DC]/40 rounded transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => openEditModal(batch)}
                            title="Edit Batch"
                            className="p-1.5 text-[#687267] hover:text-[#355C40] hover:bg-[#E2E6DC]/40 rounded transition-colors"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(batch.id)}
                            title="Delete Batch"
                            className="p-1.5 text-[#687267] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 px-6 border-t border-[#E2E6DC] bg-[#F8FAF7] flex items-center justify-between text-xs text-[#687267]">
          <div>
            Showing {filteredAndSortedBatches.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(currentPage * pageSize, filteredAndSortedBatches.length)} of {filteredAndSortedBatches.length} batches
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 border border-[#E2E6DC] rounded-lg disabled:opacity-40 hover:bg-white text-[#202820] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-semibold text-[#202820] tabular-nums">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 border border-[#E2E6DC] rounded-lg disabled:opacity-40 hover:bg-white text-[#202820] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Batch Modal */}
      {(isAddModalOpen || editingBatch) && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#E2E6DC] max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E6DC]">
              <h3 className="font-heading font-bold text-base text-[#202820]">
                {editingBatch ? `Edit Produce Batch (${editingBatch.id})` : 'Register New Produce Batch'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingBatch(null);
                }}
                className="text-[#687267] hover:text-[#202820]"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#202820] mb-1">
                    Commodity Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gir Kesar Mango (Talala GI)"
                    value={formData.commodityName}
                    onChange={(e) => setFormData({ ...formData, commodityName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202820] mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as CommodityCategory })}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                  >
                    <option value="Berries">Berries</option>
                    <option value="Leafy Greens">Leafy Greens</option>
                    <option value="Solanaceous">Solanaceous</option>
                    <option value="Stone Fruit">Stone Fruit</option>
                    <option value="Subtropical">Subtropical</option>
                    <option value="Brassicas">Brassicas</option>
                    <option value="Root Veg">Root Veg</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#202820] mb-1">
                    Initial Quantity (kg) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={formData.initialQuantityKg}
                    onChange={(e) => setFormData({ ...formData, initialQuantityKg: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202820] mb-1">
                    Remaining Shelf Life (Hours) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={formData.remainingShelfLifeHours}
                    onChange={(e) => setFormData({ ...formData, remainingShelfLifeHours: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                  />
                  <span className="text-[10px] text-[#687267] mt-0.5 block">
                    Critical cutoff is &lt; {criticalThreshold}h
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#202820] mb-1">
                    Harvest / Arrival Date
                  </label>
                  <input
                    type="date"
                    value={formData.harvestOrArrivalDate}
                    onChange={(e) => setFormData({ ...formData, harvestOrArrivalDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202820] mb-1">
                    Handling Time (h)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.estimatedHandlingHours}
                    onChange={(e) => setFormData({ ...formData, estimatedHandlingHours: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202820] mb-1">
                    Storage Temp (°C)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.storageTempC}
                    onChange={(e) => setFormData({ ...formData, storageTempC: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#202820] mb-1">
                    Quality Grade
                  </label>
                  <select
                    value={formData.qualityGrade}
                    onChange={(e) => setFormData({ ...formData, qualityGrade: e.target.value as QualityGrade })}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                  >
                    <option value="Grade A (Prime)">Grade A (Prime Fresh)</option>
                    <option value="Grade B (Standard)">Grade B (Standard Commercial)</option>
                    <option value="Processing Only">Processing / Food Service Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202820] mb-1">
                    Unit Cost per kg ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202820] mb-1">
                  Quality & Handling Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Field packed, pre-cooled to 2°C, high brix content"
                  value={formData.qualityNotes}
                  onChange={(e) => setFormData({ ...formData, qualityNotes: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E6DC]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingBatch(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-[#687267] hover:bg-[#F4F0E6] rounded-lg border border-[#E2E6DC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#243D2B] hover:bg-[#1D3223] rounded-lg shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingBatch ? 'Save Changes' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Batch Drawer */}
      {viewingBatch && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-[#E2E6DC] p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#E2E6DC]">
                <div>
                  <span className="text-[11px] font-mono text-[#687267]">{viewingBatch.id}</span>
                  <h3 className="font-heading font-bold text-lg text-[#202820]">
                    {viewingBatch.commodityName}
                  </h3>
                </div>
                <button
                  onClick={() => setViewingBatch(null)}
                  className="text-[#687267] hover:text-[#202820] p-1"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="py-5 space-y-4 text-xs">
                <div className="p-3 bg-[#F8FAF7] rounded-lg border border-[#E2E6DC] grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[#687267] block">Available Stock</span>
                    <span className="text-base font-bold text-[#202820] tabular-nums">
                      {viewingBatch.availableQuantityKg.toLocaleString()} kg
                    </span>
                  </div>
                  <div>
                    <span className="text-[#687267] block">Remaining Freshness</span>
                    <span className={`text-base font-bold tabular-nums ${
                      viewingBatch.remainingShelfLifeHours <= criticalThreshold ? 'text-[#E78B45]' : 'text-[#355C40]'
                    }`}>
                      {viewingBatch.remainingShelfLifeHours} hours
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-[#E2E6DC]">
                    <span className="text-[#687267]">Category</span>
                    <span className="font-medium text-[#202820]">{viewingBatch.category}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E2E6DC]">
                    <span className="text-[#687267]">Initial Harvest Volume</span>
                    <span className="font-medium text-[#202820] tabular-nums">{viewingBatch.initialQuantityKg.toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E2E6DC]">
                    <span className="text-[#687267]">Allocated to Routes</span>
                    <span className="font-medium text-[#202820] tabular-nums">{viewingBatch.allocatedQuantityKg.toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E2E6DC]">
                    <span className="text-[#687267]">Storage Temperature</span>
                    <span className="font-medium text-[#202820] tabular-nums">{viewingBatch.storageTempC}°C</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E2E6DC]">
                    <span className="text-[#687267]">Arrival / Harvest Date</span>
                    <span className="font-medium text-[#202820]">{viewingBatch.harvestOrArrivalDate}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E2E6DC]">
                    <span className="text-[#687267]">Quality Grade</span>
                    <span className="font-medium text-[#202820]">{viewingBatch.qualityGrade}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E2E6DC]">
                    <span className="text-[#687267]">Unit Acquisition Cost</span>
                    <span className="font-medium text-[#202820] tabular-nums">{currency}{viewingBatch.unitCost.toFixed(2)}/kg</span>
                  </div>
                </div>

                {viewingBatch.qualityNotes && (
                  <div className="pt-2">
                    <span className="text-[#687267] block mb-1 font-semibold">Quality & Inspector Notes:</span>
                    <div className="p-3 bg-[#F8FAF7] rounded border border-[#E2E6DC] text-[#202820]">
                      {viewingBatch.qualityNotes}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E6DC] flex gap-2">
              <button
                onClick={() => {
                  const b = viewingBatch;
                  setViewingBatch(null);
                  openEditModal(b);
                }}
                className="flex-1 py-2 bg-[#243D2B] text-white rounded-lg text-xs font-semibold hover:bg-[#1D3223]"
              >
                Edit Batch Parameters
              </button>
              <button
                onClick={() => setViewingBatch(null)}
                className="px-4 py-2 border border-[#E2E6DC] text-xs font-semibold text-[#687267] rounded-lg hover:bg-[#F4F0E6]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
