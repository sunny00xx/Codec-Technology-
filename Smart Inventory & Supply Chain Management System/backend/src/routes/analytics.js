const express = require("express");
const router = express.Router();
const db = require("../database");
const { authMiddleware, apiResponse, apiError } = require("../middleware/auth");

router.use(authMiddleware);

// ── GET /dashboard-stats ─────────────────────────────────────
router.get("/dashboard-stats", (req, res) => {
    try {
        const tid = req.tenantId;
        const { from, to } = req.query;
        const dateFrom = from || new Date(Date.now() - 30 * 86400000).toISOString();
        const dateTo = to || new Date().toISOString();

        // KPI counts
        const totalProducts = db.prepare(`SELECT COUNT(*) as c FROM products WHERE tenant_id = ?`).get(tid).c;
        const totalWarehouses = db.prepare(`SELECT COUNT(*) as c FROM warehouses WHERE tenant_id = ?`).get(tid).c;
        const totalSuppliers = db.prepare(`SELECT COUNT(*) as c FROM suppliers WHERE tenant_id = ?`).get(tid).c;
        const totalShipments = db.prepare(`SELECT COUNT(*) as c FROM shipments WHERE tenant_id = ?`).get(tid).c;

        // Inventory health
        const totalInventory = db.prepare(`SELECT COALESCE(SUM(quantity), 0) as total FROM inventory_ledgers WHERE tenant_id = ?`).get(tid).total;
        const lowStock = db.prepare(`SELECT COUNT(*) as c FROM inventory_ledgers il JOIN products p ON il.product_id = p.id WHERE il.tenant_id = ? AND il.quantity <= p.reorder_point AND il.quantity > 0`).get(tid).c;
        const outOfStock = db.prepare(`SELECT COUNT(*) as c FROM inventory_ledgers WHERE tenant_id = ? AND quantity <= 0`).get(tid).c;
        const healthyStock = totalInventory > 0 ? Math.max(0, totalProducts - lowStock - outOfStock) : 0;
        const inventoryHealth = totalProducts > 0 ? Math.round(((totalProducts - lowStock - outOfStock) / totalProducts) * 100) : 100;

        // Stock value
        const stockValue = db.prepare(`
            SELECT COALESCE(SUM(il.quantity * COALESCE(p.cost_price, 0)), 0) as val
            FROM inventory_ledgers il JOIN products p ON il.product_id = p.id WHERE il.tenant_id = ?
        `).get(tid).val;

        // Monthly stock movements (last 6 months)
        const movements = db.prepare(`
            SELECT strftime('%Y-%m', created_at) as month,
                   SUM(CASE WHEN type = 'IN' THEN quantity ELSE 0 END) as stock_in,
                   SUM(CASE WHEN type = 'OUT' THEN quantity ELSE 0 END) as stock_out
            FROM stock_movements WHERE tenant_id = ? AND created_at >= date('now', '-6 months')
            GROUP BY month ORDER BY month
        `).all(tid);

        // Procurement spend trend (6 months)
        const procurementTrend = db.prepare(`
            SELECT strftime('%Y-%m', created_at) as month, COALESCE(SUM(total_amount), 0) as spend
            FROM purchase_orders WHERE tenant_id = ? AND created_at >= date('now', '-6 months')
            GROUP BY month ORDER BY month
        `).all(tid);

        // Top products by stock movement
        const topSKUs = db.prepare(`
            SELECT p.name, p.sku, SUM(sm.quantity) as total_moved
            FROM stock_movements sm JOIN products p ON sm.product_id = p.id
            WHERE sm.tenant_id = ? AND sm.created_at >= date('now', '-3 months')
            GROUP BY p.id ORDER BY total_moved DESC LIMIT 8
        `).all(tid);

        // Supplier performance
        const supplierPerf = db.prepare(`
            SELECT name, rating as score, lead_time_days
            FROM suppliers WHERE tenant_id = ? AND is_active = 1 ORDER BY rating DESC LIMIT 6
        `).all(tid);

        // Warehouse utilization
        const warehouseUtil = db.prepare(`
            SELECT w.name, w.capacity, COALESCE(SUM(il.quantity), 0) as used
            FROM warehouses w
            LEFT JOIN inventory_ledgers il ON il.warehouse_id = w.id
            WHERE w.tenant_id = ? GROUP BY w.id ORDER BY w.name
        `).all(tid);

        // Shipment status breakdown
        const shipmentStatus = db.prepare(`
            SELECT status, COUNT(*) as count FROM shipments WHERE tenant_id = ? GROUP BY status
        `).all(tid);

        // PO status breakdown
        const poStatus = db.prepare(`
            SELECT status, COUNT(*) as count FROM purchase_orders WHERE tenant_id = ? GROUP BY status
        `).all(tid);

        // Supply-demand gap (compare inbound vs outbound last 6 months)
        const supplyDemand = db.prepare(`
            SELECT strftime('%Y-%m', created_at) as month,
                   SUM(CASE WHEN type = 'IN' THEN quantity ELSE 0 END) as supply,
                   SUM(CASE WHEN type = 'OUT' THEN quantity ELSE 0 END) as demand
            FROM stock_movements WHERE tenant_id = ? AND created_at >= date('now', '-6 months')
            GROUP BY month ORDER BY month
        `).all(tid);

        // KPI sparklines (daily counts for last 14 days)
        const ordersSparkline = db.prepare(`
            SELECT date(created_at) as day, COUNT(*) as count
            FROM purchase_orders WHERE tenant_id = ? AND created_at >= date('now', '-14 days')
            GROUP BY day ORDER BY day
        `).all(tid);

        const shipmentsSparkline = db.prepare(`
            SELECT date(created_at) as day, COUNT(*) as count
            FROM shipments WHERE tenant_id = ? AND created_at >= date('now', '-14 days')
            GROUP BY day ORDER BY day
        `).all(tid);

        return apiResponse(res, 200, {
            kpis: {
                total_products: totalProducts,
                total_warehouses: totalWarehouses,
                total_suppliers: totalSuppliers,
                total_shipments: totalShipments,
                total_inventory: totalInventory,
                stock_value: stockValue,
                low_stock: lowStock,
                out_of_stock: outOfStock,
                healthy_stock: healthyStock,
                inventory_health: inventoryHealth,
            },
            sparklines: { orders: ordersSparkline, shipments: shipmentsSparkline },
            charts: {
                movements,
                procurement_trend: procurementTrend,
                top_skus: topSKUs,
                supplier_performance: supplierPerf,
                warehouse_utilization: warehouseUtil,
                shipment_status: shipmentStatus,
                po_status: poStatus,
                supply_demand: supplyDemand,
            },
        }, "Dashboard stats");
    } catch (err) { console.error("[Analytics]", err); return apiError(res, 500, "SERVER_ERROR", err.message); }
});

