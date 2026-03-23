const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const db = require("../database");
const { authMiddleware, apiResponse, apiError } = require("../middleware/auth");

router.use(authMiddleware);

// ============================================================
// HELPERS — Safety Stock & Reorder Point Calculations
// ============================================================
function calcSafetyStock(avgDailyDemand, stdDevDemand, leadTimeDays, serviceLevel = 1.65) {
    // SS = Z × σ × √LT
    return Math.ceil(serviceLevel * stdDevDemand * Math.sqrt(leadTimeDays));
}

function calcReorderPoint(avgDailyDemand, leadTimeDays, safetyStock) {
    // ROP = (Avg Daily Demand × Lead Time) + Safety Stock
    return Math.ceil(avgDailyDemand * leadTimeDays + safetyStock);
}

function getDemandStats(productId, tenantId, days = 30) {
    const movements = db.prepare(`
        SELECT quantity FROM stock_movements 
        WHERE product_id = ? AND tenant_id = ? AND type = 'OUT' 
        AND created_at >= datetime('now', '-${days} days')
    `).all(productId, tenantId);

    if (movements.length === 0) return { avg: 0, std: 0, total: 0 };
    const total = movements.reduce((sum, m) => sum + m.quantity, 0);
    const avg = total / days;
    const variance = movements.reduce((sum, m) => sum + (m.quantity - avg) ** 2, 0) / movements.length;
    return { avg, std: Math.sqrt(variance), total };
}

