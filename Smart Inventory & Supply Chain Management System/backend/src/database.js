const initSqlJs = require("sql.js");
const path = require("path");
const fs = require("fs");

const DB_PATH = path.join(__dirname, "..", "data", "nexusflow.db");

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// ── sql.js → better-sqlite3 compatibility wrapper ────────────
// All route files use: db.prepare(sql).get(...) / .all(...) / .run(...)
// This wrapper matches that API so nothing else needs changing.

let rawDb = null;
let saveTimer = null;

function saveToDisk() {
  if (!rawDb) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const data = rawDb.export();
      fs.writeFileSync(DB_PATH, Buffer.from(data));
    } catch (e) { console.error("[DB] Save error:", e.message); }
    saveTimer = null;
  }, 50);
}

function createStatement(sql) {
  return {
    run(...params) {
      const stmt = rawDb.prepare(sql);
      if (params.length > 0) stmt.bind(params);
      stmt.step();
      stmt.free();
      saveToDisk();
      return { changes: rawDb.getRowsModified(), lastInsertRowid: 0 };
    },
    get(...params) {
      const stmt = rawDb.prepare(sql);
      if (params.length > 0) stmt.bind(params);
      const hasRow = stmt.step();
      if (!hasRow) { stmt.free(); return undefined; }
      const cols = stmt.getColumnNames();
      const vals = stmt.get();
      stmt.free();
      const row = {};
      for (let i = 0; i < cols.length; i++) row[cols[i]] = vals[i];
      return row;
    },
    all(...params) {
      const stmt = rawDb.prepare(sql);
      if (params.length > 0) stmt.bind(params);
      const rows = [];
      const cols = stmt.getColumnNames();
      while (stmt.step()) {
        const vals = stmt.get();
        const row = {};
        for (let i = 0; i < cols.length; i++) row[cols[i]] = vals[i];
        rows.push(row);
      }
      stmt.free();
      return rows;
    }
  };
}

// The db proxy object — exported immediately, usable after init()
const db = {
  prepare(sql) { return createStatement(sql); },
  exec(sql) { rawDb.run(sql); saveToDisk(); },
  pragma() { /* no-op for sql.js */ },
  close() { if (rawDb) { saveToDisk(); rawDb.close(); } },
  transaction(fn) {
    return (...args) => {
      rawDb.run("BEGIN TRANSACTION");
      try {
        const result = fn(...args);
        rawDb.run("COMMIT");
        saveToDisk();
        return result;
      } catch (err) {
        rawDb.run("ROLLBACK");
        saveToDisk();
        throw err;
      }
    };
  },
  _initPromise: null,
};

