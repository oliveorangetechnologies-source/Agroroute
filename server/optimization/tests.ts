import {
  checkShelfLifeFeasibility,
  runOptimizationEngine,
  generateDiscountScenarios,
} from './solver.ts';
import {
  InventoryBatch,
  Destination,
  CompanySettings,
  TestSuiteResult,
  TestResultItem,
} from '../../src/types/index.ts';

export function runAllOptimizationTests(): TestSuiteResult {
  const results: TestResultItem[] = [];

  const mockCompany: CompanySettings = {
    id: 'COMP-TEST',
    companyName: 'Gujarat Agro Fresh Logistics',
    businessType: 'distributor',
    operatingRegion: 'Gujarat State APMC Corridor (Ahmedabad Hub)',
    defaultCurrency: '₹',
    measurementUnit: 'kg',
    criticalShelfLifeHours: 48,
    warningShelfLifeHours: 96,
    defaultTransportCostPerKg: 2.20,
    contactEmail: 'dispatch@gujaratagrofresh.com',
    onboardingCompleted: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const createBatch = (overrides?: Partial<InventoryBatch>): InventoryBatch => ({
    id: 'BATCH-T1',
    commodityName: 'Strawberries',
    category: 'Berries',
    initialQuantityKg: 1000,
    allocatedQuantityKg: 0,
    dispatchedQuantityKg: 0,
    spoiledQuantityKg: 0,
    availableQuantityKg: 1000,
    remainingShelfLifeHours: 40,
    harvestOrArrivalDate: '2026-10-15',
    estimatedHandlingHours: 2.0,
    storageTempC: 2.0,
    qualityGrade: 'Grade A (Prime)',
    unitCost: 2.50,
    status: 'available',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  const createDest = (overrides?: Partial<Destination>): Destination => ({
    id: 'DEST-T1',
    name: 'Ahmedabad APMC Terminal',
    location: 'Ahmedabad, Gujarat',
    destinationType: 'Wholesale Market',
    distanceKm: 35,
    estimatedTravelHours: 4.0,
    transportCostPerKg: 0.15,
    availableTransportCapacityKg: 5000,
    handlingTimeHours: 1.5,
    deliveryDeadline: '2026-10-16 18:00',
    commodityDemands: [
      {
        commodityName: 'Strawberries',
        demandKg: 800,
        fulfilledKg: 0,
        sellingPricePerKg: 5.00,
        minShelfLifeRequiredHours: 20,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  // TEST 1: Insufficient Shelf Life (Infeasible)
  try {
    const batch = createBatch({ remainingShelfLifeHours: 6 }); // 6h remaining vs (2h load + 4h travel + 1.5h unload = 7.5h required)
    const dest = createDest({ estimatedTravelHours: 4.0, handlingTimeHours: 1.5 });
    const check = checkShelfLifeFeasibility(batch, dest, {
      safetyBufferHours: 4.0,
      warehouseHandlingCostPerKg: 0.05,
      spoilageDisposalCostPerKg: 0.20,
      unmetDemandPenaltyPerKg: 0.0,
      demandResponseEnabled: false,
      priceElasticity: -1.2,
      minFreshnessMarginHours: 2.0,
    });

    const passed = !check.feasible && (check.rejectionReason?.includes('Perishable decay') || check.rejectionReason?.includes('Safety buffer'));
    results.push({
      id: 'TEST-01',
      name: 'Insufficient Shelf Life Rejection',
      category: 'Feasibility Constraints',
      passed: !!passed,
      expected: 'feasible: false with decay/safety buffer rejection reason',
      actual: `feasible: ${check.feasible}, reason: "${check.rejectionReason}"`,
      details: 'Evaluated 6h shelf life against 7.5h transit requirement.',
    });
  } catch (err: any) {
    results.push({ id: 'TEST-01', name: 'Insufficient Shelf Life Rejection', category: 'Feasibility Constraints', passed: false, expected: 'false', actual: err.message, details: err.stack });
  }

  // TEST 2: Adequate Shelf Life (Feasible)
  try {
    const batch = createBatch({ remainingShelfLifeHours: 50 });
    const dest = createDest({ estimatedTravelHours: 4.0, handlingTimeHours: 1.5 });
    const check = checkShelfLifeFeasibility(batch, dest, {
      safetyBufferHours: 4.0,
      warehouseHandlingCostPerKg: 0.05,
      spoilageDisposalCostPerKg: 0.20,
      unmetDemandPenaltyPerKg: 0.0,
      demandResponseEnabled: false,
      priceElasticity: -1.2,
      minFreshnessMarginHours: 2.0,
    });

    const passed = check.feasible && check.remainingShelfLifeAtArrivalHours > 30;
    results.push({
      id: 'TEST-02',
      name: 'Adequate Shelf Life Acceptance',
      category: 'Feasibility Constraints',
      passed,
      expected: 'feasible: true with >30h arrival freshness buffer',
      actual: `feasible: ${check.feasible}, arrival freshness: ${check.remainingShelfLifeAtArrivalHours}h`,
      details: 'Evaluated 50h shelf life against 7.5h total transit time.',
    });
  } catch (err: any) {
    results.push({ id: 'TEST-02', name: 'Adequate Shelf Life Acceptance', category: 'Feasibility Constraints', passed: false, expected: 'true', actual: err.message, details: err.stack });
  }

  // TEST 3: Insufficient Stock (Allocation capped at available stock)
  try {
    const batch = createBatch({ availableQuantityKg: 300, remainingShelfLifeHours: 72 });
    const dest = createDest({
      commodityDemands: [{ commodityName: 'Strawberries', demandKg: 1000, fulfilledKg: 0, sellingPricePerKg: 5.00 }],
    });
    const plan = runOptimizationEngine([batch], [dest], mockCompany);
    const allocated = plan.optimized.dispatches.find(d => d.batchId === batch.id)?.allocatedQuantityKg || 0;

    const passed = allocated === 300;
    results.push({
      id: 'TEST-03',
      name: 'Insufficient Stock Cap Enforcement',
      category: 'Supply Constraints',
      passed,
      expected: 'allocatedQuantityKg === 300 kg (capped by available stock)',
      actual: `allocatedQuantityKg === ${allocated} kg`,
      details: 'Requested 1,000 kg demand with only 300 kg batch stock.',
    });
  } catch (err: any) {
    results.push({ id: 'TEST-03', name: 'Insufficient Stock Cap Enforcement', category: 'Supply Constraints', passed: false, expected: '300', actual: err.message, details: err.stack });
  }

  // TEST 4: Demand Caps (Allocation never exceeds contract demand)
  try {
    const batch = createBatch({ availableQuantityKg: 2000, remainingShelfLifeHours: 72 });
    const dest = createDest({
      commodityDemands: [{ commodityName: 'Strawberries', demandKg: 650, fulfilledKg: 0, sellingPricePerKg: 5.00 }],
    });
    const plan = runOptimizationEngine([batch], [dest], mockCompany);
    const allocated = plan.optimized.dispatches.find(d => d.destinationId === dest.id)?.allocatedQuantityKg || 0;

    const passed = allocated === 650;
    results.push({
      id: 'TEST-04',
      name: 'Destination Demand Cap Enforcement',
      category: 'Demand Constraints',
      passed,
      expected: 'allocatedQuantityKg === 650 kg (strictly bounded by demand)',
      actual: `allocatedQuantityKg === ${allocated} kg`,
      details: 'Supplied 2,000 kg inventory with 650 kg destination demand.',
    });
  } catch (err: any) {
    results.push({ id: 'TEST-04', name: 'Destination Demand Cap Enforcement', category: 'Demand Constraints', passed: false, expected: '650', actual: err.message, details: err.stack });
  }

  // TEST 5: Transport Capacity Limits (Vehicle weight capacity enforced)
  try {
    const batch = createBatch({ availableQuantityKg: 5000, remainingShelfLifeHours: 72 });
    const dest = createDest({
      availableTransportCapacityKg: 1200, // truck capacity limit
      commodityDemands: [{ commodityName: 'Strawberries', demandKg: 4000, fulfilledKg: 0, sellingPricePerKg: 5.00 }],
    });
    const plan = runOptimizationEngine([batch], [dest], mockCompany);
    const allocated = plan.optimized.dispatches.find(d => d.destinationId === dest.id)?.allocatedQuantityKg || 0;

    const passed = allocated === 1200;
    results.push({
      id: 'TEST-05',
      name: 'Vehicle Fleet Transport Capacity Bound',
      category: 'Logistics Constraints',
      passed,
      expected: 'allocatedQuantityKg === 1200 kg (capped by truck capacity)',
      actual: `allocatedQuantityKg === ${allocated} kg`,
      details: 'Tested 4,000 kg demand and 5,000 kg stock with 1,200 kg vehicle capacity.',
    });
  } catch (err: any) {
    results.push({ id: 'TEST-05', name: 'Vehicle Fleet Transport Capacity Bound', category: 'Logistics Constraints', passed: false, expected: '1200', actual: err.message, details: err.stack });
  }

  // TEST 6: Missing Price or Cost Data (Graceful fallbacks)
  try {
    const batch = createBatch({ unitCost: 0, remainingShelfLifeHours: 72 });
    const dest = createDest({
      transportCostPerKg: 0,
      commodityDemands: [{ commodityName: 'Strawberries', demandKg: 500, fulfilledKg: 0, sellingPricePerKg: 4.00 }],
    });
    const plan = runOptimizationEngine([batch], [dest], mockCompany);
    const passed = plan.optimized.dispatches.length > 0 && !isNaN(plan.optimized.netRevenue);

    results.push({
      id: 'TEST-06',
      name: 'Missing Price & Cost Handling',
      category: 'Robustness & Edge Cases',
      passed,
      expected: 'Plan generated without NaN values or runtime crashes',
      actual: `dispatches: ${plan.optimized.dispatches.length}, netRevenue: $${plan.optimized.netRevenue}`,
      details: 'Handled zero transport cost and zero unit acquisition cost gracefully.',
    });
  } catch (err: any) {
    results.push({ id: 'TEST-06', name: 'Missing Price & Cost Handling', category: 'Robustness & Edge Cases', passed: false, expected: 'valid', actual: err.message, details: err.stack });
  }

  // TEST 7: Multiple Commodities Routing
  try {
    const batchA = createBatch({ id: 'B-BERRY', commodityName: 'Strawberries', category: 'Berries', availableQuantityKg: 800, remainingShelfLifeHours: 60 });
    const batchB = createBatch({ id: 'B-SPINACH', commodityName: 'Baby Spinach', category: 'Leafy Greens', availableQuantityKg: 600, remainingShelfLifeHours: 55, unitCost: 1.80 });
    const dest = createDest({
      availableTransportCapacityKg: 5000,
      commodityDemands: [
        { commodityName: 'Strawberries', demandKg: 800, fulfilledKg: 0, sellingPricePerKg: 5.00 },
        { commodityName: 'Baby Spinach', demandKg: 600, fulfilledKg: 0, sellingPricePerKg: 3.50 },
      ],
    });
    const plan = runOptimizationEngine([batchA, batchB], [dest], mockCompany);

    const allocA = plan.optimized.dispatches.find(d => d.commodityName === 'Strawberries')?.allocatedQuantityKg || 0;
    const allocB = plan.optimized.dispatches.find(d => d.commodityName === 'Baby Spinach')?.allocatedQuantityKg || 0;

    const passed = allocA === 800 && allocB === 600;
    results.push({
      id: 'TEST-07',
      name: 'Multi-Commodity Concurrent Routing',
      category: 'Model Solvability',
      passed,
      expected: 'Strawberries: 800 kg, Baby Spinach: 600 kg',
      actual: `Strawberries: ${allocA} kg, Baby Spinach: ${allocB} kg`,
      details: 'Allocated multiple distinct produce categories across shared destination terminal.',
    });
  } catch (err: any) {
    results.push({ id: 'TEST-07', name: 'Multi-Commodity Concurrent Routing', category: 'Model Solvability', passed: false, expected: '800, 600', actual: err.message, details: err.stack });
  }

  // TEST 8: Zero Demand Handling
  try {
    const batch = createBatch({ availableQuantityKg: 1000 });
    const dest = createDest({
      commodityDemands: [{ commodityName: 'Strawberries', demandKg: 0, fulfilledKg: 0, sellingPricePerKg: 5.00 }],
    });
    const plan = runOptimizationEngine([batch], [dest], mockCompany);

    const passed = plan.optimized.dispatches.length === 0 && plan.optimized.totalAllocatedKg === 0;
    results.push({
      id: 'TEST-08',
      name: 'Zero Destination Demand Handling',
      category: 'Robustness & Edge Cases',
      passed,
      expected: '0 dispatches allocated when recorded demand is 0',
      actual: `${plan.optimized.dispatches.length} dispatches, ${plan.optimized.totalAllocatedKg} kg allocated`,
      details: 'Verified no phantom dispatches occur with zero demand.',
    });
  } catch (err: any) {
    results.push({ id: 'TEST-08', name: 'Zero Destination Demand Handling', category: 'Robustness & Edge Cases', passed: false, expected: '0', actual: err.message, details: err.stack });
  }

  // TEST 9: Zero Baseline Spoilage Handling
  try {
    const batch = createBatch({ remainingShelfLifeHours: 168, availableQuantityKg: 500 }); // Healthy 7-day shelf life
    const dest = createDest({
      commodityDemands: [{ commodityName: 'Strawberries', demandKg: 500, fulfilledKg: 0, sellingPricePerKg: 5.00 }],
    });
    const plan = runOptimizationEngine([batch], [dest], mockCompany);

    const passed = plan.baseline.spoiledQuantityKg === 0 && !Number.isNaN(Number(plan.improvement.spoilageReductionPercent));
    results.push({
      id: 'TEST-09',
      name: 'Zero Baseline Spoilage Zero-Division Safeguard',
      category: 'Metric Reconciliation',
      passed,
      expected: 'Baseline spoilage === 0 kg, spoilage reduction handled without NaN error',
      actual: `Baseline spoilage: ${plan.baseline.spoiledQuantityKg} kg, Spoilage reduction: ${plan.improvement.spoilageReductionPercent}%`,
      details: 'Tested mathematical stability when no baseline spoilage occurs.',
    });
  } catch (err: any) {
    results.push({ id: 'TEST-09', name: 'Zero Baseline Spoilage Zero-Division Safeguard', category: 'Metric Reconciliation', passed: false, expected: '0', actual: err.message, details: err.stack });
  }

  // TEST 10: Discounts with and without Demand-Response Elasticity
  try {
    const batch = createBatch({ remainingShelfLifeHours: 28, availableQuantityKg: 1000 }); // Critical shelf life < 48h
    const dest = createDest();
    const scenarios = generateDiscountScenarios([batch], mockCompany, [dest]);

    const item = scenarios[0];
    const passed = item &&
      item.withoutElasticity.projectedSellThroughKg <= item.withElasticity.projectedSellThroughKg &&
      item.withElasticity.elasticityFactor === -1.2;

    results.push({
      id: 'TEST-10',
      name: 'Discount Scenarios & Demand Elasticity Modeling',
      category: 'Perishable Markdowns',
      passed: !!passed,
      expected: 'Elastic scenario produces higher sell-through volume than fixed demand scenario',
      actual: `Fixed: ${item?.withoutElasticity.projectedSellThroughKg} kg, Elastic: ${item?.withElasticity.projectedSellThroughKg} kg (ε = ${item?.withElasticity.elasticityFactor})`,
      details: 'Demonstrates clear comparison between conservative clearance and price-responsive demand lift.',
    });
  } catch (err: any) {
    results.push({ id: 'TEST-10', name: 'Discount Scenarios & Demand Elasticity Modeling', category: 'Perishable Markdowns', passed: false, expected: 'elastic > fixed', actual: err.message, details: err.stack });
  }

  // TEST 11: Repeated Planning Runs Idempotence
  try {
    const batch = createBatch();
    const dest = createDest();
    const plan1 = runOptimizationEngine([batch], [dest], mockCompany);
    const plan2 = runOptimizationEngine([batch], [dest], mockCompany);

    const passed = plan1.optimized.netRevenue === plan2.optimized.netRevenue &&
      plan1.optimized.totalAllocatedKg === plan2.optimized.totalAllocatedKg;

    results.push({
      id: 'TEST-11',
      name: 'Optimization Engine Determinism & Idempotence',
      category: 'Reproducibility',
      passed,
      expected: 'Identical net revenue and allocated volumes across successive runs',
      actual: `Run 1: $${plan1.optimized.netRevenue} (${plan1.optimized.totalAllocatedKg} kg) vs Run 2: $${plan2.optimized.netRevenue} (${plan2.optimized.totalAllocatedKg} kg)`,
      details: 'Verified mathematical consistency without randomized state leaks.',
    });
  } catch (err: any) {
    results.push({ id: 'TEST-11', name: 'Optimization Engine Determinism & Idempotence', category: 'Reproducibility', passed: false, expected: 'identical', actual: err.message, details: err.stack });
  }

  // TEST 12: Invalid Input Values Rejection
  try {
    const invalidBatch = createBatch({ availableQuantityKg: -100, remainingShelfLifeHours: -10 });
    const dest = createDest();
    const check = checkShelfLifeFeasibility(invalidBatch, dest, {
      safetyBufferHours: 4.0,
      warehouseHandlingCostPerKg: 0.05,
      spoilageDisposalCostPerKg: 0.20,
      unmetDemandPenaltyPerKg: 0.0,
      demandResponseEnabled: false,
      priceElasticity: -1.2,
      minFreshnessMarginHours: 2.0,
    });

    const passed = !check.feasible && check.rejectionReason !== undefined;
    results.push({
      id: 'TEST-12',
      name: 'Negative & Invalid Parameter Rejection',
      category: 'Input Validation',
      passed,
      expected: 'feasible: false with descriptive rejection message',
      actual: `feasible: ${check.feasible}, reason: "${check.rejectionReason}"`,
      details: 'Tested negative stock and negative shelf-life inputs.',
    });
  } catch (err: any) {
    results.push({ id: 'TEST-12', name: 'Negative & Invalid Parameter Rejection', category: 'Input Validation', passed: false, expected: 'false', actual: err.message, details: err.stack });
  }

  // TEST 13: Baseline vs. Optimized Strategy Comparison
  try {
    // Two batches: B1 has 28h shelf life (urgent), B2 has 120h shelf life (healthy)
    // Destination 1 has higher price ($6.00) but long transit (8h). Destination 2 has lower price ($4.50) but short transit (2h).
    const batchUrgent = createBatch({ id: 'B-URGENT', availableQuantityKg: 1000, remainingShelfLifeHours: 28 });
    const batchHealthy = createBatch({ id: 'B-HEALTHY', availableQuantityKg: 1000, remainingShelfLifeHours: 120 });

    const destFar = createDest({
      id: 'D-FAR',
      name: 'Far City Hub',
      estimatedTravelHours: 7.0,
      handlingTimeHours: 1.5,
      commodityDemands: [{ commodityName: 'Strawberries', demandKg: 1000, fulfilledKg: 0, sellingPricePerKg: 6.00 }],
    });

    const destNear = createDest({
      id: 'D-NEAR',
      name: 'Near Regional Market',
      estimatedTravelHours: 2.0,
      handlingTimeHours: 1.0,
      commodityDemands: [{ commodityName: 'Strawberries', demandKg: 1000, fulfilledKg: 0, sellingPricePerKg: 4.50 }],
    });

    const plan = runOptimizationEngine([batchUrgent, batchHealthy], [destFar, destNear], mockCompany);

    const passed = plan.optimized.netRevenue >= plan.baseline.netRevenue &&
      plan.optimized.violationsCount === 0 &&
      plan.baseline.violationsCount === 0;

    results.push({
      id: 'TEST-13',
      name: 'Baseline FIFO vs. FreshRoute LP Benchmark',
      category: 'Algorithm Performance',
      passed,
      expected: 'Optimized net revenue >= Baseline net revenue with zero hard constraint violations',
      actual: `Optimized: $${plan.optimized.netRevenue} vs Baseline: $${plan.baseline.netRevenue} (Diff: +$${plan.improvement.netRevenueGain})`,
      details: 'Demonstrates revenue superiority and spoilage avoidance under dual competitive routing.',
    });
  } catch (err: any) {
    results.push({ id: 'TEST-13', name: 'Baseline FIFO vs. FreshRoute LP Benchmark', category: 'Algorithm Performance', passed: false, expected: 'opt >= base', actual: err.message, details: err.stack });
  }

  // TEST 14: Economic Calculation Consistency
  try {
    const batch = createBatch({ availableQuantityKg: 500, unitCost: 2.00, remainingShelfLifeHours: 60 });
    const dest = createDest({
      transportCostPerKg: 0.20,
      commodityDemands: [{ commodityName: 'Strawberries', demandKg: 500, fulfilledKg: 0, sellingPricePerKg: 5.00 }],
    });
    const plan = runOptimizationEngine([batch], [dest], mockCompany, { warehouseHandlingCostPerKg: 0.10 });
    const d = plan.optimized.dispatches[0];

    // Check reconciliation:
    // Revenue = 500 * $5.00 = 2500
    // Transport = 500 * $0.20 = 100
    // Handling = 500 * $0.10 = 50
    // Batch Cost = 500 * $2.00 = 1000
    // Net Margin = 2500 - 100 - 50 - 1000 = 1350
    const passed = d &&
      d.grossRevenue === 2500 &&
      d.transportCost === 100 &&
      d.handlingCost === 50 &&
      d.batchCost === 1000 &&
      d.netMargin === 1350;

    results.push({
      id: 'TEST-14',
      name: 'Economic Ledger Reconciled Consistency',
      category: 'Financial Rigor',
      passed: !!passed,
      expected: 'Revenue: $2,500, Transport: $100, Handling: $50, Batch: $1,000, Net Margin: $1,350',
      actual: `Revenue: $${d?.grossRevenue}, Freight: $${d?.transportCost}, Handling: $${d?.handlingCost}, Cost: $${d?.batchCost}, Margin: $${d?.netMargin}`,
      details: 'Verified no double-counting of costs and full mathematical reconciliation.',
    });
  } catch (err: any) {
    results.push({ id: 'TEST-14', name: 'Economic Ledger Reconciled Consistency', category: 'Financial Rigor', passed: false, expected: 'reconciled', actual: err.message, details: err.stack });
  }

  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.filter(r => !r.passed).length;

  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passedTests,
    failedTests,
    allPassed: failedTests === 0,
    results,
  };
}
