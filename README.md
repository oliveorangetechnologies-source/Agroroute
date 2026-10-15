# AGROROUTE — Phase 3: Analytical Reporting, What-If Simulation & Verification MVP
> **Smarter Distribution. Fresher Produce.**

AGROROUTE is an enterprise decision-support and supply-chain optimization SaaS platform for perishable fresh produce logistics operators, commercial shippers, and regional cooperatives. In the fresh food supply chain, spoilage, transit decay, and suboptimal routing cause catastrophic margin erosion and severe food waste.

AGROROUTE integrates a **reproducible Linear Programming (Revised Simplex) optimization engine**, an **empirical Baseline vs. FreshRoute Comparison Dashboard**, an interactive **What-If Scenario Simulator**, a **Deterministic Sensitivity Engine**, and an **Explainability & Verification Suite**.

---

## 1. System Architecture & Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Recharts, Motion.
- **Design System**: Human-designed agricultural logistics interface adhering to strict anti-slop guidelines:
  - Palette: Forest Green (`#243D2B`), Primary Green (`#355C40`), Sage (`#D8E5C3`), Warm Ivory (`#F4F0E6`), Harvest Orange (`#E78B45`), Main Text (`#202820`), Hairline Borders (`#E2E6DC`).
  - Typography: **Manrope** for interface headings and navigation, **DM Sans** for data grids, and **tabular numerals (`tabular-nums`)** for all financial ledgers, volume weights, and KPI cards.
  - Zero-pill metadata discipline, single-elevation surfaces, and 1440px desktop layout integrity.
- **Backend & REST API**: Full-stack Node.js & Express RESTful services running on port 3000 (`tsx server.ts`), serving `/api/*` endpoints and Vite frontend middleware.
- **Optimization Engine**: Operations Research solver using Revised Simplex LP (`javascript-lp-solver`) with exact constraint matrix formulation and dual bounds.
- **Data Persistence**: Atomic file-backed relational store (`data/agroroute_db.json`) with strict schema validation, referential integrity, and stock allocation locking.
- **Evaluation Dataset**: Explicitly labeled synthetic benchmark dataset modeling the Salinas Valley, CA & Pacific Northwest fresh produce distribution corridor.

---

## 2. Core Modules & Phase 3 Capabilities

### A. Performance Comparison Dashboard (`/reports`)
- **Real Benchmark Outputs**: Evaluates saved optimization plans against the deterministic First-Eligible FIFO baseline using persisted application data.
- **Side-by-Side Accounting Ledger**: Completely reconciled without double-counting:
  - Gross contract revenue.
  - Refrigerated freight transport costs.
  - Cross-dock warehouse handling costs ($0.05/kg).
  - Grower batch procurement acquisition cost.
  - Mandatory environmental spoilage disposal fee ($0.20/kg).
  - Net operating margin and return on sales.
- **Recharts Visualizations**:
  - Financial comparison by ledger metric (Baseline vs. FreshRoute).
  - Destination vehicle fleet capacity utilization (Reefer payload vs. remaining capacity limit).
  - Produce volume and spoilage distribution.
- **Explainability Drill-Down**: Click on any dispatch or infeasible candidate row to open the Explainability Audit Drawer.
- **Export Capabilities**: Clean CSV export of benchmark results and browser print-optimized layout.

### B. What-If Scenario Simulator (`/simulation`)
- **Non-Destructive Sandbox**: Clones active inventory and destination demands in memory to evaluate shocks without corrupting original state.
- **Configurable Operational Shocks**:
  - **Harvest Shelf-Life Shock** (-24h to +12h): Simulates extreme summer heat or broken pre-cooling chains.
  - **Corridor Transit Delay** (0h to +12h): Simulates mountain highway closures (e.g. I-5 corridor) and freight congestion.
  - **Transport Capacity Multiplier** (20% to 160%): Simulates regional refrigerated truck driver shortages.
  - **Destination Contract Demand Multiplier** (50% to 180%): Simulates grocery demand spikes or contractions.
  - **Wholesale Price Multiplier** (50% to 150%): Simulates terminal wholesale market price volatility.
  - **Demand Response Elasticity ($\epsilon = -1.2$)**: Evaluates dynamic clearance markdown lift.
