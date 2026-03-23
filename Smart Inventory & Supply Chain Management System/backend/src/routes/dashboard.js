const express = require("express");
const db = require("../database");
const { authMiddleware, apiResponse, apiError } = require("../middleware/auth");

const router = express.Router();

// ============================================================
// GET /api/v1/dashboard/stats — Dashboard KPI statistics
// ============================================================
router.get("/stats", authMiddleware, (req, res) => {
    try {
        const tenantId = req.tenantId;

        // Total products
        const products = db.prepare(
            "SELECT COUNT(*) as count FROM products WHERE tenant_id = ? AND is_active = 1"
        ).get(tenantId);

        // Total warehouses
        const warehouses = db.prepare(
            "SELECT COUNT(*) as count FROM warehouses WHERE tenant_id = ? AND is_active = 1"
        ).get(tenantId);

        // Active purchase orders
        const activeOrders = db.prepare(
            "SELECT COUNT(*) as count FROM purchase_orders WHERE tenant_id = ? AND status IN ('pending', 'approved', 'ordered')"
        ).get(tenantId);

        // In-transit shipments
        const inTransit = db.prepare(
            "SELECT COUNT(*) as count FROM shipments WHERE tenant_id = ? AND status = 'in_transit'"
        ).get(tenantId);

        // Low stock items
        const lowStock = db.prepare(`
      SELECT COUNT(*) as count FROM inventory_ledgers il
      JOIN products p ON il.product_id = p.id
      WHERE il.tenant_id = ? AND il.quantity <= p.reorder_point AND p.reorder_point > 0
    `).get(tenantId);

        // Total suppliers
        const suppliers = db.prepare(
            "SELECT COUNT(*) as count FROM suppliers WHERE tenant_id = ? AND status = 'active'"
        ).get(tenantId);

        // Total inventory value
        const inventoryValue = db.prepare(`
      SELECT COALESCE(SUM(il.quantity * il.unit_cost), 0) as total
      FROM inventory_ledgers il
      WHERE il.tenant_id = ?
    `).get(tenantId);

        // Recent movements count (last 24h)
        const recentMovements = db.prepare(`
      SELECT COUNT(*) as count FROM stock_movements
      WHERE tenant_id = ? AND created_at >= datetime('now', '-1 day')
    `).get(tenantId);

        // Warehouse utilization
        const warehouseUtilization = db.prepare(`
      SELECT w.id, w.name, w.city, w.capacity, w.current_utilization
      FROM warehouses w
      WHERE w.tenant_id = ? AND w.is_active = 1
      ORDER BY w.current_utilization DESC
      LIMIT 5
    `).all(tenantId);

        // Recent audit logs
        const recentActivity = db.prepare(`
      SELECT al.action, al.entity, al.created_at, u.full_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.tenant_id = ?
      ORDER BY al.created_at DESC
      LIMIT 10
    `).all(tenantId);

        return apiResponse(res, 200, {
            kpis: {
                totalProducts: products.count,
                totalWarehouses: warehouses.count,
                activeOrders: activeOrders.count,
                inTransitShipments: inTransit.count,
                lowStockItems: lowStock.count,
                activeSuppliers: suppliers.count,
                inventoryValue: inventoryValue.total,
                recentMovements: recentMovements.count,
            },
            warehouseUtilization,
            recentActivity,
        }, "Dashboard stats fetched");
    } catch (err) {
        console.error("[Dashboard] Stats error:", err);
        return apiError(res, 500, "INTERNAL_ERROR", "Failed to fetch dashboard stats");
    }
});

module.exports = router;