// ── SCHEMA SQL ───────────────────────────────────────────────
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
    plan TEXT DEFAULT 'starter', settings TEXT DEFAULT '{}', logo_url TEXT,
    primary_color TEXT DEFAULT '#6366f1', timezone TEXT DEFAULT 'UTC',
    currency TEXT DEFAULT 'USD', is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL,
    description TEXT, permissions TEXT DEFAULT '{}', is_system INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, role_id TEXT,
    email TEXT NOT NULL, password_hash TEXT NOT NULL, full_name TEXT NOT NULL,
    phone TEXT, avatar_url TEXT, is_active INTEGER DEFAULT 1, last_login TEXT,
    refresh_token TEXT, created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id), UNIQUE(email, tenant_id)
  );
  CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL, code TEXT,
    address TEXT, city TEXT, state TEXT, country TEXT, zip_code TEXT,
    latitude REAL, longitude REAL, region TEXT, capacity INTEGER DEFAULT 0,
    current_utilization REAL DEFAULT 0, manager_id TEXT, is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (manager_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS warehouse_zones (
    id TEXT PRIMARY KEY, warehouse_id TEXT NOT NULL, name TEXT NOT NULL,
    type TEXT DEFAULT 'general', capacity INTEGER DEFAULT 0,
    temperature_min REAL, temperature_max REAL, created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS shelf_locations (
    id TEXT PRIMARY KEY, zone_id TEXT NOT NULL, aisle TEXT, rack TEXT,
    shelf TEXT, bin TEXT, capacity INTEGER DEFAULT 0, is_occupied INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (zone_id) REFERENCES warehouse_zones(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS product_categories (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL,
    parent_id TEXT, description TEXT, created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES product_categories(id)
  );
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, category_id TEXT,
    sku TEXT NOT NULL, name TEXT NOT NULL, description TEXT,
    unit TEXT DEFAULT 'pcs', base_price REAL DEFAULT 0, cost_price REAL DEFAULT 0,
    weight REAL, dimensions TEXT, image_url TEXT, barcode TEXT,
    min_stock INTEGER DEFAULT 0, max_stock INTEGER DEFAULT 0,
    reorder_point INTEGER DEFAULT 0, safety_stock INTEGER DEFAULT 0,
    lead_time_days INTEGER DEFAULT 7, is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES product_categories(id)
  );
  CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY, product_id TEXT NOT NULL, sku_suffix TEXT,
    attributes TEXT DEFAULT '{}', price_modifier REAL DEFAULT 0, is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS inventory_ledgers (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, product_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL, quantity INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0, batch_no TEXT, lot_no TEXT, serial_no TEXT,
    expiry_date TEXT, manufacturing_date TEXT, unit_cost REAL DEFAULT 0,
    accounting_method TEXT DEFAULT 'FIFO',
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, ledger_id TEXT,
    product_id TEXT NOT NULL, warehouse_id TEXT NOT NULL,
    type TEXT NOT NULL, quantity INTEGER NOT NULL,
    reference_type TEXT, reference_id TEXT, notes TEXT, performed_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (ledger_id) REFERENCES inventory_ledgers(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (performed_by) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL,
    supplier_code TEXT, email TEXT, phone TEXT, address TEXT, city TEXT, 
    state TEXT, country TEXT, contact_person TEXT, website TEXT, 
    payment_terms TEXT, status TEXT DEFAULT 'active', notes TEXT,
    lead_time_days INTEGER DEFAULT 7, contract_start_date TEXT, 
    contract_end_date TEXT, is_active INTEGER DEFAULT 1, 
    is_blacklisted INTEGER DEFAULT 0, blacklist_reason TEXT, 
    rating REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS supplier_scorecards (
    id TEXT PRIMARY KEY, supplier_id TEXT NOT NULL,
    on_time_rate REAL DEFAULT 0, quality_rate REAL DEFAULT 0,
    price_score REAL DEFAULT 0, overall_score REAL DEFAULT 0,
    total_orders INTEGER DEFAULT 0, period TEXT,
    calculated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS purchase_requisitions (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, pr_number TEXT UNIQUE NOT NULL,
    warehouse_id TEXT, requested_by TEXT, approved_by TEXT,
    approved_at TEXT, approval_notes TEXT, status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium', total_quantity INTEGER DEFAULT 0,
    estimated_total REAL DEFAULT 0, notes TEXT, auto_generated INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (requested_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS purchase_requisition_items (
    id TEXT PRIMARY KEY, requisition_id TEXT NOT NULL, product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1, estimated_unit_cost REAL DEFAULT 0, notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (requisition_id) REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
  CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, supplier_id TEXT NOT NULL,
    warehouse_id TEXT, requisition_id TEXT, po_number TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending', order_date TEXT DEFAULT (datetime('now')),
    expected_delivery_date TEXT, actual_delivery_date TEXT,
    payment_terms TEXT DEFAULT 'NET30', subtotal REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0, total_amount REAL DEFAULT 0,
    currency TEXT DEFAULT 'USD', shipping_address TEXT, notes TEXT,
    internal_notes TEXT, created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (requisition_id) REFERENCES purchase_requisitions(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS purchase_order_items (
    id TEXT PRIMARY KEY, po_id TEXT NOT NULL, product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1, unit_price REAL NOT NULL DEFAULT 0,
    line_total REAL DEFAULT 0, quantity_received INTEGER DEFAULT 0, notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
  CREATE TABLE IF NOT EXISTS goods_receipt_notes (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, grn_number TEXT UNIQUE NOT NULL,
    po_id TEXT NOT NULL, supplier_id TEXT, warehouse_id TEXT, received_by TEXT,
    received_date TEXT DEFAULT (datetime('now')), quantity_received INTEGER DEFAULT 0,
    quality_passed INTEGER DEFAULT 0, delivery_note TEXT, vehicle_number TEXT, notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (received_by) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS shipments (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, tracking_number TEXT UNIQUE,
    origin_warehouse_id TEXT, destination_address TEXT, destination_city TEXT,
    destination_state TEXT, destination_country TEXT DEFAULT 'India',
    destination_zip TEXT, recipient_name TEXT, recipient_phone TEXT,
    carrier TEXT, service_type TEXT DEFAULT 'standard',
    status TEXT DEFAULT 'created', estimated_delivery TEXT, actual_delivery TEXT,
    current_location TEXT, current_lat REAL, current_lng REAL,
    weight REAL, dimensions TEXT, pod_collected INTEGER DEFAULT 0,
    notes TEXT, created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (origin_warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS shipment_events (
    id TEXT PRIMARY KEY, shipment_id TEXT NOT NULL, tenant_id TEXT,
    event_type TEXT NOT NULL, status TEXT, description TEXT,
    location TEXT, latitude REAL, longitude REAL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS shipment_exceptions (
    id TEXT PRIMARY KEY, shipment_id TEXT NOT NULL, tenant_id TEXT,
    exception_type TEXT, description TEXT, detected_at TEXT,
    resolved INTEGER DEFAULT 0, resolved_at TEXT, resolution_notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS shipment_gps_logs (
    id TEXT PRIMARY KEY, shipment_id TEXT NOT NULL, latitude REAL NOT NULL,
    longitude REAL NOT NULL, location_name TEXT, speed_kmh REAL,
    recorded_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS shipment_items (
    id TEXT PRIMARY KEY, shipment_id TEXT NOT NULL, product_id TEXT,
    quantity INTEGER DEFAULT 1, description TEXT, created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
  CREATE TABLE IF NOT EXISTS proof_of_delivery (
    id TEXT PRIMARY KEY, shipment_id TEXT NOT NULL, tenant_id TEXT,
    received_by TEXT NOT NULL, signature_url TEXT, image_url TEXT,
    notes TEXT, latitude REAL, longitude REAL,
    delivered_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS event_log (
    id TEXT PRIMARY KEY, tenant_id TEXT, event_type TEXT NOT NULL,
    payload TEXT, created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, user_id TEXT,
    action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT,
    old_values TEXT, new_values TEXT, ip_address TEXT, user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS provenance_ledger (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, block_number INTEGER NOT NULL,
    previous_hash TEXT NOT NULL, hash TEXT NOT NULL,
    entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
    action TEXT NOT NULL, data TEXT DEFAULT '{}', actor TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_warehouses_tenant ON warehouses(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
  CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_ledgers(product_id);
  CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON inventory_ledgers(warehouse_id);
  CREATE INDEX IF NOT EXISTS idx_inventory_tenant ON inventory_ledgers(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_movements_tenant ON stock_movements(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_po_tenant ON purchase_orders(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
  CREATE INDEX IF NOT EXISTS idx_pr_tenant ON purchase_requisitions(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_grn_tenant ON goods_receipt_notes(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_grn_po ON goods_receipt_notes(po_id);
  CREATE INDEX IF NOT EXISTS idx_shipments_tenant ON shipments(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
  CREATE INDEX IF NOT EXISTS idx_shipment_events ON shipment_events(shipment_id);
  CREATE INDEX IF NOT EXISTS idx_shipment_exc ON shipment_exceptions(shipment_id);
  CREATE INDEX IF NOT EXISTS idx_event_log_tenant ON event_log(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_provenance_tenant ON provenance_ledger(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_provenance_entity ON provenance_ledger(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_provenance_hash ON provenance_ledger(hash);
`;

// ── Async initializer ────────────────────────────────────────
db._initPromise = initSqlJs().then((SQL) => {
  try {
    if (fs.existsSync(DB_PATH)) {
      const buf = fs.readFileSync(DB_PATH);
      rawDb = new SQL.Database(buf);
    } else {
      rawDb = new SQL.Database();
    }
  } catch (e) {
    console.error("[DB] Corrupt DB, creating fresh:", e.message);
    rawDb = new SQL.Database();
  }
  rawDb.run("PRAGMA foreign_keys = ON;");

  // Run schema (split by semicolons to avoid sql.js multi-statement issues)
  const statements = SCHEMA_SQL.split(";").map(s => s.trim()).filter(s => s.length > 0);
  for (const stmt of statements) {
    try { rawDb.run(stmt + ";"); } catch (e) { /* table already exists — ignore */ }
  }

  saveToDisk();
  console.log("[DB] Database initialized successfully at:", DB_PATH);
});

module.exports = db;
