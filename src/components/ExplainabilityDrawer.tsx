import React from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Truck,
  DollarSign,
  TrendingUp,
  MapPin,
  Boxes,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Scale,
} from 'lucide-react';
import { ProposedDispatch } from '../types/index.ts';

interface ExplainabilityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  dispatch?: ProposedDispatch | null;
  infeasibleItem?: {
    batchId: string;
    commodityName: string;
    destinationId: string;
    destinationName: string;
    reason: string;
  } | null;
  baselineDiff?: {
    batchId: string;
    commodityName: string;
    baselineDestination?: string;
    baselineRevenue?: number;
    baselineSpoilage?: number;
    optimizedDestination?: string;
    optimizedRevenue?: number;
    optimizedSpoilage?: number;
    reason: string;
  } | null;
  currency?: string;
}

export const ExplainabilityDrawer: React.FC<ExplainabilityDrawerProps> = ({
  isOpen,
  onClose,
  dispatch,
  infeasibleItem,
  baselineDiff,
  currency = '$',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="px-6 py-5 bg-[#243D2B] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[#D8E5C3]">
              {infeasibleItem ? (
                <AlertTriangle size={18} className="text-[#E78B45]" />
              ) : (
                <ShieldCheck size={18} />
              )}
            </div>
            <div>
              <h2 className="font-heading font-bold text-base text-white">
                {infeasibleItem
                  ? 'Infeasibility Diagnostic & Rejection Audit'
                  : baselineDiff
                  ? 'Baseline vs. FreshRoute Allocation Rationale'
                  : 'Decision Explainability & Math Verification'}
              </h2>
              <p className="text-xs text-white/70">
                Transparent Operations Research and Constraint Justification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-[#202820]">
          {/* CASE 1: PROPOSED DISPATCH EXPLANATION */}
          {dispatch && (
            <>
              {/* Header Badge & Title */}
              <div className="bg-[#F4F0E6] p-4 rounded-xl border border-[#E2E6DC]">
                <div className="flex items-center justify-between text-xs text-[#687267] mb-1">
                  <span>Dispatch ID: <strong className="text-[#202820]">{dispatch.id}</strong></span>
                  <span className="px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px] bg-[#D8E5C3] text-[#243D2B]">
                    {dispatch.priorityLevel}
                  </span>
                </div>
                <div className="text-lg font-heading font-bold text-[#243D2B]">
                  {dispatch.allocatedQuantityKg.toLocaleString()} kg {dispatch.commodityName}
                </div>
                <div className="flex items-center gap-2 text-xs text-[#687267] mt-1">
                  <span>Batch: <strong className="text-[#202820]">{dispatch.batchId}</strong></span>
                  <span>→</span>
                  <span>Destination: <strong className="text-[#202820]">{dispatch.destinationName}</strong></span>
                </div>
              </div>

              {/* Natural Language Objective Explanation */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#687267] mb-2">
                  Optimization Rationale
                </h3>
                <div className="bg-[#F8FAF7] border-l-3 border-[#355C40] p-4 rounded-r-xl border border-y-[#E2E6DC] border-r-[#E2E6DC] text-xs leading-relaxed text-[#202820]">
                  <p className="font-medium text-[#243D2B] mb-1">Why this route was selected:</p>
                  <p>{dispatch.explanation}</p>
                  {dispatch.alternativesConsidered && (
                    <p className="mt-2 text-[#687267]">
                      <strong>Alternatives Evaluated:</strong> {dispatch.alternativesConsidered}
                    </p>
                  )}
                </div>
              </div>

              {/* Shelf-Life Math Verification */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#687267] mb-2 flex items-center gap-1.5">
                  <Clock size={14} className="text-[#355C40]" />
                  <span>Cold-Chain Shelf-Life Equation</span>
                </h3>
                <div className="bg-white border border-[#E2E6DC] rounded-xl p-4 space-y-3 text-xs">
                  <div className="grid grid-cols-3 gap-2 text-center pb-3 border-b border-[#E2E6DC]">
                    <div className="bg-[#F8FAF7] p-2 rounded-lg">
                      <div className="text-[10px] text-[#687267] uppercase">Handling & Load</div>
                      <div className="text-sm font-bold text-[#202820] tabular-nums">{dispatch.handlingHours} hrs</div>
                    </div>
                    <div className="bg-[#F8FAF7] p-2 rounded-lg">
                      <div className="text-[10px] text-[#687267] uppercase">Reefer Transit</div>
                      <div className="text-sm font-bold text-[#202820] tabular-nums">{dispatch.travelHours} hrs</div>
                    </div>
                    <div className="bg-[#F8FAF7] p-2 rounded-lg">
                      <div className="text-[10px] text-[#687267] uppercase">Total Required</div>
                      <div className="text-sm font-bold text-[#243D2B] tabular-nums">{dispatch.totalRequiredTimeHours} hrs</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[#687267]">Remaining Usable Freshness at Dock Arrival:</span>
                    <span className="font-heading font-bold text-sm text-[#355C40] tabular-nums">
                      {dispatch.remainingShelfLifeAtArrivalHours} hrs
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#D8E5C3]/40 border border-[#D8E5C3] text-[11px] text-[#243D2B] flex items-center gap-2">
                    <CheckCircle2 size={15} className="shrink-0 text-[#355C40]" />
                    <span>
                      Passes 4.0h buffer threshold and destination contract minimum. Zero modeled en-route decay.
                    </span>
                  </div>
                </div>
              </div>

              {/* Reconciled Financial Ledger */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#687267] mb-2 flex items-center gap-1.5">
                  <DollarSign size={14} className="text-[#355C40]" />
                  <span>Reconciled Financial Ledger (Per Dispatch)</span>
                </h3>
                <div className="bg-white border border-[#E2E6DC] rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-[#F8FAF7] border-b border-[#E2E6DC] text-[11px] text-[#687267]">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Ledger Item</th>
                        <th className="py-2 px-3 font-semibold">Unit Rate</th>
                        <th className="py-2 px-3 font-semibold text-right">Dispatch Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E6DC]">
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-[#202820]">Gross Contract Revenue</td>
                        <td className="py-2.5 px-3 text-[#687267] tabular-nums">{currency}{dispatch.sellingPricePerKg.toFixed(2)} /kg</td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#202820] tabular-nums">+{currency}{dispatch.grossRevenue.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-[#687267]">Refrigerated Transport Freight</td>
                        <td className="py-2 px-3 text-[#687267] tabular-nums">{currency}{dispatch.transportCostPerKg.toFixed(2)} /kg</td>
                        <td className="py-2 px-3 text-right text-red-600 tabular-nums">-{currency}{dispatch.transportCost.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-[#687267]">Cross-Dock Handling</td>
                        <td className="py-2 px-3 text-[#687267] tabular-nums">{currency}{dispatch.warehouseHandlingCostPerKg.toFixed(2)} /kg</td>
                        <td className="py-2 px-3 text-right text-red-600 tabular-nums">-{currency}{dispatch.handlingCost.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-[#687267]">Grower Acquisition Cost</td>
                        <td className="py-2 px-3 text-[#687267] tabular-nums">{currency}{dispatch.unitCost.toFixed(2)} /kg</td>
                        <td className="py-2 px-3 text-right text-red-600 tabular-nums">-{currency}{dispatch.batchCost.toLocaleString()}</td>
                      </tr>
                      <tr className="bg-[#F4F0E6] font-bold text-[#243D2B]">
                        <td className="py-2.5 px-3">Net Operating Margin</td>
                        <td className="py-2.5 px-3 tabular-nums">
                          {currency}{((dispatch.netMargin / dispatch.allocatedQuantityKg)).toFixed(2)} /kg
                        </td>
                        <td className="py-2.5 px-3 text-right text-sm text-[#355C40] tabular-nums">
                          +{currency}{dispatch.netMargin.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* CASE 2: INFEASIBLE COMBINATION DIAGNOSTIC */}
          {infeasibleItem && (
            <>
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 mb-1">
                  <AlertCircle size={15} />
                  <span>Hard Constraint Rejection</span>
                </div>
                <div className="text-base font-heading font-bold text-[#202820]">
                  Batch {infeasibleItem.batchId} ({infeasibleItem.commodityName}) ↛ {infeasibleItem.destinationName}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#687267] mb-2">
                  Solver Diagnostic Reason
                </h3>
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-xs text-red-900 leading-relaxed">
                  <p className="font-bold mb-1">Why the LP solver strictly forbade this allocation:</p>
                  <p>{infeasibleItem.reason}</p>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#687267] mb-2">
                  Violated Feasibility Guardrails
                </h3>
                <div className="bg-white border border-[#E2E6DC] rounded-xl p-4 space-y-2.5 text-xs">
                  <div className="flex items-start gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                    <span>
                      <strong>Perishable Shelf Life Rule:</strong> Required transit & handling time must be strictly less than remaining harvest shelf life minus the configured safety buffer.
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>
                      <strong>Buyer Dock Contract:</strong> Commercial buyers contractually reject shipments with inadequate remaining dock shelf life upon arrival.
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <span>
                      <strong>Recommended Alternative:</strong> Divert this batch to a proximal wholesale market, or trigger an immediate 15–25% clearance discount in the Dynamic Markdowns module.
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* CASE 3: BASELINE COMPARISON */}
          {baselineDiff && (
            <>
              <div className="bg-[#F4F0E6] p-4 rounded-xl border border-[#E2E6DC]">
                <div className="text-xs font-bold uppercase tracking-wider text-[#243D2B] mb-1">
                  Strategy Decision Variance
                </div>
                <div className="text-base font-heading font-bold text-[#202820]">
                  {baselineDiff.commodityName} (Batch {baselineDiff.batchId})
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl space-y-1">
                  <div className="font-bold text-red-900">Baseline (FIFO)</div>
                  <div className="text-[#687267]">Destination: {baselineDiff.baselineDestination || 'None'}</div>
                  <div className="text-[#687267]">Net Margin: {currency}{baselineDiff.baselineRevenue?.toLocaleString() || 0}</div>
                  <div className="text-red-700 font-medium">Spoilage: {baselineDiff.baselineSpoilage || 0} kg</div>
                </div>

                <div className="p-3 bg-[#D8E5C3]/40 border border-[#D8E5C3] rounded-xl space-y-1">
                  <div className="font-bold text-[#243D2B]">FreshRoute (LP)</div>
                  <div className="text-[#687267]">Destination: {baselineDiff.optimizedDestination || 'None'}</div>
                  <div className="text-[#355C40] font-bold">Net Margin: {currency}{baselineDiff.optimizedRevenue?.toLocaleString() || 0}</div>
                  <div className="text-[#355C40] font-medium">Spoilage: {baselineDiff.optimizedSpoilage || 0} kg</div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#687267] mb-2">
                  Comparative Analysis
                </h3>
                <div className="bg-[#F8FAF7] border border-[#E2E6DC] p-4 rounded-xl text-xs text-[#202820] leading-relaxed">
                  {baselineDiff.reason}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E2E6DC] bg-[#F8FAF7] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#243D2B] hover:bg-[#1D3223] rounded-lg transition-colors shadow-xs"
          >
            Close Audit Drawer
          </button>
        </div>
      </div>
    </div>
  );
};
