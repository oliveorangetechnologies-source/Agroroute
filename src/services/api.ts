import {
  CompanySettings,
  UserProfile,
  InventoryBatch,
  Destination,
  Allocation,
  DashboardStats,
  DiscountRecommendation,
  OperationalReport,
  OptimizationPlanResult,
  SavedPlanRun,
  OptimizationParams,
  DiscountScenario,
  TestSuiteResult,
  ScenarioModification,
  ScenarioSimulationResult,
  SensitivityAnalysisResult,
} from '../types/index.ts';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    let errMsg = `Request failed: ${res.statusText}`;
    try {
      const errorData = await res.json();
      if (errorData.error) errMsg = errorData.error;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  auth: {
    login: (email: string, password: string) =>
      fetchJson<{ success: boolean; user: UserProfile; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    signup: (data: { name: string; email: string; companyName: string; businessType?: string }) =>
      fetchJson<{ success: boolean; user: UserProfile; token: string }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getMe: () =>
      fetchJson<{ user: UserProfile; company: CompanySettings }>('/auth/me'),
    logout: () =>
      fetchJson<{ success: boolean; message: string }>('/auth/logout', { method: 'POST' }),
  },

  // Company
  company: {
    get: () => fetchJson<CompanySettings>('/company'),
    update: (updates: Partial<CompanySettings>) =>
      fetchJson<CompanySettings>('/company', {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
  },

  // Inventory
  inventory: {
    getAll: (params?: { search?: string; category?: string; status?: string; maxShelfLife?: number }) => {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.category && params.category !== 'All') query.set('category', params.category);
      if (params?.status && params.status !== 'All') query.set('status', params.status);
      if (params?.maxShelfLife) query.set('maxShelfLife', params.maxShelfLife.toString());
      const qs = query.toString();
      return fetchJson<InventoryBatch[]>(`/inventory${qs ? `?${qs}` : ''}`);
    },
    getById: (id: string) => fetchJson<InventoryBatch>(`/inventory/${encodeURIComponent(id)}`),
    create: (data: Partial<InventoryBatch>) =>
      fetchJson<InventoryBatch>('/inventory', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, updates: Partial<InventoryBatch>) =>
      fetchJson<InventoryBatch>(`/inventory/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
    delete: (id: string) =>
      fetchJson<{ success: boolean; message: string }>(`/inventory/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
  },

  // Destinations
  destinations: {
    getAll: () => fetchJson<Destination[]>('/destinations'),
    getById: (id: string) => fetchJson<Destination>(`/destinations/${encodeURIComponent(id)}`),
    create: (data: Partial<Destination>) =>
      fetchJson<Destination>('/destinations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, updates: Partial<Destination>) =>
      fetchJson<Destination>(`/destinations/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
    delete: (id: string) =>
      fetchJson<{ success: boolean; message: string }>(`/destinations/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
  },

  // Allocations
  allocations: {
    getAll: () => fetchJson<Allocation[]>('/allocations'),
    create: (data: {
      batchId: string;
      destinationId: string;
      commodityName: string;
      quantityKg: number;
      sellingPricePerKg: number;
      notes?: string;
    }) =>
      fetchJson<Allocation>('/allocations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateStatus: (id: string, status: Allocation['status']) =>
      fetchJson<Allocation>(`/allocations/${encodeURIComponent(id)}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
    delete: (id: string) =>
      fetchJson<{ success: boolean; message: string }>(`/allocations/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
  },

  // Discounts
  discounts: {
    getRecommendations: () => fetchJson<DiscountRecommendation[]>('/discounts'),
    apply: (batchId: string, discountPercent: number) =>
      fetchJson<{ success: boolean; batch: InventoryBatch }>('/discounts/apply', {
        method: 'POST',
        body: JSON.stringify({ batchId, discountPercent }),
      }),
  },

  // Dashboard Stats
  dashboard: {
    getStats: () => fetchJson<DashboardStats>('/dashboard/stats'),
  },

  // Reports
  reports: {
    get: () => fetchJson<OperationalReport>('/reports'),
  },

  // Demo Seeding / Reset
  demo: {
    reset: () => fetchJson<{ success: boolean; message: string }>('/demo/reset', { method: 'POST' }),
    seed: () => fetchJson<{ success: boolean; message: string }>('/demo/seed', { method: 'POST' }),
  },

  // Operations Research Optimization Engine
  optimization: {
    generatePlan: (params?: Partial<OptimizationParams>) =>
      fetchJson<OptimizationPlanResult>('/optimization/plan', {
        method: 'POST',
        body: JSON.stringify(params || {}),
      }),
    getSavedPlans: () => fetchJson<SavedPlanRun[]>('/optimization/plans'),
    getSavedPlanById: (id: string) => fetchJson<SavedPlanRun>(`/optimization/plans/${encodeURIComponent(id)}`),
    savePlan: (name: string, planResult: OptimizationPlanResult) =>
      fetchJson<SavedPlanRun>('/optimization/plans/save', {
        method: 'POST',
        body: JSON.stringify({ name, planResult }),
      }),
    commitPlan: (id: string) =>
      fetchJson<{ success: boolean; message: string; executedDispatches: number }>(
        `/optimization/plans/${encodeURIComponent(id)}/commit`,
        { method: 'POST' }
      ),
    getDiscountScenarios: () => fetchJson<DiscountScenario[]>('/optimization/scenarios/discounts'),
    runTests: () => fetchJson<TestSuiteResult>('/optimization/tests/run'),
    simulateScenario: (data: { basePlanId?: string; modifications: ScenarioModification }) =>
      fetchJson<ScenarioSimulationResult>('/optimization/scenarios/simulate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getScenarioHistory: () => fetchJson<ScenarioSimulationResult[]>('/optimization/scenarios/history'),
    getScenarioById: (id: string) => fetchJson<ScenarioSimulationResult>(`/optimization/scenarios/${encodeURIComponent(id)}`),
    deleteScenario: (id: string) =>
      fetchJson<{ success: boolean; message: string }>(`/optimization/scenarios/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
    getSensitivity: (parameter: 'shelf_life' | 'travel_time' | 'demand' | 'price') =>
      fetchJson<SensitivityAnalysisResult>(`/optimization/sensitivity/${encodeURIComponent(parameter)}`),
  },
};
