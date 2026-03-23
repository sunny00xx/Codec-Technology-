# 🚀 NexusFlow — Smart Inventory & Supply Chain Management System

## Run Guide & Testing Manual

---

## 📋 Prerequisites

| Software | Version | Check Command |
|----------|---------|---------------|
| **Node.js** | 18+ | `node -v` |
| **npm** | 9+ | `npm -v` |
| **Git** | Any | `git --version` |

> **No external databases required!** The backend uses SQLite (via `better-sqlite3`) — the database file is auto-created on first run.

---

## ⚡ Quick Start (2 Terminals)

### Terminal 1 — Backend (Port 4000)

```bash
cd backend
npm install
npm run dev
```

> If `npm run dev` doesn't work, use: `node src/server.js`

You should see:
```
[DB] Database initialized successfully
[Server] NexusFlow API running on port 4000
```

### Terminal 2 — Frontend (Port 3000)

```bash
cd frontend
npm install
npm run dev
```

You should see:
```
▲ Next.js 14.x
- Local:  http://localhost:3000
```

### 🌐 Open the Application

Navigate to **http://localhost:3000** in your browser.

---

## 🔐 First-Time Setup

### 1. Register a New Account
1. Go to **http://localhost:3000/register**
2. Fill in:
   - **Company Name**: e.g., `MyCompany`
   - **Full Name**: e.g., `John Admin`
   - **Email**: e.g., `admin@mycompany.com`
   - **Password**: at least 8 characters
3. Click **Create Account**
4. You'll be automatically redirected to the dashboard

### 2. Login (if already registered)
1. Go to **http://localhost:3000/login**
2. Enter your email and password
3. Click **Sign In**

---

## 🧪 Testing Guide — Feature by Feature

### Phase 1: Dashboard
| Test | Steps | Expected Result |
|------|-------|-----------------|
| Dashboard loads | Login → Dashboard | KPI cards show 0 values |
| Navigation works | Click sidebar links | Pages load without errors |
| User menu | Click avatar top-right | Dropdown shows Settings + Sign Out |
| Mobile sidebar | Resize browser < 1024px | Hamburger menu appears |

---

### Phase 2: Warehouses & Products

#### Warehouses (`/dashboard/warehouses`)
| Test | Steps | Expected Result |
|------|-------|-----------------|
| Create warehouse | Click "Add Warehouse" → Fill form → Submit | Warehouse appears in list |
| Edit warehouse | Click Edit icon on a warehouse | Edit form opens with data |
| Delete warehouse | Click Delete icon → Confirm | Warehouse removed |
| Search | Type in search bar | Filtered results |

#### Products (`/dashboard/products`)
| Test | Steps | Expected Result |
|------|-------|-----------------|
| Create product | Click "Add Product" → Fill name, SKU, cost → Submit | Product appears in table |
| Search & filter | Use search bar and category filter | Filtered results |
| Product detail | Click a product row | Detail modal appears |

#### Inventory (`/dashboard/inventory`)
| Test | Steps | Expected Result |
|------|-------|-----------------|
| View stock levels | Go to Inventory page | Stock cards and table shown |
| Stock adjustment | Click "Adjust Stock" → Fill form | Movement recorded |
| Low stock alerts | Create product with qty below reorder point | Low stock badge shown |

---

### Phase 3: Procurement & Suppliers

#### Suppliers (`/dashboard/suppliers`)
| Test | Steps | Expected Result |
|------|-------|-----------------|
| Add supplier | Click "Add Supplier" → Fill form | Supplier appears with rating |
| Scorecard | Click a supplier row | Scorecard radar chart shown |
| Blacklist | Toggle blacklist on supplier | Status changes |

#### Procurement (`/dashboard/procurement`)
| Test | Steps | Expected Result |
|------|-------|-----------------|
| Create PO | Click "New PO" → Select supplier → Add items → Submit | PO created with status "draft" |
| Approve PO | Click Approve on a draft PO | Status changes to "approved" |
| GRN | Record goods receipt for an approved PO | GRN created, inventory updated |

---

### Phase 4: Shipments & Events

#### Shipments (`/dashboard/shipments`)
| Test | Steps | Expected Result |
|------|-------|-----------------|
| Create shipment | Click "New Shipment" → Fill tracking #, carrier → Submit | Shipment appears as "created" |
| Update status | Click status button → Select next status | Status transitions correctly |
| GPS simulation | Click "Simulate GPS" on an in_transit shipment | 4 GPS waypoints generated |
| Record POD | Click "Record POD" on delivered shipment | POD recorded |
| Live events | Open page and trigger actions | Events appear in left panel |

