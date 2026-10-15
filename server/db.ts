import fs from 'fs';
import path from 'path';
import {
  CompanySettings,
  UserProfile,
  InventoryBatch,
  Destination,
  Allocation,
  DashboardStats,
  DiscountRecommendation,
  OperationalReport,
  SavedPlanRun,
  ScenarioSimulationResult,
} from '../src/types/index.ts';
import { runOptimizationEngine } from './optimization/solver.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'agroroute_db.json');

export interface DatabaseSchema {
  company: CompanySettings;
  users: UserProfile[];
  batches: InventoryBatch[];
  destinations: Destination[];
  allocations: Allocation[];
  plans?: SavedPlanRun[];
  scenarios?: ScenarioSimulationResult[];
  lastSeededAt: string;
}

export function getDefaultSeedData(): DatabaseSchema {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterdayStr = new Date(now.getTime() - 24 * 3600 * 1000).toISOString().split('T')[0];
  const twoDaysAgoStr = new Date(now.getTime() - 48 * 3600 * 1000).toISOString().split('T')[0];

  const company: CompanySettings = {
    id: 'COMP-001',
    companyName: 'Gujarat Agro Fresh Logistics Ltd.',
    businessType: 'distributor',
    operatingRegion: 'Gujarat State APMC & Cold-Chain Corridor (Ahmedabad Hub)',
    defaultCurrency: '₹',
    measurementUnit: 'kg',
    criticalShelfLifeHours: 48,
    warningShelfLifeHours: 96,
    defaultTransportCostPerKg: 2.20,
    contactEmail: 'dispatch@gujaratagrofresh.in',
    onboardingCompleted: true,
    createdAt: twoDaysAgoStr + 'T08:00:00.000Z',
    updatedAt: todayStr + 'T08:00:00.000Z',
  };

  const users: UserProfile[] = [
    {
      id: 'USR-001',
      name: 'Rajesh Patel',
      email: 'rajesh.patel@gujaratagrofresh.in',
      role: 'Director of Distribution & Cold-Chain Operations',
      companyId: 'COMP-001',
    },
    {
      id: 'USR-002',
      name: 'Bhavin Shah',
      email: 'bhavin.shah@gujaratagrofresh.in',
      role: 'Senior Supply-Chain & Logistics Planner',
      companyId: 'COMP-001',
    }
  ];

  // 8 domain-authentic Gujarat produce batches
  const batches: InventoryBatch[] = [
    {
      id: 'BATCH-GJ-101',
      commodityName: 'Gir Kesar Mango (Talala GI Tagged)',
      category: 'Subtropical',
      initialQuantityKg: 3500,
      allocatedQuantityKg: 1800,
      dispatchedQuantityKg: 0,
      spoiledQuantityKg: 0,
      availableQuantityKg: 1700,
      remainingShelfLifeHours: 32, // Critical! < 48 hours
      harvestOrArrivalDate: yesterdayStr,
      estimatedHandlingHours: 1.5,
      storageTempC: 11.5,
      qualityGrade: 'Grade A (Prime)',
      qualityNotes: 'Harvested at dawn from Talala Gir orchards, pre-cooled to 11.5°C. High natural brix (18.5°).',
      unitCost: 110,
      discountPercent: 15,
      status: 'low_shelf_life',
      createdAt: yesterdayStr + 'T06:30:00.000Z',
      updatedAt: todayStr + 'T04:00:00.000Z',
    },
    {
      id: 'BATCH-GJ-102',
      commodityName: 'Anand G9 Robusta Bananas',
      category: 'Subtropical',
      initialQuantityKg: 4200,
      allocatedQuantityKg: 1500,
      dispatchedQuantityKg: 0,
      spoiledQuantityKg: 0,
      availableQuantityKg: 2700,
      remainingShelfLifeHours: 38, // Critical! < 48 hours
      harvestOrArrivalDate: yesterdayStr,
      estimatedHandlingHours: 1.5,
      storageTempC: 13.0,
      qualityGrade: 'Grade A (Prime)',
      qualityNotes: 'Ripening stage 3.5 turning yellow. Anand-Bharuch fertile alluvial soil origin.',
      unitCost: 20,
      discountPercent: 10,
      status: 'low_shelf_life',
      createdAt: yesterdayStr + 'T07:15:00.000Z',
      updatedAt: todayStr + 'T04:15:00.000Z',
    },
    {
      id: 'BATCH-GJ-103',
      commodityName: 'Navsari & Surat Hybrid Tomatoes',
      category: 'Solanaceous',
      initialQuantityKg: 6000,
      allocatedQuantityKg: 2500,
      dispatchedQuantityKg: 1000,
      spoiledQuantityKg: 0,
      availableQuantityKg: 2500,
      remainingShelfLifeHours: 96, // Healthy: 4 days
      harvestOrArrivalDate: twoDaysAgoStr,
      estimatedHandlingHours: 2.0,
      storageTempC: 12.0,
      qualityGrade: 'Grade A (Prime)',
      qualityNotes: 'Firm breaker stage, uniform red calyx, greenhouse grown in South Gujarat.',
      unitCost: 22,
      status: 'available',
      createdAt: twoDaysAgoStr + 'T10:00:00.000Z',
      updatedAt: todayStr + 'T05:00:00.000Z',
    },
    {
      id: 'BATCH-GJ-104',
      commodityName: 'Deesa Cold-Storage Potatoes (Kufri Chipsona)',
      category: 'Root Veg',
      initialQuantityKg: 8500,
      allocatedQuantityKg: 3000,
      dispatchedQuantityKg: 0,
      spoiledQuantityKg: 0,
      availableQuantityKg: 5500,
      remainingShelfLifeHours: 240, // Healthy: 10 days
      harvestOrArrivalDate: twoDaysAgoStr,
      estimatedHandlingHours: 2.5,
      storageTempC: 8.0,
      qualityGrade: 'Grade A (Prime)',
      qualityNotes: 'Deesa Banaskantha cold storage, high dry matter 21.5%, low sugar suitable for chip-makers & markets.',
      unitCost: 15,
      status: 'available',
      createdAt: twoDaysAgoStr + 'T14:20:00.000Z',
      updatedAt: todayStr + 'T05:30:00.000Z',
    },
    {
      id: 'BATCH-GJ-105',
      commodityName: 'Mahuva Red Onions (Bhavnagar Belt)',
      category: 'Root Veg',
      initialQuantityKg: 7000,
      allocatedQuantityKg: 2500,
      dispatchedQuantityKg: 0,
      spoiledQuantityKg: 0,
      availableQuantityKg: 4500,
      remainingShelfLifeHours: 192, // 8 days
      harvestOrArrivalDate: yesterdayStr,
      estimatedHandlingHours: 2.0,
      storageTempC: 18.0,
      qualityGrade: 'Grade A (Prime)',
      qualityNotes: 'Cured tight outer scales, spicy pungency, harvested from Mahuva APMC belt.',
      unitCost: 18,
      status: 'available',
      createdAt: yesterdayStr + 'T11:00:00.000Z',
      updatedAt: todayStr + 'T06:00:00.000Z',
    },
    {
      id: 'BATCH-GJ-106',
      commodityName: 'Gondal Reshampatti Red Chilies & Capsicum',
      category: 'Solanaceous',
      initialQuantityKg: 3000,
      allocatedQuantityKg: 1000,
      dispatchedQuantityKg: 0,
      spoiledQuantityKg: 0,
      availableQuantityKg: 2000,
      remainingShelfLifeHours: 72,
      harvestOrArrivalDate: yesterdayStr,
      estimatedHandlingHours: 1.5,
      storageTempC: 7.5,
      qualityGrade: 'Grade A (Prime)',
      qualityNotes: 'Deep glossy skin, crisp thick walls, premium Gondal yard quality.',
      unitCost: 48,
      status: 'available',
      createdAt: yesterdayStr + 'T13:40:00.000Z',
      updatedAt: todayStr + 'T06:15:00.000Z',
    },
    {
      id: 'BATCH-GJ-107',
      commodityName: 'Mehsana Tender Green Okra (Bhindi)',
      category: 'Other',
      initialQuantityKg: 2000,
      allocatedQuantityKg: 0,
      dispatchedQuantityKg: 0,
      spoiledQuantityKg: 0,
      availableQuantityKg: 2000,
      remainingShelfLifeHours: 26, // Urgent < 48 hours
      harvestOrArrivalDate: todayStr,
      estimatedHandlingHours: 1.2,
      storageTempC: 9.0,
      qualityGrade: 'Grade B (Standard)',
      qualityNotes: 'Pencil-thin tender pods. Rapid respiration requires immediate dispatch or 25% salvage markdown.',
      unitCost: 28,
      discountPercent: 25,
      status: 'low_shelf_life',
      createdAt: todayStr + 'T05:00:00.000Z',
      updatedAt: todayStr + 'T05:00:00.000Z',
    },
    {
      id: 'BATCH-GJ-108',
      commodityName: 'Kutch Fresh Barhee Dates (Kharik)',
      category: 'Other',
      initialQuantityKg: 2800,
      allocatedQuantityKg: 0,
      dispatchedQuantityKg: 0,
      spoiledQuantityKg: 0,
      availableQuantityKg: 2800,
      remainingShelfLifeHours: 144, // 6 days
      harvestOrArrivalDate: yesterdayStr,
      estimatedHandlingHours: 1.8,
      storageTempC: 4.0,
      qualityGrade: 'Grade A (Prime)',
      qualityNotes: 'Kutch arid oasis harvest, crisp sweet texture, premium retail market grade.',
      unitCost: 80,
      status: 'available',
      createdAt: yesterdayStr + 'T08:00:00.000Z',
      updatedAt: todayStr + 'T06:30:00.000Z',
    }
  ];

  // 4 Gujarat destination APMC markets & logistics parks
  const destinations: Destination[] = [
    {
      id: 'DEST-GJ-001',
      name: 'Ahmedabad APMC Wholesale Terminal (Jamalpur)',
      location: 'Ahmedabad, Gujarat (Sardar Patel Ring Road Junction)',
      destinationType: 'Wholesale Market',
      distanceKm: 35,
      estimatedTravelHours: 1.2,
      transportCostPerKg: 1.80,
      availableTransportCapacityKg: 15000,
      handlingTimeHours: 1.0,
      deliveryDeadline: todayStr + ' 18:00',
      commodityDemands: [
        {
          commodityName: 'Gir Kesar Mango (Talala GI Tagged)',
          demandKg: 2500,
          fulfilledKg: 1000,
          sellingPricePerKg: 220,
          minShelfLifeRequiredHours: 24,
        },
        {
          commodityName: 'Anand Robusta Banana',
          demandKg: 3000,
          fulfilledKg: 1200,
          sellingPricePerKg: 28,
          minShelfLifeRequiredHours: 28,
        },
        {
          commodityName: 'Navsari Hybrid Tomato',
          demandKg: 2000,
          fulfilledKg: 1000,
          sellingPricePerKg: 42,
          minShelfLifeRequiredHours: 24,
        }
      ],
      contactPerson: 'Ramesh Patel (Chief Yard Master)',
      notes: 'Central auction yard dock #3. Direct ramp for refrigerated freight.',
      createdAt: twoDaysAgoStr + 'T09:00:00.000Z',
      updatedAt: todayStr + 'T06:00:00.000Z',
    },
    {
      id: 'DEST-GJ-002',
      name: 'Surat APMC & South Gujarat Cold Hub',
      location: 'Surat, Gujarat (Sahara Darwaja / Ring Road Terminal)',
      destinationType: 'Supermarket Chain',
      distanceKm: 265,
      estimatedTravelHours: 4.5,
      transportCostPerKg: 3.60,
      availableTransportCapacityKg: 18000,
      handlingTimeHours: 1.5,
      deliveryDeadline: todayStr + ' 22:00',
      commodityDemands: [
        {
          commodityName: 'Gir Kesar Mango (Talala GI Tagged)',
          demandKg: 2000,
          fulfilledKg: 800,
          sellingPricePerKg: 245,
          minShelfLifeRequiredHours: 30,
        },
        {
          commodityName: 'Mahuva Red Onion',
          demandKg: 4000,
          fulfilledKg: 1500,
          sellingPricePerKg: 34,
          minShelfLifeRequiredHours: 48,
        },
        {
          commodityName: 'Gondal Resham Patti Chilli',
          demandKg: 800,
          fulfilledKg: 400,
          sellingPricePerKg: 165,
          minShelfLifeRequiredHours: 48,
        }
      ],
      contactPerson: 'Harish Mehta (Procurement Officer)',
      notes: 'Fast-track reefer bays. Express cold storage facility for perishables.',
      createdAt: twoDaysAgoStr + 'T09:30:00.000Z',
      updatedAt: todayStr + 'T06:15:00.000Z',
    },
    {
      id: 'DEST-GJ-003',
      name: 'Rajkot Marketing Yard (Bedi APMC)',
      location: 'Rajkot, Gujarat (Bedi Bypass Highway)',
      destinationType: 'Regional Food Bank',
      distanceKm: 215,
      estimatedTravelHours: 3.8,
      transportCostPerKg: 2.90,
      availableTransportCapacityKg: 14000,
      handlingTimeHours: 1.2,
      deliveryDeadline: todayStr + ' 16:00',
      commodityDemands: [
        {
          commodityName: 'Anand Robusta Banana',
          demandKg: 2200,
          fulfilledKg: 800,
          sellingPricePerKg: 26,
          minShelfLifeRequiredHours: 20,
        },
        {
          commodityName: 'Deesa Jyoti Potato',
          demandKg: 4500,
          fulfilledKg: 2000,
          sellingPricePerKg: 25,
          minShelfLifeRequiredHours: 72,
        },
        {
          commodityName: 'Mehsana Seedless Lemon',
          demandKg: 1000,
          fulfilledKg: 500,
          sellingPricePerKg: 115,
          minShelfLifeRequiredHours: 36,
        }
      ],
      contactPerson: 'Jayeshbhai Jadeja (Market Supervisor)',
      notes: 'Saurashtra regional distribution hub. Quick unloading bay.',
      createdAt: twoDaysAgoStr + 'T10:00:00.000Z',
      updatedAt: todayStr + 'T06:30:00.000Z',
    },
    {
      id: 'DEST-GJ-004',
      name: 'Vadodara Central Agro Logistics Park',
      location: 'Vadodara, Gujarat (Sayajipura APMC Complex)',
      destinationType: 'Food Service Processor',
      distanceKm: 110,
      estimatedTravelHours: 2.0,
      transportCostPerKg: 2.20,
      availableTransportCapacityKg: 12000,
      handlingTimeHours: 1.0,
      deliveryDeadline: todayStr + ' 20:00',
      commodityDemands: [
        {
          commodityName: 'Navsari Hybrid Tomato',
          demandKg: 1800,
          fulfilledKg: 800,
          sellingPricePerKg: 40,
          minShelfLifeRequiredHours: 26,
        },
        {
          commodityName: 'Deesa Jyoti Potato',
          demandKg: 3000,
          fulfilledKg: 0,
          sellingPricePerKg: 24,
          minShelfLifeRequiredHours: 48,
        },
        {
          commodityName: 'Kutch Barhee Fresh Dates',
          demandKg: 600,
          fulfilledKg: 300,
          sellingPricePerKg: 240,
          minShelfLifeRequiredHours: 36,
        }
      ],
      contactPerson: 'Bhavesh Shah (Logistics In-charge)',
      notes: 'Golden Corridor connectivity. Strict quality grading inspection at entry.',
      createdAt: yesterdayStr + 'T10:00:00.000Z',
      updatedAt: todayStr + 'T06:45:00.000Z',
    }
  ];

  // 4 real pre-calculated active allocations
  const allocations: Allocation[] = [
    {
      id: 'ALLOC-GJ-001',
      batchId: 'BATCH-GJ-101',
      commodityName: 'Gir Kesar Mango (Talala GI Tagged)',
      destinationId: 'DEST-GJ-001',
      destinationName: 'Ahmedabad APMC Wholesale Terminal (Jamalpur)',
      quantityKg: 1000,
      sellingPricePerKg: 220,
      unitCost: 140,
      transportCostPerKg: 1.80,
      totalRevenue: 220000,
      totalTransportCost: 1800,
      batchCost: 140000,
      netMargin: 78200,
      transitHours: 1.2,
      shelfLifeAtArrivalHours: 33.8,
      status: 'Pending',
      allocatedAt: todayStr + 'T05:30:00.000Z',
      notes: 'Eicher Reefer Van GJ-01-AX-4821 assigned with temperature probe at 12°C.',
    },
    {
      id: 'ALLOC-GJ-002',
      batchId: 'BATCH-GJ-101',
      commodityName: 'Gir Kesar Mango (Talala GI Tagged)',
      destinationId: 'DEST-GJ-002',
      destinationName: 'Surat APMC & South Gujarat Cold Hub',
      quantityKg: 800,
      sellingPricePerKg: 245,
      unitCost: 140,
      transportCostPerKg: 3.60,
      totalRevenue: 196000,
      totalTransportCost: 2880,
      batchCost: 112000,
      netMargin: 81120,
      transitHours: 4.5,
      shelfLifeAtArrivalHours: 30.0,
      status: 'Pending',
      allocatedAt: todayStr + 'T05:45:00.000Z',
      notes: 'Express NH-48 Southbound freight schedule.',
    },
    {
      id: 'ALLOC-GJ-003',
      batchId: 'BATCH-GJ-102',
      commodityName: 'Anand Robusta Banana',
      destinationId: 'DEST-GJ-001',
      destinationName: 'Ahmedabad APMC Wholesale Terminal (Jamalpur)',
      quantityKg: 1200,
      sellingPricePerKg: 28,
      unitCost: 18,
      transportCostPerKg: 1.80,
      totalRevenue: 33600,
      totalTransportCost: 2160,
      batchCost: 21600,
      netMargin: 9840,
      transitHours: 1.2,
      shelfLifeAtArrivalHours: 57.8,
      status: 'Dispatched',
      allocatedAt: todayStr + 'T04:30:00.000Z',
      dispatchedAt: todayStr + 'T06:00:00.000Z',
      notes: 'Dispatched via Express Ring Road. Driver Mukesh Rathod.',
    },
    {
      id: 'ALLOC-GJ-004',
      batchId: 'BATCH-GJ-104',
      commodityName: 'Deesa Jyoti Potato',
      destinationId: 'DEST-GJ-003',
      destinationName: 'Rajkot Marketing Yard (Bedi APMC)',
      quantityKg: 2000,
      sellingPricePerKg: 25,
      unitCost: 16,
      transportCostPerKg: 2.90,
      totalRevenue: 50000,
      totalTransportCost: 5800,
      batchCost: 32000,
      netMargin: 12200,
      transitHours: 3.8,
      shelfLifeAtArrivalHours: 235.0,
      status: 'Dispatched',
      allocatedAt: todayStr + 'T04:45:00.000Z',
      dispatchedAt: todayStr + 'T06:15:00.000Z',
      notes: 'Covered ventilated truck dispatch to Rajkot Bedi yard.',
    }
  ];

  // Generate initial real benchmark plan
  let initialPlans: SavedPlanRun[] = [];
  try {
    const defaultPlan = runOptimizationEngine(batches, destinations, company);
    initialPlans = [
      {
        id: 'PLAN-BENCHMARK-001',
        name: 'Morning Gujarat APMC Benchmark Run (FreshRoute Optimization vs FIFO Baseline)',
        createdAt: todayStr + 'T07:00:00.000Z',
        status: 'Approved',
        summary: {
          totalVolumeKg: defaultPlan.optimized.totalAllocatedKg,
          netRevenue: defaultPlan.optimized.netRevenue,
          spoilageAvoidedKg: defaultPlan.improvement.wasteAvoidedKg,
          spoilageReductionPercent: defaultPlan.improvement.spoilageReductionPercent,
          dispatchesCount: defaultPlan.optimized.dispatches.length,
        },
        planResult: defaultPlan,
      }
    ];
  } catch (err) {
    console.error('Failed generating initial seed plan:', err);
  }

  return {
    company,
    users,
    batches,
    destinations,
    allocations,
    plans: initialPlans,
    scenarios: [],
    lastSeededAt: now.toISOString(),
  };
}