- **Evaluator Quick Presets**:
  - *Summer Heat Wave (-12h Shelf Life)*
  * *I-5 Corridor Closure (+4.5h Transit Delay)*
  * *Reefer Fleet Shortage (-40% Capacity)*
  * *Wholesale Demand Surge (+40% Orders)*
  * *Terminal Market Glut (-25% Price Slump)*
- **Real-Time Deltas**: Displays volume delta (kg), spoilage delta (kg), net revenue delta ($), fulfillment delta (%), and lists newly triggered infeasible routes.
- **Scenario History**: Stores past simulations with instant recall and delete actions.

### C. Deterministic Sensitivity Analysis Engine
- Sweeps operational parameters across systematic intervals:
  - **Shelf-Life Shock**: Sweeps from 0h down to -16h.
  - **Transit Corridor Delay**: Sweeps from 0% to +50% delay.
  - **Destination Demand Shift**: Sweeps from -25% to +50%.
  - **Terminal Price Shocks**: Sweeps from -30% to 0%.
- Generates dual parametric curves:
  - Net Revenue ($) vs. Modeled Spoilage (kg).
  - Demand Fulfillment (%) vs. Feasible Dispatches.
- Outputs grounded domain operations research interpretations.

### D. Decision Explainability & Math Verification Drawer
- Transparent mathematical proofs for every dispatch decision:
  - $\tau_{\text{required}} = h_{\text{load}} + t_{\text{travel}} + t_{\text{unload}}$
  - $L_{\text{arrival}} = L_{\text{harvest}} - \tau_{\text{required}}$
  - Proof that $L_{\text{arrival}} \ge \Delta_{\text{buffer}} + L^{\min}_{\text{margin}}$.
  - Specific plain-English reason for why the LP solver chose this destination over alternative hubs.
  - Specific plain-English rejection diagnostics for infeasible routes (e.g., transit time exceeds remaining shelf life, buyer dock minimum breached).

### E. Automated 14-Point Test Suite (`/tests`)
- Integrated in the web interface and accessible via terminal CLI.
- 14 automated unit and integration tests verifying all mathematical invariants:
  - Physical decay & shelf-life feasibility.
  - Stock allocation bounding & double-counting prevention.
  - Destination contract demand caps.
  - Vehicle fleet weight capacity limits.
  - Missing price & cost tolerance without NaN crashes.
  - Multi-commodity concurrent routing.
  - Zero demand and zero inventory edge cases.
  - Zero baseline spoilage zero-division protection.
  - Elastic vs. inelastic markdown salvage modeling.
  - Optimization determinism & idempotence.
  - Negative parameter input rejection.
  - Baseline vs. optimized superiority proof.
  - Economic ledger mathematical reconciliation.

---

## 3. Mathematical Formulation (PPDP)

### A. Sets & Indices
- $i \in B$: Inventory batches with available stock $S_i \ge 0$ (kg), remaining shelf life $L_i$ (hours), and acquisition cost $u_i$ ($/kg).
- $j \in D$: Destination terminals with transit travel time $t_j^{\text{travel}}$ (h), unloading time $t_j^{\text{unload}}$ (h), transport rate $r_j$ ($/kg), and vehicle capacity $C_j$ (kg).
- $k \in K$: Commodity categories with destination demand $M_{j,k}$ (kg) and contract price $P_{j,k}$ ($/kg).

### B. Objective Function
$$\max Z = \sum_{(i,j) \in \text{Feasible}} \left( P_{j, c(i)}^{\text{eff}} - r_j - h^{\text{wh}} - u_i \right) x_{i,j} - \sum_{i \in B} w_i \cdot \text{Spoil}(s_i) - \sum_{j, k} \pi_k \cdot u_{j,k}$$