#### Notifications (Top bar bell icon)
| Test | Steps | Expected Result |
|------|-------|-----------------|
| Notification bell | Click bell icon in header | Dropdown shows notifications |
| Unread count | Trigger shipment events | Badge shows count |
| Mark all read | Click "Mark all read" | Badge disappears |

---

### Phase 5: Analytics & RBAC

#### Analytics (`/dashboard/analytics`)
| Test | Steps | Expected Result |
|------|-------|-----------------|
| KPI cards | Load page | 8 KPI cards with values |
| Inventory health | Check gauge chart | Percentage based on stock |
| Charts populate | Add data (products, shipments) | Charts show data |

#### Reports (`/dashboard/reports`)
| Test | Steps | Expected Result |
|------|-------|-----------------|
| CSV export | Select "Inventory" → Click "Export CSV" | CSV file downloads |
| PDF export | Select any type → Click "Export PDF" | Print dialog opens |
| Date filter | Set From/To dates | Report filtered |
| All report types | Try each: Inventory, Procurement, Movements, Suppliers, Shipments, Audit | All export correctly |

#### Users & Roles (`/dashboard/users`)
| Test | Steps | Expected Result |
|------|-------|-----------------|
| View users | Go to Users tab | Your user appears |
| Create role | Roles tab → "New Role" → Name + permissions → Create | Role card appears |
| Permission matrix | Check/uncheck module permissions | Toggles correctly |
| Assign role | Users tab → Key icon → Select role → Assign | Role updated |
| Audit log | Audit tab | Actions listed with timestamps |

---

### Phase 6: AI & Anomaly Detection

#### AI Forecasting (`/dashboard/forecasting`)
| Test | Steps | Expected Result |
|------|-------|-----------------|
| Forecast overview | Load page with Product stock movement data | Product cards with trend arrows |
| Detail forecast | Click a product card | SVG chart + forecast table opens |
| Accuracy metrics | Check R², MAPE, slope values | Metrics displayed |
| Anomalies tab | Switch to "Anomaly Detection" | Alert cards shown |

> **Tip**: Add 3+ months of stock movements (via Inventory) for a product to see meaningful forecasts.

---

### Phase 7: Digital Twin

#### Digital Twin (`/dashboard/digital-twin`)
| Test | Steps | Expected Result |
|------|-------|-----------------|
| Supply chain graph | Load page | SVG graph with supplier/warehouse/customer nodes |
| Risk score | Check Monte Carlo panel | Risk score with distribution |
| Run simulation | Click "Simulate" → Choose scenario → Run | Impacts + recommendations shown |
| Pricing suggestions | Scroll to pricing section | Cards with price adjustments |

> **Tip**: Add suppliers, warehouses, POs, and shipments first to see a rich graph.

---

### Phase 8: Sustainability

#### Sustainability (`/dashboard/sustainability`)
| Test | Steps | Expected Result |
|------|-------|-----------------|
| Carbon dashboard | Load Carbon tab | Emissions KPIs + gauge |
| Mode breakdown | Check transport modes | Bar chart by mode |
| Offset suggestions | Check trees/solar cards | Values calculated |
| Provenance search | Switch to Provenance → Enter entity ID → Search | Chain timeline shown |
| Create block | Click "Record New Block" → Fill form → Create | Block added to chain |
| Verify hash | Copy a hash → Paste in verify → Click verify | "Verified ✓" shown |

---

## 📁 Project Structure

```
Smart Inventory & Supply Chain Management System/
├── backend/
│   ├── src/
│   │   ├── server.js           # Express server + WebSocket
│   │   ├── database.js         # SQLite schema (auto-creates tables)
│   │   ├── wsHub.js            # WebSocket pub/sub hub
│   │   ├── middleware/
│   │   │   └── auth.js         # JWT auth + response helpers
│   │   └── routes/
│   │       ├── auth.js         # Register, Login, Refresh
│   │       ├── dashboard.js    # Main dashboard stats
│   │       ├── warehouses.js   # Warehouse CRUD
│   │       ├── products.js     # Product CRUD
│   │       ├── inventory.js    # Stock management
│   │       ├── suppliers.js    # Supplier CRUD + scorecard
│   │       ├── procurement.js  # PO/PR/GRN lifecycle
│   │       ├── shipments.js    # Shipment tracking + GPS
│   │       ├── analytics.js    # BI dashboard + CSV export
│   │       ├── rbac.js         # Roles, permissions, users
│   │       ├── ai.js           # Forecasting + anomaly detection
│   │       ├── digitaltwin.js  # Graph, simulation, pricing
│   │       └── sustainability.js # Carbon + provenance
│   ├── data/
│   │   └── nexusflow.db        # SQLite database (auto-created)
│   └── package.json
├── frontend/
│   ├── src/app/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── dashboard/
│   │   │   ├── layout.tsx      # Sidebar + notifications
│   │   │   ├── page.tsx        # Main dashboard
│   │   │   ├── warehouses/
│   │   │   ├── products/
│   │   │   ├── inventory/
│   │   │   ├── procurement/
│   │   │   ├── suppliers/
│   │   │   ├── shipments/
│   │   │   ├── analytics/
│   │   │   ├── reports/
│   │   │   ├── users/
│   │   │   ├── forecasting/
│   │   │   ├── digital-twin/
│   │   │   └── sustainability/
│   │   └── globals.css
│   └── package.json
├── task.md                     # Task checklist (all phases ✅)
├── PRD.md                      # Product requirements
├── implementation_plan.md      # Phase-by-phase plan
└── run.md                      # ← You are here
```

