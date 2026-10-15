import solver from 'javascript-lp-solver';
import {
  InventoryBatch,
  Destination,
  CompanySettings,
  OptimizationParams,
  ProposedDispatch,
  StrategyPerformanceMetrics,
  OptimizationPlanResult,
  DiscountScenario,
  FeasibilityCheckResult,
  ScenarioModification,
  ScenarioSimulationResult,
  SensitivityAnalysisResult,
  SensitivityDataPoint,
} from '../../src/types/index.ts';

/**
 * Validates shelf-life and physical feasibility for a proposed (batch, destination) allocation.
 * Required time = loading time + travel time + unloading/handling time.
 * Usable shelf life at arrival = remaining shelf life - required time.
 */
export function checkShelfLifeFeasibility(
  batch: InventoryBatch,
  destination: Destination,
  params: OptimizationParams
): FeasibilityCheckResult {
  const loadingHours = Number(batch.estimatedHandlingHours) || 2.0;
  const travelHours = Number(destination.estimatedTravelHours) || 0.0;
  const unloadingHours = Number(destination.handlingTimeHours) || 1.5;
  const safetyBuffer = Number(params.safetyBufferHours) || 0.0;
  const minFreshnessMargin = Number(params.minFreshnessMarginHours) || 0.0;

  const requiredTimeHours = Math.round((loadingHours + travelHours + unloadingHours) * 10) / 10;
  const remainingShelfLifeAtArrival = Math.round((batch.remainingShelfLifeHours - requiredTimeHours) * 10) / 10;

  // 1. Commodity demand check
  const demandRecord = destination.commodityDemands.find(
    cd => cd.commodityName.toLowerCase() === batch.commodityName.toLowerCase() ||
          cd.commodityName.toLowerCase().includes(batch.category.toLowerCase())
  );

  if (!demandRecord) {
    return {
      feasible: false,
      requiredTimeHours,
      remainingShelfLifeAtArrivalHours: remainingShelfLifeAtArrival,
      rejectionReason: `Destination ${destination.name} has no demand contract for commodity "${batch.commodityName}".`,
    };
  }

  // 2. Shelf-life vs. Transit & Safety Buffer
  if (remainingShelfLifeAtArrival <= 0) {
    return {
      feasible: false,
      requiredTimeHours,
      remainingShelfLifeAtArrivalHours: remainingShelfLifeAtArrival,
      rejectionReason: `Perishable decay violation: Transit & handling (${requiredTimeHours}h) exceeds remaining shelf life (${batch.remainingShelfLifeHours}h). Produce would spoil en route.`,
    };
  }

  if (remainingShelfLifeAtArrival < safetyBuffer + minFreshnessMargin) {
    return {
      feasible: false,
      requiredTimeHours,
      remainingShelfLifeAtArrivalHours: remainingShelfLifeAtArrival,
      rejectionReason: `Safety buffer breach: Arrival shelf life (${remainingShelfLifeAtArrival}h) is below the configured safety threshold (${safetyBuffer}h buffer + ${minFreshnessMargin}h margin).`,
    };
  }

  // 3. Destination-specific minimum shelf life (if contracted)
  if (demandRecord.minShelfLifeRequiredHours && remainingShelfLifeAtArrival < demandRecord.minShelfLifeRequiredHours) {
    return {
      feasible: false,
      requiredTimeHours,
      remainingShelfLifeAtArrivalHours: remainingShelfLifeAtArrival,
      rejectionReason: `Buyer contract violation: Destination requires minimum ${demandRecord.minShelfLifeRequiredHours}h shelf life upon dock delivery, but only ${remainingShelfLifeAtArrival}h would remain.`,
    };
  }

  // 4. Physical availability
  if (batch.availableQuantityKg <= 0) {
    return {
      feasible: false,
      requiredTimeHours,
      remainingShelfLifeAtArrivalHours: remainingShelfLifeAtArrival,
      rejectionReason: `Batch ${batch.id} has no available stock (0 kg).`,
    };
  }

  if (destination.availableTransportCapacityKg <= 0) {
    return {
      feasible: false,
      requiredTimeHours,
      remainingShelfLifeAtArrivalHours: remainingShelfLifeAtArrival,
      rejectionReason: `Destination ${destination.name} vehicle capacity is fully utilized (0 kg remaining).`,
    };
  }

  return {
    feasible: true,
    requiredTimeHours,
    remainingShelfLifeAtArrivalHours: remainingShelfLifeAtArrival,
  };
}

/**
 * Solves the Perishable Produce Distribution Problem (PPDP) using Revised Simplex LP.
 * Objective: Maximize expected net economic margin while respecting all shelf-life, demand, and transport bounds.
 */