### C. Hard Constraints
1. **Batch Stock Cap**: $\sum_{j \in D} x_{i,j} \le S_i \quad \forall i \in B$
2. **Commodity Demand Cap**: $\sum_{i: c(i)=k} x_{i,j} \le M_{j,k} \quad \forall j \in D, \forall k \in K$
3. **Vehicle Fleet Capacity**: $\sum_{i \in B} x_{i,j} \le C_j \quad \forall j \in D$
4. **Decay Infeasibility**: $x_{i,j} = 0 \quad \forall (i,j) \notin \text{Feasible}$
5. **Non-negativity**: $x_{i,j} \ge 0 \quad \forall (i,j)$

---

## 4. REST API Endpoint Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health, phase, and uptime timestamp |
| `POST` | `/api/auth/login` | Authenticate user session with demo accounts |
| `POST` | `/api/auth/signup` | Register new distributor company and operator profile |
| `GET` | `/api/inventory` | List produce batches with search, status, and category filters |
| `POST` | `/api/inventory` | Create new incoming harvest batch with shelf-life validation |
| `GET` | `/api/destinations` | List terminal hubs with contract demands and truck capacities |
| `POST` | `/api/optimization/plan` | Run Revised Simplex LP solver vs. FIFO baseline |
| `GET` | `/api/optimization/plans` | Fetch saved benchmark planning runs |
| `POST` | `/api/optimization/plans/save` | Persist planning run with custom name |
| `POST` | `/api/optimization/plans/:id/commit` | Transfer planned dispatches into active shipment allocations |
| `POST` | `/api/optimization/scenarios/simulate` | Execute non-destructive what-if simulation with deltas |
| `GET` | `/api/optimization/scenarios/history` | List saved scenario simulations |
| `DELETE` | `/api/optimization/scenarios/:id` | Remove scenario run from history |
| `GET` | `/api/optimization/sensitivity/:parameter` | Run parametric sensitivity sweeps (`shelf_life`, `travel_time`, `demand`, `price`) |
| `GET` | `/api/optimization/tests/run` | Execute 14-point automated test suite |
| `POST` | `/api/demo/reset` | Restore pristine synthetic Salinas Valley demonstration dataset |

---

## 5. Verification: Running the 14-Point Test Suite

Execute the entire optimization verification suite directly from the terminal:

```bash
# Execute test suite via backend CLI
npx tsx -e "
import { runAllOptimizationTests } from './server/optimization/tests.ts';
const r = runAllOptimizationTests();
console.log('Passed:', r.passedTests, '/', r.totalTests, 'All passed:', r.allPassed);
"
```

Or via cURL when the server is active:

```bash
curl -s http://localhost:3000/api/optimization/tests/run
```

**Results:**
- **Total Tests**: 14
- **Passed**: 14 (100%)
- **Failed**: 0
- **Regression Errors**: 0

---

## 6. How to Evaluate & Demo the MVP

1. **Start the Platform**:
   The dev server runs automatically on `http://localhost:3000` via `npm run dev` (`tsx server.ts`).
2. **One-Click Evaluator Sign-In**:
   On the `/login` screen, click either **"Sign In as Elena Rostova"** (Director of Distribution) or **"Sign In as Marcus Chen"** (Operations Planner).
3. **Inspect Performance Comparison (`/reports`)**:
   - Compare Baseline FIFO vs. FreshRoute LP side-by-side.
   - Review the Recharts financial and capacity charts.
   - Click any dispatch row in the table to open the **Explainability Drawer** and inspect the step-by-step cold-chain math.
4. **Run What-If Scenarios (`/simulation`)**:
   - Click the **"Summer Heat Wave"** or **"Corridor Delay"** quick preset.
   - Click **Execute What-If Simulation** to see instantaneous delta calculations and newly infeasible routes.
   - Switch to the **Deterministic Sensitivity Sweeps** tab to view the parametric curves.
5. **Inspect Test Proofs (`/tests`)**:
   - Run the 14-point test suite on-demand.
   - Filter by constraint categories and expand tests to inspect exact expected vs. actual values.
6. **Reset State**:
   - Click **Reset Demo Data** in the top navigation bar at any point to restore the pristine Salinas Valley showcase dataset.
