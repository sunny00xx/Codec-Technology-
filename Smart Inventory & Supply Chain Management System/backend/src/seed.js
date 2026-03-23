/**
 * Seed script — Creates demo data for development
 * Run: npm run seed
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const db = require("./database");

console.log("[Seed] Waiting for database initialization...");

db._initPromise.then(() => {
  console.log("[Seed] Starting database seeding...");

  // ============================================================
  // Demo Tenant
  // ============================================================
  const tenantId = uuidv4();
  db.prepare(`
  INSERT OR IGNORE INTO tenants (id, name, slug, plan, settings)
  VALUES (?, 'Acme Corporation', 'acme-corp', 'professional', '{"timezone": "Asia/Kolkata", "currency": "INR"}')
`).run(tenantId);

  // ============================================================
  // Roles
  // ============================================================
  const superAdminRoleId = uuidv4();
  const managerRoleId = uuidv4();
  const pickerRoleId = uuidv4();

  db.prepare(`INSERT OR IGNORE INTO roles (id, tenant_id, name, description, permissions, is_system) VALUES (?, ?, 'Super Admin', 'Full access', '{"all": true}', 1)`).run(superAdminRoleId, tenantId);
  db.prepare(`INSERT OR IGNORE INTO roles (id, tenant_id, name, description, permissions) VALUES (?, ?, 'Warehouse Manager', 'Manage warehouse operations', '{"inventory": "full", "procurement": "create"}')`).run(managerRoleId, tenantId);
  db.prepare(`INSERT OR IGNORE INTO roles (id, tenant_id, name, description, permissions) VALUES (?, ?, 'Warehouse Picker', 'Basic inventory read access', '{"inventory": "read"}')`).run(pickerRoleId, tenantId);

  // ============================================================
  // Demo Users
  // ============================================================
  const adminId = uuidv4();
  const managerId = uuidv4();
  const passwordHash = bcrypt.hashSync("admin123", 12);

  db.prepare(`INSERT OR IGNORE INTO users (id, tenant_id, role_id, email, password_hash, full_name) VALUES (?, ?, ?, 'admin@demo.com', ?, 'Alex Johnson')`).run(adminId, tenantId, superAdminRoleId, passwordHash);
  db.prepare(`INSERT OR IGNORE INTO users (id, tenant_id, role_id, email, password_hash, full_name) VALUES (?, ?, ?, 'manager@demo.com', ?, 'Sarah Williams')`).run(managerId, tenantId, managerRoleId, passwordHash);

  // ============================================================
  // Warehouses
  // ============================================================
  const warehouses = [
    { name: "Warehouse Alpha", code: "WH-ALPHA", city: "Mumbai", state: "Maharashtra", country: "India", lat: 19.076, lng: 72.8777, capacity: 10000, utilization: 87 },
    { name: "Warehouse Beta", code: "WH-BETA", city: "Delhi", state: "Delhi", country: "India", lat: 28.7041, lng: 77.1025, capacity: 8000, utilization: 62 },
    { name: "Warehouse Gamma", code: "WH-GAMMA", city: "Bangalore", state: "Karnataka", country: "India", lat: 12.9716, lng: 77.5946, capacity: 12000, utilization: 94 },
    { name: "Warehouse Delta", code: "WH-DELTA", city: "Pune", state: "Maharashtra", country: "India", lat: 18.5204, lng: 73.8567, capacity: 6000, utilization: 45 },
    { name: "Warehouse Epsilon", code: "WH-EPSILON", city: "Hyderabad", state: "Telangana", country: "India", lat: 17.385, lng: 78.4867, capacity: 9000, utilization: 73 },
  ];

  const warehouseIds = [];
  for (const wh of warehouses) {
    const id = uuidv4();
    warehouseIds.push(id);
    db.prepare(`
    INSERT OR IGNORE INTO warehouses (id, tenant_id, name, code, city, state, country, latitude, longitude, capacity, current_utilization, manager_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, tenantId, wh.name, wh.code, wh.city, wh.state, wh.country, wh.lat, wh.lng, wh.capacity, wh.utilization, adminId);
  }

  // ============================================================
  // Warehouse Zones
  // ============================================================
  const zoneTypes = ["general", "cold-storage", "hazmat", "high-value", "bulk"];
  for (const whId of warehouseIds) {
    for (let i = 0; i < 3; i++) {
      const zoneId = uuidv4();
      db.prepare(`
      INSERT OR IGNORE INTO warehouse_zones (id, warehouse_id, name, type, capacity)
      VALUES (?, ?, ?, ?, ?)
    `).run(zoneId, whId, `Zone ${String.fromCharCode(65 + i)}`, zoneTypes[i % zoneTypes.length], 500 + i * 200);

      // Shelf locations in each zone
      for (let a = 1; a <= 2; a++) {
        for (let r = 1; r <= 3; r++) {
          db.prepare(`
          INSERT OR IGNORE INTO shelf_locations (id, zone_id, aisle, rack, shelf, bin, capacity)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), zoneId, `A${a}`, `R${r}`, `S1`, `B${a}${r}`, 50);
        }
      }
    }
  }

  // ============================================================
  // Product Categories
  // ============================================================
  const categories = [
    { name: "Electronics", desc: "Electronic components and devices" },
    { name: "Raw Materials", desc: "Manufacturing raw materials" },
    { name: "Packaging", desc: "Packaging materials and supplies" },
    { name: "Finished Goods", desc: "Ready-to-ship products" },
    { name: "Perishables", desc: "Temperature-sensitive items" },
  ];

  const categoryIds = [];
  for (const cat of categories) {
    const id = uuidv4();
    categoryIds.push(id);
    db.prepare(`
    INSERT OR IGNORE INTO product_categories (id, tenant_id, name, description)
    VALUES (?, ?, ?, ?)
  `).run(id, tenantId, cat.name, cat.desc);
  }

  // ============================================================
  // Products
  // ============================================================
  const products = [
    { name: "Widget-A Pro", sku: "WGT-A-001", category: 0, price: 29.99, cost: 15.50, unit: "pcs", reorder: 100, safety: 50, lead: 7 },
    { name: "Widget-B Standard", sku: "WGT-B-002", category: 0, price: 19.99, cost: 10.00, unit: "pcs", reorder: 200, safety: 80, lead: 5 },
    { name: "Circuit Board X1", sku: "PCB-X1-003", category: 0, price: 45.00, cost: 22.50, unit: "pcs", reorder: 50, safety: 20, lead: 14 },
    { name: "Steel Rod 10mm", sku: "STL-10-004", category: 1, price: 8.50, cost: 4.25, unit: "kg", reorder: 500, safety: 200, lead: 10 },
    { name: "Aluminum Sheet", sku: "ALM-SH-005", category: 1, price: 12.00, cost: 6.00, unit: "sheet", reorder: 300, safety: 100, lead: 12 },
    { name: "Copper Wire 2mm", sku: "CPR-2M-006", category: 1, price: 15.75, cost: 8.00, unit: "meter", reorder: 1000, safety: 400, lead: 8 },
    { name: "Cardboard Box L", sku: "BOX-L-007", category: 2, price: 2.50, cost: 0.80, unit: "pcs", reorder: 2000, safety: 500, lead: 3 },
    { name: "Bubble Wrap Roll", sku: "BWR-R-008", category: 2, price: 18.00, cost: 7.50, unit: "roll", reorder: 100, safety: 30, lead: 5 },
    { name: "Smart Thermostat V2", sku: "SMT-V2-009", category: 3, price: 149.99, cost: 65.00, unit: "pcs", reorder: 30, safety: 10, lead: 21 },
    { name: "LED Panel 60W", sku: "LED-60-010", category: 3, price: 89.00, cost: 38.00, unit: "pcs", reorder: 50, safety: 15, lead: 14 },
    { name: "Organic Solvent 5L", sku: "ORG-5L-011", category: 4, price: 35.00, cost: 18.00, unit: "bottle", reorder: 50, safety: 20, lead: 7 },
    { name: "Thermal Paste TG7", sku: "TPG-7-012", category: 4, price: 12.99, cost: 5.50, unit: "tube", reorder: 100, safety: 30, lead: 5 },
  ];

  const productIds = [];
  for (const p of products) {
    const id = uuidv4();
    productIds.push(id);
    db.prepare(`
    INSERT OR IGNORE INTO products (id, tenant_id, category_id, sku, name, unit, base_price, cost_price, reorder_point, safety_stock, lead_time_days)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, tenantId, categoryIds[p.category], p.sku, p.name, p.unit, p.price, p.cost, p.reorder, p.safety, p.lead);
  }

  // ============================================================
  // Inventory Ledgers — Stock for each product in random warehouses
  // ============================================================
  for (const productId of productIds) {
    const numWarehouses = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numWarehouses; i++) {
      const whId = warehouseIds[Math.floor(Math.random() * warehouseIds.length)];
      const qty = Math.floor(Math.random() * 500) + 10;
      const product = db.prepare("SELECT cost_price FROM products WHERE id = ?").get(productId);

      db.prepare(`
      INSERT OR IGNORE INTO inventory_ledgers (id, tenant_id, product_id, warehouse_id, quantity, unit_cost, batch_no, accounting_method)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'FIFO')
    `).run(uuidv4(), tenantId, productId, whId, qty, product.cost_price, `BATCH-${Date.now().toString(36).toUpperCase()}`);
    }
  }

  // ============================================================
  // Suppliers
  // ============================================================
  const supplierData = [
    { name: "GlobalParts Inc.", email: "sales@globalparts.com", city: "Shanghai", country: "China", contact: "Li Wei" },
    { name: "MegaSupply Corp", email: "orders@megasupply.com", city: "Mumbai", country: "India", contact: "Raj Patel" },
    { name: "EuroParts GmbH", email: "info@europarts.de", city: "Berlin", country: "Germany", contact: "Hans Mueller" },
    { name: "FastLog Materials", email: "procurement@fastlog.com", city: "Tokyo", country: "Japan", contact: "Yuki Tanaka" },
    { name: "SteelWorks Ltd", email: "supply@steelworks.co.uk", city: "London", country: "UK", contact: "James Carter" },
  ];

  for (const s of supplierData) {
    const suppId = uuidv4();
    db.prepare(`
    INSERT OR IGNORE INTO suppliers (id, tenant_id, name, email, city, country, contact_person, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
  `).run(suppId, tenantId, s.name, s.email, s.city, s.country, s.contact);

    // Supplier scorecard
    const onTime = 60 + Math.random() * 40;
    const quality = 70 + Math.random() * 30;
    const price = 50 + Math.random() * 50;
    const overall = (0.5 * onTime + 0.3 * quality + 0.2 * price);

    db.prepare(`
    INSERT OR IGNORE INTO supplier_scorecards (id, supplier_id, on_time_rate, quality_rate, price_score, overall_score, total_orders, period)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Q1-2026')
  `).run(uuidv4(), suppId, onTime.toFixed(1), quality.toFixed(1), price.toFixed(1), overall.toFixed(1), Math.floor(Math.random() * 100) + 10);
  }

  // ============================================================
  // Sample Purchase Orders
  // ============================================================
  const poStatuses = ["draft", "pending", "approved", "ordered", "received", "completed"];
  for (let i = 0; i < 8; i++) {
    db.prepare(`
    INSERT OR IGNORE INTO purchase_orders (id, tenant_id, supplier_id, po_number, status, total_amount, created_by)
    VALUES (?, ?, (SELECT id FROM suppliers WHERE tenant_id = ? LIMIT 1 OFFSET ?), ?, ?, ?, ?)
  `).run(
      uuidv4(), tenantId, tenantId, i % 5,
      `PO-${8280 + i}`,
      poStatuses[i % poStatuses.length],
      Math.floor(Math.random() * 50000) + 1000,
      adminId
    );
  }

  // ============================================================
  // Sample Shipments
  // ============================================================
  const shipmentStatuses = ["created", "packed", "dispatched", "in_transit", "delivered"];
  for (let i = 0; i < 6; i++) {
    db.prepare(`
    INSERT OR IGNORE INTO shipments (id, tenant_id, tracking_number, origin_warehouse_id, destination_city, destination_country, carrier, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
      uuidv4(), tenantId,
      `SHP-${2840 + i}`,
      warehouseIds[i % warehouseIds.length],
      ["Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Lucknow", "Chandigarh"][i],
      "India",
      ["FastLog Express", "SpeedShip", "BlueDart", "DTDC", "FedEx", "DHL"][i],
      shipmentStatuses[i % shipmentStatuses.length],
      adminId
    );
  }

  console.log("[Seed] Database seeding completed successfully!");
  console.log("[Seed] Demo login: admin@demo.com / admin123");

  // Give saveToDisk() 500ms to flush db to disk
  setTimeout(() => {
    process.exit(0);
  }, 500);
}).catch(err => {
  console.error("[Seed] Error during seeding:", err);
  process.exit(1);
});
