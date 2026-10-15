import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Truck,
  Clock,
  DollarSign,
  Calendar,
  X,
  AlertCircle,
  CheckCircle2,
  Scale,
  Building,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Destination, CommodityDemand, DestinationType } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const DestinationsPage: React.FC = () => {
  const { company } = useAuth();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [viewingDestination, setViewingDestination] = useState<Destination | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    id?: string;
    name: string;
    location: string;
    destinationType: DestinationType;
    distanceKm: number;
    estimatedTravelHours: number;
    transportCostPerKg: number;
    availableTransportCapacityKg: number;
    handlingTimeHours: number;
    deliveryDeadline: string;
    contactPerson: string;
    notes: string;
    commodityDemands: CommodityDemand[];
  }>({
    name: '',
    location: '',
    destinationType: 'Wholesale Market',
    distanceKm: 250,
    estimatedTravelHours: 4.0,
    transportCostPerKg: 0.18,
    availableTransportCapacityKg: 8000,
    handlingTimeHours: 1.5,
    deliveryDeadline: new Date().toISOString().split('T')[0],
    contactPerson: '',
    notes: '',
    commodityDemands: [
      { commodityName: 'Gir Kesar Mango (Talala GI Tagged)', demandKg: 1500, fulfilledKg: 0, sellingPricePerKg: 220 },
    ],
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadDestinations = async () => {
    try {
      setLoading(true);
      const data = await api.destinations.getAll();
      setDestinations(data);
    } catch (err) {
      console.error('Failed loading destinations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDestinations();
  }, []);

  const currency = company?.defaultCurrency || '₹';

  const openAddModal = () => {
    setFormData({
      id: `DEST-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      location: '',
      destinationType: 'Wholesale Market',
      distanceKm: 250,
      estimatedTravelHours: 4.0,
      transportCostPerKg: company?.defaultTransportCostPerKg || 2.20,
      availableTransportCapacityKg: 8000,
      handlingTimeHours: 1.5,
      deliveryDeadline: new Date().toISOString().split('T')[0],
      contactPerson: '',
      notes: '',
      commodityDemands: [
        { commodityName: 'Gir Kesar Mango (Talala GI Tagged)', demandKg: 1500, fulfilledKg: 0, sellingPricePerKg: 220, minShelfLifeRequiredHours: 24 },
        { commodityName: 'Anand Robusta Banana', demandKg: 1000, fulfilledKg: 0, sellingPricePerKg: 28, minShelfLifeRequiredHours: 28 }
      ],
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (dest: Destination) => {
    setEditingDestination(dest);
    setFormData({
      id: dest.id,
      name: dest.name,
      location: dest.location,
      destinationType: dest.destinationType,
      distanceKm: dest.distanceKm,
      estimatedTravelHours: dest.estimatedTravelHours,
      transportCostPerKg: dest.transportCostPerKg,
      availableTransportCapacityKg: dest.availableTransportCapacityKg,
      handlingTimeHours: dest.handlingTimeHours,
      deliveryDeadline: dest.deliveryDeadline,
      contactPerson: dest.contactPerson || '',
      notes: dest.notes || '',
      commodityDemands: dest.commodityDemands.map(cd => ({ ...cd })),
    });
    setFormError(null);
  };

  const addDemandRow = () => {
    setFormData(prev => ({
      ...prev,
      commodityDemands: [
        ...prev.commodityDemands,
        { commodityName: '', demandKg: 500, fulfilledKg: 0, sellingPricePerKg: 3.00, minShelfLifeRequiredHours: 24 },
      ],
    }));
  };

  const removeDemandRow = (index: number) => {
    setFormData(prev => ({
      ...prev,
      commodityDemands: prev.commodityDemands.filter((_, i) => i !== index),
    }));
  };

  const updateDemandRow = (index: number, field: keyof CommodityDemand, value: any) => {
    setFormData(prev => {
      const updated = [...prev.commodityDemands];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, commodityDemands: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Destination name is required');
      return;
    }
    if (!formData.location.trim()) {
      setFormError('Location is required');
      return;
    }
    if (formData.availableTransportCapacityKg <= 0) {
      setFormError('Transport capacity must be greater than zero kg');
      return;
    }
    if (formData.commodityDemands.length === 0) {
      setFormError('At least one commodity demand must be configured');
      return;
    }
    for (const cd of formData.commodityDemands) {
      if (!cd.commodityName.trim()) {
        setFormError('All commodity demands must have a commodity name');
        return;
      }
      if (cd.demandKg <= 0) {
        setFormError(`Demand for ${cd.commodityName} must be greater than zero`);
        return;
      }
      if (cd.sellingPricePerKg <= 0) {
        setFormError(`Selling price for ${cd.commodityName} must be greater than zero`);
        return;
      }
    }

    setSubmitting(true);
    try {
      if (editingDestination) {
        await api.destinations.update(editingDestination.id, formData);
        setEditingDestination(null);
      } else {
        await api.destinations.create(formData);
        setIsAddModalOpen(false);
      }
      await loadDestinations();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Permanently remove destination ${id}?`)) {
      return;
    }
    try {
      await api.destinations.delete(id);
      await loadDestinations();
    } catch (err: any) {
      alert(`Deletion error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#E2E6DC]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-[#243D2B]">
            Destinations & Market Demands
          </h1>
          <div className="flex items-center gap-2 text-xs text-[#687267] mt-1">
            <span>{destinations.length} active terminal markets</span>
            <span aria-hidden="true">·</span>
            <span>
              {destinations.reduce((sum, d) => sum + d.commodityDemands.reduce((s, cd) => s + cd.demandKg, 0), 0).toLocaleString()} kg total demand
            </span>
            <span aria-hidden="true">·</span>
            <span>Commodity-specific pricing & transport constraints</span>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#243D2B] hover:bg-[#1D3223] rounded-lg shadow-sm transition-colors whitespace-nowrap self-start md:self-auto"
        >
          <Plus size={16} />
          <span>Add Destination Hub</span>
        </button>
      </div>

      {/* Destinations Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {destinations.map((dest) => {
          const totalDestDemand = dest.commodityDemands.reduce((sum, cd) => sum + cd.demandKg, 0);
          const totalFulfilled = dest.commodityDemands.reduce((sum, cd) => sum + cd.fulfilledKg, 0);
          const fulfillmentPct = totalDestDemand > 0 ? Math.round((totalFulfilled / totalDestDemand) * 100) : 0;

          return (
            <div
              key={dest.id}
              className="bg-white rounded-xl border border-[#E2E6DC] p-5 shadow-xs flex flex-col justify-between hover:border-[#355C40]/50 transition-colors"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#E2E6DC]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-base text-[#202820]">
                        {dest.name}
                      </span>
                      <span className="text-[11px] font-mono text-[#687267]">{dest.id}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#687267] mt-1">
                      <MapPin size={13} className="text-[#355C40] shrink-0" />
                      <span>{dest.location}</span>
                      <span aria-hidden="true">·</span>
                      <span>{dest.destinationType}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditModal(dest)}
                      title="Edit Destination"
                      className="p-1.5 text-[#687267] hover:text-[#355C40] hover:bg-[#E2E6DC]/40 rounded transition-colors"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(dest.id)}
                      title="Delete Destination"
                      className="p-1.5 text-[#687267] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Logistics Profile Strip */}
                <div className="grid grid-cols-3 gap-2 py-3 border-b border-[#E2E6DC] text-xs">
                  <div>
                    <span className="text-[11px] text-[#687267] block">Transit + Dock</span>
                    <span className="font-semibold text-[#202820] tabular-nums">
                      {dest.estimatedTravelHours}h + {dest.handlingTimeHours}h
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#687267] block">Transport Rate</span>
                    <span className="font-semibold text-[#202820] tabular-nums">
                      {currency}{dest.transportCostPerKg.toFixed(2)}/kg
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#687267] block">Vehicle Capacity</span>
                    <span className="font-semibold text-[#202820] tabular-nums">
                      {dest.availableTransportCapacityKg.toLocaleString()} kg
                    </span>
                  </div>
                </div>

                {/* Commodity Demands List */}
                <div className="py-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#202820]">
                    <span>Target Commodity Demands</span>
                    <span className="text-[#687267] font-normal text-[11px]">
                      {totalFulfilled.toLocaleString()} / {totalDestDemand.toLocaleString()} kg ({fulfillmentPct}%)
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {dest.commodityDemands.map((cd, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-[#F8FAF7] rounded border border-[#E2E6DC]/80 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-medium text-[#202820]">{cd.commodityName}</div>
                          <div className="text-[11px] text-[#687267]">
                            Requires min {cd.minShelfLifeRequiredHours || 24}h shelf life on dock
                          </div>
                        </div>
                        <div className="text-right tabular-nums">
                          <div className="font-bold text-[#202820]">
                            {currency}{cd.sellingPricePerKg.toFixed(2)}/kg
                          </div>
                          <div className="text-[11px] text-[#687267]">
                            {cd.fulfilledKg} / {cd.demandKg} kg
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Delivery Deadline & Contact */}
              <div className="pt-3 border-t border-[#E2E6DC] flex items-center justify-between text-xs text-[#687267]">
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-[#355C40]" />
                  <span>Dock Deadline: {dest.deliveryDeadline}</span>
                </div>
                {dest.contactPerson && (
                  <span className="truncate max-w-[160px]">{dest.contactPerson}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Destination Modal */}
      {(isAddModalOpen || editingDestination) && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#E2E6DC] max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E6DC]">
              <h3 className="font-heading font-bold text-base text-[#202820]">
                {editingDestination ? `Edit Destination (${editingDestination.id})` : 'Register Destination Market'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingDestination(null);
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

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#202820] mb-1">
                    Terminal / Facility Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pacific Fresh Wholesale Terminal"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202820] mb-1">
                    Location / City *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Surat, Gujarat (Sahara Darwaja Terminal)"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#202820] mb-1">
                    Facility Type
                  </label>
                  <select
                    value={formData.destinationType}
                    onChange={(e) => setFormData({ ...formData, destinationType: e.target.value as DestinationType })}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                  >
                    <option value="Wholesale Market">Wholesale Terminal</option>
                    <option value="Supermarket Chain">Supermarket Depot</option>
                    <option value="Regional Food Bank">Food Bank / Relief</option>
                    <option value="Food Service Processor">Commissary Processor</option>
                    <option value="Direct Retail Hub">Retail Hub</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202820] mb-1">
                    Distance (km)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.distanceKm}
                    onChange={(e) => setFormData({ ...formData, distanceKm: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202820] mb-1">
                    Travel Time (Hours)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formData.estimatedTravelHours}
                    onChange={(e) => setFormData({ ...formData, estimatedTravelHours: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#202820] mb-1">
                    Transport Cost/kg ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.transportCostPerKg}
                    onChange={(e) => setFormData({ ...formData, transportCostPerKg: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202820] mb-1">
                    Vehicle Capacity (kg)
                  </label>
                  <input
                    type="number"
                    min="100"
                    value={formData.availableTransportCapacityKg}
                    onChange={(e) => setFormData({ ...formData, availableTransportCapacityKg: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202820] mb-1">
                    Dock Handling (Hours)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.handlingTimeHours}
                    onChange={(e) => setFormData({ ...formData, handlingTimeHours: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                  />
                </div>
              </div>

              {/* Dynamic Commodity Demands Builder */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[#202820]">
                    Commodity Demand Specifications & Selling Prices
                  </label>
                  <button
                    type="button"
                    onClick={addDemandRow}
                    className="text-xs font-semibold text-[#355C40] hover:underline flex items-center gap-1"
                  >
                    <Plus size={14} />
                    <span>Add Commodity</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.commodityDemands.map((cd, idx) => (
                    <div key={idx} className="p-3 bg-[#F8FAF7] rounded-lg border border-[#E2E6DC] grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        <input
                          type="text"
                          required
                          placeholder="Commodity name"
                          value={cd.commodityName}
                          onChange={(e) => updateDemandRow(idx, 'commodityName', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E2E6DC] rounded focus:outline-none focus:border-[#355C40]"
                        />
                      </div>
                      <div className="col-span-3">
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            placeholder="Demand kg"
                            value={cd.demandKg}
                            onChange={(e) => updateDemandRow(idx, 'demandKg', parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E2E6DC] rounded focus:outline-none focus:border-[#355C40]"
                          />
                          <span className="absolute right-2 top-1.5 text-[10px] text-[#687267]">kg</span>
                        </div>
                      </div>
                      <div className="col-span-3">
                        <div className="relative">
                          <input
                            type="number"
                            step="0.05"
                            min="0.1"
                            placeholder="Price/kg"
                            value={cd.sellingPricePerKg}
                            onChange={(e) => updateDemandRow(idx, 'sellingPricePerKg', parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E2E6DC] rounded focus:outline-none focus:border-[#355C40]"
                          />
                          <span className="absolute right-2 top-1.5 text-[10px] text-[#687267]">{currency}/kg</span>
                        </div>
                      </div>
                      <div className="col-span-2 flex justify-end">
                        {formData.commodityDemands.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDemandRow(idx)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Remove"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#202820] mb-1">
                    Delivery Dock Deadline
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2026-10-16 18:00"
                    value={formData.deliveryDeadline}
                    onChange={(e) => setFormData({ ...formData, deliveryDeadline: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202820] mb-1">
                    Dock Contact / Receiving Mgr
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. David Vance (Dock Master)"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg focus:outline-none focus:border-[#355C40]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E6DC]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingDestination(null);
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
                  {submitting ? 'Saving...' : editingDestination ? 'Save Changes' : 'Create Destination Hub'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