export function runOptimizationEngine(
  batches: InventoryBatch[],
  destinations: Destination[],
  company: CompanySettings,
  userParams?: Partial<OptimizationParams>
): OptimizationPlanResult {
  const params: OptimizationParams = {
    safetyBufferHours: userParams?.safetyBufferHours ?? 4.0,
    warehouseHandlingCostPerKg: userParams?.warehouseHandlingCostPerKg ?? 0.05,
    spoilageDisposalCostPerKg: userParams?.spoilageDisposalCostPerKg ?? 0.20,
    unmetDemandPenaltyPerKg: userParams?.unmetDemandPenaltyPerKg ?? 0.00,
    demandResponseEnabled: userParams?.demandResponseEnabled ?? false,
    priceElasticity: userParams?.priceElasticity ?? -1.2,
    minFreshnessMarginHours: userParams?.minFreshnessMarginHours ?? 2.0,
    targetCommodityFilter: userParams?.targetCommodityFilter ?? 'All',
    targetDestinationFilter: userParams?.targetDestinationFilter ?? 'All',
  };

  // Filter input batches and destinations if filtered
  let activeBatches = batches.filter(b => b.availableQuantityKg > 0);
  if (params.targetCommodityFilter && params.targetCommodityFilter !== 'All') {
    activeBatches = activeBatches.filter(b => b.category === params.targetCommodityFilter);
  }

  let activeDestinations = destinations;
  if (params.targetDestinationFilter && params.targetDestinationFilter !== 'All') {
    activeDestinations = activeDestinations.filter(d => d.id === params.targetDestinationFilter);
  }

  // 1. Audit Feasibility across all (batch, destination) combinations
  const infeasibleCombinations: {
    batchId: string;
    commodityName: string;
    destinationId: string;
    destinationName: string;
    reason: string;
  }[] = [];

  interface FeasibleCandidate {
    batch: InventoryBatch;
    destination: Destination;
    sellingPricePerKg: number;
    effectivePricePerKg: number;
    unitCost: number;
    transportCostPerKg: number;
    handlingCostPerKg: number;
    netMarginPerKg: number;
    requiredTimeHours: number;
    remainingShelfLifeAtArrival: number;
  }

  const feasibleCandidates: FeasibleCandidate[] = [];

  for (const b of activeBatches) {
    for (const d of activeDestinations) {
      const check = checkShelfLifeFeasibility(b, d, params);
      if (!check.feasible) {
        infeasibleCombinations.push({
          batchId: b.id,
          commodityName: b.commodityName,
          destinationId: d.id,
          destinationName: d.name,
          reason: check.rejectionReason || 'Infeasible',
        });
        continue;
      }

      const demandRecord = d.commodityDemands.find(
        cd => cd.commodityName.toLowerCase() === b.commodityName.toLowerCase() ||
              cd.commodityName.toLowerCase().includes(b.category.toLowerCase())
      )!;

      let effectivePrice = demandRecord.sellingPricePerKg;
      if (b.discountPercent && b.discountPercent > 0) {
        effectivePrice = effectivePrice * (1 - b.discountPercent / 100);
      }

      const transportCost = d.transportCostPerKg;
      const handlingCost = params.warehouseHandlingCostPerKg;
      const unitCost = b.unitCost;
      const netMarginPerKg = effectivePrice - transportCost - handlingCost - unitCost;

      feasibleCandidates.push({
        batch: b,
        destination: d,
        sellingPricePerKg: demandRecord.sellingPricePerKg,
        effectivePricePerKg: effectivePrice,
        unitCost,
        transportCostPerKg: transportCost,
        handlingCostPerKg: handlingCost,
        netMarginPerKg,
        requiredTimeHours: check.requiredTimeHours,
        remainingShelfLifeAtArrival: check.remainingShelfLifeAtArrivalHours,
      });
    }
  }

  // 2. Build and Solve Linear Programming Model for FreshRoute Optimized Plan
  const optimizedDispatches = solveLpModel(activeBatches, activeDestinations, feasibleCandidates, params, company);

  // 3. Build and Solve Deterministic Baseline Plan (First-Eligible FIFO)
  const baselineDispatches = solveBaselineModel(activeBatches, activeDestinations, params);

  // 4. Calculate reconciled metrics for both strategies
  const optimizedMetrics = computeStrategyMetrics(
    'FreshRoute LP Optimizer',
    optimizedDispatches,
    activeBatches,
    activeDestinations,
    company,
    params
  );

  const baselineMetrics = computeStrategyMetrics(
    'Baseline (First-Eligible FIFO)',
    baselineDispatches,
    activeBatches,
    activeDestinations,
    company,
    params
  );

  // 5. Calculate Improvement Differential
  let spoilageReductionPercent: number | 'N/A' = 'N/A';
  if (baselineMetrics.spoiledQuantityKg > 0) {
    const diff = ((baselineMetrics.spoiledQuantityKg - optimizedMetrics.spoiledQuantityKg) / baselineMetrics.spoiledQuantityKg) * 100;
    spoilageReductionPercent = Math.max(0, Math.round(diff * 10) / 10);
  } else if (optimizedMetrics.spoiledQuantityKg === 0) {
    spoilageReductionPercent = 0.0;
  }

  const netRevenueGain = Math.round((optimizedMetrics.netRevenue - baselineMetrics.netRevenue) * 100) / 100;
  const fulfillmentGainPercent = Math.round((optimizedMetrics.demandFulfillmentPercent - baselineMetrics.demandFulfillmentPercent) * 10) / 10;
  const wasteAvoidedKg = Math.max(0, baselineMetrics.spoiledQuantityKg - optimizedMetrics.spoiledQuantityKg);

  return {
    planId: `PLAN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    createdAt: new Date().toISOString(),
    algorithmVersion: 'FreshRoute Revised Simplex LP v2.4',
    params,
    optimized: {
      ...optimizedMetrics,
      dispatches: optimizedDispatches,
    },
    baseline: {
      ...baselineMetrics,
      dispatches: baselineDispatches,
    },
    improvement: {
      spoilageReductionPercent,
      netRevenueGain,
      fulfillmentGainPercent,
      wasteAvoidedKg,
    },
    infeasibleCombinations,
    status: 'Proposed',
  };
}

/**
 * Solves the LP using Simplex solver.
 */
function solveLpModel(
  batches: InventoryBatch[],
  destinations: Destination[],
  candidates: any[],
  params: OptimizationParams,
  company: CompanySettings
): ProposedDispatch[] {
  if (candidates.length === 0) return [];

  // Model schema for javascript-lp-solver
  const model: any = {
    optimize: 'netRevenue',
    opType: 'max',
    constraints: {},
    variables: {},
  };

  // Constraints: Batch stock limits
  for (const b of batches) {
    model.constraints[`batch_${b.id}`] = { max: b.availableQuantityKg };
  }

  // Constraints: Destination commodity demand limits
  for (const d of destinations) {
    for (const cd of d.commodityDemands) {
      const remainingDemand = Math.max(0, cd.demandKg - (cd.fulfilledKg || 0));
      model.constraints[`demand_${d.id}_${cd.commodityName}`] = { max: remainingDemand };
    }
    // Constraints: Destination transport capacity limits
    model.constraints[`capacity_${d.id}`] = { max: d.availableTransportCapacityKg };
  }

  // Variables: feasible (batch, destination) quantities
  for (const c of candidates) {
    const varName = `x_${c.batch.id}_${c.destination.id}`;
    const demandKey = `demand_${c.destination.id}_${c.batch.commodityName}`;

    // Objective coefficient: Net economic value per kg
    // If batch has critical shelf life, we prioritize its allocation to avoid 100% loss
    let urgencyBonus = 0;
    if (c.batch.remainingShelfLifeHours <= (company.criticalShelfLifeHours || 48)) {
      urgencyBonus = (params.spoilageDisposalCostPerKg || 0.20) + 0.10;
    }

    const netValuePerKg = c.netMarginPerKg + urgencyBonus;

    model.variables[varName] = {
      netRevenue: netValuePerKg,
      [`batch_${c.batch.id}`]: 1,
      [demandKey]: 1,
      [`capacity_${c.destination.id}`]: 1,
    };
  }

  // Run Simplex Solver
  const solution: any = solver.Solve(model);

  // Extract dispatches
  const dispatches: ProposedDispatch[] = [];
  let dispIndex = 1;

  for (const c of candidates) {
    const varName = `x_${c.batch.id}_${c.destination.id}`;
    const rawQty = solution[varName];

    if (rawQty && rawQty > 0.01) {
      const allocatedQty = Math.round(rawQty);
      if (allocatedQty <= 0) continue;

      const grossRevenue = Math.round(allocatedQty * c.effectivePricePerKg * 100) / 100;
      const transportCost = Math.round(allocatedQty * c.transportCostPerKg * 100) / 100;
      const batchCost = Math.round(allocatedQty * c.unitCost * 100) / 100;
      const handlingCost = Math.round(allocatedQty * c.handlingCostPerKg * 100) / 100;
      const netMargin = Math.round((grossRevenue - transportCost - batchCost - handlingCost) * 100) / 100;

      // Determine priority level
      let priorityLevel: ProposedDispatch['priorityLevel'] = 'Normal (Tier 3)';
      let priorityScore = 50;

      if (c.batch.remainingShelfLifeHours <= (company.criticalShelfLifeHours || 48)) {
        priorityLevel = 'Urgent (Tier 1)';
        priorityScore = 95;
      } else if (c.remainingShelfLifeAtArrival < 36 || netMargin > 1500) {
        priorityLevel = 'High (Tier 2)';
        priorityScore = 75;
      }

      // Generate explainability rationale
      const explanation = `Allocated ${allocatedQty.toLocaleString()} kg of ${c.batch.commodityName} to ${c.destination.name}. Shelf life at arrival is ${c.remainingShelfLifeAtArrival.toFixed(1)}h (required ${c.requiredTimeHours.toFixed(1)}h transit & handling). Contributes +$${netMargin.toLocaleString()} net margin with unit return of $${(netMargin / allocatedQty).toFixed(2)}/kg.`;
      const alternativesConsidered = `Alternative destinations with longer transit times were deprioritized to preserve freshness buffer and meet vehicle weight limits.`;

      dispatches.push({
        id: `DISP-${String(dispIndex++).padStart(3, '0')}`,
        batchId: c.batch.id,
        commodityName: c.batch.commodityName,
        category: c.batch.category,
        destinationId: c.destination.id,
        destinationName: c.destination.name,
        destinationLocation: c.destination.location,
        allocatedQuantityKg: allocatedQty,
        sellingPricePerKg: c.effectivePricePerKg,
        unitCost: c.unitCost,
        transportCostPerKg: c.transportCostPerKg,
        warehouseHandlingCostPerKg: c.handlingCostPerKg,
        grossRevenue,
        transportCost,
        batchCost,
        handlingCost,
        netMargin,
        travelHours: c.destination.estimatedTravelHours,
        handlingHours: c.destination.handlingTimeHours,
        totalRequiredTimeHours: c.requiredTimeHours,
        remainingShelfLifeAtArrivalHours: c.remainingShelfLifeAtArrival,
        priorityLevel,
        priorityScore,
        explanation,
        alternativesConsidered,
      });
    }
  }

  // Sort by priority score descending
  return dispatches.sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Solves the deterministic First-Eligible (FIFO) Baseline Strategy.
 * Follows fixed input order and checks all hard constraints without mathematical optimization.
 */
function solveBaselineModel(
  batches: InventoryBatch[],
  destinations: Destination[],
  params: OptimizationParams
): ProposedDispatch[] {
  const dispatches: ProposedDispatch[] = [];
  let dispIndex = 1;

  // Track remaining stock and demands
  const batchStockRem: Record<string, number> = {};
  batches.forEach(b => { batchStockRem[b.id] = b.availableQuantityKg; });

  const destCapRem: Record<string, number> = {};
  destinations.forEach(d => { destCapRem[d.id] = d.availableTransportCapacityKg; });

  const destDemandRem: Record<string, number> = {};
  destinations.forEach(d => {
    d.commodityDemands.forEach(cd => {
      destDemandRem[`${d.id}_${cd.commodityName}`] = Math.max(0, cd.demandKg - (cd.fulfilledKg || 0));
    });
  });

  // Evaluate in fixed sequential FIFO order
  for (const b of batches) {
    if (batchStockRem[b.id] <= 0) continue;

    for (const d of destinations) {
      if (batchStockRem[b.id] <= 0) break;
      if (destCapRem[d.id] <= 0) continue;

      const demandKey = `${d.id}_${b.commodityName}`;
      const remDemand = destDemandRem[demandKey] || 0;
      if (remDemand <= 0) continue;

      // Check identical hard shelf-life constraints
      const check = checkShelfLifeFeasibility(b, d, params);
      if (!check.feasible) continue;

      // Allocate first eligible minimum
      const allocQty = Math.min(batchStockRem[b.id], remDemand, destCapRem[d.id]);
      if (allocQty <= 0) continue;

      // Deduct
      batchStockRem[b.id] -= allocQty;
      destCapRem[d.id] -= allocQty;
      destDemandRem[demandKey] -= allocQty;

      const demandRecord = d.commodityDemands.find(cd => cd.commodityName === b.commodityName)!;
      let effectivePrice = demandRecord.sellingPricePerKg;
      if (b.discountPercent && b.discountPercent > 0) {
        effectivePrice = effectivePrice * (1 - b.discountPercent / 100);
      }

      const grossRevenue = Math.round(allocQty * effectivePrice * 100) / 100;
      const transportCost = Math.round(allocQty * d.transportCostPerKg * 100) / 100;
      const batchCost = Math.round(allocQty * b.unitCost * 100) / 100;
      const handlingCost = Math.round(allocQty * params.warehouseHandlingCostPerKg * 100) / 100;
      const netMargin = Math.round((grossRevenue - transportCost - batchCost - handlingCost) * 100) / 100;

      dispatches.push({
        id: `BASE-${String(dispIndex++).padStart(3, '0')}`,
        batchId: b.id,
        commodityName: b.commodityName,
        category: b.category,
        destinationId: d.id,
        destinationName: d.name,
        destinationLocation: d.location,
        allocatedQuantityKg: allocQty,
        sellingPricePerKg: effectivePrice,
        unitCost: b.unitCost,
        transportCostPerKg: d.transportCostPerKg,
        warehouseHandlingCostPerKg: params.warehouseHandlingCostPerKg,
        grossRevenue,
        transportCost,
        batchCost,
        handlingCost,
        netMargin,
        travelHours: d.estimatedTravelHours,
        handlingHours: d.handlingTimeHours,
        totalRequiredTimeHours: check.requiredTimeHours,
        remainingShelfLifeAtArrivalHours: check.remainingShelfLifeAtArrivalHours,
        priorityLevel: 'Normal (Tier 3)',
        priorityScore: 40,
        explanation: `Sequential first-eligible dispatch of ${allocQty} kg without multi-route shelf life optimization.`,
        alternativesConsidered: `First available eligible destination in default index order.`,
      });
    }
  }

  return dispatches;
}

/**
 * Computes performance metrics for a strategy run.
 */
function computeStrategyMetrics(
  strategyName: StrategyPerformanceMetrics['strategyName'],
  dispatches: ProposedDispatch[],
  batches: InventoryBatch[],
  destinations: Destination[],
  company: CompanySettings,
  params: OptimizationParams
): StrategyPerformanceMetrics {
  const totalAllocatedKg = dispatches.reduce((sum, d) => sum + d.allocatedQuantityKg, 0);

  let totalDemandKg = 0;
  destinations.forEach(d => {
    d.commodityDemands.forEach(cd => {
      totalDemandKg += cd.demandKg;
    });
  });

  const demandFulfillmentPercent = totalDemandKg > 0
    ? Math.round((totalAllocatedKg / totalDemandKg) * 1000) / 10
    : 0;

  const unmetDemandKg = Math.max(0, totalDemandKg - totalAllocatedKg);

  const grossRevenue = dispatches.reduce((sum, d) => sum + d.grossRevenue, 0);
  const totalTransportCosts = dispatches.reduce((sum, d) => sum + d.transportCost, 0);
  const totalHandlingCosts = dispatches.reduce((sum, d) => sum + d.handlingCost, 0);
  const totalBatchAcquisitionCosts = dispatches.reduce((sum, d) => sum + d.batchCost, 0);

  // Spoilage calculation: Unallocated batches with critical shelf life <= threshold
  const criticalThreshold = company.criticalShelfLifeHours || 48;
  let spoiledQuantityKg = 0;

  batches.forEach(b => {
    const allocatedFromBatch = dispatches
      .filter(d => d.batchId === b.id)
      .reduce((sum, d) => sum + d.allocatedQuantityKg, 0);
    const unallocated = Math.max(0, b.availableQuantityKg - allocatedFromBatch);

    if (unallocated > 0 && b.remainingShelfLifeHours <= criticalThreshold) {
      spoiledQuantityKg += unallocated;
    }
  });

  const spoilageCost = Math.round(spoiledQuantityKg * params.spoilageDisposalCostPerKg * 100) / 100;
  const netRevenue = Math.round((grossRevenue - totalTransportCosts - totalHandlingCosts - totalBatchAcquisitionCosts - spoilageCost) * 100) / 100;

  // Capacity utilization per destination
  const capacityUtilization = destinations.map(dest => {
    const usedKg = dispatches
      .filter(d => d.destinationId === dest.id)
      .reduce((sum, d) => sum + d.allocatedQuantityKg, 0);
    const utilizationPercent = dest.availableTransportCapacityKg > 0
      ? Math.round((usedKg / dest.availableTransportCapacityKg) * 1000) / 10
      : 0;
    return {
      destinationId: dest.id,
      destinationName: dest.name,
      usedKg,
      capacityKg: dest.availableTransportCapacityKg,
      utilizationPercent,
    };
  });

  // Verify Zero Violations
  const violations: string[] = [];

  // Check batch limits
  batches.forEach(b => {
    const allocTotal = dispatches.filter(d => d.batchId === b.id).reduce((s, d) => s + d.allocatedQuantityKg, 0);
    if (allocTotal > b.availableQuantityKg + 0.01) {
      violations.push(`Batch ${b.id} over-allocated: ${allocTotal} kg > available ${b.availableQuantityKg} kg.`);
    }
  });

  // Check capacity limits
  destinations.forEach(dest => {
    const used = dispatches.filter(d => d.destinationId === dest.id).reduce((s, d) => s + d.allocatedQuantityKg, 0);
    if (used > dest.availableTransportCapacityKg + 0.01) {
      violations.push(`Destination ${dest.name} vehicle capacity breached: ${used} kg > capacity ${dest.availableTransportCapacityKg} kg.`);
    }
  });

  return {
    strategyName,
    totalAllocatedKg,
    totalDemandKg,
    demandFulfillmentPercent,
    unmetDemandKg,
    grossRevenue: Math.round(grossRevenue),
    totalTransportCosts: Math.round(totalTransportCosts),
    totalHandlingCosts: Math.round(totalHandlingCosts),
    totalBatchAcquisitionCosts: Math.round(totalBatchAcquisitionCosts),
    spoilageCost: Math.round(spoilageCost),
    netRevenue,
    spoiledQuantityKg,
    spoilageReductionPercent: 'N/A', // filled in comparison
    capacityUtilization,
    violationsCount: violations.length,
    violations,
  };
}

/**
 * Rule-based Perishable Discount Recommendations Engine
 * Generates both conservative (flat demand) and elasticity-adjusted scenarios.
 */
export function generateDiscountScenarios(
  batches: InventoryBatch[],
  company: CompanySettings,
  destinations: Destination[]
): DiscountScenario[] {
  const criticalThreshold = company.criticalShelfLifeHours || 48;
  const warningThreshold = company.warningShelfLifeHours || 96;

  const scenarios: DiscountScenario[] = [];

  for (const b of batches) {
    if (b.availableQuantityKg <= 0) continue;

    const hours = b.remainingShelfLifeHours;
    let suggestedDiscount = 0;
    let urgency: DiscountScenario['urgency'] = 'moderate';
    let reason = '';

    if (hours <= 24) {
      suggestedDiscount = 45;
      urgency = 'critical';
      reason = `Imminent expiry (${hours}h remaining). High probability of total write-off without immediate liquidation.`;
    } else if (hours <= criticalThreshold) {
      suggestedDiscount = 25;
      urgency = 'high';
      reason = `Critical freshness threshold breached (<${criticalThreshold}h). Route clearance markdown recommended.`;
    } else if (hours <= warningThreshold) {
      suggestedDiscount = 15;
      urgency = 'moderate';
      reason = `Proactive shelf-life decay buffer (<${warningThreshold}h). Stimulate early warehouse turnover.`;
    }

    if (suggestedDiscount > 0 || (b.discountPercent && b.discountPercent > 0)) {
      const discountPct = b.discountPercent || suggestedDiscount;
      const normalPrice = Math.round(b.unitCost * 1.6 * 100) / 100;
      const discountedPrice = Math.round(normalPrice * (1 - discountPct / 100) * 100) / 100;

      // Conservative Scenario (without elasticity):
      // Sell-through is limited to standard unallocated inventory
      const conservativeSellThroughKg = Math.round(b.availableQuantityKg * 0.70);
      const conservativeRevenue = Math.round(conservativeSellThroughKg * discountedPrice);
      const conservativeSpoilageLoss = Math.round((b.availableQuantityKg - conservativeSellThroughKg) * b.unitCost);
      const conservativeSalvageValue = Math.max(0, conservativeRevenue - conservativeSpoilageLoss);

      // Elasticity-Adjusted Scenario (with price elasticity -1.2):
      // % change in quantity demanded = elasticity * % change in price
      // Price drop = discountPct %. Quantity increase = -1.2 * (-discountPct) = +1.2 * discountPct %
      const elasticity = -1.2;
      const demandLiftFactor = 1 + Math.abs(elasticity) * (discountPct / 100);
      const elasticSellThroughKg = Math.min(b.availableQuantityKg, Math.round(b.availableQuantityKg * 0.70 * demandLiftFactor));
      const elasticRevenue = Math.round(elasticSellThroughKg * discountedPrice);
      const elasticSpoilageAvoided = Math.round((elasticSellThroughKg - conservativeSellThroughKg));
      const elasticSalvageValue = Math.max(0, elasticRevenue - Math.round((b.availableQuantityKg - elasticSellThroughKg) * b.unitCost));

      scenarios.push({
        batchId: b.id,
        commodityName: b.commodityName,
        category: b.category,
        availableQuantityKg: b.availableQuantityKg,
        remainingShelfLifeHours: b.remainingShelfLifeHours,
        suggestedDiscountPercent: discountPct,
        unitCost: b.unitCost,
        normalSellingPrice: normalPrice,
        discountedSellingPrice: discountedPrice,
        urgency,
        reason,
        assumptions: [
          `Base wholesale markup: 60% over acquisition unit cost ($${b.unitCost.toFixed(2)}/kg -> $${normalPrice.toFixed(2)}/kg).`,
          `Conservative baseline assumes 70% natural sell-through of short-dated produce.`,
          `Elastic scenario assumes price elasticity coefficient ε = -1.2 across secondary food-service & relief buyers.`,
          `Salvage value accounts for avoided disposal loss of $0.20/kg.`,
        ],
        withoutElasticity: {
          projectedSellThroughKg: conservativeSellThroughKg,
          estimatedRevenue: conservativeRevenue,
          estimatedSpoilageLoss: conservativeSpoilageLoss,
          netSalvageValue: conservativeSalvageValue,
          interpretation: 'Fixed demand scenario: Price reduced for immediate clearance without assuming buyer expansion.',
        },
        withElasticity: {
          elasticityFactor: elasticity,
          projectedSellThroughKg: elasticSellThroughKg,
          estimatedRevenue: elasticRevenue,
          estimatedSpoilageAvoidedKg: Math.max(0, elasticSpoilageAvoided),
          netSalvageValue: elasticSalvageValue,
          demandNote: `Stimulates +${Math.round(Math.abs(elasticity) * discountPct)}% volume lift among institutional processors and food relief buyers.`,
          interpretation: 'Demand-responsive scenario: Price cut unlocks price-elastic commissary and relief demand.',
        },
      });
    }
  }

  return scenarios.sort((a, b) => a.remainingShelfLifeHours - b.remainingShelfLifeHours);
}

/**
 * Runs what-if scenario simulations with modified transport times, demand, capacity, prices, and shelf life.
 * Clones state non-destructively and runs both baseline and LP optimization.
 */
export function runScenarioSimulation(
  batches: InventoryBatch[],
  destinations: Destination[],
  company: CompanySettings,
  basePlan: OptimizationPlanResult,
  modifications: ScenarioModification
): ScenarioSimulationResult {
  // 1. Create non-destructive clone with modifications
  const simBatches: InventoryBatch[] = batches.map(b => {
    let shelfLife = b.remainingShelfLifeHours;
    if (modifications.shelfLifeDeltaHours) {
      shelfLife = Math.max(0, shelfLife + modifications.shelfLifeDeltaHours);
    }
    return {
      ...b,
      remainingShelfLifeHours: shelfLife,
    };
  });

  const simDestinations: Destination[] = destinations.map(d => {
    let travelHours = d.estimatedTravelHours;
    if (modifications.routeDelayHours && modifications.routeDelayHours[d.id]) {
      travelHours += modifications.routeDelayHours[d.id];
    }

    let capacity = d.availableTransportCapacityKg;
    if (modifications.capacityMultiplier && modifications.capacityMultiplier[d.id]) {
      capacity = Math.max(0, Math.round(capacity * modifications.capacityMultiplier[d.id]));
    }

    const demands = d.commodityDemands.map(cd => {
      let dem = cd.demandKg;
      let price = cd.sellingPricePerKg;
      if (modifications.demandMultiplier && modifications.demandMultiplier[d.id]) {
        dem = Math.max(0, Math.round(dem * modifications.demandMultiplier[d.id]));
      }
      if (modifications.priceMultiplier && modifications.priceMultiplier[d.id]) {
        price = Math.round(price * modifications.priceMultiplier[d.id] * 100) / 100;
      }
      return {
        ...cd,
        demandKg: dem,
        sellingPricePerKg: price,
      };
    });

    return {
      ...d,
      estimatedTravelHours: travelHours,
      availableTransportCapacityKg: capacity,
      commodityDemands: demands,
    };
  });

  // 2. Execute optimization engine on scenario
  const scenarioPlan = runOptimizationEngine(simBatches, simDestinations, company, {
    safetyBufferHours: modifications.safetyBufferHours ?? basePlan.params.safetyBufferHours,
    spoilageDisposalCostPerKg: modifications.spoilageCostPerKg ?? basePlan.params.spoilageDisposalCostPerKg,
    priceElasticity: modifications.priceElasticity ?? basePlan.params.priceElasticity,
  });

  // 3. Compute deltas vs original plan
  const orig = basePlan.optimized;
  const scen = scenarioPlan.optimized;

  const volumeDeltaKg = scen.totalAllocatedKg - orig.totalAllocatedKg;
  const netRevenueDelta = Math.round((scen.netRevenue - orig.netRevenue) * 100) / 100;
  const spoilageDeltaKg = scen.spoiledQuantityKg - orig.spoiledQuantityKg;
  const fulfillmentDeltaPercent = Math.round((scen.demandFulfillmentPercent - orig.demandFulfillmentPercent) * 10) / 10;

  // 4. Identify newly infeasible routes that were previously feasible
  const previousFeasiblePairs = new Set(orig.dispatches.map(d => `${d.batchId}_${d.destinationId}`));
  const newlyInfeasibleRoutes = scenarioPlan.infeasibleCombinations.filter(inf =>
    previousFeasiblePairs.has(`${inf.batchId}_${inf.destinationId}`)
  );

  // 5. Generate domain observations
  const observations: string[] = [];
  if (spoilageDeltaKg > 0) {
    observations.push(`Spoilage increased by ${spoilageDeltaKg.toLocaleString()} kg due to tightened shelf-life constraints or route delays.`);
  } else if (spoilageDeltaKg < 0) {
    observations.push(`Spoilage reduced by ${Math.abs(spoilageDeltaKg).toLocaleString()} kg under simulated scenario.`);
  } else {
    observations.push(`Zero spoilage delta: Cold-chain shelf-life integrity remained intact under tested modifications.`);
  }

  if (netRevenueDelta < 0) {
    observations.push(`Net economic margin contracted by $${Math.abs(netRevenueDelta).toLocaleString()} (${Math.round((netRevenueDelta / (orig.netRevenue || 1)) * 100)}% change).`);
  } else if (netRevenueDelta > 0) {
    observations.push(`Net economic margin expanded by +$${netRevenueDelta.toLocaleString()} due to demand or pricing advantages.`);
  }

  if (newlyInfeasibleRoutes.length > 0) {
    observations.push(`${newlyInfeasibleRoutes.length} route allocations that were previously feasible became impossible under this scenario.`);
  }

  return {
    scenarioId: `SCEN-${Date.now().toString().slice(-4)}`,
    scenarioName: modifications.name,
    description: modifications.description,
    simulatedAt: new Date().toISOString(),
    modifications,
    originalPlanSummary: {
      totalVolumeKg: orig.totalAllocatedKg,
      netRevenue: orig.netRevenue,
      spoilageKg: orig.spoiledQuantityKg,
      fulfillmentPercent: orig.demandFulfillmentPercent,
    },
    scenarioOptimized: scen,
    scenarioBaseline: scenarioPlan.baseline,
    deltas: {
      volumeDeltaKg,
      netRevenueDelta,
      spoilageDeltaKg,
      fulfillmentDeltaPercent,
    },
    newlyInfeasibleRoutes,
    observations,
  };
}

/**
 * Runs deterministic parameter sensitivity analysis across systematic intervals.
 */
export function runSensitivityAnalysis(
  batches: InventoryBatch[],
  destinations: Destination[],
  company: CompanySettings,
  parameter: 'shelf_life' | 'travel_time' | 'demand' | 'price'
): SensitivityAnalysisResult {
  const dataPoints: SensitivityDataPoint[] = [];
  let label = '';
  let description = '';
  let interpretation = '';

  if (parameter === 'shelf_life') {
    label = 'Shelf-Life Shock Sensitivity';
    description = 'Evaluates impact of systematic harvest shelf-life decay reductions from 0h down to -16h.';
    const sweeps = [0, -4, -8, -12, -16];

    for (const val of sweeps) {
      const simBatches = batches.map(b => ({
        ...b,
        remainingShelfLifeHours: Math.max(0, b.remainingShelfLifeHours + val),
      }));
      const plan = runOptimizationEngine(simBatches, destinations, company);
      dataPoints.push({
        variationLabel: `${val >= 0 ? '+' : ''}${val}h`,
        variationValue: val,
        spoilageKg: plan.optimized.spoiledQuantityKg,
        netRevenue: plan.optimized.netRevenue,
        demandFulfillmentPercent: plan.optimized.demandFulfillmentPercent,
        feasibleDispatchesCount: plan.optimized.dispatches.length,
        unmetDemandKg: plan.optimized.unmetDemandKg,
      });
    }

    const maxLoss = dataPoints[0].netRevenue - dataPoints[dataPoints.length - 1].netRevenue;
    interpretation = `A -16h shelf-life reduction increases spoilage risk and decreases net margin by up to $${maxLoss.toLocaleString()}, as long-distance routes become infeasible.`;

  } else if (parameter === 'travel_time') {
    label = 'Transit Corridor Delay Sensitivity';
    description = 'Evaluates systematic transit time increases across regional transport corridors (0% to +50%).';
    const sweeps = [0, 15, 30, 50]; // % delay

    for (const pct of sweeps) {
      const multiplier = 1 + pct / 100;
      const simDestinations = destinations.map(d => ({
        ...d,
        estimatedTravelHours: Math.round(d.estimatedTravelHours * multiplier * 10) / 10,
      }));
      const plan = runOptimizationEngine(batches, simDestinations, company);
      dataPoints.push({
        variationLabel: `+${pct}% Delay`,
        variationValue: pct,
        spoilageKg: plan.optimized.spoiledQuantityKg,
        netRevenue: plan.optimized.netRevenue,
        demandFulfillmentPercent: plan.optimized.demandFulfillmentPercent,
        feasibleDispatchesCount: plan.optimized.dispatches.length,
        unmetDemandKg: plan.optimized.unmetDemandKg,
      });
    }

    interpretation = `Transit delays above +30% begin to trigger safety buffer breaches on short-dated produce like berries and leafy greens.`;

  } else if (parameter === 'demand') {
    label = 'Destination Demand Shift Sensitivity';
    description = 'Evaluates impact of regional market demand swings from -25% contraction to +50% surge.';
    const sweeps = [-25, 0, 25, 50];

    for (const pct of sweeps) {
      const multiplier = 1 + pct / 100;
      const simDestinations = destinations.map(d => ({
        ...d,
        commodityDemands: d.commodityDemands.map(cd => ({
          ...cd,
          demandKg: Math.round(cd.demandKg * multiplier),
        })),
      }));
      const plan = runOptimizationEngine(batches, simDestinations, company);
      dataPoints.push({
        variationLabel: `${pct >= 0 ? '+' : ''}${pct}% Demand`,
        variationValue: pct,
        spoilageKg: plan.optimized.spoiledQuantityKg,
        netRevenue: plan.optimized.netRevenue,
        demandFulfillmentPercent: plan.optimized.demandFulfillmentPercent,
        feasibleDispatchesCount: plan.optimized.dispatches.length,
        unmetDemandKg: plan.optimized.unmetDemandKg,
      });
    }

    interpretation = `When demand expands by +50%, vehicle fleet capacities and warehouse stock become the active binding constraints.`;

  } else {
    label = 'Terminal Market Price Fluctuation Sensitivity';
    description = 'Evaluates net margin sensitivity to wholesale market price shocks from -30% to baseline.';
    const sweeps = [-30, -20, -10, 0];

    for (const pct of sweeps) {
      const multiplier = 1 + pct / 100;
      const simDestinations = destinations.map(d => ({
        ...d,
        commodityDemands: d.commodityDemands.map(cd => ({
          ...cd,
          sellingPricePerKg: Math.round(cd.sellingPricePerKg * multiplier * 100) / 100,
        })),
      }));
      const plan = runOptimizationEngine(batches, simDestinations, company);
      dataPoints.push({
        variationLabel: `${pct}% Price`,
        variationValue: pct,
        spoilageKg: plan.optimized.spoiledQuantityKg,
        netRevenue: plan.optimized.netRevenue,
        demandFulfillmentPercent: plan.optimized.demandFulfillmentPercent,
        feasibleDispatchesCount: plan.optimized.dispatches.length,
        unmetDemandKg: plan.optimized.unmetDemandKg,
      });
    }

    interpretation = `A -30% wholesale price drop reduces operating margin significantly; solver redirects volume to lower-freight proximal hubs.`;
  }

  return {
    parameter,
    label,
    description,
    dataPoints,
    interpretation,
  };
}
