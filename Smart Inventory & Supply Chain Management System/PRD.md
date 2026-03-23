# Product Requirements Document (PRD)

**Product Name:** Advanced Smart Inventory & Supply Chain Management System  
**Document Version:** 2.0 (Enterprise Blueprint)  
**Status:** Approved for Architecture Design  
**Date:** February 25, 2026  
**Target Level:** 15/15 (Ultra-Advanced, Enterprise SaaS Blueprint)  
**Authors:** Engineering Team  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Platform Architecture & Tech Stack](#2-platform-architecture--tech-stack)
3. [Core Enterprise Features](#3-core-enterprise-features)
4. [Ultimate Advanced Features](#4-ultimate-advanced-features-level-1515)
5. [Multi-Tenant SaaS Requirements](#5-multi-tenant-saas-requirements)
6. [Database Schema Design](#6-database-schema-design)
7. [API Contract & Endpoint Design](#7-api-contract--endpoint-design)
8. [UI/UX Design Specifications](#8-uiux-design-specifications)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [Implementation Roadmap](#10-implementation-roadmap)

---

## 1. Executive Summary

### 1.1 Product Vision

To build an ultra-advanced, AI-driven, real-time multi-tenant SaaS platform that unifies inventory management, predictive supply chain analytics, automated procurement, and warehouse operations. The platform acts as the "central nervous system" for global logistics operations, capable of independent decision-making and real-time risk mitigation.

### 1.2 Problem Statement

Modern enterprises struggle with:
- **Fragmented Systems:** Inventory, procurement, and logistics are managed in isolated silos.
- **Reactive Decision Making:** Lack of real-time data leads to stockouts, overstocking, and delayed shipments.
- **Supply Chain Opacity:** No end-to-end visibility from raw material sourcing to final delivery.
- **Manual Processes:** Procurement approvals, stock counting, and supplier evaluation are labor-intensive and error-prone.

### 1.3 Target Audience

| Persona | Description | Key Need |
|---------|-------------|----------|
| **Enterprise Retailers** | Managing millions of SKUs across multiple geographical zones | Unified multi-warehouse visibility |
| **3PL Providers** | Third-Party Logistics needing robust tenant tracking | Multi-tenant operational efficiency |
| **Manufacturing Units** | Raw material tracking aligned with dynamic demand | Demand forecasting & auto-procurement |
| **C-Suite Executives** | Strategic decision-makers | BI dashboards & predictive analytics |
| **Warehouse Managers** | Day-to-day warehouse operations | Real-time stock tracking & IoT integration |

### 1.4 Success Metrics (KPIs)

| Metric | Target |
|--------|--------|
| Inventory Accuracy | ≥ 99.5% |
| Stockout Rate Reduction | ≥ 40% |
| Order Fulfillment Time | ≤ 24 hours |
| Procurement Cycle Time | Reduced by 60% |
| System Uptime | 99.9% SLA |
| API Response Time (P95) | ≤ 200ms |
| Concurrent Users | 10,000+ |

---

## 2. Platform Architecture & Tech Stack

### 2.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  Next.js App Router │ React │ Zustand │ Tailwind │ Recharts/D3  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / WSS
┌──────────────────────────▼──────────────────────────────────────┐
│                      API GATEWAY LAYER                           │
│         Rate Limiting │ JWT Auth │ Tenant Resolution             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    BACKEND SERVICES (NestJS)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │Auth Svc  │ │Inventory │ │Procure   │ │Warehouse Mgmt     │  │
│  │& RBAC    │ │Engine    │ │Workflow  │ │& Topology         │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │Supplier  │ │Shipment  │ │Analytics │ │Event Bus          │  │
│  │Intel     │ │Tracker   │ │& BI      │ │(Redis Pub/Sub)    │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                       DATA LAYER                                 │
│  PostgreSQL │ Redis │ TimescaleDB │ S3 (Object Storage)          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Core Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 (App Router) | SSR, Routing, SEO |
| **UI Framework** | React 18 | Component Architecture |
| **State Management** | Zustand | Lightweight global state |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Data Visualization** | Recharts + D3.js | Charts, graphs, dashboards |
| **Backend** | Node.js + NestJS | Enterprise microservice structure |
| **Real-Time** | Socket.io + Redis Pub/Sub | WebSocket events, live updates |
| **Primary Database** | PostgreSQL 16 | Transactional data, RBAC, multi-tenancy |
| **Caching** | Redis 7 | Session cache, event queue, rate limiting |
| **Time-Series DB** | TimescaleDB | Demand tracking, sensor telemetry |
| **ORM** | Prisma | Type-safe database queries |
| **Authentication** | JWT + Refresh Tokens | Stateless auth with rotation |
| **File Storage** | AWS S3 / Local MinIO | Documents, images, reports |
| **API Documentation** | Swagger/OpenAPI 3.0 | Auto-generated API docs |

### 2.3 DevOps & Infrastructure

| Component | Technology |
|-----------|-----------|
| Containerization | Docker + Docker Compose |
| Orchestration | Kubernetes (EKS/GKE) |
| CI/CD | GitHub Actions |
| Monitoring | Prometheus + Grafana |
| Logging | Winston + ELK Stack |
| Security | Helmet, CORS, Rate Limiting, OWASP compliance |

---

## 3. Core Enterprise Features (The Foundation)

### 3.1 Authentication & Multi-Tenancy (Phase 1 — PRIORITY)

#### 3.1.1 User Authentication
- **Registration:** Email/password with email verification.
- **Login:** JWT access token (15 min) + HTTP-only refresh token (7 days).
- **Password Recovery:** Secure reset flow with time-limited tokens.
- **Session Management:** Multiple active sessions with device tracking.
- **2FA/MFA:** TOTP-based (Google Authenticator compatible).

#### 3.1.2 Multi-Tenant Foundation
- Every API request scoped by `tenant_id` extracted from JWT.
- Tenant onboarding: Organization creation → Admin user → Initial configuration.
- Logical tenant isolation via `tenant_id` foreign key on all tables.
- Tenant-specific settings: timezone, currency, locale, branding colors.

#### 3.1.3 Acceptance Criteria
- [ ] User can register, verify email, and login.
- [ ] JWT tokens are issued with tenant context.
- [ ] All API responses are scoped to the authenticated tenant.
- [ ] Refresh token rotation works correctly.
- [ ] Invalid/expired tokens return 401.
- [ ] Rate limiting prevents brute-force attacks.

---

### 3.2 Multi-Warehouse Management & Hierarchy

#### 3.2.1 Warehouse Topology
- **Hierarchy:** Organization → Region → Zone → Warehouse → Aisle → Rack → Shelf → Bin.
- Full CRUD for each level of the hierarchy.
- Visual tree-map representation on the frontend.

#### 3.2.2 Cross-Docking & Transfers
- **Inter-Warehouse Transfers:** Create transfer orders with approval workflow.
- **Smart Routing:** Automated suggestion for optimal source warehouse.
- **Status Tracking:** Pending → Approved → In Transit → Received → Completed.

#### 3.2.3 Geo-Based Optimization
- Assign GPS coordinates to each warehouse.
- Calculate shipping costs and delivery time estimates.
- Recommend fulfillment from the most optimal warehouse.

#### 3.2.4 Acceptance Criteria
- [ ] Full CRUD for warehouse hierarchy (Region → Bin).
- [ ] Transfer orders with multi-step approval workflow.
- [ ] Visual hierarchy tree on the dashboard.
- [ ] Geo-based warehouse recommendation for orders.

---

### 3.3 Real-Time Stock Intelligence Engine

#### 3.3.1 Product & SKU Management
- Product catalog with categories, variants (size, color, etc.).
- Barcode/QR code generation and scanning support.
- Bulk import/export via CSV.

#### 3.3.2 Inventory Tracking
- **Batch/Lot Control:** Track manufacturing date, expiry, and lot numbers.
- **Serial Tracking:** IMEI/Serial number management for high-value items.
- **Shelf-Life Monitoring:** Alerts for items approaching expiry.

#### 3.3.3 Inventory Accounting Methods
- **FIFO** (First-In, First-Out)
- **LIFO** (Last-In, First-Out)
- **FEFO** (First-Expired, First-Out) — critical for perishables.

#### 3.3.4 Auto-Calculations & Alerts
- **Safety Stock:** `SS = Z × σ × √LT` (Z-score × demand std dev × sqrt of lead time).
- **Reorder Point:** `ROP = (Average Daily Demand × Lead Time) + Safety Stock`.
- **Dead Stock Detection:** Items with zero movement for configurable days.
- **Shrinkage Identification:** Delta between expected and actual stock.

#### 3.3.5 Acceptance Criteria
- [ ] Full CRUD for products with category and variant support.
- [ ] Batch/lot and serial number tracking functional.
- [ ] FIFO/LIFO/FEFO accounting calculations correct.
- [ ] Safety stock and reorder point auto-calculated.
- [ ] Real-time stock level updates via WebSocket.

---

### 3.4 Automated Procurement Workflow

#### 3.4.1 No-Touch Procurement Lifecycle
```
Low Stock Detected → Auto Purchase Requisition (PR)
       → Approval Workflow (Manager/Director based on value)
       → Purchase Order (PO) Generated → Supplier Notified (Email/Webhook)
       → Goods Received Note (GRN) on delivery → Stock Updated
```

#### 3.4.2 Core Capabilities
- **Purchase Requisitions (PR):** Auto-generated or manual with line items.
- **Approval Engine:** Configurable multi-level approvals based on PO value thresholds.
- **Purchase Orders (PO):** Auto-generated from approved PRs, sent to suppliers.
- **Goods Received Notes (GRN):** Barcode scanning on receipt, partial delivery support.

#### 3.4.3 Financial Controls
- Price variance flagging: Alert when PO price deviates > 5% from historical average.
- Partial delivery tracking with remaining balance.
- Dynamic supplier price comparison before PO generation.

#### 3.4.4 Acceptance Criteria
- [ ] Auto-PR generation when stock hits reorder point.
- [ ] Multi-level approval workflow configurable per tenant.
- [ ] PO auto-generated and supplier notified.
- [ ] GRN with barcode scanning and partial delivery support.
- [ ] Price variance alerts working correctly.

---

### 3.5 Supplier Intelligence & Risk Scoring

#### 3.5.1 Supplier Scorecard Algorithm
```
Supplier Score = (0.5 × OnTimeDeliveryRate) + (0.3 × QualityAcceptanceRate) + (0.2 × PriceCompetitivenessScore)
```

| Component | Calculation |
|-----------|------------|
| On-Time Rate | `(Orders delivered on time / Total orders) × 100` |
| Quality Rate | `(Accepted units / Total received units) × 100` |
| Price Score | `100 - ((Supplier Price - Lowest Price) / Lowest Price × 100)` |

#### 3.5.2 Automated Actions
- **Green Zone (Score ≥ 80):** Preferred supplier status, auto-PO eligible.
- **Yellow Zone (60-79):** Warning flagged, manual approval required.
- **Red Zone (< 60):** Auto-blacklisted, contracts frozen for review.

#### 3.5.3 Acceptance Criteria
- [ ] Supplier CRUD with scorecard dashboard.
- [ ] Algorithmic score calculation after each GRN.
- [ ] Auto-blacklisting and risk flagging functional.
- [ ] Contract expiry notifications (30/15/7 days).

---

### 3.6 Shipment & Logistics Tracking

#### 3.6.1 Shipment Lifecycle
```
Created → Packed → Dispatched → In Transit → Out for Delivery → Delivered
                                    │
                                    └→ Exception (Delayed / Damaged / Returned)
```

#### 3.6.2 Features
- **Live GPS Tracking:** Simulated real-time location updates.
- **Exception Management:** Auto-detect delays, trigger stakeholder notifications.
- **Proof of Delivery:** Digital signature + photo capture.

#### 3.6.3 Acceptance Criteria
- [ ] Shipment CRUD with full lifecycle management.
- [ ] Real-time status updates via WebSocket.
- [ ] Exception detection and automatic notifications.
- [ ] Shipment history and analytics.

---

### 3.7 Event-Driven Architecture

#### 3.7.1 System Events
| Event Name | Trigger | Action |
|------------|---------|--------|
| `StockLowEvent` | Stock ≤ Reorder Point | Auto-generate PR, notify manager |
| `ShipmentDelayedEvent` | ETA exceeded | Notify customer, flag on dashboard |
| `SupplierLateEvent` | Delivery past due date | Update supplier score, send reminder |
| `IoTTemperatureSpikeEvent` | Temp > threshold | Flag stock as damaged, trigger replacement |
| `PriceVarianceEvent` | PO price > 5% deviation | Alert procurement team |
| `ExpiryApproachingEvent` | Items within 30 days of expiry | Trigger FEFO prioritization |

#### 3.7.2 Implementation
- Redis Pub/Sub for internal event propagation.
- WebSocket broadcast to connected clients for real-time UI updates.
- Event log persistence for audit trail.

---

### 3.8 Financial & Cost Analytics

#### 3.8.1 Key Formulas
| Metric | Formula |
|--------|---------|
| Inventory Turnover | `COGS / Average Inventory Value` |
| Carrying Cost | `(Storage + Insurance + Depreciation + Opportunity Cost) / Total Inventory Value` |
| Landed Cost | `Product Cost + Freight + Customs + Insurance + Handling` |
| Gross Margin | `(Revenue - COGS) / Revenue × 100` |
| EOQ | `√((2 × Annual Demand × Order Cost) / Holding Cost per Unit)` |

#### 3.8.2 ABC/XYZ Classification
- **ABC (Value-Based):** A = top 20% items (80% value), B = next 30%, C = bottom 50%.
- **XYZ (Variability):** X = stable demand, Y = moderate variability, Z = highly unpredictable.

---

### 3.9 Enterprise RBAC & Security

#### 3.9.1 Permission Matrix
| Role | Inventory | Procurement | Suppliers | Reports | Admin |
|------|-----------|-------------|-----------|---------|-------|
| Super Admin | Full | Full | Full | Full | Full |
| Regional Manager | Read/Write | Approve | Read | Full | None |
| Warehouse Manager | Full | Create PR | Read | Own Warehouse | None |
| Warehouse Picker | Read | None | None | None | None |
| Supplier Portal | None | View POs | Own Profile | None | None |

#### 3.9.2 Security Features
- Complete audit trail logging (who, what, when, IP address).
- IP-based access restrictions per tenant.
- Anomaly detection: unusual login patterns, bulk data exports.
- Data encryption at rest (AES-256) and in transit (TLS 1.3).

---

### 3.10 BI Dashboard & Executive Reporting

#### 3.10.1 Dashboard Widgets
| Widget | Data Source | Visualization |
|--------|-----------|---------------|
| Stock Health Index | Inventory Ledger | Gauge + Trend Line |
| Supply-Demand Gap | Forecast vs. Actual | Area Chart |
| Procurement Cost Trends | PO History | Bar Chart |
| Fulfillment Rate | Shipment Data | Donut Chart |
| Top 10 SKUs by Revenue | Sales Data | Horizontal Bar |
| Supplier Performance | Scorecards | Radar Chart |
| Warehouse Utilization | Topology Data | Heat Map |

#### 3.10.2 Report Features
- Scheduled reports (daily, weekly, monthly) via email.
- Export to PDF and CSV.
- Custom date range and drill-down filters.

---

## 4. Ultimate Advanced Features (Level 15/15)

### 4.1 Digital Twin Supply Chain Simulation

**Description:** A mathematical and visual "Digital Twin" of the entire supply chain. Consumes live real-world data and allows executives to run "What-If" crisis simulations.

**Capabilities:**
- "What if the primary manufacturer in Asia goes offline for 14 days?"
- "What if a port strike delays all inbound ship freight by 3 weeks?"
- Visual supply chain graph with animated flow paths.
- Monte Carlo simulation engine for probabilistic risk assessment.

**Outcome:** AI models reroute inventory, suggest alternative suppliers, adjust holding costs, and show immediate financial impact.

**Technical Approach:**
- Graph-based supply chain model stored in PostgreSQL.
- Simulation engine as a dedicated NestJS microservice.
- D3.js force-directed graph for visualization.
- Results cached in Redis for interactive performance.

---

### 4.2 Blockchain-Based Supply Verification & Provenance

**Description:** Immutable ledger ensuring complete transparency and traceability from raw material to final delivery.

**Capabilities:**
- Tokenized asset tracking with permanent batch logging.
- Smart contracts for conditional payment release.
- QR-code based provenance verification for end consumers.

**Technical Approach:**
- Simulated blockchain ledger using PostgreSQL with hash-chain verification.
- SHA-256 block hashing with previous-block reference.
- REST API for provenance queries.

---

### 4.3 AI Anomaly & Fraud Detection Engine

**Description:** ML pipeline for detecting human error, shrinkage, or intentional fraud.

**Capabilities:**
- Abnormal invoice amount detection using statistical Z-score analysis.
- Duplicate vendor detection using fuzzy string matching.
- Ghost inventory detection: correlation of physical scans vs. system records.

**Technical Approach:**
- Statistical anomaly detection (Z-score, IQR method) in Node.js.
- Scheduled batch analysis jobs.
- Alert dashboard with severity levels.

---

### 4.4 Scope 3 Carbon Footprint & Sustainability Tracker

**Description:** ESG engine calculating ecological impact of every shipment and warehouse operation.

**Capabilities:**
- Greenhouse gas emission calculation per shipment route.
- SKU-level carbon attribution.
- Compliance-grade sustainability report generation.

**Formulas:**
- `CO2 Emissions = Distance × Weight × Emission Factor (per transport mode)`
- Transport mode factors: Truck (0.062 kg/ton-km), Ship (0.008), Air (0.602), Rail (0.022).

---

### 4.5 Dynamic Pricing & Yield Management

**Description:** Intelligent pricing algorithm adjusting B2B inventory prices based on real-time scarcity, holding costs, and forecasted demand.

**Capabilities:**
- Scarcity multipliers when stock < safety threshold.
- Auto-discount for near-expiry goods (FEFO).
- Dead stock liquidation pricing.

**Formulas:**
- `Dynamic Price = Base Price × Scarcity Multiplier × Demand Coefficient`
- `Scarcity Multiplier = 1 + ((Safety Stock - Current Stock) / Safety Stock) × Max Markup`

---

## 5. Multi-Tenant SaaS Requirements

### 5.1 Tenant Isolation Strategy
- **Logical Isolation:** `tenant_id` column on all major tables with Row-Level Security (RLS) policies in PostgreSQL.
- **Middleware Enforcement:** NestJS guard extracts `tenant_id` from JWT, injects into every query.
- **Data Guarantee:** No cross-tenant data leakage under any circumstance.

### 5.2 Tenant Onboarding Flow
```
1. Organization Registration → Create tenant record
2. Admin User Creation → Assign Super Admin role
3. Initial Configuration → Timezone, Currency, Locale
4. Warehouse Setup Wizard → First warehouse + zones
5. Invite Team Members → Role assignment
```

### 5.3 Customization Engine
- Per-tenant feature toggles (enable/disable modules).
- White-labeled branding (logo, primary color, custom domain).
- Configurable workflow rules (approval thresholds, notification preferences).

### 5.4 Usage Metering & Billing
- Track: API calls, storage usage, active users, warehouses.
- Stripe integration for subscription management.
- Plan tiers: Starter, Professional, Enterprise.

---

## 6. Database Schema Design

### 6.1 Entity Relationship Summary

```
┌─────────────┐     ┌──────────────┐     ┌───────────────────┐
│  tenants     │────<│  users       │     │  roles            │
│              │     │              │>────│                   │
└─────────────┘     └──────────────┘     └───────────────────┘
       │                                         │
       │            ┌──────────────┐     ┌───────┴───────────┐
       ├───────────<│  warehouses  │     │  permissions      │
       │            └──────────────┘     └───────────────────┘
       │                   │
       │            ┌──────┴───────┐
       │            │warehouse_zones│
       │            └──────┬───────┘
       │            ┌──────┴───────┐
       │            │shelf_locations│
       │            └──────────────┘
       │
       │   ┌────────────────┐    ┌──────────────────┐
       ├──<│  products      │───<│ product_variants  │
       │   └────────────────┘    └──────────────────┘
       │          │
       │   ┌──────┴─────────┐    ┌──────────────────┐
       ├──<│inventory_ledgers│──<│ stock_movements   │
       │   └────────────────┘    └──────────────────┘
       │
       │   ┌────────────────┐    ┌──────────────────┐
       ├──<│  suppliers     │───<│supplier_scorecards│
       │   └────────────────┘    └──────────────────┘
       │
       │   ┌────────────────┐    ┌──────────────────┐
       ├──<│purchase_orders │───<│   po_line_items   │
       │   └────────────────┘    └──────────────────┘
       │
       │   ┌────────────────┐    ┌──────────────────┐
       └──<│  shipments     │───<│ logistics_events  │
           └────────────────┘    └──────────────────┘
```

### 6.2 Core Tables

| Table | Key Columns | Purpose |
|-------|------------|---------|
| `tenants` | id, name, slug, settings, plan, created_at | SaaS tenant root |
| `users` | id, tenant_id, email, password_hash, role_id, is_active | User accounts |
| `roles` | id, tenant_id, name, permissions (JSONB) | RBAC roles |
| `warehouses` | id, tenant_id, name, address, lat, lng, region, capacity | Warehouse registry |
| `warehouse_zones` | id, warehouse_id, name, type (cold/dry/hazmat) | Zone management |
| `shelf_locations` | id, zone_id, aisle, rack, shelf, bin, capacity | Bin-level topology |
| `products` | id, tenant_id, sku, name, category_id, unit, base_price | Product catalog |
| `product_variants` | id, product_id, attributes (JSONB), sku_suffix | Size/color variants |
| `inventory_ledgers` | id, product_id, warehouse_id, quantity, batch_no, expiry_date | Stock state |
| `stock_movements` | id, ledger_id, type (IN/OUT/TRANSFER), quantity, reference | Movement history |
| `suppliers` | id, tenant_id, name, email, phone, address, status | Supplier registry |
| `supplier_scorecards` | id, supplier_id, on_time_rate, quality_rate, price_score, overall_score | Performance tracking |
| `purchase_orders` | id, tenant_id, supplier_id, status, total_amount, approved_by | PO management |
| `po_line_items` | id, po_id, product_id, quantity, unit_price | PO details |
| `grns` | id, po_id, received_by, received_at, notes | Goods received |
| `shipments` | id, tenant_id, origin_warehouse_id, destination, status, tracking_no | Shipment tracking |
| `logistics_events` | id, shipment_id, event_type, location, timestamp | Event log |
| `audit_logs` | id, tenant_id, user_id, action, entity, entity_id, metadata, ip | Security audit |

---

## 7. API Contract & Endpoint Design

### 7.1 Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new organization + admin user |
| POST | `/api/v1/auth/login` | Login, returns JWT + refresh token |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Invalidate refresh token |
| POST | `/api/v1/auth/forgot-password` | Send password reset email |
| POST | `/api/v1/auth/reset-password` | Reset password with token |
| GET  | `/api/v1/auth/me` | Get current user profile |

### 7.2 Core Resource Endpoints

| Module | Endpoints | Methods |
|--------|-----------|---------|
| **Warehouses** | `/api/v1/warehouses` | GET, POST, PUT, DELETE |
| **Zones** | `/api/v1/warehouses/:id/zones` | GET, POST, PUT, DELETE |
| **Products** | `/api/v1/products` | GET, POST, PUT, DELETE |
| **Inventory** | `/api/v1/inventory` | GET, POST (adjust), PUT |
| **Stock Movements** | `/api/v1/inventory/movements` | GET, POST |
| **Suppliers** | `/api/v1/suppliers` | GET, POST, PUT, DELETE |
| **Scorecards** | `/api/v1/suppliers/:id/scorecard` | GET |
| **Purchase Orders** | `/api/v1/purchase-orders` | GET, POST, PUT |
| **GRNs** | `/api/v1/grns` | GET, POST |
| **Shipments** | `/api/v1/shipments` | GET, POST, PUT |
| **Dashboard** | `/api/v1/dashboard/stats` | GET |
| **Reports** | `/api/v1/reports` | GET, POST |
| **Users** | `/api/v1/users` | GET, POST, PUT, DELETE |
| **Roles** | `/api/v1/roles` | GET, POST, PUT, DELETE |
| **Audit Logs** | `/api/v1/audit-logs` | GET |

### 7.3 API Response Format

```json
{
  "success": true,
  "data": { },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "message": "Resources retrieved successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [
      { "field": "email", "message": "Must be a valid email address" }
    ]
  }
}
```

---

## 8. UI/UX Design Specifications

### 8.1 Design System

| Token | Value |
|-------|-------|
| **Primary Color** | `#6366F1` (Indigo 500) |
| **Secondary Color** | `#8B5CF6` (Violet 500) |
| **Success** | `#10B981` (Emerald 500) |
| **Warning** | `#F59E0B` (Amber 500) |
| **Danger** | `#EF4444` (Red 500) |
| **Background (Dark)** | `#0F172A` (Slate 900) |
| **Surface (Dark)** | `#1E293B` (Slate 800) |
| **Font** | Inter (Google Fonts) |
| **Border Radius** | 12px (cards), 8px (buttons), 6px (inputs) |

### 8.2 Page Layout

- **Sidebar Navigation:** Collapsible, icon + label, grouped sections.
- **Top Bar:** Search, notifications bell, user avatar dropdown.
- **Content Area:** Responsive grid, card-based layouts.
- **Dark Mode Default:** Premium dark theme as default, light mode toggle.

### 8.3 Key Pages

| Page | Description |
|------|-------------|
| `/login` | Auth page with organization selection |
| `/dashboard` | Executive overview with KPI widgets |
| `/warehouses` | Warehouse list + hierarchy tree |
| `/products` | Product catalog with filters + bulk actions |
| `/inventory` | Stock levels, movements, alerts |
| `/procurement` | PR/PO lifecycle management |
| `/suppliers` | Supplier list with scorecard views |
| `/shipments` | Tracking with timeline & map |
| `/analytics` | BI charts and reports |
| `/settings` | Org settings, users, roles, billing |

---

## 9. Non-Functional Requirements

### 9.1 Performance
- API P95 response time: ≤ 200ms
- Dashboard load time: ≤ 2 seconds
- Real-time event propagation: ≤ 500ms
- Database query optimization with proper indexing

### 9.2 Scalability
- Horizontal scaling via Kubernetes
- Database connection pooling (pgBouncer)
- Redis cluster for caching layer
- CDN for static assets

### 9.3 Security
- OWASP Top 10 compliance
- SQL injection prevention via parameterized queries (Prisma)
- XSS prevention with Content Security Policy
- CSRF protection with SameSite cookies
- Rate limiting: 100 requests/minute per user

### 9.4 Reliability
- 99.9% uptime SLA
- Automated database backups (daily)
- Graceful degradation when external services fail
- Circuit breaker pattern for microservice communication

---

## 10. Implementation Roadmap

| Phase | Features | Duration |
|-------|----------|----------|
| **Phase 1** | Project Setup, DB Schema, Auth, Multi-Tenancy, Dashboard Shell | Week 1-2 |
| **Phase 2** | Warehouse Management, Product Catalog, Inventory CRUD | Week 3-4 |
| **Phase 3** | Procurement Workflow, Supplier Management, GRN | Week 5-6 |
| **Phase 4** | Shipment Tracking, Event System, WebSocket Integration | Week 7-8 |
| **Phase 5** | BI Dashboard, Analytics, RBAC, Reporting | Week 9-10 |
| **Phase 6** | AI Demand Forecasting, Anomaly Detection | Week 11-12 |
| **Phase 7** | Digital Twin Simulation, Dynamic Pricing | Week 13-14 |
| **Phase 8** | Carbon Tracker, Blockchain Provenance, Polish | Week 15-16 |

---

*End of PRD v2.0*
