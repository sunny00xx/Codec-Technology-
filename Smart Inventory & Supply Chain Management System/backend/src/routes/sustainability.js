const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const db = require("../database");
const { authMiddleware, apiResponse, apiError } = require("../middleware/auth");

router.use(authMiddleware);

// ════════════════════════════════════════════════════════════
//  EMISSION FACTORS (kg CO₂ per ton-km)
// ════════════════════════════════════════════════════════════
const EMISSION_FACTORS = {
    truck: 0.062,      // road freight
    rail: 0.022,       // rail freight
    air: 0.602,        // air cargo
    sea: 0.008,        // maritime
    courier: 0.120,    // last-mile courier
    electric: 0.015,   // electric vehicle
};

// ── GET /carbon/dashboard ────────────────────────────────────
router.get("/carbon/dashboard", (req, res) => {
    try {
        const tid = req.tenantId;

        const shipments = db.prepare(`SELECT id, carrier, status, weight, service_type, created_at FROM shipments WHERE tenant_id = ?`).all(tid);
        let totalEmissions = 0;
        const byMode = {};
        const monthly = {};

        for (const s of shipments) {
            const mode = (s.service_type || "truck").toLowerCase();
            const factor = EMISSION_FACTORS[mode] || EMISSION_FACTORS.truck;
            const wt = (s.weight || 50) / 1000; // tonnes
            const dist = 150; // default 150km estimate
            const emission = +(wt * dist * factor).toFixed(3);
            totalEmissions += emission;

            if (!byMode[mode]) byMode[mode] = { emissions: 0, count: 0 };
            byMode[mode].emissions += emission;
            byMode[mode].count++;

            const month = (s.created_at || "").slice(0, 7);
            if (month) { if (!monthly[month]) monthly[month] = 0; monthly[month] += emission; }
        }

        // Offset suggestions
        const treesNeeded = Math.ceil(totalEmissions / 21); // 1 tree ≈ 21 kg CO₂/year
        const solarPanels = Math.ceil(totalEmissions / 900);  // 1 panel ≈ 900 kg/year

        // Transport mode breakdown
        const modeBreakdown = Object.entries(byMode).map(([mode, data]) => ({
            mode, ...data, emissions: +data.emissions.toFixed(2), avg_per_shipment: data.count > 0 ? +(data.emissions / data.count).toFixed(3) : 0,
        })).sort((a, b) => b.emissions - a.emissions);

        const monthlyTrend = Object.entries(monthly).sort().map(([month, val]) => ({ month, emissions: +val.toFixed(2) }));

        // Sustainability score (0-100, lower emissions = higher)
        const avgPerShipment = shipments.length > 0 ? totalEmissions / shipments.length : 0;
        const sustainabilityScore = Math.max(0, Math.min(100, Math.round(100 - avgPerShipment * 10)));

        return apiResponse(res, 200, {
            total_emissions: +totalEmissions.toFixed(2),
            total_shipments: shipments.length,
            avg_per_shipment: +avgPerShipment.toFixed(3),
            sustainability_score: sustainabilityScore,
            mode_breakdown: modeBreakdown,
            monthly_trend: monthlyTrend,
            offsets: { trees_needed: treesNeeded, solar_panels: solarPanels },
            unit: "kg CO₂",
        }, "Carbon dashboard");
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});

// ── GET /carbon/sku/:productId ───────────────────────────────
router.get("/carbon/sku/:productId", (req, res) => {
    try {
        const { productId } = req.params;
        const product = db.prepare(`SELECT id, name, sku FROM products WHERE id = ? AND tenant_id = ?`).get(productId, req.tenantId);
        if (!product) return apiError(res, 404, "NOT_FOUND", "Product not found");

        // Find shipments containing this product
        const shipments = db.prepare(`
            SELECT s.id, s.weight, s.service_type, s.created_at, si.quantity
            FROM shipment_items si JOIN shipments s ON si.shipment_id = s.id
            WHERE s.tenant_id = ? AND si.product_id = ?
        `).all(req.tenantId, productId);

        let totalCarbon = 0;
        const entries = shipments.map((s) => {
            const mode = (s.service_type || "truck").toLowerCase();
            const factor = EMISSION_FACTORS[mode] || EMISSION_FACTORS.truck;
            const wt = (s.weight || 50) / 1000;
            const dist = 150;
            const emission = +(wt * dist * factor).toFixed(3);
            totalCarbon += emission;
            return { shipment_id: s.id, quantity: s.quantity, emission, mode, date: s.created_at };
        });

        return apiResponse(res, 200, {
            product, total_carbon: +totalCarbon.toFixed(2), shipment_count: entries.length,
            per_unit: entries.length > 0 ? +(totalCarbon / entries.reduce((s, e) => s + (e.quantity || 1), 0)).toFixed(4) : 0,
            entries, unit: "kg CO₂",
        }, "SKU carbon attribution");
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});


// ════════════════════════════════════════════════════════════
//  BLOCKCHAIN PROVENANCE (Hash-Chain Ledger)
// ════════════════════════════════════════════════════════════

function computeHash(data) {
    return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

// ── POST /provenance/block ───────────────────────────────────
router.post("/provenance/block", (req, res) => {
    try {
        const { entity_type, entity_id, action, data, actor } = req.body;
        if (!entity_type || !entity_id || !action) return apiError(res, 400, "VALIDATION_ERROR", "entity_type, entity_id, action required");

        // Get previous block
        const prevBlock = db.prepare(`SELECT hash FROM provenance_ledger WHERE tenant_id = ? ORDER BY block_number DESC LIMIT 1`).get(req.tenantId);
        const prevHash = prevBlock?.hash || "0000000000000000000000000000000000000000000000000000000000000000";

        const blockNumber = db.prepare(`SELECT COALESCE(MAX(block_number), 0) + 1 as n FROM provenance_ledger WHERE tenant_id = ?`).get(req.tenantId).n;
        const timestamp = new Date().toISOString();
        const blockData = { block_number: blockNumber, previous_hash: prevHash, entity_type, entity_id, action, data: data || {}, actor: actor || req.user.fullName, timestamp };
        const hash = computeHash(blockData);

        const id = uuidv4();
        db.prepare(`INSERT INTO provenance_ledger (id, tenant_id, block_number, previous_hash, hash, entity_type, entity_id, action, data, actor, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(id, req.tenantId, blockNumber, prevHash, hash, entity_type, entity_id, action, JSON.stringify(data || {}), actor || req.user.fullName, timestamp);

        return apiResponse(res, 201, { id, block_number: blockNumber, hash, previous_hash: prevHash, entity_type, entity_id, action, timestamp }, "Block created");
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});

// ── GET /provenance/:entityType/:entityId ────────────────────
router.get("/provenance/:entityType/:entityId", (req, res) => {
    try {
        const blocks = db.prepare(`SELECT * FROM provenance_ledger WHERE tenant_id = ? AND entity_type = ? AND entity_id = ? ORDER BY block_number`)
            .all(req.tenantId, req.params.entityType, req.params.entityId);

        const parsed = blocks.map((b) => ({ ...b, data: JSON.parse(b.data || "{}") }));

        // Verify chain integrity
        let valid = true;
        for (let i = 1; i < parsed.length; i++) {
            if (parsed[i].previous_hash !== parsed[i - 1].hash) { valid = false; break; }
        }

        return apiResponse(res, 200, { chain: parsed, length: parsed.length, integrity: valid ? "VALID" : "BROKEN" }, "Provenance chain");
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});

// ── GET /provenance/verify/:hash ─────────────────────────────
router.get("/provenance/verify/:hash", (req, res) => {
    try {
        const block = db.prepare(`SELECT * FROM provenance_ledger WHERE hash = ?`).get(req.params.hash);
        if (!block) return apiError(res, 404, "NOT_FOUND", "Block not found");
        return apiResponse(res, 200, { ...block, data: JSON.parse(block.data || "{}"), verified: true }, "Block verified");
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});

module.exports = router;