---

## 🔌 API Endpoints Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register tenant + admin |
| POST | `/api/v1/auth/login` | Login → JWT tokens |
| POST | `/api/v1/auth/refresh` | Refresh token |

### Core CRUD
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/warehouses` | List / Create |
| GET/PUT/DELETE | `/api/v1/warehouses/:id` | Read / Update / Delete |
| GET/POST | `/api/v1/products` | List / Create |
| GET/POST | `/api/v1/suppliers` | List / Create |
| GET/POST | `/api/v1/procurement/purchase-orders` | PO management |

### Shipments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/shipments` | List / Create |
| PUT | `/api/v1/shipments/:id/status` | Update lifecycle |
| POST | `/api/v1/shipments/:id/gps/simulate` | GPS simulation |

### Intelligence
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/analytics/dashboard-stats` | BI dashboard data |
| GET | `/api/v1/analytics/reports/csv?type=X` | CSV export |
| GET | `/api/v1/ai/forecast/:productId` | Product forecast |
| GET | `/api/v1/ai/anomalies` | Anomaly detection |

### Digital Twin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/digital-twin/graph` | Supply chain graph |
| POST | `/api/v1/digital-twin/simulate` | What-If simulation |
| GET | `/api/v1/digital-twin/risk-assessment` | Monte Carlo risk |
| GET | `/api/v1/digital-twin/pricing/suggestions` | Dynamic pricing |

### Sustainability
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/sustainability/carbon/dashboard` | Carbon tracker |
| GET | `/api/v1/sustainability/carbon/sku/:id` | SKU carbon |
| POST | `/api/v1/sustainability/provenance/block` | Create block |
| GET | `/api/v1/sustainability/provenance/:type/:id` | Query chain |
| GET | `/api/v1/sustainability/provenance/verify/:hash` | Verify block |

### RBAC
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/rbac/roles` | Role management |
| GET | `/api/v1/rbac/users` | User listing |
| PUT | `/api/v1/rbac/users/:id/role` | Assign role |

---

## 🐛 Troubleshooting

| Issue | Fix |
|-------|-----|
| `PORT 4000 already in use` | Kill the process: `npx kill-port 4000` |
| `PORT 3000 already in use` | Kill the process: `npx kill-port 3000` |
| `better-sqlite3` build error | Run `npm rebuild better-sqlite3` |
| `ws` package not found | Run `npm install ws` in backend/ |
| Frontend shows "Unauthorized" | Token expired — logout and login again |
| Database reset needed | Delete `backend/data/nexusflow.db` and restart |
| CORS errors | Check `FRONTEND_URL` in backend `.env` |

---

## 🌍 Environment Variables

### Backend (`backend/.env`)
```env
PORT=4000
JWT_SECRET=your_super_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:4000/ws
```

---

## ✅ All 8 Phases Complete

| Phase | Features | Status |
|-------|----------|--------|
| 1. Foundation | Auth, DB, multi-tenant, dashboard | 🟢 Done |
| 2. Warehouse & Products | CRUD, inventory, stock movements | 🟢 Done |
| 3. Procurement & Suppliers | PO lifecycle, GRN, supplier scoring | 🟢 Done |
| 4. Shipment & Events | Tracking, GPS, WebSocket, notifications | 🟢 Done |
| 5. BI & RBAC | Analytics charts, roles, permissions, reports | 🟢 Done |
| 6. AI & Anomaly | Demand forecasting, Z-score anomalies | 🟢 Done |
| 7. Digital Twin & Pricing | Graph model, simulation, Monte Carlo, pricing | 🟢 Done |
| 8. Carbon & Polish | Carbon tracker, blockchain provenance | 🟢 Done |
