import { Router, Request, Response } from 'express';
import { db } from './db.ts';
import {
  runOptimizationEngine,
  generateDiscountScenarios,
  runScenarioSimulation,
  runSensitivityAnalysis,
} from './optimization/solver.ts';
import { runAllOptimizationTests } from './optimization/tests.ts';
import { SavedPlanRun, ScenarioModification, ScenarioSimulationResult } from '../src/types/index.ts';

export const apiRouter = Router();

// Health Check
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    project: 'AGROROUTE',
    tagline: 'Smarter Distribution. Fresher Produce.',
    phase: 'Enterprise Production Engine',
    timestamp: new Date().toISOString(),
  });
});

// Authentication endpoints
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }
  const user = db.getCurrentUser();
  res.json({
    success: true,
    user: {
      ...user,
      email: email.trim().toLowerCase(),
    },
    token: 'jwt-agroroute-dev-session-token',
  });
});

apiRouter.post('/auth/signup', (req: Request, res: Response) => {
  const { name, email, companyName, businessType } = req.body;
  if (!name || !email || !companyName) {
    res.status(400).json({ error: 'Name, email, and company name are required' });
    return;
  }
  // Initialize company
  db.updateCompany({
    companyName: companyName.trim(),
    businessType: businessType || 'distributor',
    contactEmail: email.trim().toLowerCase(),
    onboardingCompleted: false,
  });

  const user = {
    id: `USR-${Math.floor(100 + Math.random() * 900)}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: 'Operations Director',
    companyId: db.getCompany().id,
  };

  res.json({
    success: true,
    user,
    token: 'jwt-agroroute-dev-session-token',
  });
});

apiRouter.get('/auth/me', (_req: Request, res: Response) => {
  const user = db.getCurrentUser();
  const company = db.getCompany();
  res.json({ user, company });
});

apiRouter.post('/auth/logout', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// Company Settings
apiRouter.get('/company', (_req: Request, res: Response) => {
  res.json(db.getCompany());
});

apiRouter.put('/company', (req: Request, res: Response) => {
  const updates = req.body;
  if (updates.criticalShelfLifeHours && updates.criticalShelfLifeHours <= 0) {
    res.status(400).json({ error: 'Critical shelf life must be greater than zero hours' });
    return;
  }
  const updated = db.updateCompany(updates);
  res.json(updated);
});

// Inventory CRUD
apiRouter.get('/inventory', (req: Request, res: Response) => {
  let batches = db.getBatches();
  const { search, category, status, maxShelfLife } = req.query;

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    batches = batches.filter(
      b => b.commodityName.toLowerCase().includes(q) || b.id.toLowerCase().includes(q)
    );
  }

  if (category && typeof category === 'string' && category !== 'All') {
    batches = batches.filter(b => b.category === category);
  }

  if (status && typeof status === 'string' && status !== 'All') {
    batches = batches.filter(b => b.status === status);
  }

  if (maxShelfLife && typeof maxShelfLife === 'string') {
    const max = Number(maxShelfLife);
    if (!isNaN(max)) {
      batches = batches.filter(b => b.remainingShelfLifeHours <= max);
    }
  }

  res.json(batches);
});

apiRouter.get('/inventory/:id', (req: Request, res: Response) => {
  const batch = db.getBatchById(req.params.id);
  if (!batch) {
    res.status(404).json({ error: 'Batch not found' });
    return;
  }
  res.json(batch);
});

apiRouter.post('/inventory', (req: Request, res: Response) => {
  const data = req.body;
  if (!data.commodityName || !data.commodityName.trim()) {
    res.status(400).json({ error: 'Commodity name is required' });
    return;
  }
  const qty = Number(data.initialQuantityKg);
  if (isNaN(qty) || qty <= 0) {
    res.status(400).json({ error: 'Initial quantity must be greater than zero kilograms' });
    return;
  }
  const shelfLife = Number(data.remainingShelfLifeHours);
  if (isNaN(shelfLife) || shelfLife < 0) {
    res.status(400).json({ error: 'Shelf life must be a positive number of hours' });
    return;
  }

  const created = db.createBatch(data);
  res.status(201).json(created);
});

apiRouter.put('/inventory/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  if (updates.initialQuantityKg !== undefined && Number(updates.initialQuantityKg) < 0) {
    res.status(400).json({ error: 'Quantity cannot be negative' });
    return;
  }
  if (updates.remainingShelfLifeHours !== undefined && Number(updates.remainingShelfLifeHours) < 0) {
    res.status(400).json({ error: 'Shelf life cannot be negative' });
    return;
  }

  const updated = db.updateBatch(id, updates);
  if (!updated) {
    res.status(404).json({ error: 'Batch not found' });
    return;
  }
  res.json(updated);
});

apiRouter.delete('/inventory/:id', (req: Request, res: Response) => {
  const success = db.deleteBatch(req.params.id);
  if (!success) {
    res.status(404).json({ error: 'Batch not found' });
    return;
  }
  res.json({ success: true, message: 'Batch removed successfully' });
});

// Destinations CRUD
apiRouter.get('/destinations', (_req: Request, res: Response) => {
  res.json(db.getDestinations());
});

apiRouter.get('/destinations/:id', (req: Request, res: Response) => {
  const dest = db.getDestinationById(req.params.id);
  if (!dest) {
    res.status(404).json({ error: 'Destination not found' });
    return;
  }
  res.json(dest);
});

apiRouter.post('/destinations', (req: Request, res: Response) => {
  const data = req.body;
  if (!data.name || !data.name.trim()) {
    res.status(400).json({ error: 'Destination name is required' });
    return;
  }
  if (!data.location || !data.location.trim()) {
    res.status(400).json({ error: 'Destination location is required' });
    return;
  }
  if (Number(data.availableTransportCapacityKg) <= 0) {
    res.status(400).json({ error: 'Transport capacity must be greater than zero kg' });
    return;
  }

  const created = db.createDestination(data);
  res.status(201).json(created);
});

apiRouter.put('/destinations/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updated = db.updateDestination(id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Destination not found' });
    return;
  }
  res.json(updated);
});

apiRouter.delete('/destinations/:id', (req: Request, res: Response) => {
  const success = db.deleteDestination(req.params.id);
  if (!success) {
    res.status(404).json({ error: 'Destination not found' });
    return;
  }
  res.json({ success: true, message: 'Destination removed successfully' });
});

// Allocations
apiRouter.get('/allocations', (_req: Request, res: Response) => {
  res.json(db.getAllocations());
});

apiRouter.post('/allocations', (req: Request, res: Response) => {
  const { batchId, destinationId, commodityName, quantityKg, sellingPricePerKg, notes } = req.body;

  if (!batchId || !destinationId || !quantityKg) {
    res.status(400).json({ error: 'Batch ID, Destination ID, and Quantity are required' });
    return;
  }

  const result = db.createAllocation({
    batchId,
    destinationId,
    commodityName,
    quantityKg: Number(quantityKg),
    sellingPricePerKg: Number(sellingPricePerKg),
    notes,
  });

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.status(201).json(result.allocation);
});

apiRouter.put('/allocations/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Pending', 'Dispatched', 'Delivered', 'Cancelled'].includes(status)) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }

  const updated = db.updateAllocationStatus(id, status);
  if (!updated) {
    res.status(404).json({ error: 'Allocation not found' });
    return;
  }

  res.json(updated);
});

apiRouter.delete('/allocations/:id', (req: Request, res: Response) => {
  const success = db.deleteAllocation(req.params.id);
  if (!success) {
    res.status(404).json({ error: 'Allocation not found' });
    return;
  }
  res.json({ success: true, message: 'Allocation cancelled and stock restored' });
});

// Discounts & Salvage Engine
apiRouter.get('/discounts', (_req: Request, res: Response) => {
  const recommendations = db.getDiscountRecommendations();
  res.json(recommendations);
});

apiRouter.post('/discounts/apply', (req: Request, res: Response) => {
  const { batchId, discountPercent } = req.body;
  if (!batchId || discountPercent === undefined) {
    res.status(400).json({ error: 'Batch ID and discount percent are required' });
    return;
  }

  const updated = db.applyDiscount(batchId, Number(discountPercent));
  if (!updated) {
    res.status(404).json({ error: 'Batch not found' });
    return;
  }

  res.json({ success: true, batch: updated });
});

// Dashboard Statistics
apiRouter.get('/dashboard/stats', (_req: Request, res: Response) => {
  res.json(db.getDashboardStats());
});

// Reports
apiRouter.get('/reports', (_req: Request, res: Response) => {
  res.json(db.getOperationalReport());
});

// Demo Seeding & Reset
apiRouter.post('/demo/reset', (_req: Request, res: Response) => {
  const fresh = db.resetToDefaultSeed();
  res.json({
    success: true,
    message: 'Reset database to pristine Gujarat APMC agricultural corridor demonstration dataset',
    seededAt: fresh.lastSeededAt,
  });
});

apiRouter.post('/demo/seed', (_req: Request, res: Response) => {
  const data = db.resetToDefaultSeed();
  res.json({
    success: true,
    message: 'Gujarat agricultural demonstration dataset seeded successfully',
    summary: {
      batches: data.batches.length,
      destinations: data.destinations.length,
      allocations: data.allocations.length,
    }
  });
});

// ==========================================
// Operations Research & Optimization Endpoints
// ==========================================

// 1. Generate Optimization Plan (LP Solver vs. Baseline FIFO)
apiRouter.post('/optimization/plan', (req: Request, res: Response) => {
  try {
    const params = req.body || {};
    const batches = db.getBatches();
    const destinations = db.getDestinations();
    const company = db.getCompany();

    const plan = runOptimizationEngine(batches, destinations, company, params);
    res.json(plan);
  } catch (err: any) {
    console.error('Optimization run failed:', err);
    res.status(500).json({ error: `Optimization failed: ${err.message}` });
  }
});

// 2. Saved Plans Management
apiRouter.get('/optimization/plans', (_req: Request, res: Response) => {
  res.json(db.getSavedPlans());
});

apiRouter.get('/optimization/plans/:id', (req: Request, res: Response) => {
  const plan = db.getSavedPlanById(req.params.id);
  if (!plan) {
    res.status(404).json({ error: 'Saved plan not found' });
    return;
  }
  res.json(plan);
});

apiRouter.post('/optimization/plans/save', (req: Request, res: Response) => {
  const { name, planResult } = req.body;
  if (!planResult || !planResult.planId) {
    res.status(400).json({ error: 'Valid planResult is required' });
    return;
  }

  const saved: SavedPlanRun = {
    id: planResult.planId,
    name: name || `Optimization Run ${new Date().toLocaleTimeString()}`,
    createdAt: planResult.createdAt || new Date().toISOString(),
    status: 'Proposed',
    summary: {
      totalVolumeKg: planResult.optimized.totalAllocatedKg,
      netRevenue: planResult.optimized.netRevenue,
      spoilageAvoidedKg: planResult.improvement.wasteAvoidedKg,
      spoilageReductionPercent: planResult.improvement.spoilageReductionPercent,
      dispatchesCount: planResult.optimized.dispatches.length,
    },
    planResult,
  };

  db.savePlan(saved);
  res.status(201).json(saved);
});

apiRouter.post('/optimization/plans/:id/commit', (req: Request, res: Response) => {
  const { id } = req.params;
  const result = db.commitPlan(id);
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({
    success: true,
    message: `Plan committed! ${result.executedDispatches} dispatches transferred to active shipment allocations.`,
    executedDispatches: result.executedDispatches,
  });
});

// 3. Discount Scenarios with Elasticity
apiRouter.get('/optimization/scenarios/discounts', (_req: Request, res: Response) => {
  const batches = db.getBatches();
  const destinations = db.getDestinations();
  const company = db.getCompany();

  const scenarios = generateDiscountScenarios(batches, company, destinations);
  res.json(scenarios);
});

// 4. Automated 14-Point Test Suite Runner
apiRouter.get('/optimization/tests/run', (_req: Request, res: Response) => {
  const testResults = runAllOptimizationTests();
  res.json(testResults);
});

// 5. Scenario Simulator & What-If Engine
apiRouter.post('/optimization/scenarios/simulate', (req: Request, res: Response) => {
  try {
    const { basePlanId, modifications } = req.body as {
      basePlanId?: string;
      modifications: ScenarioModification;
    };

    if (!modifications) {
      res.status(400).json({ error: 'Modifications object is required for simulation' });
      return;
    }

    const batches = db.getBatches();
    const destinations = db.getDestinations();
    const company = db.getCompany();

    // Determine baseline plan
    let basePlan = basePlanId ? db.getSavedPlanById(basePlanId)?.planResult : undefined;
    if (!basePlan) {
      const savedPlans = db.getSavedPlans();
      if (savedPlans.length > 0) {
        basePlan = savedPlans[0].planResult;
      } else {
        basePlan = runOptimizationEngine(batches, destinations, company);
      }
    }

    const simResult = runScenarioSimulation(batches, destinations, company, basePlan, modifications);
    db.saveScenario(simResult);
    res.json(simResult);
  } catch (err: any) {
    console.error('Scenario simulation error:', err);
    res.status(500).json({ error: `Simulation failed: ${err.message}` });
  }
});

// 6. Scenario History
apiRouter.get('/optimization/scenarios/history', (_req: Request, res: Response) => {
  res.json(db.getScenarios());
});

apiRouter.get('/optimization/scenarios/:id', (req: Request, res: Response) => {
  const scen = db.getScenarioById(req.params.id);
  if (!scen) {
    res.status(404).json({ error: 'Scenario not found' });
    return;
  }
  res.json(scen);
});

apiRouter.delete('/optimization/scenarios/:id', (req: Request, res: Response) => {
  const deleted = db.deleteScenario(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Scenario not found' });
    return;
  }
  res.json({ success: true, message: 'Scenario removed from history' });
});

// 7. Sensitivity Analysis Engine
apiRouter.get('/optimization/sensitivity/:parameter', (req: Request, res: Response) => {
  try {
    const { parameter } = req.params;
    if (!['shelf_life', 'travel_time', 'demand', 'price'].includes(parameter)) {
      res.status(400).json({
        error: `Invalid parameter: ${parameter}. Must be one of: shelf_life, travel_time, demand, price`,
      });
      return;
    }

    const batches = db.getBatches();
    const destinations = db.getDestinations();
    const company = db.getCompany();

    const analysis = runSensitivityAnalysis(
      batches,
      destinations,
      company,
      parameter as 'shelf_life' | 'travel_time' | 'demand' | 'price'
    );
    res.json(analysis);
  } catch (err: any) {
    console.error('Sensitivity analysis error:', err);
    res.status(500).json({ error: `Sensitivity analysis failed: ${err.message}` });
  }
});

