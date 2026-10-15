# AGROROUTE API Documentation (Phase 3)

**Tagline**: Smarter Distribution. Fresher Produce.  
**Version**: 3.0.0 (Analytical Reporting, What-If Simulation & Verification)  
**Base URL**: `http://localhost:3000/api`

---

## 1. System & Authentication Endpoints

### `GET /api/health`
Returns system health, version, and timestamp.

### `POST /api/auth/login`
Authenticates an operator with email and password. Preset accounts: `elena@verdantcoastfresh.com`, `marcus@verdantcoastfresh.com`.

### `POST /api/auth/signup`
Creates a company account and primary operator user profile.

### `GET /api/auth/me`
Fetches current operator and company profile.

---

## 2. Operations Research & Plan Generation

### `POST /api/optimization/plan`
Executes the Revised Simplex LP solver against available stock and destination demand, benchmarked against the deterministic first-eligible FIFO baseline.

### `GET /api/optimization/plans`
Returns the list of saved optimization plans.

### `GET /api/optimization/plans/:id`
Retrieves a specific saved optimization run by ID.

### `POST /api/optimization/plans/save`
Persists a generated plan result with a custom descriptive name.

### `POST /api/optimization/plans/:id/commit`
Converts planned dispatches into active shipment allocations, automatically updating batch available balances and destination fulfilled amounts.

---

## 3. What-If Scenario Simulation Endpoints (Phase 3)

### `POST /api/optimization/scenarios/simulate`
Executes non-destructive what-if scenario simulations.

- **Request Body**:
  ```json
  {
    "basePlanId": "PLAN-BENCHMARK-001",
    "modifications": {
      "name": "Summer Heat Wave & Corridor Delay",
      "description": "Evaluating -12h harvest shelf-life reduction and +4.5h transit delays",
      "shelfLifeDeltaHours": -12,
      "routeDelayHours": {
        "DEST-001": 4.5,
        "DEST-002": 4.5
      },
      "capacityMultiplier": {
        "DEST-001": 0.8
      },
      "demandMultiplier": {
        "DEST-002": 1.3
      },
      "priceMultiplier": {
        "DEST-001": 0.9
      },
      "safetyBufferHours": 5.0,
      "spoilageCostPerKg": 0.30,
      "priceElasticity": -1.2
    }
  }
  ```

- **Response Payload**:
  ```json
  {
    "scenarioId": "SCEN-8291",
    "scenarioName": "Summer Heat Wave & Corridor Delay",
    "description": "Evaluating -12h harvest shelf-life reduction and +4.5h transit delays",
    "simulatedAt": "2026-10-15T11:20:00.000Z",
    "originalPlanSummary": {
      "totalVolumeKg": 6300,
      "netRevenue": 9985,
      "spoilageKg": 0,
      "fulfillmentPercent": 45.3
    },
    "scenarioOptimized": { ... },
    "scenarioBaseline": { ... },
    "deltas": {
      "volumeDeltaKg": -700,
      "netRevenueDelta": -1850,
      "spoilageDeltaKg": 700,
      "fulfillmentDeltaPercent": -5.0
    },
    "newlyInfeasibleRoutes": [
      {
        "batchId": "BATCH-2026-081",
        "commodityName": "Strawberries (Albion Variety)",
        "destinationId": "DEST-002",
        "destinationName": "Cascade Cold Chain Metro Depot",
        "reason": "Transit & handling (13.0h) exceeds remaining shelf life (20.0h) minus safety buffer."
      }
    ],
    "observations": [
      "Spoilage increased by 700 kg due to tightened shelf-life constraints or route delays.",
      "Net economic margin contracted by $1,850 (-19% change).",
      "1 route allocation that was previously feasible became impossible under this scenario."
    ]
  }
  ```

### `GET /api/optimization/scenarios/history`
Returns previous simulation runs.

### `GET /api/optimization/scenarios/:id`
Retrieves a specific simulation result by ID.

### `DELETE /api/optimization/scenarios/:id`
Deletes a simulation run from history.

---

## 4. Parameter Sensitivity Sweeps (Phase 3)

### `GET /api/optimization/sensitivity/:parameter`
Runs systematic parametric sensitivity analysis across operational intervals.
- Supported parameters: `shelf_life`, `travel_time`, `demand`, `price`.

- **Response Payload**:
  ```json
  {
    "parameter": "shelf_life",
    "label": "Shelf-Life Shock Sensitivity",
    "description": "Evaluates impact of systematic harvest shelf-life decay reductions from 0h down to -16h.",
    "interpretation": "A -16h shelf-life reduction increases spoilage risk and decreases net margin by up to $3,200, as long-distance routes become infeasible.",
    "dataPoints": [
      {
        "variationLabel": "0h (Normal)",
        "variationValue": 0,
        "spoilageKg": 0,
        "netRevenue": 9985,
        "demandFulfillmentPercent": 45.3,
        "feasibleDispatchesCount": 6,
        "unmetDemandKg": 7600
      },
      {
        "variationLabel": "-4h Decay",
        "variationValue": -4,
        "spoilageKg": 0,
        "netRevenue": 9985,
        "demandFulfillmentPercent": 45.3,
        "feasibleDispatchesCount": 6,
        "unmetDemandKg": 7600
      },
      {
        "variationLabel": "-12h Heat Shock",
        "variationValue": -12,
        "spoilageKg": 700,
        "netRevenue": 8135,
        "demandFulfillmentPercent": 40.3,
        "feasibleDispatchesCount": 5,
        "unmetDemandKg": 8300
      }
    ]
  }
  ```

---

## 5. Automated 14-Point Test Suite

### `GET /api/optimization/tests/run`
Executes all 14 mathematical invariants and returns test logs.

- **Response Payload**:
  ```json
  {
    "timestamp": "2026-10-15T11:25:00.000Z",
    "totalTests": 14,
    "passedTests": 14,
    "failedTests": 0,
    "allPassed": true,
    "results": [
      {
        "id": "TEST-01",
        "name": "Insufficient Shelf Life Rejection",
        "category": "Feasibility Constraints",
        "passed": true,
        "expected": "feasible: false with decay/safety buffer rejection reason",
        "actual": "feasible: false, reason: \"Perishable decay violation...\"",
        "details": "Evaluated 6h shelf life against 7.5h transit requirement."
      }
    ]
  }
  ```

---

## 6. Core Inventory, Destinations, & Demo Management

### `GET /api/inventory`
Lists produce batches with query parameters: `search`, `category`, `status`, `maxShelfLife`.

### `POST /api/inventory`
Creates a batch with attributes: `commodityName`, `category`, `initialQuantityKg`, `remainingShelfLifeHours`, `storageTempC`, `unitCost`.

### `GET /api/destinations`
Lists destination markets with multi-commodity demands, transport rates, and truck capacity bounds.

### `POST /api/demo/reset`
Resets the file-backed database to the clean synthetic Salinas Valley demonstration dataset with benchmark plans pre-generated.
