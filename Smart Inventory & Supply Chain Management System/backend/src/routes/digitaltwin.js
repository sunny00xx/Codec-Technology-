const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const db = require("../database");
const { authMiddleware, apiResponse, apiError } = require("../middleware/auth");

router.use(authMiddleware);

// ════════════════════════════════════════════════════════════
//  SUPPLY CHAIN GRAPH MODEL
// ════════════════════════════════════════════════════════════

// ── GET /graph ── Build the supply chain as nodes + edges ─────
router.get("/graph", (req, res) => {
    try {
        const tid = req.tenantId;
        const nodes = [];
        const edges = [];

        // Warehouses as nodes
        const warehouses = db.prepare(`SELECT id, name, city, capacity FROM warehouses WHERE tenant_id = ?`).all(tid);
        for (const w of warehouses) {
            const used = db.prepare(`SELECT COALESCE(SUM(quantity),0) as u FROM inventory_ledgers WHERE warehouse_id = ?`).get(w.id).u;
            nodes.push({ id: w.id, type: "warehouse", label: w.name, city: w.city, capacity: w.capacity, used, utilization: w.capacity > 0 ? Math.round((used / w.capacity) * 100) : 0 });
        }

        // Suppliers as nodes
        const suppliers = db.prepare(`SELECT id, name, city, status FROM suppliers WHERE tenant_id = ? AND status = 'active'`).all(tid);
        for (const s of suppliers) {
            nodes.push({ id: s.id, type: "supplier", label: s.name, city: s.city });
        }

        // Supplier → Warehouse edges (from POs)
        const poEdges = db.prepare(`
            SELECT DISTINCT po.supplier_id, po.warehouse_id, COUNT(*) as orders, SUM(po.total_amount) as total_value
            FROM purchase_orders po WHERE po.tenant_id = ? AND po.warehouse_id IS NOT NULL
            GROUP BY po.supplier_id, po.warehouse_id
        `).all(tid);
        for (const e of poEdges) {
            edges.push({ source: e.supplier_id, target: e.warehouse_id, type: "supply", weight: e.orders, value: e.total_value });
        }

        // Warehouse → Customer edges (from shipments)
        const shipEdges = db.prepare(`
            SELECT origin_warehouse_id, destination_city, COUNT(*) as shipments
            FROM shipments WHERE tenant_id = ? AND origin_warehouse_id IS NOT NULL
            GROUP BY origin_warehouse_id, destination_city
        `).all(tid);
        for (const e of shipEdges) {
            const custId = `cust_${e.destination_city?.replace(/\s/g, "_")}`;
            if (!nodes.find((n) => n.id === custId)) {
                nodes.push({ id: custId, type: "customer", label: e.destination_city, city: e.destination_city });
            }
            edges.push({ source: e.origin_warehouse_id, target: custId, type: "delivery", weight: e.shipments });
        }

        return apiResponse(res, 200, { nodes, edges, stats: { total_nodes: nodes.length, total_edges: edges.length, warehouses: warehouses.length, suppliers: suppliers.length } }, "Supply chain graph");
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});

// ════════════════════════════════════════════════════════════
//  WHAT-IF SIMULATION ENGINE
// ════════════════════════════════════════════════════════════

router.post("/simulate", (req, res) => {
    try {
        const tid = req.tenantId;
        const body = req.body || {};
        const scenario = body.scenario || "supplier_disruption";
        const parameters = body.parameters || {};
        // scenario: "supplier_disruption" | "demand_spike" | "warehouse_closure" | "route_change"

        const results = { scenario, parameters, impacts: [], recommendations: [], financial_impact: 0, risk_score: 0 };

        if (scenario === "supplier_disruption") {
            let { supplier_id, duration_days = 30 } = parameters || {};
            // Auto-pick first active supplier if none specified
            if (!supplier_id) {
                const first = db.prepare(`SELECT id FROM suppliers WHERE tenant_id = ?`).get(tid);
                if (first) supplier_id = first.id;
            }
            const supplier = supplier_id ? db.prepare(`SELECT * FROM suppliers WHERE id = ? AND tenant_id = ?`).get(supplier_id, tid) : null;
            if (!supplier) return apiError(res, 400, "NO_SUPPLIERS", "No active suppliers found for simulation");

            // Find affected POs
            const activePOs = db.prepare(`SELECT * FROM purchase_orders WHERE supplier_id = ? AND tenant_id = ? AND status NOT IN ('received','cancelled')`).all(supplier_id, tid);
            const poValue = activePOs.reduce((s, po) => s + (po.total_amount || 0), 0);

            // Find products only from this supplier
            const affectedProducts = db.prepare(`
                SELECT DISTINCT p.id, p.name, p.sku FROM products p
                JOIN purchase_order_items poi ON poi.product_id = p.id
                JOIN purchase_orders po ON poi.po_id = po.id
                WHERE po.supplier_id = ? AND po.tenant_id = ?
            `).all(supplier_id, tid);

            // Find alternative suppliers
            const altSuppliers = db.prepare(`SELECT id, name FROM suppliers WHERE tenant_id = ? AND id != ? AND status = 'active' LIMIT 3`).all(tid, supplier_id);

            results.impacts = [
                { type: "delayed_orders", description: `${activePOs.length} active POs worth $${poValue.toFixed(0)} will be delayed`, severity: "high", value: poValue },
                { type: "affected_products", description: `${affectedProducts.length} products may face stockout`, severity: affectedProducts.length > 3 ? "critical" : "medium" },
                { type: "recovery_time", description: `Estimated ${duration_days + 14} days to full recovery`, severity: duration_days > 30 ? "high" : "medium" },
            ];
            results.recommendations = altSuppliers.map((s) => `Switch to ${s.name} as alternative supplier`);
            results.financial_impact = poValue * 1.15; // 15% penalty
            results.risk_score = Math.min(100, Math.round((activePOs.length * 10 + affectedProducts.length * 15 + duration_days) / 2));

        } else if (scenario === "demand_spike") {
            let { product_id, spike_percent = 50 } = parameters || {};
            // Auto-pick first product if none specified
            if (!product_id) {
                const first = db.prepare(`SELECT id FROM products WHERE tenant_id = ? AND is_active = 1 LIMIT 1`).get(tid);
                if (first) product_id = first.id;
            }
            const product = product_id ? db.prepare(`SELECT * FROM products WHERE id = ? AND tenant_id = ?`).get(product_id, tid) : null;
            if (!product) return apiError(res, 400, "NO_PRODUCTS", "No products found for simulation");

            const inventory = db.prepare(`SELECT COALESCE(SUM(quantity),0) as total FROM inventory_ledgers WHERE product_id = ? AND tenant_id = ?`).get(product_id, tid);
            const avgMonthly = db.prepare(`SELECT COALESCE(AVG(qty),0) as avg FROM (SELECT SUM(ABS(quantity)) as qty FROM stock_movements WHERE product_id = ? AND tenant_id = ? AND type = 'OUT' GROUP BY strftime('%Y-%m', created_at))`).get(product_id, tid);
            const spikedDemand = Math.round((avgMonthly.avg || 0) * (1 + spike_percent / 100));
            const stockDays = spikedDemand > 0 ? Math.round((inventory.total || 0) / (spikedDemand / 30)) : 999;

            results.impacts = [
                { type: "stock_depletion", description: `Current stock (${inventory.total || 0}) will last ~${stockDays} days at +${spike_percent}% demand`, severity: stockDays < 14 ? "critical" : stockDays < 30 ? "high" : "medium" },
                { type: "reorder_needed", description: `Need to order ${Math.max(0, spikedDemand - (inventory.total || 0))} additional units`, severity: "medium" },
            ];
            results.recommendations = [`Increase safety stock to ${Math.round(spikedDemand * 1.5)} units`, `Expedite pending POs for ${product.name}`, `Consider alternative suppliers for faster delivery`];
            results.financial_impact = Math.max(0, spikedDemand - (inventory.total || 0)) * (product.cost_price || 10);
            results.risk_score = Math.min(100, Math.round(100 - stockDays * 2));

        } else if (scenario === "warehouse_closure") {
            let { warehouse_id } = parameters || {};
            // Auto-pick first warehouse if none specified
            if (!warehouse_id) {
                const first = db.prepare(`SELECT id FROM warehouses WHERE tenant_id = ? AND is_active = 1 LIMIT 1`).get(tid);
                if (first) warehouse_id = first.id;
            }
            const warehouse = warehouse_id ? db.prepare(`SELECT * FROM warehouses WHERE id = ? AND tenant_id = ?`).get(warehouse_id, tid) : null;
            if (!warehouse) return apiError(res, 400, "NO_WAREHOUSES", "No warehouses found for simulation");

            const stockInWH = db.prepare(`SELECT COALESCE(SUM(quantity),0) as total FROM inventory_ledgers WHERE warehouse_id = ?`).get(warehouse_id);
            const productCount = db.prepare(`SELECT COUNT(DISTINCT product_id) as c FROM inventory_ledgers WHERE warehouse_id = ? AND quantity > 0`).get(warehouse_id);
            const otherWarehouses = db.prepare(`SELECT id, name, capacity FROM warehouses WHERE tenant_id = ? AND id != ?`).all(tid, warehouse_id);
            const totalCapacity = otherWarehouses.reduce((s, w) => s + (w.capacity || 0), 0);

            results.impacts = [
                { type: "stock_displacement", description: `${stockInWH.total} units across ${productCount.c} products need relocation`, severity: "critical" },
                { type: "capacity_check", description: `Other warehouses have ${totalCapacity} total capacity`, severity: totalCapacity > stockInWH.total ? "low" : "critical" },
            ];
            results.recommendations = otherWarehouses.map((w) => `Transfer stock to ${w.name} (Capacity: ${w.capacity})`);
            results.financial_impact = stockInWH.total * 2; // $2/unit transfer cost
            results.risk_score = totalCapacity > stockInWH.total ? 40 : 85;

        } else {
            return apiError(res, 400, "INVALID_SCENARIO", "Supported: supplier_disruption, demand_spike, warehouse_closure");
        }

        return apiResponse(res, 200, results, "Simulation complete");
    } catch (err) { console.error("[DigitalTwin] Simulate error:", err); return apiError(res, 500, "SERVER_ERROR", err.message); }
});

// ════════════════════════════════════════════════════════════
//  MONTE CARLO RISK ASSESSMENT
// ════════════════════════════════════════════════════════════

router.get("/risk-assessment", (req, res) => {
    try {
        const tid = req.tenantId;
        const iterations = 1000;

        // Gather data
        const suppliers = db.prepare(`SELECT name FROM suppliers WHERE tenant_id = ? AND status = 'active'`).all(tid);
        const avgRating = 3; // default
        const avgLead = 14;  // default

        const inventory = db.prepare(`SELECT COALESCE(SUM(quantity),0) as total FROM inventory_ledgers WHERE tenant_id = ?`).get(tid);
        const totalLedgers = db.prepare(`SELECT COUNT(*) as c FROM inventory_ledgers WHERE tenant_id = ?`).get(tid).c;
        const lowStockCount = db.prepare(`SELECT COUNT(*) as c FROM inventory_ledgers il JOIN products p ON il.product_id = p.id WHERE il.tenant_id = ? AND il.quantity <= p.reorder_point`).get(tid).c;
        const lowStockPct = totalLedgers > 0 ? lowStockCount / totalLedgers : 0;

        // Run Monte Carlo
        const results = [];
        for (let i = 0; i < iterations; i++) {
            const supplierDisruption = Math.random() < 0.05; // 5% chance
            const demandSpike = Math.random() < 0.15; // 15% chance
            const leadTimeVariance = 1 + (Math.random() - 0.5) * 0.4; // ±20%
            const qualityIssue = Math.random() < 0.03; // 3% chance

            let riskScore = 0;
            if (supplierDisruption) riskScore += 30;
            if (demandSpike) riskScore += 20;
            if (qualityIssue) riskScore += 15;
            riskScore += lowStockPct * 25;
            riskScore += Math.max(0, (avgLead * leadTimeVariance - 14)) * 2;
            riskScore += Math.max(0, (3 - avgRating)) * 10;
            results.push(Math.min(100, Math.round(riskScore)));
        }

        results.sort((a, b) => a - b);
        const mean = Math.round(results.reduce((a, b) => a + b, 0) / iterations);
        const p50 = results[Math.floor(iterations * 0.5)];
        const p75 = results[Math.floor(iterations * 0.75)];
        const p95 = results[Math.floor(iterations * 0.95)];
        const p99 = results[Math.floor(iterations * 0.99)];

        // Distribution buckets
        const distribution = [
            { range: "0-20", label: "Low Risk", count: results.filter((r) => r <= 20).length, color: "#34d399" },
            { range: "21-40", label: "Moderate", count: results.filter((r) => r > 20 && r <= 40).length, color: "#fbbf24" },
            { range: "41-60", label: "Elevated", count: results.filter((r) => r > 40 && r <= 60).length, color: "#fb923c" },
            { range: "61-80", label: "High", count: results.filter((r) => r > 60 && r <= 80).length, color: "#f87171" },
            { range: "81-100", label: "Critical", count: results.filter((r) => r > 80).length, color: "#ef4444" },
        ];

        return apiResponse(res, 200, {
            iterations, mean, percentiles: { p50, p75, p95, p99 }, distribution,
            inputs: { avg_supplier_rating: +avgRating.toFixed(2), avg_lead_time: Math.round(avgLead), low_stock_ratio: +(lowStockPct * 100).toFixed(1), total_inventory: inventory.total },
            overall_risk: mean <= 25 ? "LOW" : mean <= 45 ? "MODERATE" : mean <= 65 ? "ELEVATED" : "HIGH",
        }, "Monte Carlo risk assessment");
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});

// ════════════════════════════════════════════════════════════
//  DYNAMIC PRICING
// ════════════════════════════════════════════════════════════

router.get("/pricing/suggestions", (req, res) => {
    try {
        const tid = req.tenantId;
        const suggestions = [];

        // Scarcity pricing — low stock items
        const scarce = db.prepare(`
            SELECT p.id, p.name, p.sku, p.base_price, p.cost_price, il.quantity, p.reorder_point
            FROM inventory_ledgers il JOIN products p ON il.product_id = p.id
            WHERE il.tenant_id = ? AND il.quantity > 0 AND il.quantity <= p.reorder_point
        `).all(tid);
        for (const item of scarce) {
            const ratio = item.reorder_point > 0 ? item.quantity / item.reorder_point : 1;
            const multiplier = +(1 + (1 - ratio) * 0.3).toFixed(3); // up to 30% markup
            if (multiplier > 1.05) {
                suggestions.push({
                    type: "SCARCITY", product_id: item.id, product: item.name, sku: item.sku,
                    current_price: item.base_price || item.cost_price, suggested_price: +((item.base_price || item.cost_price || 0) * multiplier).toFixed(2),
                    multiplier, reason: `Only ${item.quantity}/${item.reorder_point} stock remaining`, priority: "high"
                });
            }
        }

        // Near-expiry discounts (products with expiry data)
        const nearExpiry = db.prepare(`
            SELECT p.id, p.name, p.sku, p.base_price, p.cost_price, il.expiry_date, il.quantity
            FROM inventory_ledgers il JOIN products p ON il.product_id = p.id
            WHERE il.tenant_id = ? AND il.expiry_date IS NOT NULL AND il.expiry_date != '' AND il.quantity > 0
        `).all(tid);
        for (const item of nearExpiry) {
            const daysLeft = Math.floor((new Date(item.expiry_date).getTime() - Date.now()) / 86400000);
            if (daysLeft > 0 && daysLeft <= 60) {
                const discount = daysLeft <= 7 ? 0.5 : daysLeft <= 14 ? 0.35 : daysLeft <= 30 ? 0.2 : 0.1;
                suggestions.push({
                    type: "EXPIRY_DISCOUNT", product_id: item.id, product: item.name, sku: item.sku,
                    current_price: item.base_price || item.cost_price, suggested_price: +((item.base_price || item.cost_price || 0) * (1 - discount)).toFixed(2),
                    discount_pct: Math.round(discount * 100), days_to_expiry: daysLeft, quantity: item.quantity,
                    reason: `Expires in ${daysLeft} days — ${Math.round(discount * 100)}% discount`, priority: daysLeft <= 14 ? "critical" : "medium"
                });
            }
        }

        // Dead stock liquidation — no movement 90+ days
        const deadStock = db.prepare(`
            SELECT p.id, p.name, p.sku, p.base_price, p.cost_price, il.quantity,
                   (SELECT MAX(sm.created_at) FROM stock_movements sm WHERE sm.product_id = p.id) as last_movement
            FROM products p JOIN inventory_ledgers il ON il.product_id = p.id
            WHERE il.tenant_id = ? AND il.quantity > 0
        `).all(tid);
        for (const item of deadStock) {
            if (!item.last_movement) continue;
            const daysSince = Math.floor((Date.now() - new Date(item.last_movement).getTime()) / 86400000);
            if (daysSince > 90) {
                const discount = daysSince > 180 ? 0.6 : daysSince > 120 ? 0.4 : 0.25;
                suggestions.push({
                    type: "DEAD_STOCK", product_id: item.id, product: item.name, sku: item.sku,
                    current_price: item.base_price || item.cost_price, suggested_price: +((item.base_price || item.cost_price || 0) * (1 - discount)).toFixed(2),
                    discount_pct: Math.round(discount * 100), days_stale: daysSince, quantity: item.quantity,
                    reason: `No movement for ${daysSince} days — liquidation pricing`, priority: daysSince > 180 ? "high" : "medium"
                });
            }
        }

        suggestions.sort((a, b) => (a.priority === "critical" ? 0 : a.priority === "high" ? 1 : 2) - (b.priority === "critical" ? 0 : b.priority === "high" ? 1 : 2));

        return apiResponse(res, 200, {
            suggestions,
            summary: {
                total: suggestions.length, scarcity: suggestions.filter((s) => s.type === "SCARCITY").length,
                expiry: suggestions.filter((s) => s.type === "EXPIRY_DISCOUNT").length, dead_stock: suggestions.filter((s) => s.type === "DEAD_STOCK").length,
            }
        }, "Pricing suggestions");
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});

module.exports = router;