// ── GET /reports/csv ─────────────────────────────────────────
router.get("/reports/csv", (req, res) => {
    try {
        const tid = req.tenantId;
        const { type = "inventory", from, to } = req.query;

        let rows = [];
        let headers = [];

        if (type === "inventory") {
            headers = ["Product", "SKU", "Warehouse", "Qty On Hand", "Reorder Point", "Unit Cost", "Stock Value"];
            rows = db.prepare(`
                SELECT p.name, p.sku, w.name as warehouse, il.quantity, p.reorder_point,
                       p.cost_price, (il.quantity * COALESCE(p.cost_price, 0)) as stock_value
                FROM inventory_ledgers il
                JOIN products p ON il.product_id = p.id
                LEFT JOIN warehouses w ON il.warehouse_id = w.id
                WHERE il.tenant_id = ?
                ORDER BY p.name
            `).all(tid);
        } else if (type === "procurement") {
            headers = ["PO Number", "Supplier", "Total Amount", "Status", "Order Date", "Expected Delivery"];
            rows = db.prepare(`
                SELECT po.po_number, s.name as supplier, po.total_amount, po.status, po.order_date, po.expected_delivery_date
                FROM purchase_orders po
                LEFT JOIN suppliers s ON po.supplier_id = s.id
                WHERE po.tenant_id = ? ${from ? `AND po.created_at >= '${from}'` : ""} ${to ? `AND po.created_at <= '${to}'` : ""}
                ORDER BY po.created_at DESC
            `).all(tid);
        } else if (type === "movements") {
            headers = ["Date", "Product", "SKU", "Type", "Quantity", "Reference", "Warehouse"];
            rows = db.prepare(`
                SELECT sm.created_at, p.name, p.sku, sm.type, sm.quantity, sm.reference_id, w.name as warehouse
                FROM stock_movements sm
                JOIN products p ON sm.product_id = p.id
                LEFT JOIN warehouses w ON sm.warehouse_id = w.id
                WHERE sm.tenant_id = ? ${from ? `AND sm.created_at >= '${from}'` : ""} ${to ? `AND sm.created_at <= '${to}'` : ""}
                ORDER BY sm.created_at DESC
            `).all(tid);
        } else if (type === "suppliers") {
            headers = ["Name", "Code", "Rating", "Lead Time", "Payment Terms", "City", "Country", "Blacklisted"];
            rows = db.prepare(`SELECT name, supplier_code, rating, lead_time_days, payment_terms, city, country, is_blacklisted FROM suppliers WHERE tenant_id = ?`).all(tid);
        } else if (type === "shipments") {
            headers = ["Tracking #", "Carrier", "Status", "Destination", "Recipient", "Est. Delivery", "Actual Delivery"];
            rows = db.prepare(`SELECT tracking_number, carrier, status, destination_city, recipient_name, estimated_delivery, actual_delivery FROM shipments WHERE tenant_id = ? ORDER BY created_at DESC`).all(tid);
        } else if (type === "audit") {
            headers = ["Date", "User", "Action", "Entity", "Entity ID"];
            rows = db.prepare(`
                SELECT al.created_at, u.full_name as user_name, al.action, al.entity, al.entity_id
                FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id
                WHERE al.tenant_id = ? ORDER BY al.created_at DESC LIMIT 500
            `).all(tid);
        }

        // Generate CSV
        const csvLines = [headers.join(",")];
        for (const row of rows) {
            const vals = Object.values(row).map((v) => {
                const s = String(v ?? "").replace(/"/g, '""');
                return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
            });
            csvLines.push(vals.join(","));
        }

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${type}_report_${new Date().toISOString().slice(0, 10)}.csv"`);
        return res.send(csvLines.join("\n"));
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});

// ── GET /audit-logs ──────────────────────────────────────────
router.get("/audit-logs", (req, res) => {
    try {
        const { entity, action, user_id, from, to, page = 1, limit = 30 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let q = `SELECT al.*, u.full_name as user_name, u.email as user_email FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id WHERE al.tenant_id = ?`;
        const params = [req.tenantId];
        if (entity) { q += ` AND al.entity = ?`; params.push(entity); }
        if (action) { q += ` AND al.action = ?`; params.push(action); }
        if (user_id) { q += ` AND al.user_id = ?`; params.push(user_id); }
        if (from) { q += ` AND al.created_at >= ?`; params.push(from); }
        if (to) { q += ` AND al.created_at <= ?`; params.push(to); }
        const total = db.prepare(`SELECT COUNT(*) as c FROM audit_logs WHERE tenant_id = ?`).get(req.tenantId).c;
        q += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);
        return apiResponse(res, 200, db.prepare(q).all(...params), "Audit logs", { total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});

module.exports = router;
