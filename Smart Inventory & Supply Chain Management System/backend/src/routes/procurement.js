const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const db = require("../database");
const { authMiddleware, apiResponse, apiError } = require("../middleware/auth");

router.use(authMiddleware);

// ============================================================
// HELPERS
// ============================================================
function poNumber() {
    return `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
}
function prNumber() {
    return `PR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
}
function grnNumber() {
    return `GRN-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
}

// ============================================================
// ─── PURCHASE REQUISITIONS ────────────────────────────────
// ============================================================

// GET /api/v1/procurement/requisitions
router.get("/requisitions", (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let q = `
            SELECT pr.*, u.full_name as requested_by_name, w.name as warehouse_name
            FROM purchase_requisitions pr
            LEFT JOIN users u ON pr.requested_by = u.id
            LEFT JOIN warehouses w ON pr.warehouse_id = w.id
            WHERE pr.tenant_id = ?
        `;
        const params = [req.tenantId];
        if (status) { q += ` AND pr.status = ?`; params.push(status); }

        const total = db.prepare(`SELECT COUNT(*) as c FROM purchase_requisitions WHERE tenant_id = ?` + (status ? ` AND status = '${status}'` : "")).get(req.tenantId).c;
        q += ` ORDER BY pr.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const requisitions = db.prepare(q).all(...params);

        // Attach line items
        const withItems = requisitions.map((pr) => {
            const items = db.prepare(`
                SELECT pri.*, p.name as product_name, p.sku
                FROM purchase_requisition_items pri
                JOIN products p ON pri.product_id = p.id
                WHERE pri.requisition_id = ?
            `).all(pr.id);
            return { ...pr, items };
        });

        return apiResponse(res, 200, withItems, "Requisitions retrieved", { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) });
    } catch (err) {
        console.error("[Procurement] PR List error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// POST /api/v1/procurement/requisitions — Create PR (manual or auto)
router.post("/requisitions", (req, res) => {
    try {
        const { warehouse_id, priority, items, notes, auto_generated } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return apiError(res, 400, "VALIDATION_ERROR", "At least one item is required");
        }

        const id = uuidv4();
        const prNum = prNumber();
        const totalQty = items.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0);
        const totalAmt = items.reduce((s, i) => s + ((parseFloat(i.estimated_unit_cost) || 0) * (parseInt(i.quantity) || 0)), 0);

        db.prepare(`
            INSERT INTO purchase_requisitions (id, tenant_id, pr_number, warehouse_id, requested_by, priority, status, total_quantity, estimated_total, notes, auto_generated)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
        `).run(id, req.tenantId, prNum, warehouse_id || null, req.user.id, priority || "medium", totalQty, totalAmt, notes || null, auto_generated ? 1 : 0);

        // Insert line items
        for (const item of items) {
            db.prepare(`
                INSERT INTO purchase_requisition_items (id, requisition_id, product_id, quantity, estimated_unit_cost, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(uuidv4(), id, item.product_id, parseInt(item.quantity) || 1, parseFloat(item.estimated_unit_cost) || 0, item.notes || null);
        }

        db.prepare(`INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, entity_id, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), req.tenantId, req.user.id, "CREATE", "purchase_requisition", id, req.ip);

        const pr = db.prepare(`SELECT * FROM purchase_requisitions WHERE id = ?`).get(id);
        const prItems = db.prepare(`SELECT pri.*, p.name FROM purchase_requisition_items pri JOIN products p ON pri.product_id = p.id WHERE pri.requisition_id = ?`).all(id);
        return apiResponse(res, 201, { ...pr, items: prItems }, "Purchase Requisition created");
    } catch (err) {
        console.error("[Procurement] PR Create error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// POST /api/v1/procurement/requisitions/:id/approve — Approve or reject PR
router.post("/requisitions/:id/approve", (req, res) => {
    try {
        const pr = db.prepare(`SELECT * FROM purchase_requisitions WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!pr) return apiError(res, 404, "NOT_FOUND", "Requisition not found");
        if (!["pending", "under_review"].includes(pr.status)) return apiError(res, 400, "INVALID_STATE", `PR is already ${pr.status}`);

        const { action, notes } = req.body;
        if (!["approve", "reject"].includes(action)) return apiError(res, 400, "VALIDATION_ERROR", "action must be 'approve' or 'reject'");

        const newStatus = action === "approve" ? "approved" : "rejected";
        db.prepare(`UPDATE purchase_requisitions SET status = ?, approved_by = ?, approved_at = datetime('now'), approval_notes = ?, updated_at = datetime('now') WHERE id = ?`)
            .run(newStatus, req.user.id, notes || null, req.params.id);

        db.prepare(`INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, entity_id, new_values, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), req.tenantId, req.user.id, action.toUpperCase(), "purchase_requisition", req.params.id, JSON.stringify({ status: newStatus, notes }), req.ip);

        return apiResponse(res, 200, { id: req.params.id, status: newStatus }, `PR ${newStatus}`);
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// POST /api/v1/procurement/requisitions/auto-generate — Trigger from low stock
router.post("/requisitions/auto-generate", (req, res) => {
    try {
        const lowStockItems = db.prepare(`
            SELECT p.id as product_id, p.name, p.sku, p.reorder_point, p.safety_stock, p.cost_price, p.lead_time_days,
                   il.warehouse_id, SUM(il.quantity) as current_stock
            FROM inventory_ledgers il
            JOIN products p ON il.product_id = p.id
            WHERE il.tenant_id = ? AND p.reorder_point > 0
            GROUP BY p.id, il.warehouse_id
            HAVING current_stock <= p.reorder_point
        `).all(req.tenantId);

        if (lowStockItems.length === 0) return apiResponse(res, 200, { created: 0 }, "No low stock items found");

        // Group by warehouse
        const byWarehouse = lowStockItems.reduce((acc, item) => {
            const wid = item.warehouse_id || "default";
            if (!acc[wid]) acc[wid] = [];
            acc[wid].push(item);
            return acc;
        }, {});

        const created = [];
        for (const [warehouse_id, items] of Object.entries(byWarehouse)) {
            // Check if a pending PR already exists for this warehouse
            const existing = db.prepare(`SELECT id FROM purchase_requisitions WHERE tenant_id = ? AND warehouse_id = ? AND status = 'pending' AND auto_generated = 1`).get(req.tenantId, warehouse_id);
            if (existing) continue;

            const id = uuidv4();
            const prNum = prNumber();
            const prItems = items.map((i) => ({
                product_id: i.product_id,
                quantity: Math.max(1, (i.reorder_point + i.safety_stock) - i.current_stock),
                estimated_unit_cost: i.cost_price,
            }));
            const totalQty = prItems.reduce((s, i) => s + i.quantity, 0);

            db.prepare(`INSERT INTO purchase_requisitions (id, tenant_id, pr_number, warehouse_id, requested_by, priority, status, total_quantity, notes, auto_generated) VALUES (?, ?, ?, ?, ?, 'high', 'pending', ?, 'Auto-generated from low stock detection', 1)`)
                .run(id, req.tenantId, prNum, warehouse_id === "default" ? null : warehouse_id, req.user.id, totalQty);

            for (const item of prItems) {
                db.prepare(`INSERT INTO purchase_requisition_items (id, requisition_id, product_id, quantity, estimated_unit_cost) VALUES (?, ?, ?, ?, ?)`)
                    .run(uuidv4(), id, item.product_id, item.quantity, item.estimated_unit_cost);
            }
            created.push({ id, pr_number: prNum, items_count: prItems.length });
        }

        return apiResponse(res, 201, { created: created.length, requisitions: created }, `Created ${created.length} auto PR(s) from low stock`);
    } catch (err) {
        console.error("[Procurement] Auto-PR error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// ─── PURCHASE ORDERS ──────────────────────────────────────
// ============================================================

// GET /api/v1/procurement/orders
router.get("/orders", (req, res) => {
    try {
        const { status, supplier_id, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let q = `
            SELECT po.*, s.name as supplier_name, u.full_name as created_by_name, w.name as warehouse_name
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.id
            LEFT JOIN users u ON po.created_by = u.id
            LEFT JOIN warehouses w ON po.warehouse_id = w.id
            WHERE po.tenant_id = ?
        `;
        const params = [req.tenantId];
        if (status) { q += ` AND po.status = ?`; params.push(status); }
        if (supplier_id) { q += ` AND po.supplier_id = ?`; params.push(supplier_id); }

        const total = db.prepare(`SELECT COUNT(*) as c FROM purchase_orders WHERE tenant_id = ?`).get(req.tenantId).c;
        q += ` ORDER BY po.order_date DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const orders = db.prepare(q).all(...params);

        // Attach line items
        const withItems = orders.map((po) => {
            const items = db.prepare(`
                SELECT poi.*, p.name as product_name, p.sku
                FROM purchase_order_items poi JOIN products p ON poi.product_id = p.id
                WHERE poi.po_id = ?
            `).all(po.id);
            const receivedQty = db.prepare(`SELECT COALESCE(SUM(quantity_received), 0) as total FROM goods_receipt_notes WHERE po_id = ?`).get(po.id).total;
            return { ...po, items, received_quantity: receivedQty };
        });

        return apiResponse(res, 200, withItems, "Purchase orders retrieved", { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) });
    } catch (err) {
        console.error("[Procurement] PO List error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// POST /api/v1/procurement/orders — Create PO (from approved PR or manual)
router.post("/orders", (req, res) => {
    try {
        const { supplier_id, warehouse_id, requisition_id, expected_delivery_date, payment_terms, shipping_address, notes, items } = req.body;
        if (!supplier_id) return apiError(res, 400, "VALIDATION_ERROR", "supplier_id is required");
        if (!items || !Array.isArray(items) || items.length === 0) return apiError(res, 400, "VALIDATION_ERROR", "At least one item is required");

        const supplier = db.prepare(`SELECT * FROM suppliers WHERE id = ? AND tenant_id = ?`).get(supplier_id, req.tenantId);
        if (!supplier) return apiError(res, 404, "NOT_FOUND", "Supplier not found");
        if (supplier.is_blacklisted) return apiError(res, 403, "SUPPLIER_BLACKLISTED", "Cannot create PO for a blacklisted supplier");

        // If linked to PR, mark it as converted
        if (requisition_id) {
            const pr = db.prepare(`SELECT * FROM purchase_requisitions WHERE id = ? AND tenant_id = ?`).get(requisition_id, req.tenantId);
            if (pr && pr.status !== "approved") return apiError(res, 400, "INVALID_STATE", "PR must be approved before creating a PO");
        }

        const id = uuidv4();
        const poNum = poNumber();
        const subtotal = items.reduce((s, i) => s + ((parseFloat(i.unit_price) || 0) * (parseInt(i.quantity) || 0)), 0);
        const taxAmount = subtotal * 0.18; // 18% GST
        const totalAmount = subtotal + taxAmount;

        db.prepare(`
            INSERT INTO purchase_orders (id, tenant_id, po_number, supplier_id, warehouse_id, requisition_id, status, order_date, expected_delivery_date, payment_terms, subtotal, tax_amount, total_amount, shipping_address, notes, created_by)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, req.tenantId, poNum, supplier_id, warehouse_id || null, requisition_id || null,
            expected_delivery_date || null, payment_terms || supplier.payment_terms || "NET30",
            subtotal, taxAmount, totalAmount, shipping_address || null, notes || null, req.user.id);

        // Insert line items
        for (const item of items) {
            const lineTotal = (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity) || 0);
            db.prepare(`INSERT INTO purchase_order_items (id, po_id, product_id, quantity, unit_price, line_total, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`)
                .run(uuidv4(), id, item.product_id, parseInt(item.quantity) || 1, parseFloat(item.unit_price) || 0, lineTotal, item.notes || null);
        }

        // Update PR status to "converted"
        if (requisition_id) {
            db.prepare(`UPDATE purchase_requisitions SET status = 'converted', updated_at = datetime('now') WHERE id = ?`).run(requisition_id);
        }

        db.prepare(`INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, entity_id, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), req.tenantId, req.user.id, "CREATE", "purchase_order", id, req.ip);

        const po = db.prepare(`SELECT po.*, s.name as supplier_name FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.id WHERE po.id = ?`).get(id);
        const poItems = db.prepare(`SELECT poi.*, p.name FROM purchase_order_items poi JOIN products p ON poi.product_id = p.id WHERE poi.po_id = ?`).all(id);
        return apiResponse(res, 201, { ...po, items: poItems }, "Purchase Order created");
    } catch (err) {
        console.error("[Procurement] PO Create error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// POST /api/v1/procurement/orders/:id/status — Update PO lifecycle status
router.post("/orders/:id/status", (req, res) => {
    try {
        const po = db.prepare(`SELECT * FROM purchase_orders WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!po) return apiError(res, 404, "NOT_FOUND", "Purchase Order not found");

        const { status, notes } = req.body;
        const validTransitions = {
            pending: ["sent", "cancelled"],
            sent: ["acknowledged", "cancelled"],
            acknowledged: ["partial", "received", "cancelled"],
            partial: ["received", "cancelled"],
        };

        if (!validTransitions[po.status]?.includes(status)) {
            return apiError(res, 400, "INVALID_TRANSITION", `Cannot transition from '${po.status}' to '${status}'`);
        }

        const actualDelivery = status === "received" ? "datetime('now')" : null;
        db.prepare(`UPDATE purchase_orders SET status = ?, internal_notes = COALESCE(?, internal_notes), actual_delivery_date = ${actualDelivery ? actualDelivery : "actual_delivery_date"}, updated_at = datetime('now') WHERE id = ?`)
            .run(status, notes, req.params.id);

        // Price variance detection on receipt
        if (status === "received") {
            const items = db.prepare(`SELECT poi.*, p.cost_price as catalog_price FROM purchase_order_items poi JOIN products p ON poi.product_id = p.id WHERE poi.po_id = ?`).all(req.params.id);
            const variances = items.filter((i) => Math.abs(i.unit_price - i.catalog_price) / Math.max(i.catalog_price, 0.01) > 0.1);
            if (variances.length > 0) {
                console.log(`[Events] PRICE_VARIANCE on PO ${po.po_number}: ${variances.length} item(s) with >10% variance`);
            }
        }

        db.prepare(`INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, entity_id, new_values, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), req.tenantId, req.user.id, `PO_${status.toUpperCase()}`, "purchase_order", req.params.id, JSON.stringify({ status }), req.ip);

        return apiResponse(res, 200, { id: req.params.id, status }, `PO status updated to ${status}`);
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// ─── GOODS RECEIPT NOTES (GRN) ────────────────────────────
// ============================================================

// GET /api/v1/procurement/grn
router.get("/grn", (req, res) => {
    try {
        const { po_id, supplier_id, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let q = `
            SELECT grn.*, s.name as supplier_name, po.po_number, u.full_name as received_by_name, w.name as warehouse_name
            FROM goods_receipt_notes grn
            LEFT JOIN suppliers s ON grn.supplier_id = s.id
            LEFT JOIN purchase_orders po ON grn.po_id = po.id
            LEFT JOIN users u ON grn.received_by = u.id
            LEFT JOIN warehouses w ON grn.warehouse_id = w.id
            WHERE grn.tenant_id = ?
        `;
        const params = [req.tenantId];
        if (po_id) { q += ` AND grn.po_id = ?`; params.push(po_id); }
        if (supplier_id) { q += ` AND grn.supplier_id = ?`; params.push(supplier_id); }

        q += ` ORDER BY grn.received_date DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        return apiResponse(res, 200, db.prepare(q).all(...params), "GRNs retrieved");
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// POST /api/v1/procurement/grn — Receive goods against PO
router.post("/grn", (req, res) => {
    try {
        const { po_id, supplier_id, warehouse_id, items, delivery_note, vehicle_number, notes } = req.body;
        if (!po_id || !items?.length) return apiError(res, 400, "VALIDATION_ERROR", "po_id and items required");

        const po = db.prepare(`SELECT * FROM purchase_orders WHERE id = ? AND tenant_id = ?`).get(po_id, req.tenantId);
        if (!po) return apiError(res, 404, "NOT_FOUND", "PO not found");
        if (["cancelled", "received"].includes(po.status)) return apiError(res, 400, "INVALID_STATE", "PO is already closed");

        const grnId = uuidv4();
        const grnNum = grnNumber();
        const totalReceived = items.reduce((s, i) => s + (parseInt(i.quantity_received) || 0), 0);
        const qualityPassed = items.reduce((s, i) => s + (parseInt(i.quality_passed) || parseInt(i.quantity_received) || 0), 0);

        db.prepare(`
            INSERT INTO goods_receipt_notes (id, tenant_id, grn_number, po_id, supplier_id, warehouse_id, received_by, quantity_received, quality_passed, delivery_note, vehicle_number, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(grnId, req.tenantId, grnNum, po_id, supplier_id || po.supplier_id, warehouse_id || po.warehouse_id,
            req.user.id, totalReceived, qualityPassed, delivery_note || null, vehicle_number || null, notes || null);

        // Auto-update inventory for received items
        const grnTransaction = db.transaction(() => {
            for (const item of items) {
                if (!item.product_id || !item.quantity_received) continue;
                const product = db.prepare(`SELECT * FROM products WHERE id = ? AND tenant_id = ?`).get(item.product_id, req.tenantId);
                if (!product) continue;

                const effectiveWarehouse = warehouse_id || po.warehouse_id;
                let ledger = db.prepare(`SELECT * FROM inventory_ledgers WHERE product_id = ? AND warehouse_id = ? AND tenant_id = ? LIMIT 1`).get(item.product_id, effectiveWarehouse, req.tenantId);

                if (ledger) {
                    db.prepare(`UPDATE inventory_ledgers SET quantity = quantity + ?, updated_at = datetime('now') WHERE id = ?`).run(parseInt(item.quantity_received), ledger.id);
                } else {
                    const ledgerId = uuidv4();
                    db.prepare(`INSERT INTO inventory_ledgers (id, tenant_id, product_id, warehouse_id, quantity, unit_cost) VALUES (?, ?, ?, ?, ?, ?)`)
                        .run(ledgerId, req.tenantId, item.product_id, effectiveWarehouse, parseInt(item.quantity_received), product.cost_price);
                    ledger = { id: ledgerId };
                }

                // Log stock movement
                db.prepare(`INSERT INTO stock_movements (id, tenant_id, ledger_id, product_id, warehouse_id, type, quantity, reference_type, reference_id, notes, performed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                    .run(uuidv4(), req.tenantId, ledger.id, item.product_id, effectiveWarehouse, "IN", parseInt(item.quantity_received), "GRN", grnId, `GRN: ${grnNum}`, req.user.id);
            }
        });
        grnTransaction();

        // Check if PO is fully received
        const orderedQty = db.prepare(`SELECT SUM(quantity) as total FROM purchase_order_items WHERE po_id = ?`).get(po_id).total || 0;
        const receivedQty = db.prepare(`SELECT SUM(quantity_received) as total FROM goods_receipt_notes WHERE po_id = ?`).get(po_id).total || 0;
        const newPoStatus = receivedQty >= orderedQty ? "received" : "partial";
        db.prepare(`UPDATE purchase_orders SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(newPoStatus, po_id);

        const grn = db.prepare(`SELECT * FROM goods_receipt_notes WHERE id = ?`).get(grnId);
        return apiResponse(res, 201, { ...grn, po_updated_status: newPoStatus }, "GRN recorded and inventory updated");
    } catch (err) {
        console.error("[Procurement] GRN Create error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// ─── PROCUREMENT DASHBOARD STATS ──────────────────────────
// ============================================================
router.get("/dashboard", (req, res) => {
    try {
        const pendingPRs = db.prepare(`SELECT COUNT(*) as c FROM purchase_requisitions WHERE tenant_id = ? AND status = 'pending'`).get(req.tenantId).c;
        const openPOs = db.prepare(`SELECT COUNT(*) as c FROM purchase_orders WHERE tenant_id = ? AND status IN ('pending', 'sent', 'acknowledged', 'partial')`).get(req.tenantId).c;
        const monthSpend = db.prepare(`SELECT COALESCE(SUM(total_amount), 0) as total FROM purchase_orders WHERE tenant_id = ? AND status = 'received' AND order_date >= datetime('now', 'start of month')`).get(req.tenantId).total;
        const overduePos = db.prepare(`SELECT COUNT(*) as c FROM purchase_orders WHERE tenant_id = ? AND status IN ('pending', 'sent', 'acknowledged', 'partial') AND expected_delivery_date < datetime('now')`).get(req.tenantId).c;
        const topSuppliers = db.prepare(`SELECT s.name, COUNT(po.id) as orders, SUM(po.total_amount) as spend FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.id WHERE po.tenant_id = ? GROUP BY po.supplier_id ORDER BY spend DESC LIMIT 5`).all(req.tenantId);
        const recentPOs = db.prepare(`SELECT po.*, s.name as supplier_name FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id = s.id WHERE po.tenant_id = ? ORDER BY po.order_date DESC LIMIT 5`).all(req.tenantId);
        const monthlySpend = db.prepare(`SELECT strftime('%Y-%m', order_date) as month, SUM(total_amount) as spend FROM purchase_orders WHERE tenant_id = ? AND status != 'cancelled' GROUP BY month ORDER BY month ASC LIMIT 6`).all(req.tenantId);

        return apiResponse(res, 200, {
            pending_prs: pendingPRs,
            open_pos: openPOs,
            month_spend: Math.round(monthSpend),
            overdue_pos: overduePos,
            top_suppliers: topSuppliers,
            recent_pos: recentPOs,
            monthly_spend_trend: monthlySpend,
        }, "Procurement dashboard stats");
    } catch (err) {
        console.error("[Procurement] Dashboard error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

module.exports = router;