export class Database {
  private static instance: Database;
  private data: DatabaseSchema;

  private constructor() {
    this.ensureDataDirectory();
    this.data = this.loadOrSeed();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadOrSeed(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.batches && parsed.destinations && parsed.company) {
          parsed.plans = parsed.plans || [];
          parsed.scenarios = parsed.scenarios || [];
          if (parsed.plans.length === 0) {
            try {
              const defaultPlan = runOptimizationEngine(parsed.batches, parsed.destinations, parsed.company);
              parsed.plans.push({
                id: 'PLAN-BENCHMARK-001',
                name: 'Morning Gujarat APMC Benchmark Run (FreshRoute Optimization vs FIFO Baseline)',
                createdAt: new Date().toISOString(),
                status: 'Approved',
                summary: {
                  totalVolumeKg: defaultPlan.optimized.totalAllocatedKg,
                  netRevenue: defaultPlan.optimized.netRevenue,
                  spoilageAvoidedKg: defaultPlan.improvement.wasteAvoidedKg,
                  spoilageReductionPercent: defaultPlan.improvement.spoilageReductionPercent,
                  dispatchesCount: defaultPlan.optimized.dispatches.length,
                },
                planResult: defaultPlan,
              });
            } catch (err) {
              console.error('Failed creating fallback plan:', err);
            }
          }
          return parsed;
        }
      } catch (e) {
        console.error('Failed reading existing DB, reseeding:', e);
      }
    }
    const seed = getDefaultSeedData();
    this.saveData(seed);
    return seed;
  }

  private saveData(dataToSave: DatabaseSchema = this.data) {
    try {
      this.ensureDataDirectory();
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed saving database:', e);
    }
  }

  // Seed / Reset operations
  public resetToDefaultSeed(): DatabaseSchema {
    const fresh = getDefaultSeedData();
    this.data = fresh;
    this.saveData(fresh);
    return this.data;
  }

  // Company
  public getCompany(): CompanySettings {
    return this.data.company;
  }

  public updateCompany(updates: Partial<CompanySettings>): CompanySettings {
    this.data.company = {
      ...this.data.company,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveData();
    return this.data.company;
  }

  // User
  public getCurrentUser(): UserProfile {
    return this.data.users[0];
  }

  public getUsers(): UserProfile[] {
    return this.data.users || [];
  }

  public getUserByEmail(email: string): UserProfile | undefined {
    const clean = email.toLowerCase().trim();
    return (this.data.users || []).find(
      (u) => u.email.toLowerCase() === clean
    );
  }

  // Batches CRUD
  public getBatches(): InventoryBatch[] {
    // Recompute status based on shelf life and quantities
    const criticalThreshold = this.data.company.criticalShelfLifeHours || 48;
    return this.data.batches.map(batch => {
      let status = batch.status;
      if (batch.availableQuantityKg <= 0 && batch.allocatedQuantityKg <= 0) {
        status = 'depleted';
      } else if (batch.remainingShelfLifeHours <= 0) {
        status = 'spoiled';
      } else if (batch.remainingShelfLifeHours <= criticalThreshold) {
        status = 'low_shelf_life';
      } else {
        status = 'available';
      }
      return { ...batch, status };
    });
  }

  public getBatchById(id: string): InventoryBatch | undefined {
    return this.getBatches().find(b => b.id === id);
  }

  public createBatch(batchData: Omit<InventoryBatch, 'createdAt' | 'updatedAt' | 'availableQuantityKg' | 'allocatedQuantityKg' | 'dispatchedQuantityKg' | 'spoiledQuantityKg' | 'status'> & Partial<InventoryBatch>): InventoryBatch {
    const now = new Date().toISOString();
    const initialQty = Number(batchData.initialQuantityKg) || 0;
    const shelfLife = Number(batchData.remainingShelfLifeHours) || 0;
    const criticalThreshold = this.data.company.criticalShelfLifeHours || 48;

    let status: InventoryBatch['status'] = 'available';
    if (shelfLife <= 0) status = 'spoiled';
    else if (shelfLife <= criticalThreshold) status = 'low_shelf_life';

    const newBatch: InventoryBatch = {
      id: batchData.id || `BATCH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      commodityName: batchData.commodityName.trim(),
      category: batchData.category || 'Other',
      initialQuantityKg: initialQty,
      allocatedQuantityKg: 0,
      dispatchedQuantityKg: 0,
      spoiledQuantityKg: 0,
      availableQuantityKg: initialQty,
      remainingShelfLifeHours: shelfLife,
      harvestOrArrivalDate: batchData.harvestOrArrivalDate || new Date().toISOString().split('T')[0],
      estimatedHandlingHours: Number(batchData.estimatedHandlingHours) || 2.0,
      storageTempC: Number(batchData.storageTempC) || 3.0,
      qualityGrade: batchData.qualityGrade || 'Grade A (Prime)',
      qualityNotes: batchData.qualityNotes || '',
      unitCost: Number(batchData.unitCost) || 2.0,
      discountPercent: Number(batchData.discountPercent) || 0,
      status,
      createdAt: now,
      updatedAt: now,
    };

    this.data.batches.unshift(newBatch);
    this.saveData();
    return newBatch;
  }

  public updateBatch(id: string, updates: Partial<InventoryBatch>): InventoryBatch | null {
    const index = this.data.batches.findIndex(b => b.id === id);
    if (index === -1) return null;

    const existing = this.data.batches[index];
    const initialQty = updates.initialQuantityKg !== undefined ? Number(updates.initialQuantityKg) : existing.initialQuantityKg;
    const allocated = updates.allocatedQuantityKg !== undefined ? Number(updates.allocatedQuantityKg) : existing.allocatedQuantityKg;
    const dispatched = updates.dispatchedQuantityKg !== undefined ? Number(updates.dispatchedQuantityKg) : existing.dispatchedQuantityKg;
    const spoiled = updates.spoiledQuantityKg !== undefined ? Number(updates.spoiledQuantityKg) : existing.spoiledQuantityKg;
    const available = Math.max(0, initialQty - allocated - dispatched - spoiled);

    const shelfLife = updates.remainingShelfLifeHours !== undefined ? Number(updates.remainingShelfLifeHours) : existing.remainingShelfLifeHours;
    const criticalThreshold = this.data.company.criticalShelfLifeHours || 48;

    let status: InventoryBatch['status'] = 'available';
    if (available <= 0 && allocated <= 0) status = 'depleted';
    else if (shelfLife <= 0) status = 'spoiled';
    else if (shelfLife <= criticalThreshold) status = 'low_shelf_life';

    const updated: InventoryBatch = {
      ...existing,
      ...updates,
      initialQuantityKg: initialQty,
      allocatedQuantityKg: allocated,
      dispatchedQuantityKg: dispatched,
      spoiledQuantityKg: spoiled,
      availableQuantityKg: available,
      remainingShelfLifeHours: shelfLife,
      status,
      updatedAt: new Date().toISOString(),
    };

    this.data.batches[index] = updated;
    this.saveData();
    return updated;
  }

  public deleteBatch(id: string): boolean {
    const initialLength = this.data.batches.length;
    this.data.batches = this.data.batches.filter(b => b.id !== id);
    if (this.data.batches.length !== initialLength) {
      // Also remove pending allocations associated with this batch
      this.data.allocations = this.data.allocations.filter(a => a.batchId !== id);
      this.saveData();
      return true;
    }
    return false;
  }

  // Destinations CRUD
  public getDestinations(): Destination[] {
    return this.data.destinations;
  }

  public getDestinationById(id: string): Destination | undefined {
    return this.data.destinations.find(d => d.id === id);
  }

  public createDestination(destData: Omit<Destination, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Destination {
    const now = new Date().toISOString();
    const newDest: Destination = {
      id: destData.id || `DEST-${Math.floor(100 + Math.random() * 900)}`,
      name: destData.name.trim(),
      location: destData.location.trim(),
      destinationType: destData.destinationType || 'Wholesale Market',
      distanceKm: Number(destData.distanceKm) || 100,
      estimatedTravelHours: Number(destData.estimatedTravelHours) || 2.0,
      transportCostPerKg: Number(destData.transportCostPerKg) || 0.15,
      availableTransportCapacityKg: Number(destData.availableTransportCapacityKg) || 5000,
      handlingTimeHours: Number(destData.handlingTimeHours) || 1.5,
      deliveryDeadline: destData.deliveryDeadline || new Date().toISOString().split('T')[0],
      commodityDemands: (destData.commodityDemands || []).map(cd => ({
        commodityName: cd.commodityName.trim(),
        demandKg: Number(cd.demandKg) || 0,
        fulfilledKg: Number(cd.fulfilledKg) || 0,
        sellingPricePerKg: Number(cd.sellingPricePerKg) || 0,
        minShelfLifeRequiredHours: cd.minShelfLifeRequiredHours ? Number(cd.minShelfLifeRequiredHours) : undefined,
      })),
      contactPerson: destData.contactPerson || '',
      notes: destData.notes || '',
      createdAt: now,
      updatedAt: now,
    };

    this.data.destinations.unshift(newDest);
    this.saveData();
    return newDest;
  }

  public updateDestination(id: string, updates: Partial<Destination>): Destination | null {
    const index = this.data.destinations.findIndex(d => d.id === id);
    if (index === -1) return null;

    const existing = this.data.destinations[index];
    const updated: Destination = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.data.destinations[index] = updated;
    this.saveData();
    return updated;
  }

  public deleteDestination(id: string): boolean {
    const initialLength = this.data.destinations.length;
    this.data.destinations = this.data.destinations.filter(d => d.id !== id);
    if (this.data.destinations.length !== initialLength) {
      this.saveData();
      return true;
    }
    return false;
  }

  // Allocations
  public getAllocations(): Allocation[] {
    return this.data.allocations;
  }

  public createAllocation(params: {
    batchId: string;
    destinationId: string;
    commodityName: string;
    quantityKg: number;
    sellingPricePerKg: number;
    notes?: string;
  }): { success: boolean; allocation?: Allocation; error?: string } {
    const batch = this.data.batches.find(b => b.id === params.batchId);
    if (!batch) return { success: false, error: 'Batch not found' };

    const destination = this.data.destinations.find(d => d.id === params.destinationId);
    if (!destination) return { success: false, error: 'Destination not found' };

    const qty = Number(params.quantityKg);
    if (qty <= 0) return { success: false, error: 'Quantity must be greater than zero' };

    if (qty > batch.availableQuantityKg) {
      return { success: false, error: `Insufficient available stock. Requested ${qty} kg, available ${batch.availableQuantityKg} kg.` };
    }

    // Check transport capacity
    const currentAllocatedForDest = this.data.allocations
      .filter(a => a.destinationId === destination.id && a.status === 'Pending')
      .reduce((sum, a) => sum + a.quantityKg, 0);

    if (currentAllocatedForDest + qty > destination.availableTransportCapacityKg) {
      return {
        success: false,
        error: `Exceeds destination available vehicle capacity of ${destination.availableTransportCapacityKg} kg (already pending: ${currentAllocatedForDest} kg).`
      };
    }

    // Calculate shelf life upon arrival
    const totalTransitTimeHours = destination.estimatedTravelHours + destination.handlingTimeHours;
    const shelfLifeAtArrival = batch.remainingShelfLifeHours - totalTransitTimeHours;

    if (shelfLifeAtArrival <= 0) {
      return {
        success: false,
        error: `Critical freshness violation: Total transit & handling time (${totalTransitTimeHours.toFixed(1)}h) exceeds remaining shelf life (${batch.remainingShelfLifeHours}h). Produce would spoil in transit!`
      };
    }

    // Apply any active discount on selling price
    let effectivePrice = Number(params.sellingPricePerKg);
    if (batch.discountPercent && batch.discountPercent > 0) {
      effectivePrice = effectivePrice * (1 - batch.discountPercent / 100);
    }

    const totalRevenue = Math.round(qty * effectivePrice * 100) / 100;
    const totalTransportCost = Math.round(qty * destination.transportCostPerKg * 100) / 100;
    const batchCost = Math.round(qty * batch.unitCost * 100) / 100;
    const netMargin = Math.round((totalRevenue - totalTransportCost - batchCost) * 100) / 100;

    const newAlloc: Allocation = {
      id: `ALLOC-2026-${Math.floor(100 + Math.random() * 900)}`,
      batchId: batch.id,
      commodityName: params.commodityName || batch.commodityName,
      destinationId: destination.id,
      destinationName: destination.name,
      quantityKg: qty,
      sellingPricePerKg: effectivePrice,
      unitCost: batch.unitCost,
      transportCostPerKg: destination.transportCostPerKg,
      totalRevenue,
      totalTransportCost,
      batchCost,
      netMargin,
      transitHours: destination.estimatedTravelHours,
      shelfLifeAtArrivalHours: Math.round(shelfLifeAtArrival * 10) / 10,
      status: 'Pending',
      allocatedAt: new Date().toISOString(),
      notes: params.notes || '',
    };

    // Update batch allocations
    batch.allocatedQuantityKg += qty;
    batch.availableQuantityKg = Math.max(0, batch.initialQuantityKg - batch.allocatedQuantityKg - batch.dispatchedQuantityKg - batch.spoiledQuantityKg);
    batch.updatedAt = new Date().toISOString();

    // Update destination demand fulfillment
    const demandRecord = destination.commodityDemands.find(cd => cd.commodityName === params.commodityName || cd.commodityName === batch.commodityName);
    if (demandRecord) {
      demandRecord.fulfilledKg += qty;
      destination.updatedAt = new Date().toISOString();
    }

    this.data.allocations.unshift(newAlloc);
    this.saveData();

    return { success: true, allocation: newAlloc };
  }

  public updateAllocationStatus(id: string, newStatus: Allocation['status']): Allocation | null {
    const alloc = this.data.allocations.find(a => a.id === id);
    if (!alloc) return null;

    const oldStatus = alloc.status;
    alloc.status = newStatus;

    const batch = this.data.batches.find(b => b.id === alloc.batchId);
    if (batch) {
      if (newStatus === 'Dispatched' && oldStatus === 'Pending') {
        batch.allocatedQuantityKg = Math.max(0, batch.allocatedQuantityKg - alloc.quantityKg);
        batch.dispatchedQuantityKg += alloc.quantityKg;
        alloc.dispatchedAt = new Date().toISOString();
      } else if (newStatus === 'Cancelled' && oldStatus === 'Pending') {
        batch.allocatedQuantityKg = Math.max(0, batch.allocatedQuantityKg - alloc.quantityKg);
        batch.availableQuantityKg = Math.max(0, batch.initialQuantityKg - batch.allocatedQuantityKg - batch.dispatchedQuantityKg - batch.spoiledQuantityKg);

        const dest = this.data.destinations.find(d => d.id === alloc.destinationId);
        if (dest) {
          const demand = dest.commodityDemands.find(cd => cd.commodityName === alloc.commodityName);
          if (demand) {
            demand.fulfilledKg = Math.max(0, demand.fulfilledKg - alloc.quantityKg);
          }
        }
      }
      batch.updatedAt = new Date().toISOString();
    }

    this.saveData();
    return alloc;
  }

  public deleteAllocation(id: string): boolean {
    const alloc = this.data.allocations.find(a => a.id === id);
    if (!alloc) return false;

    // If pending, return stock to batch
    if (alloc.status === 'Pending') {
      const batch = this.data.batches.find(b => b.id === alloc.batchId);
      if (batch) {
        batch.allocatedQuantityKg = Math.max(0, batch.allocatedQuantityKg - alloc.quantityKg);
        batch.availableQuantityKg = Math.max(0, batch.initialQuantityKg - batch.allocatedQuantityKg - batch.dispatchedQuantityKg - batch.spoiledQuantityKg);
      }
      const dest = this.data.destinations.find(d => d.id === alloc.destinationId);
      if (dest) {
        const demand = dest.commodityDemands.find(cd => cd.commodityName === alloc.commodityName);
        if (demand) {
          demand.fulfilledKg = Math.max(0, demand.fulfilledKg - alloc.quantityKg);
        }
      }
    }

    this.data.allocations = this.data.allocations.filter(a => a.id !== id);
    this.saveData();
    return true;
  }

  // Perishables Discounts & Salvage Engine
  public getDiscountRecommendations(): DiscountRecommendation[] {
    const criticalThreshold = this.data.company.criticalShelfLifeHours || 48;
    const warningThreshold = this.data.company.warningShelfLifeHours || 96;

    const batches = this.getBatches();
    const recommendations: DiscountRecommendation[] = [];

    for (const batch of batches) {
      if (batch.availableQuantityKg <= 0) continue;

      const hours = batch.remainingShelfLifeHours;
      let recommendedPercent = 0;
      let urgency: DiscountRecommendation['urgency'] = 'moderate';
      let reason = '';

      if (hours <= 24) {
        recommendedPercent = 40;
        urgency = 'critical';
        reason = `Urgent: Under 24h remaining (${hours}h). High risk of total loss without liquidation.`;
      } else if (hours <= criticalThreshold) {
        recommendedPercent = 25;
        urgency = 'high';
        reason = `At-Risk: Under ${criticalThreshold}h remaining (${hours}h). Fast-track markdown recommended.`;
      } else if (hours <= warningThreshold) {
        recommendedPercent = 10;
        urgency = 'moderate';
        reason = `Proactive markdown: ${hours}h remaining. Accelerate movement to prevent backlog.`;
      }

      if (recommendedPercent > 0 || (batch.discountPercent && batch.discountPercent > 0)) {
        const basePrice = batch.unitCost * 1.5; // estimated normal wholesale price
        const originalValue = Math.round(batch.availableQuantityKg * basePrice);
        const effectivePercent = batch.discountPercent || recommendedPercent;
        const discountedValue = Math.round(originalValue * (1 - effectivePercent / 100));
        const salvageSavings = Math.round(discountedValue - (batch.availableQuantityKg * batch.unitCost));

        recommendations.push({
          batchId: batch.id,
          commodityName: batch.commodityName,
          category: batch.category,
          availableQuantityKg: batch.availableQuantityKg,
          remainingShelfLifeHours: batch.remainingShelfLifeHours,
          unitCost: batch.unitCost,
          currentDiscountPercent: batch.discountPercent || 0,
          recommendedDiscountPercent: recommendedPercent,
          originalEstimatedValue: originalValue,
          discountedValue,
          potentialSalvageSavings: Math.max(0, salvageSavings),
          urgency,
          reason,
        });
      }
    }

    return recommendations.sort((a, b) => a.remainingShelfLifeHours - b.remainingShelfLifeHours);
  }

  public applyDiscount(batchId: string, discountPercent: number): InventoryBatch | null {
    const batch = this.data.batches.find(b => b.id === batchId);
    if (!batch) return null;

    batch.discountPercent = Math.max(0, Math.min(80, discountPercent));
    batch.updatedAt = new Date().toISOString();
    this.saveData();
    return batch;
  }

  // Dashboard Stats
  public getDashboardStats(): DashboardStats {
    const batches = this.getBatches();
    const destinations = this.getDestinations();
    const allocations = this.getAllocations();
    const criticalThreshold = this.data.company.criticalShelfLifeHours || 48;

    const totalAvailable = batches.reduce((sum, b) => sum + b.availableQuantityKg, 0);
    const atRisk = batches
      .filter(b => b.remainingShelfLifeHours <= criticalThreshold && b.availableQuantityKg > 0)
      .reduce((sum, b) => sum + b.availableQuantityKg, 0);

    const criticalCount = batches.filter(
      b => b.remainingShelfLifeHours <= criticalThreshold && b.availableQuantityKg > 0
    ).length;

    let totalDemand = 0;
    destinations.forEach(d => {
      d.commodityDemands.forEach(cd => {
        totalDemand += cd.demandKg;
      });
    });

    const pendingAllocationsKg = allocations
      .filter(a => a.status === 'Pending')
      .reduce((sum, a) => sum + a.quantityKg, 0);

    const dispatchedProduceKg = allocations
      .filter(a => a.status === 'Dispatched' || a.status === 'Delivered')
      .reduce((sum, a) => sum + a.quantityKg, 0);

    const projectedRevenue = allocations
      .filter(a => a.status !== 'Cancelled')
      .reduce((sum, a) => sum + a.totalRevenue, 0);

    const projectedMargin = allocations
      .filter(a => a.status !== 'Cancelled')
      .reduce((sum, a) => sum + a.netMargin, 0);

    const availableBatches = batches.filter(b => b.availableQuantityKg > 0);
    const avgShelfLife = availableBatches.length > 0
      ? Math.round(availableBatches.reduce((sum, b) => sum + b.remainingShelfLifeHours, 0) / availableBatches.length)
      : 0;

    return {
      totalAvailableInventoryKg: totalAvailable,
      totalDestinationDemandKg: totalDemand,
      atRiskInventoryKg: atRisk,
      pendingAllocationsKg,
      dispatchedProduceKg,
      projectedRevenue: Math.round(projectedRevenue),
      projectedMargin: Math.round(projectedMargin),
      averageShelfLifeHours: avgShelfLife,
      criticalBatchesCount: criticalCount,
      totalBatchesCount: batches.length,
      totalDestinationsCount: destinations.length,
    };
  }

  // Reports
  public getOperationalReport(): OperationalReport {
    const allocations = this.getAllocations().filter(a => a.status !== 'Cancelled');
    const batches = this.getBatches();
    const destinations = this.getDestinations();

    const totalVolume = allocations.reduce((sum, a) => sum + a.quantityKg, 0);
    const totalRev = allocations.reduce((sum, a) => sum + a.totalRevenue, 0);
    const totalTransport = allocations.reduce((sum, a) => sum + a.totalTransportCost, 0);
    const totalCost = allocations.reduce((sum, a) => sum + a.batchCost, 0);
    const netProfit = totalRev - totalTransport - totalCost;

    const avgMargin = totalRev > 0 ? Math.round((netProfit / totalRev) * 1000) / 10 : 0;
    const avgTransit = allocations.length > 0
      ? Math.round((allocations.reduce((s, a) => s + a.transitHours, 0) / allocations.length) * 10) / 10
      : 0;

    const avgFreshness = allocations.length > 0
      ? Math.round((allocations.reduce((s, a) => s + a.shelfLifeAtArrivalHours, 0) / allocations.length) * 10) / 10
      : 0;

    // Spoilage calculation
    const totalSpoiled = batches.reduce((sum, b) => sum + (b.spoiledQuantityKg || 0), 0);
    const totalHarvested = batches.reduce((sum, b) => sum + b.initialQuantityKg, 0);
    const spoilageRate = totalHarvested > 0 ? Math.round((totalSpoiled / totalHarvested) * 1000) / 10 : 0.8;
    const wasteAvoided = Math.round(totalVolume * 0.94); // produce dispatched within shelf life

    // Commodity breakdowns
    const commodityMap: Record<string, { volume: number; revenue: number }> = {};
    allocations.forEach(a => {
      if (!commodityMap[a.commodityName]) commodityMap[a.commodityName] = { volume: 0, revenue: 0 };
      commodityMap[a.commodityName].volume += a.quantityKg;
      commodityMap[a.commodityName].revenue += a.totalRevenue;
    });

    const topCommodities = Object.entries(commodityMap).map(([name, data]) => ({
      name,
      volumeKg: data.volume,
      revenue: Math.round(data.revenue),
    })).sort((a, b) => b.volumeKg - a.volumeKg);

    // Destination summary
    const destinationSummary = destinations.map(d => {
      const destAllocs = allocations.filter(a => a.destinationId === d.id);
      const vol = destAllocs.reduce((s, a) => s + a.quantityKg, 0);
      const rev = destAllocs.reduce((s, a) => s + a.totalRevenue, 0);
      const margin = destAllocs.reduce((s, a) => s + a.netMargin, 0);
      return {
        name: d.name,
        volumeKg: vol,
        revenue: Math.round(rev),
        margin: Math.round(margin),
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      period: 'Current Gujarat State APMC Distribution Cycle (Live Operations)',
      totalVolumeHandledKg: totalVolume,
      totalRevenue: Math.round(totalRev),
      totalTransportCosts: Math.round(totalTransport),
      netProfit: Math.round(netProfit),
      averageMarginPercent: avgMargin,
      spoilageRatePercent: spoilageRate,
      wasteAvoidedKg: wasteAvoided,
      averageTransitHours: avgTransit,
      averageArrivalFreshnessHours: avgFreshness,
      topCommodities,
      destinationSummary,
    };
  }

  // Saved Optimization Plans
  public getSavedPlans(): SavedPlanRun[] {
    return this.data.plans || [];
  }

  public getSavedPlanById(id: string): SavedPlanRun | undefined {
    return (this.data.plans || []).find(p => p.id === id);
  }

  public savePlan(plan: SavedPlanRun): SavedPlanRun {
    if (!this.data.plans) this.data.plans = [];
    const index = this.data.plans.findIndex(p => p.id === plan.id);
    if (index >= 0) {
      this.data.plans[index] = plan;
    } else {
      this.data.plans.unshift(plan);
    }
    this.saveData();
    return plan;
  }

  public commitPlan(planId: string): { success: boolean; executedDispatches: number; error?: string } {
    const plan = this.getSavedPlanById(planId);
    if (!plan) return { success: false, executedDispatches: 0, error: 'Plan not found' };

    let executed = 0;
    for (const disp of plan.planResult.optimized.dispatches) {
      const res = this.createAllocation({
        batchId: disp.batchId,
        destinationId: disp.destinationId,
        commodityName: disp.commodityName,
        quantityKg: disp.allocatedQuantityKg,
        sellingPricePerKg: disp.sellingPricePerKg,
        notes: `Plan ${plan.id} execution: ${disp.explanation}`,
      });
      if (res.success) {
        executed++;
      }
    }

    plan.status = 'Executed';
    plan.executedAt = new Date().toISOString();
    this.saveData();

    return { success: true, executedDispatches: executed };
  }

  // Scenarios Management
  public getScenarios(): ScenarioSimulationResult[] {
    return this.data.scenarios || [];
  }

  public getScenarioById(id: string): ScenarioSimulationResult | undefined {
    return (this.data.scenarios || []).find(s => s.scenarioId === id);
  }

  public saveScenario(scenario: ScenarioSimulationResult): ScenarioSimulationResult {
    if (!this.data.scenarios) this.data.scenarios = [];
    const idx = this.data.scenarios.findIndex(s => s.scenarioId === scenario.scenarioId);
    if (idx >= 0) {
      this.data.scenarios[idx] = scenario;
    } else {
      this.data.scenarios.unshift(scenario);
    }
    if (this.data.scenarios.length > 25) {
      this.data.scenarios = this.data.scenarios.slice(0, 25);
    }
    this.saveData();
    return scenario;
  }

  public deleteScenario(id: string): boolean {
    if (!this.data.scenarios) return false;
    const initialLen = this.data.scenarios.length;
    this.data.scenarios = this.data.scenarios.filter(s => s.scenarioId !== id);
    if (this.data.scenarios.length !== initialLen) {
      this.saveData();
      return true;
    }
    return false;
  }
}

export const db = Database.getInstance();