// ============================================================
// GET /api/v1/inventory — Stock levels overview
// ============================================================
router.get("/", (req, res) => {
    try {
        const { warehouse_id, product_id, low_stock, expiring_soon, dead_stock, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `
            SELECT 
                il.*,
                p.name as product_name, p.sku, p.unit, p.base_price, p.cost_price, p.reorder_point, p.safety_stock, p.lead_time_days,
                p.min_stock, p.max_stock,
                c.name as category_name,
                w.name as warehouse_name, w.city as warehouse_city,
                ROUND(il.quantity * p.cost_price, 2) as stock_value
            FROM inventory_ledgers il
            JOIN products p ON il.product_id = p.id
            LEFT JOIN product_categories c ON p.category_id = c.id
            JOIN warehouses w ON il.warehouse_id = w.id
            WHERE il.tenant_id = ?
        `;
        const params = [req.tenantId];

        if (warehouse_id) { query += ` AND il.warehouse_id = ?`; params.push(warehouse_id); }
        if (product_id) { query += ` AND il.product_id = ?`; params.push(product_id); }
        if (low_stock === "true") query += ` AND il.quantity <= p.reorder_point AND p.reorder_point > 0`;
        if (expiring_soon === "true") query += ` AND il.expiry_date IS NOT NULL AND il.expiry_date <= datetime('now', '+30 days') AND il.quantity > 0`;
        if (dead_stock === "true") query += ` AND il.quantity > 0 AND il.updated_at <= datetime('now', '-90 days')`;

        const countQuery = `SELECT COUNT(*) as count FROM inventory_ledgers il JOIN products p ON il.product_id = p.id JOIN warehouses w ON il.warehouse_id = w.id WHERE il.tenant_id = ?` + (warehouse_id ? ` AND il.warehouse_id = '${warehouse_id}'` : "");
        const total = db.prepare(countQuery).get(req.tenantId).count;

        query += ` ORDER BY il.updated_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const inventory = db.prepare(query).all(...params);

        return apiResponse(res, 200, inventory, "Inventory retrieved successfully", {
            page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)),
        });
    } catch (err) {
        console.error("[Inventory] List error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// GET /api/v1/inventory/summary — Aggregated stock summary
// ============================================================
router.get("/summary", (req, res) => {
    try {
        const totalProducts = db.prepare(`SELECT COUNT(DISTINCT product_id) as count FROM inventory_ledgers WHERE tenant_id = ?`).get(req.tenantId).count;
        const totalStockValue = db.prepare(`SELECT COALESCE(SUM(il.quantity * p.cost_price), 0) as val FROM inventory_ledgers il JOIN products p ON il.product_id = p.id WHERE il.tenant_id = ?`).get(req.tenantId).val;
        const lowStockCount = db.prepare(`SELECT COUNT(*) as count FROM inventory_ledgers il JOIN products p ON il.product_id = p.id WHERE il.tenant_id = ? AND il.quantity <= p.reorder_point AND p.reorder_point > 0`).get(req.tenantId).count;
        const expiringCount = db.prepare(`SELECT COUNT(*) as count FROM inventory_ledgers WHERE tenant_id = ? AND expiry_date IS NOT NULL AND expiry_date <= datetime('now', '+30 days') AND quantity > 0`).get(req.tenantId).count;
        const outOfStockCount = db.prepare(`SELECT COUNT(*) as count FROM inventory_ledgers WHERE tenant_id = ? AND quantity = 0`).get(req.tenantId).count;
        const totalMovementsToday = db.prepare(`SELECT COUNT(*) as count FROM stock_movements WHERE tenant_id = ? AND created_at >= date('now')`).get(req.tenantId).count;

        // Stock by warehouse
        const byWarehouse = db.prepare(`
            SELECT w.name, w.id, SUM(il.quantity) as total_qty, COUNT(DISTINCT il.product_id) as products
            FROM inventory_ledgers il JOIN warehouses w ON il.warehouse_id = w.id
            WHERE il.tenant_id = ? GROUP BY w.id ORDER BY total_qty DESC
        `).all(req.tenantId);

        return apiResponse(res, 200, {
            total_products: totalProducts,
            total_stock_value: Math.round(totalStockValue * 100) / 100,
            low_stock_alerts: lowStockCount,
            expiring_soon: expiringCount,
            out_of_stock: outOfStockCount,
            movements_today: totalMovementsToday,
            by_warehouse: byWarehouse,
        }, "Inventory summary retrieved");
    } catch (err) {
        console.error("[Inventory] Summary error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// POST /api/v1/inventory/adjust — Stock adjustment (IN/OUT/TRANSFER)
// ============================================================
router.post("/adjust", (req, res) => {
    try {
        const {
            product_id, warehouse_id, type, quantity, batch_no, lot_no,
            expiry_date, manufacturing_date, unit_cost, accounting_method,
            notes, to_warehouse_id, reference_type, reference_id
        } = req.body;

        if (!product_id || !warehouse_id || !type || !quantity) {
            return apiError(res, 400, "VALIDATION_ERROR", "product_id, warehouse_id, type, and quantity are required");
        }
        if (!["IN", "OUT", "TRANSFER", "ADJUSTMENT"].includes(type)) {
            return apiError(res, 400, "VALIDATION_ERROR", "type must be IN, OUT, TRANSFER, or ADJUSTMENT");
        }
        if (quantity <= 0) return apiError(res, 400, "VALIDATION_ERROR", "Quantity must be positive");

        // Validate product belongs to tenant
        const product = db.prepare(`SELECT * FROM products WHERE id = ? AND tenant_id = ?`).get(product_id, req.tenantId);
        if (!product) return apiError(res, 404, "NOT_FOUND", "Product not found");

        // Validate warehouse belongs to tenant
        const warehouse = db.prepare(`SELECT * FROM warehouses WHERE id = ? AND tenant_id = ?`).get(warehouse_id, req.tenantId);
        if (!warehouse) return apiError(res, 404, "NOT_FOUND", "Warehouse not found");

        const adjustmentFn = db.transaction(() => {
            if (type === "IN") {
                // Check existing ledger entry
                let ledger = db.prepare(`SELECT * FROM inventory_ledgers WHERE product_id = ? AND warehouse_id = ? AND tenant_id = ? AND (batch_no IS NULL OR batch_no = ?)`).get(product_id, warehouse_id, req.tenantId, batch_no || null);

                if (ledger) {
                    db.prepare(`UPDATE inventory_ledgers SET quantity = quantity + ?, unit_cost = COALESCE(?, unit_cost), updated_at = datetime('now') WHERE id = ?`)
                        .run(quantity, unit_cost, ledger.id);
                } else {
                    const ledgerId = uuidv4();
                    db.prepare(`INSERT INTO inventory_ledgers (id, tenant_id, product_id, warehouse_id, quantity, batch_no, lot_no, expiry_date, manufacturing_date, unit_cost, accounting_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                        .run(ledgerId, req.tenantId, product_id, warehouse_id, quantity, batch_no || null, lot_no || null, expiry_date || null, manufacturing_date || null, unit_cost || product.cost_price, accounting_method || "FIFO");
                    ledger = { id: ledgerId };
                }

                // Movement log
                db.prepare(`INSERT INTO stock_movements (id, tenant_id, ledger_id, product_id, warehouse_id, type, quantity, reference_type, reference_id, notes, performed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                    .run(uuidv4(), req.tenantId, ledger.id, product_id, warehouse_id, "IN", quantity, reference_type || null, reference_id || null, notes || null, req.user.id);

            } else if (type === "OUT") {
                const ledger = db.prepare(`SELECT * FROM inventory_ledgers WHERE product_id = ? AND warehouse_id = ? AND tenant_id = ? AND quantity >= ? LIMIT 1`).get(product_id, warehouse_id, req.tenantId, quantity);
                if (!ledger) return { error: "INSUFFICIENT_STOCK", message: "Not enough stock available" };

                db.prepare(`UPDATE inventory_ledgers SET quantity = quantity - ?, updated_at = datetime('now') WHERE id = ?`).run(quantity, ledger.id);
                db.prepare(`INSERT INTO stock_movements (id, tenant_id, ledger_id, product_id, warehouse_id, type, quantity, reference_type, reference_id, notes, performed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                    .run(uuidv4(), req.tenantId, ledger.id, product_id, warehouse_id, "OUT", quantity, reference_type || null, reference_id || null, notes || null, req.user.id);

                // Check low stock event
                const currentStock = db.prepare(`SELECT SUM(quantity) as total FROM inventory_ledgers WHERE product_id = ? AND tenant_id = ?`).get(product_id, req.tenantId).total || 0;
                if (currentStock <= product.reorder_point && product.reorder_point > 0) {
                    console.log(`[Events] LOW STOCK: ${product.name} — Current: ${currentStock}, Reorder Point: ${product.reorder_point}`);
                }

            } else if (type === "TRANSFER") {
                if (!to_warehouse_id) return { error: "VALIDATION_ERROR", message: "to_warehouse_id is required for TRANSFER" };

                const srcLedger = db.prepare(`SELECT * FROM inventory_ledgers WHERE product_id = ? AND warehouse_id = ? AND tenant_id = ? AND quantity >= ? LIMIT 1`).get(product_id, warehouse_id, req.tenantId, quantity);
                if (!srcLedger) return { error: "INSUFFICIENT_STOCK", message: "Not enough stock in source warehouse" };

                // Deduct from source
                db.prepare(`UPDATE inventory_ledgers SET quantity = quantity - ?, updated_at = datetime('now') WHERE id = ?`).run(quantity, srcLedger.id);

                // Add to destination
                let destLedger = db.prepare(`SELECT * FROM inventory_ledgers WHERE product_id = ? AND warehouse_id = ? AND tenant_id = ? LIMIT 1`).get(product_id, to_warehouse_id, req.tenantId);
                if (destLedger) {
                    db.prepare(`UPDATE inventory_ledgers SET quantity = quantity + ?, updated_at = datetime('now') WHERE id = ?`).run(quantity, destLedger.id);
                } else {
                    const destId = uuidv4();
                    db.prepare(`INSERT INTO inventory_ledgers (id, tenant_id, product_id, warehouse_id, quantity, unit_cost) VALUES (?, ?, ?, ?, ?, ?)`)
                        .run(destId, req.tenantId, product_id, to_warehouse_id, quantity, srcLedger.unit_cost);
                    destLedger = { id: destId };
                }

                // Movement logs: OUT from source, IN to destination
                const mvId = uuidv4();
                db.prepare(`INSERT INTO stock_movements (id, tenant_id, ledger_id, product_id, warehouse_id, type, quantity, reference_type, reference_id, notes, performed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                    .run(mvId, req.tenantId, srcLedger.id, product_id, warehouse_id, "TRANSFER", -quantity, "transfer", mvId, `Transfer to warehouse ${to_warehouse_id}`, req.user.id);
                db.prepare(`INSERT INTO stock_movements (id, tenant_id, ledger_id, product_id, warehouse_id, type, quantity, reference_type, reference_id, notes, performed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                    .run(uuidv4(), req.tenantId, destLedger.id, product_id, to_warehouse_id, "TRANSFER", quantity, "transfer", mvId, `Transfer from warehouse ${warehouse_id}`, req.user.id);

            } else if (type === "ADJUSTMENT") {
                // Direct quantity adjustment (e.g., after physical count)
                let ledger = db.prepare(`SELECT * FROM inventory_ledgers WHERE product_id = ? AND warehouse_id = ? AND tenant_id = ? LIMIT 1`).get(product_id, warehouse_id, req.tenantId);
                const diff = quantity - (ledger ? ledger.quantity : 0);

                if (ledger) {
                    db.prepare(`UPDATE inventory_ledgers SET quantity = ?, updated_at = datetime('now') WHERE id = ?`).run(quantity, ledger.id);
                } else {
                    const ledgerId = uuidv4();
                    db.prepare(`INSERT INTO inventory_ledgers (id, tenant_id, product_id, warehouse_id, quantity, unit_cost) VALUES (?, ?, ?, ?, ?, ?)`)
                        .run(ledgerId, req.tenantId, product_id, warehouse_id, quantity, unit_cost || product.cost_price);
                    ledger = { id: ledgerId };
                }

                db.prepare(`INSERT INTO stock_movements (id, tenant_id, ledger_id, product_id, warehouse_id, type, quantity, notes, performed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                    .run(uuidv4(), req.tenantId, ledger.id, product_id, warehouse_id, "ADJUSTMENT", diff, notes || "Physical count adjustment", req.user.id);
            }

            return { success: true };
        });

        const result = adjustmentFn();
        if (result && result.error) {
            return apiError(res, result.error === "INSUFFICIENT_STOCK" ? 422 : 400, result.error, result.message);
        }

        db.prepare(`INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, entity_id, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), req.tenantId, req.user.id, `STOCK_${type}`, "inventory", product_id, req.ip);

        // Return updated stock level
        const updatedStock = db.prepare(`SELECT SUM(quantity) as total FROM inventory_ledgers WHERE product_id = ? AND warehouse_id = ? AND tenant_id = ?`).get(product_id, warehouse_id, req.tenantId).total || 0;
        return apiResponse(res, 200, { type, product_id, warehouse_id, quantity, new_stock_level: updatedStock }, `Stock ${type} recorded successfully`);
    } catch (err) {
        console.error("[Inventory] Adjust error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// GET /api/v1/inventory/movements — Movement history
// ============================================================
router.get("/movements", (req, res) => {
    try {
        const { product_id, warehouse_id, type, page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `
            SELECT sm.*, p.name as product_name, p.sku, w.name as warehouse_name, u.full_name as performed_by_name
            FROM stock_movements sm
            JOIN products p ON sm.product_id = p.id
            JOIN warehouses w ON sm.warehouse_id = w.id
            LEFT JOIN users u ON sm.performed_by = u.id
            WHERE sm.tenant_id = ?
        `;
        const params = [req.tenantId];

        if (product_id) { query += ` AND sm.product_id = ?`; params.push(product_id); }
        if (warehouse_id) { query += ` AND sm.warehouse_id = ?`; params.push(warehouse_id); }
        if (type) { query += ` AND sm.type = ?`; params.push(type); }

        const countQuery = `SELECT COUNT(*) as count FROM stock_movements WHERE tenant_id = ?` + (product_id ? ` AND product_id = '${product_id}'` : "");
        const total = db.prepare(countQuery).get(req.tenantId).count;

        query += ` ORDER BY sm.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const movements = db.prepare(query).all(...params);
        return apiResponse(res, 200, movements, "Movements retrieved successfully", {
            page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)),
        });
    } catch (err) {
        console.error("[Inventory] Movements error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// GET /api/v1/inventory/alerts — Low stock + expiry alerts
// ============================================================
router.get("/alerts", (req, res) => {
    try {
        // Low stock items
        const lowStock = db.prepare(`
            SELECT p.id, p.sku, p.name, p.reorder_point, p.safety_stock, p.lead_time_days,
                SUM(il.quantity) as current_stock, w.name as warehouse_name
            FROM inventory_ledgers il
            JOIN products p ON il.product_id = p.id
            JOIN warehouses w ON il.warehouse_id = w.id
            WHERE il.tenant_id = ? AND p.reorder_point > 0
            GROUP BY p.id, il.warehouse_id
            HAVING current_stock <= p.reorder_point
            ORDER BY (current_stock - p.reorder_point) ASC
            LIMIT 20
        `).all(req.tenantId);

        // Expiring soon (within 30 days)
        const expiringSoon = db.prepare(`
            SELECT il.*, p.name as product_name, p.sku, w.name as warehouse_name,
                CAST(julianday(il.expiry_date) - julianday('now') AS INTEGER) as days_to_expiry
            FROM inventory_ledgers il
            JOIN products p ON il.product_id = p.id
            JOIN warehouses w ON il.warehouse_id = w.id
            WHERE il.tenant_id = ? AND il.expiry_date IS NOT NULL AND il.expiry_date <= datetime('now', '+30 days') AND il.quantity > 0
            ORDER BY il.expiry_date ASC
            LIMIT 20
        `).all(req.tenantId);

        // Dead stock (no movement for 90 days)
        const deadStock = db.prepare(`
            SELECT il.*, p.name as product_name, p.sku, w.name as warehouse_name,
                ROUND(il.quantity * p.cost_price, 2) as stock_value
            FROM inventory_ledgers il
            JOIN products p ON il.product_id = p.id
            JOIN warehouses w ON il.warehouse_id = w.id
            WHERE il.tenant_id = ? AND il.quantity > 0 AND il.updated_at <= datetime('now', '-90 days')
            LIMIT 20
        `).all(req.tenantId);

        return apiResponse(res, 200, {
            low_stock: lowStock,
            expiring_soon: expiringSoon,
            dead_stock: deadStock,
            summary: {
                low_stock_count: lowStock.length,
                expiring_soon_count: expiringSoon.length,
                dead_stock_count: deadStock.length,
            }
        }, "Alerts retrieved successfully");
    } catch (err) {
        console.error("[Inventory] Alerts error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// GET /api/v1/inventory/batches — Batch/Lot tracking
// ============================================================
router.get("/batches", (req, res) => {
    try {
        const { warehouse_id, product_id } = req.query;
        let query = `
            SELECT il.*, p.name as product_name, p.sku, w.name as warehouse_name
            FROM inventory_ledgers il
            JOIN products p ON il.product_id = p.id
            JOIN warehouses w ON il.warehouse_id = w.id
            WHERE il.tenant_id = ? AND il.batch_no IS NOT NULL
        `;
        const params = [req.tenantId];
        if (warehouse_id) { query += ` AND il.warehouse_id = ?`; params.push(warehouse_id); }
        if (product_id) { query += ` AND il.product_id = ?`; params.push(product_id); }
        query += ` ORDER BY il.expiry_date ASC`;

        const batches = db.prepare(query).all(...params);
        return apiResponse(res, 200, batches, "Batches retrieved successfully");
    } catch (err) {
        console.error("[Inventory] Batches error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// GET /api/v1/inventory/calculations/:productId — Calculate SS & ROP
// ============================================================
router.get("/calculations/:productId", (req, res) => {
    try {
        const product = db.prepare(`SELECT * FROM products WHERE id = ? AND tenant_id = ?`).get(req.params.productId, req.tenantId);
        if (!product) return apiError(res, 404, "NOT_FOUND", "Product not found");

        const { avg, std, total } = getDemandStats(req.params.productId, req.tenantId, 30);
        const safetyStock = calcSafetyStock(avg, std, product.lead_time_days);
        const reorderPoint = calcReorderPoint(avg, product.lead_time_days, safetyStock);

        // Auto-update product if values are calculated
        if (safetyStock > 0 && reorderPoint > 0) {
            db.prepare(`UPDATE products SET safety_stock = ?, reorder_point = ? WHERE id = ?`).run(safetyStock, reorderPoint, req.params.productId);
        }

        return apiResponse(res, 200, {
            product_id: req.params.productId,
            product_name: product.name,
            avg_daily_demand: Math.round(avg * 100) / 100,
            demand_std_dev: Math.round(std * 100) / 100,
            lead_time_days: product.lead_time_days,
            calculated_safety_stock: safetyStock,
            calculated_reorder_point: reorderPoint,
            current_safety_stock: product.safety_stock,
            current_reorder_point: product.reorder_point,
            demand_data_days: 30,
            total_outbound: total,
        }, "Safety stock and reorder point calculated");
    } catch (err) {
        console.error("[Inventory] Calculations error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

module.exports = router;
