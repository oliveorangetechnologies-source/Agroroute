export type BusinessType = 'grower' | 'distributor' | 'cooperative' | 'wholesaler' | 'exporter';

export interface CompanySettings {
  id: string;
  companyName: string;
  businessType: BusinessType;
  operatingRegion: string;
  defaultCurrency: string; // '$', '€', '£', etc.
  measurementUnit: 'kg' | 'metric_ton';
  criticalShelfLifeHours: number; // e.g. 48
  warningShelfLifeHours: number;  // e.g. 96
  defaultTransportCostPerKg: number;
  contactEmail: string;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  avatarUrl?: string;
}

export type CommodityCategory =
  | 'Berries'
  | 'Leafy Greens'
  | 'Solanaceous'
  | 'Stone Fruit'
  | 'Subtropical'
  | 'Brassicas'
  | 'Root Veg'
  | 'Other';

export type QualityGrade = 'Grade A (Prime)' | 'Grade B (Standard)' | 'Processing Only';

export type BatchStatus = 'available' | 'low_shelf_life' | 'spoiled' | 'depleted';

export interface InventoryBatch {
  id: string; // e.g. BATCH-2026-081
  commodityName: string;
  category: CommodityCategory;
  initialQuantityKg: number;
  allocatedQuantityKg: number;
  dispatchedQuantityKg: number;
  spoiledQuantityKg: number;
  availableQuantityKg: number; // initial - allocated - dispatched - spoiled
  remainingShelfLifeHours: number; // e.g. 36
  harvestOrArrivalDate: string; // ISO date string (YYYY-MM-DD)
  estimatedHandlingHours: number; // e.g. 2.0
  storageTempC: number; // e.g. 2.5
  qualityGrade: QualityGrade;
  qualityNotes?: string;
  unitCost: number; // acquisition/grower cost per kg, e.g. 1.80
  discountPercent?: number; // active markdown % (0 - 80)
  status: BatchStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CommodityDemand {
  commodityName: string;
  demandKg: number;
  fulfilledKg: number;
  sellingPricePerKg: number;
  minShelfLifeRequiredHours?: number;
}

export type DestinationType =
  | 'Wholesale Market'
  | 'Supermarket Chain'
  | 'Regional Food Bank'
  | 'Food Service Processor'
  | 'Direct Retail Hub';

export interface Destination {
  id: string; // e.g. DEST-001
  name: string;
  location: string;
  destinationType: DestinationType;
  distanceKm: number;
  estimatedTravelHours: number;
  transportCostPerKg: number;
  availableTransportCapacityKg: number;
  handlingTimeHours: number;
  deliveryDeadline: string; // YYYY-MM-DD or datetime
  commodityDemands: CommodityDemand[];
  contactPerson?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type AllocationStatus = 'Pending' | 'Dispatched' | 'Delivered' | 'Cancelled';

export interface Allocation {
  id: string; // ALLOC-2026-001
  batchId: string;
  commodityName: string;
  destinationId: string;
  destinationName: string;
  quantityKg: number;
  sellingPricePerKg: number;
  unitCost: number;
  transportCostPerKg: number;
  totalRevenue: number;
  totalTransportCost: number;
  batchCost: number;
  netMargin: number;
  transitHours: number;
  shelfLifeAtArrivalHours: number;
  status: AllocationStatus;
  allocatedAt: string;
  dispatchedAt?: string;
  notes?: string;
}

export interface DiscountRecommendation {
  batchId: string;
  commodityName: string;
  category: CommodityCategory;
  availableQuantityKg: number;
  remainingShelfLifeHours: number;
  unitCost: number;
  currentDiscountPercent: number;
  recommendedDiscountPercent: number;
  originalEstimatedValue: number;
  discountedValue: number;
  potentialSalvageSavings: number;
  urgency: 'high' | 'critical' | 'moderate';
  reason: string;
}

export interface DashboardStats {
  totalAvailableInventoryKg: number;
  totalDestinationDemandKg: number;
  atRiskInventoryKg: number; // shelf life <= critical threshold
  pendingAllocationsKg: number;
  dispatchedProduceKg: number;
  projectedRevenue: number;
  projectedMargin: number;
  averageShelfLifeHours: number;
  criticalBatchesCount: number;
  totalBatchesCount: number;
  totalDestinationsCount: number;
}

export interface OperationalReport {
  generatedAt: string;
  period: string;
  totalVolumeHandledKg: number;
  totalRevenue: number;
  totalTransportCosts: number;
  netProfit: number;
  averageMarginPercent: number;
  spoilageRatePercent: number;
  wasteAvoidedKg: number;
  averageTransitHours: number;
  averageArrivalFreshnessHours: number;
  topCommodities: { name: string; volumeKg: number; revenue: number }[];
  destinationSummary: { name: string; volumeKg: number; revenue: number; margin: number }[];
}

// ==========================================
// Operations Research & Optimization Types
// ==========================================

export interface OptimizationParams {
  safetyBufferHours: number; // e.g. 4.0h buffer for delays and temperature variance
  warehouseHandlingCostPerKg: number; // e.g. 0.05 $/kg
  spoilageDisposalCostPerKg: number; // e.g. 0.20 $/kg
  unmetDemandPenaltyPerKg: number; // e.g. 0.00 $/kg
  demandResponseEnabled: boolean; // toggle demand elasticity scenario
  priceElasticity: number; // default -1.2
  minFreshnessMarginHours: number; // e.g. 2.0h
  targetCommodityFilter?: string; // 'All' or specific
  targetDestinationFilter?: string; // 'All' or specific
}

export interface FeasibilityCheckResult {
  feasible: boolean;
  requiredTimeHours: number;
  remainingShelfLifeAtArrivalHours: number;
  rejectionReason?: string;
}

export interface ProposedDispatch {
  id: string; // e.g. DISP-001
  batchId: string;
  commodityName: string;
  category: CommodityCategory;
  destinationId: string;
  destinationName: string;
  destinationLocation: string;
  allocatedQuantityKg: number;
  sellingPricePerKg: number;
  unitCost: number;
  transportCostPerKg: number;
  warehouseHandlingCostPerKg: number;
  grossRevenue: number;
  transportCost: number;
  batchCost: number;
  handlingCost: number;
  netMargin: number;
  travelHours: number;
  handlingHours: number;
  totalRequiredTimeHours: number;
  remainingShelfLifeAtArrivalHours: number;
  priorityLevel: 'Urgent (Tier 1)' | 'High (Tier 2)' | 'Normal (Tier 3)';
  priorityScore: number;
  explanation: string;
  alternativesConsidered: string;
}

export interface StrategyPerformanceMetrics {
  strategyName: 'FreshRoute LP Optimizer' | 'Baseline (First-Eligible FIFO)';
  totalAllocatedKg: number;
  totalDemandKg: number;
  demandFulfillmentPercent: number;
  unmetDemandKg: number;
  grossRevenue: number;
  totalTransportCosts: number;
  totalHandlingCosts: number;
  totalBatchAcquisitionCosts: number;
  spoilageCost: number;
  netRevenue: number;
  spoiledQuantityKg: number;
  spoilageReductionPercent: number | 'N/A';
  capacityUtilization: {
    destinationId: string;
    destinationName: string;
    usedKg: number;
    capacityKg: number;
    utilizationPercent: number;
  }[];
  violationsCount: number;
  violations: string[];
}

export interface OptimizationPlanResult {
  planId: string;
  createdAt: string;
  algorithmVersion: string;
  params: OptimizationParams;
  optimized: StrategyPerformanceMetrics & { dispatches: ProposedDispatch[] };
  baseline: StrategyPerformanceMetrics & { dispatches: ProposedDispatch[] };
  improvement: {
    spoilageReductionPercent: number | 'N/A';
    netRevenueGain: number;
    fulfillmentGainPercent: number;
    wasteAvoidedKg: number;
  };
  infeasibleCombinations: {
    batchId: string;
    commodityName: string;
    destinationId: string;
    destinationName: string;
    reason: string;
  }[];
  status: 'Proposed' | 'Approved' | 'Executed';
}

export interface SavedPlanRun {
  id: string;
  name: string;
  createdAt: string;
  executedAt?: string;
  status: 'Proposed' | 'Approved' | 'Executed';
  summary: {
    totalVolumeKg: number;
    netRevenue: number;
    spoilageAvoidedKg: number;
    spoilageReductionPercent: number | 'N/A';
    dispatchesCount: number;
  };
  planResult: OptimizationPlanResult;
}

export interface DiscountScenario {
  batchId: string;
  commodityName: string;
  category: CommodityCategory;
  availableQuantityKg: number;
  remainingShelfLifeHours: number;
  suggestedDiscountPercent: number;
  unitCost: number;
  normalSellingPrice: number;
  discountedSellingPrice: number;
  urgency: 'high' | 'critical' | 'moderate';
  reason: string;
  assumptions: string[];
  withoutElasticity: {
    projectedSellThroughKg: number;
    estimatedRevenue: number;
    estimatedSpoilageLoss: number;
    netSalvageValue: number;
    interpretation: string;
  };
  withElasticity: {
    elasticityFactor: number;
    projectedSellThroughKg: number;
    estimatedRevenue: number;
    estimatedSpoilageAvoidedKg: number;
    netSalvageValue: number;
    demandNote?: string;
    interpretation: string;
  };
}

export interface TestResultItem {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
}

export interface TestSuiteResult {
  timestamp: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  allPassed: boolean;
  results: TestResultItem[];
}

// ==========================================
// Scenario Simulation & Sensitivity Types
// ==========================================

export interface ScenarioModification {
  name: string;
  description: string;
  routeDelayHours?: Record<string, number>; // destId -> additional hours
  demandMultiplier?: Record<string, number>; // destId -> multiplier (e.g. 1.4 for +40%)
  capacityMultiplier?: Record<string, number>; // destId -> multiplier (e.g. 0.5 for -50%)
  priceMultiplier?: Record<string, number>; // destId -> multiplier (e.g. 0.8 for -20%)
  shelfLifeDeltaHours?: number; // e.g. -16 for accelerated decay
  safetyBufferHours?: number;
  spoilageCostPerKg?: number;
  priceElasticity?: number;
}

export interface ScenarioSimulationResult {
  scenarioId: string;
  scenarioName: string;
  description: string;
  simulatedAt: string;
  modifications: ScenarioModification;
  originalPlanSummary: {
    totalVolumeKg: number;
    netRevenue: number;
    spoilageKg: number;
    fulfillmentPercent: number;
  };
  scenarioOptimized: StrategyPerformanceMetrics & { dispatches: ProposedDispatch[] };
  scenarioBaseline: StrategyPerformanceMetrics & { dispatches: ProposedDispatch[] };
  deltas: {
    volumeDeltaKg: number;
    netRevenueDelta: number;
    spoilageDeltaKg: number;
    fulfillmentDeltaPercent: number;
  };
  newlyInfeasibleRoutes: {
    batchId: string;
    commodityName: string;
    destinationId: string;
    destinationName: string;
    reason: string;
  }[];
  observations: string[];
}

export interface SensitivityDataPoint {
  variationLabel: string;
  variationValue: number;
  spoilageKg: number;
  netRevenue: number;
  demandFulfillmentPercent: number;
  feasibleDispatchesCount: number;
  unmetDemandKg: number;
}

export interface SensitivityAnalysisResult {
  parameter: 'shelf_life' | 'travel_time' | 'demand' | 'price';
  label: string;
  description: string;
  dataPoints: SensitivityDataPoint[];
  interpretation: string;
}

export type PlanLifecycleStatus = 'Draft' | 'Approved' | 'Executed' | 'Rejected';

export interface PlanLifecycleEvent {
  timestamp: string;
  action: 'Created' | 'Approved' | 'Executed' | 'Rejected' | 'Dispatched';
  actor: string;
  notes: string;
}

