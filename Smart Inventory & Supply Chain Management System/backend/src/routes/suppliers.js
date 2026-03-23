const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const db = require("../database");
const { authMiddleware, apiResponse, apiError } = require("../middleware/auth");

router.use(authMiddleware);

// ============================================================
// HELPERS — Scorecard Calculation
// ============================================================
function calcSupplierScore(supplierId, tenantId) {
    // Delivery performance (on-time POs)
    const poStats = db.prepare(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'received' AND updated_at <= expected_delivery_date THEN 1 ELSE 0 END) as on_time,
            AVG(CASE WHEN status = 'received' THEN 1 ELSE 0 END) as fulfillment_rate
        FROM purchase_orders WHERE supplier_id = ? AND tenant_id = ? AND status IN ('received', 'partial')
    `).get(supplierId, tenantId);

    // Quality score pulled from GRNs
    const grnStats = db.prepare(`
        SELECT 
            COALESCE(AVG(CAST(quality_passed AS FLOAT) / NULLIF(quantity_received, 0) * 100), 100) as quality_score
        FROM goods_receipt_notes WHERE supplier_id = ? AND tenant_id = ?
    `).get(supplierId, tenantId);

    const deliveryScore = poStats.total > 0 ? Math.min(100, (poStats.on_time / poStats.total) * 100) : 100;
    const fulfillmentScore = poStats.fulfillment_rate != null ? Math.min(100, poStats.fulfillment_rate * 100) : 100;
    const qualityScore = grnStats.quality_score || 100;

    // Weighted average: delivery 40%, fulfillment 35%, quality 25%
    const overall = Math.round(deliveryScore * 0.4 + fulfillmentScore * 0.35 + qualityScore * 0.25);

    return {
        delivery_score: Math.round(deliveryScore),
        fulfillment_score: Math.round(fulfillmentScore),
        quality_score: Math.round(qualityScore),
        overall_score: overall,
        total_orders: poStats.total,
        on_time_deliveries: poStats.on_time,
    };
}

// ============================================================
// GET /api/v1/suppliers — List all suppliers
// ============================================================
router.get("/", (req, res) => {
    try {
        const { search, is_active, is_blacklisted, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let q = `SELECT s.*, COUNT(po.id) as total_orders, COALESCE(SUM(po.total_amount), 0) as total_spend
                 FROM suppliers s
                 LEFT JOIN purchase_orders po ON po.supplier_id = s.id AND po.tenant_id = s.tenant_id
                 WHERE s.tenant_id = ?`;
        const params = [req.tenantId];

        if (search) { q += ` AND (s.name LIKE ? OR s.email LIKE ? OR s.supplier_code LIKE ?)`; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        if (is_active !== undefined) { q += ` AND s.is_active = ?`; params.push(is_active === "true" ? 1 : 0); }
        if (is_blacklisted !== undefined) { q += ` AND s.is_blacklisted = ?`; params.push(is_blacklisted === "true" ? 1 : 0); }

        const total = db.prepare(`SELECT COUNT(*) as c FROM suppliers WHERE tenant_id = ?`).get(req.tenantId).c;
        q += ` GROUP BY s.id ORDER BY s.rating DESC, s.name ASC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const suppliers = db.prepare(q).all(...params);

        // Attach contract expiry flags
        const now = new Date();
        const enriched = suppliers.map((s) => ({
            ...s,
            contract_expiring: s.contract_end_date && new Date(s.contract_end_date) <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        }));

        return apiResponse(res, 200, enriched, "Suppliers retrieved", { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) });
    } catch (err) {
        console.error("[Suppliers] List error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// POST /api/v1/suppliers — Create supplier
// ============================================================
router.post("/", (req, res) => {
    try {
        const { name, supplier_code, contact_person, email, phone, address, city, state, country, payment_terms, lead_time_days, contract_start_date, contract_end_date, notes } = req.body;
        if (!name) return apiError(res, 400, "VALIDATION_ERROR", "Supplier name is required");

        const id = uuidv4();
        const code = supplier_code || `SUP-${name.toUpperCase().replace(/\s/g, "").slice(0, 4)}-${Date.now().toString().slice(-4)}`;

        db.prepare(`
            INSERT INTO suppliers (id, tenant_id, name, supplier_code, contact_person, email, phone, address, city, state, country, payment_terms, lead_time_days, contract_start_date, contract_end_date, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, req.tenantId, name, code, contact_person || null, email || null, phone || null, address || null, city || null, state || null, country || null,
            payment_terms || "NET30", lead_time_days || 7, contract_start_date || null, contract_end_date || null, notes || null);

        db.prepare(`INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, entity_id, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), req.tenantId, req.user.id, "CREATE", "supplier", id, req.ip);

        return apiResponse(res, 201, db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(id), "Supplier created successfully");
    } catch (err) {
        console.error("[Suppliers] Create error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// GET /api/v1/suppliers/:id — Get supplier details + scorecard
// ============================================================
router.get("/:id", (req, res) => {
    try {
        const supplier = db.prepare(`SELECT * FROM suppliers WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!supplier) return apiError(res, 404, "NOT_FOUND", "Supplier not found");

        const scorecard = calcSupplierScore(req.params.id, req.tenantId);

        const recentOrders = db.prepare(`
            SELECT id, po_number, status, total_amount, order_date, expected_delivery_date, actual_delivery_date
            FROM purchase_orders WHERE supplier_id = ? AND tenant_id = ? ORDER BY order_date DESC LIMIT 10
        `).all(req.params.id, req.tenantId);

        return apiResponse(res, 200, { ...supplier, scorecard, recent_orders: recentOrders }, "Supplier retrieved");
    } catch (err) {
        console.error("[Suppliers] Get error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// PUT /api/v1/suppliers/:id — Update supplier
// ============================================================
router.put("/:id", (req, res) => {
    try {
        const supplier = db.prepare(`SELECT * FROM suppliers WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!supplier) return apiError(res, 404, "NOT_FOUND", "Supplier not found");

        const { name, contact_person, email, phone, address, city, state, country, payment_terms, lead_time_days, contract_start_date, contract_end_date, notes, is_active } = req.body;

        db.prepare(`
            UPDATE suppliers SET
                name = COALESCE(?, name), contact_person = COALESCE(?, contact_person),
                email = COALESCE(?, email), phone = COALESCE(?, phone),
                address = COALESCE(?, address), city = COALESCE(?, city), state = COALESCE(?, state), country = COALESCE(?, country),
                payment_terms = COALESCE(?, payment_terms), lead_time_days = COALESCE(?, lead_time_days),
                contract_start_date = COALESCE(?, contract_start_date), contract_end_date = COALESCE(?, contract_end_date),
                notes = COALESCE(?, notes), is_active = COALESCE(?, is_active), updated_at = datetime('now')
            WHERE id = ? AND tenant_id = ?
        `).run(name, contact_person, email, phone, address, city, state, country, payment_terms, lead_time_days,
            contract_start_date, contract_end_date, notes, is_active !== undefined ? (is_active ? 1 : 0) : null,
            req.params.id, req.tenantId);

        return apiResponse(res, 200, db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(req.params.id), "Supplier updated");
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// DELETE /api/v1/suppliers/:id — Delete supplier
// ============================================================
router.delete("/:id", (req, res) => {
    try {
        const supplier = db.prepare(`SELECT * FROM suppliers WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!supplier) return apiError(res, 404, "NOT_FOUND", "Supplier not found");

        const poCount = db.prepare(`SELECT COUNT(*) as c FROM purchase_orders WHERE supplier_id = ?`).get(req.params.id).c;
        if (poCount > 0) return apiError(res, 409, "CONFLICT", "Cannot delete supplier with existing purchase orders");

        db.prepare(`DELETE FROM suppliers WHERE id = ? AND tenant_id = ?`).run(req.params.id, req.tenantId);
        return apiResponse(res, 200, null, "Supplier deleted");
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// POST /api/v1/suppliers/:id/blacklist — Blacklist/unblacklist
// ============================================================
router.post("/:id/blacklist", (req, res) => {
    try {
        const supplier = db.prepare(`SELECT * FROM suppliers WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!supplier) return apiError(res, 404, "NOT_FOUND", "Supplier not found");

        const { reason, blacklist } = req.body;
        const newStatus = blacklist !== false; // default: blacklist

        db.prepare(`UPDATE suppliers SET is_blacklisted = ?, blacklist_reason = ?, updated_at = datetime('now') WHERE id = ?`)
            .run(newStatus ? 1 : 0, newStatus ? (reason || "Manually blacklisted") : null, req.params.id);

        db.prepare(`INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, entity_id, new_values, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), req.tenantId, req.user.id, newStatus ? "BLACKLIST" : "UNBLACKLIST", "supplier", req.params.id, JSON.stringify({ reason }), req.ip);

        return apiResponse(res, 200, { blacklisted: newStatus, reason }, newStatus ? "Supplier blacklisted" : "Supplier removed from blacklist");
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// GET /api/v1/suppliers/:id/scorecard — Detailed scorecard
// ============================================================
router.get("/:id/scorecard", (req, res) => {
    try {
        const supplier = db.prepare(`SELECT * FROM suppliers WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!supplier) return apiError(res, 404, "NOT_FOUND", "Supplier not found");

        const scorecard = calcSupplierScore(req.params.id, req.tenantId);

        // Auto-blacklist if score < 40
        if (scorecard.overall_score < 40 && !supplier.is_blacklisted && scorecard.total_orders >= 3) {
            db.prepare(`UPDATE suppliers SET is_blacklisted = 1, blacklist_reason = 'Auto-blacklisted: performance score below 40', updated_at = datetime('now') WHERE id = ?`)
                .run(req.params.id);
            scorecard.auto_blacklisted = true;
            scorecard.auto_blacklist_reason = "Score below 40 threshold after 3+ orders";
        }

        // Monthly performance trend (last 6 months)
        const trend = db.prepare(`
            SELECT strftime('%Y-%m', order_date) as month, COUNT(*) as orders, 
                   SUM(total_amount) as spend
            FROM purchase_orders 
            WHERE supplier_id = ? AND tenant_id = ? AND order_date >= datetime('now', '-6 months')
            GROUP BY month ORDER BY month ASC
        `).all(req.params.id, req.tenantId);

        return apiResponse(res, 200, { ...scorecard, supplier_name: supplier.name, monthly_trend: trend }, "Scorecard calculated");
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// GET /api/v1/suppliers/expiring-contracts — Contract alerts
// ============================================================
router.get("/utils/expiring-contracts", (req, res) => {
    try {
        const expiring = db.prepare(`
            SELECT *, CAST(julianday(contract_end_date) - julianday('now') AS INTEGER) as days_remaining
            FROM suppliers WHERE tenant_id = ? AND contract_end_date IS NOT NULL AND contract_end_date <= datetime('now', '+60 days') AND is_active = 1
            ORDER BY contract_end_date ASC
        `).all(req.tenantId);
        return apiResponse(res, 200, expiring, "Expiring contracts retrieved");
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

module.exports = router;
