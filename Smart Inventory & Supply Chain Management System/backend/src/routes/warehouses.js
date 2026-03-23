const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const db = require("../database");
const { authMiddleware, apiResponse, apiError } = require("../middleware/auth");

// All warehouse routes require auth
router.use(authMiddleware);

// ============================================================
// HELPERS
// ============================================================
function calcDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================
// GET /api/v1/warehouses — List all warehouses for tenant
// ============================================================
router.get("/", (req, res) => {
    try {
        const { search, region, is_active, page = 1, limit = 20 } = req.query;
        const tenantId = req.tenantId;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `SELECT w.*, u.full_name as manager_name 
                     FROM warehouses w 
                     LEFT JOIN users u ON w.manager_id = u.id
                     WHERE w.tenant_id = ?`;
        const params = [tenantId];

        if (search) {
            query += ` AND (w.name LIKE ? OR w.code LIKE ? OR w.city LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (region) { query += ` AND w.region = ?`; params.push(region); }
        if (is_active !== undefined) { query += ` AND w.is_active = ?`; params.push(is_active === "true" ? 1 : 0); }

        const total = db.prepare(`SELECT COUNT(*) as count FROM warehouses WHERE tenant_id = ?`).get(tenantId).count;
        query += ` ORDER BY w.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const warehouses = db.prepare(query).all(...params);

        // Attach zone counts
        const warehousesWithCounts = warehouses.map((w) => {
            const zoneCount = db.prepare(`SELECT COUNT(*) as count FROM warehouse_zones WHERE warehouse_id = ?`).get(w.id).count;
            const stockValue = db.prepare(`SELECT COALESCE(SUM(il.quantity * p.cost_price), 0) as val FROM inventory_ledgers il JOIN products p ON il.product_id = p.id WHERE il.warehouse_id = ?`).get(w.id).val;
            return { ...w, zone_count: zoneCount, stock_value: stockValue };
        });

        return apiResponse(res, 200, warehousesWithCounts, "Warehouses retrieved successfully", {
            page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)),
        });
    } catch (err) {
        console.error("[Warehouses] List error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// POST /api/v1/warehouses — Create warehouse
// ============================================================
router.post("/", (req, res) => {
    try {
        const { name, code, address, city, state, country, zip_code, latitude, longitude, region, capacity, manager_id } = req.body;
        if (!name) return apiError(res, 400, "VALIDATION_ERROR", "Warehouse name is required");

        const id = uuidv4();
        const warehouseCode = code || `WH-${name.toUpperCase().replace(/\s+/g, "").slice(0, 4)}-${Date.now().toString().slice(-4)}`;

        db.prepare(`
            INSERT INTO warehouses (id, tenant_id, name, code, address, city, state, country, zip_code, latitude, longitude, region, capacity, manager_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, req.tenantId, name, warehouseCode, address || null, city || null, state || null, country || null, zip_code || null,
            latitude || null, longitude || null, region || null, capacity || 0, manager_id || null);

        // Log audit
        db.prepare(`INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, entity_id, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), req.tenantId, req.user.id, "CREATE", "warehouse", id, req.ip);

        const warehouse = db.prepare(`SELECT * FROM warehouses WHERE id = ?`).get(id);
        return apiResponse(res, 201, warehouse, "Warehouse created successfully");
    } catch (err) {
        console.error("[Warehouses] Create error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// GET /api/v1/warehouses/:id — Get single warehouse
// ============================================================
router.get("/:id", (req, res) => {
    try {
        const warehouse = db.prepare(`
            SELECT w.*, u.full_name as manager_name 
            FROM warehouses w 
            LEFT JOIN users u ON w.manager_id = u.id
            WHERE w.id = ? AND w.tenant_id = ?
        `).get(req.params.id, req.tenantId);

        if (!warehouse) return apiError(res, 404, "NOT_FOUND", "Warehouse not found");

        // Get zones with shelf counts
        const zones = db.prepare(`SELECT z.*, COUNT(s.id) as shelf_count FROM warehouse_zones z LEFT JOIN shelf_locations s ON z.id = s.zone_id WHERE z.warehouse_id = ? GROUP BY z.id`).all(req.params.id);

        // Get inventory summary
        const inventory = db.prepare(`
            SELECT p.name as product_name, p.sku, il.quantity, il.batch_no, il.expiry_date
            FROM inventory_ledgers il 
            JOIN products p ON il.product_id = p.id
            WHERE il.warehouse_id = ? AND il.tenant_id = ?
            LIMIT 10
        `).all(req.params.id, req.tenantId);

        return apiResponse(res, 200, { ...warehouse, zones, inventory_preview: inventory }, "Warehouse retrieved successfully");
    } catch (err) {
        console.error("[Warehouses] Get error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// PUT /api/v1/warehouses/:id — Update warehouse
// ============================================================
router.put("/:id", (req, res) => {
    try {
        const warehouse = db.prepare(`SELECT * FROM warehouses WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!warehouse) return apiError(res, 404, "NOT_FOUND", "Warehouse not found");

        const { name, code, address, city, state, country, zip_code, latitude, longitude, region, capacity, manager_id, is_active } = req.body;

        db.prepare(`
            UPDATE warehouses SET 
                name = COALESCE(?, name), code = COALESCE(?, code), address = COALESCE(?, address),
                city = COALESCE(?, city), state = COALESCE(?, state), country = COALESCE(?, country),
                zip_code = COALESCE(?, zip_code), latitude = COALESCE(?, latitude), longitude = COALESCE(?, longitude),
                region = COALESCE(?, region), capacity = COALESCE(?, capacity), manager_id = COALESCE(?, manager_id),
                is_active = COALESCE(?, is_active), updated_at = datetime('now')
            WHERE id = ? AND tenant_id = ?
        `).run(name, code, address, city, state, country, zip_code, latitude, longitude, region, capacity,
            manager_id, is_active !== undefined ? (is_active ? 1 : 0) : null, req.params.id, req.tenantId);

        db.prepare(`INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, entity_id, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), req.tenantId, req.user.id, "UPDATE", "warehouse", req.params.id, req.ip);

        const updated = db.prepare(`SELECT * FROM warehouses WHERE id = ?`).get(req.params.id);
        return apiResponse(res, 200, updated, "Warehouse updated successfully");
    } catch (err) {
        console.error("[Warehouses] Update error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// DELETE /api/v1/warehouses/:id — Delete warehouse
// ============================================================
router.delete("/:id", (req, res) => {
    try {
        const warehouse = db.prepare(`SELECT * FROM warehouses WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!warehouse) return apiError(res, 404, "NOT_FOUND", "Warehouse not found");

        const stockCount = db.prepare(`SELECT COUNT(*) as count FROM inventory_ledgers WHERE warehouse_id = ? AND quantity > 0`).get(req.params.id).count;
        if (stockCount > 0) return apiError(res, 409, "CONFLICT", "Cannot delete warehouse with active stock");

        db.prepare(`DELETE FROM warehouses WHERE id = ? AND tenant_id = ?`).run(req.params.id, req.tenantId);
        db.prepare(`INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, entity_id, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), req.tenantId, req.user.id, "DELETE", "warehouse", req.params.id, req.ip);

        return apiResponse(res, 200, null, "Warehouse deleted successfully");
    } catch (err) {
        console.error("[Warehouses] Delete error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// GET /api/v1/warehouses/:id/hierarchy — Full hierarchy tree
// ============================================================
router.get("/:id/hierarchy", (req, res) => {
    try {
        const warehouse = db.prepare(`SELECT * FROM warehouses WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!warehouse) return apiError(res, 404, "NOT_FOUND", "Warehouse not found");

        const zones = db.prepare(`SELECT * FROM warehouse_zones WHERE warehouse_id = ? ORDER BY name`).all(req.params.id);
        const hierarchy = zones.map((zone) => {
            const shelves = db.prepare(`SELECT * FROM shelf_locations WHERE zone_id = ? ORDER BY aisle, rack, shelf, bin`).all(zone.id);
            return { ...zone, shelves };
        });

        return apiResponse(res, 200, { warehouse, hierarchy }, "Hierarchy retrieved successfully");
    } catch (err) {
        console.error("[Warehouses] Hierarchy error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// ZONES CRUD
// ============================================================
router.get("/:id/zones", (req, res) => {
    try {
        const warehouse = db.prepare(`SELECT * FROM warehouses WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!warehouse) return apiError(res, 404, "NOT_FOUND", "Warehouse not found");
        const zones = db.prepare(`SELECT z.*, COUNT(s.id) as shelf_count FROM warehouse_zones z LEFT JOIN shelf_locations s ON z.id = s.zone_id WHERE z.warehouse_id = ? GROUP BY z.id ORDER BY z.name`).all(req.params.id);
        return apiResponse(res, 200, zones, "Zones retrieved successfully");
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

router.post("/:id/zones", (req, res) => {
    try {
        const warehouse = db.prepare(`SELECT * FROM warehouses WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!warehouse) return apiError(res, 404, "NOT_FOUND", "Warehouse not found");

        const { name, type, capacity, temperature_min, temperature_max } = req.body;
        if (!name) return apiError(res, 400, "VALIDATION_ERROR", "Zone name is required");

        const id = uuidv4();
        db.prepare(`INSERT INTO warehouse_zones (id, warehouse_id, name, type, capacity, temperature_min, temperature_max) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(id, req.params.id, name, type || "general", capacity || 0, temperature_min || null, temperature_max || null);

        const zone = db.prepare(`SELECT * FROM warehouse_zones WHERE id = ?`).get(id);
        return apiResponse(res, 201, zone, "Zone created successfully");
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

router.put("/:warehouseId/zones/:zoneId", (req, res) => {
    try {
        const zone = db.prepare(`SELECT z.* FROM warehouse_zones z JOIN warehouses w ON z.warehouse_id = w.id WHERE z.id = ? AND w.tenant_id = ?`).get(req.params.zoneId, req.tenantId);
        if (!zone) return apiError(res, 404, "NOT_FOUND", "Zone not found");

        const { name, type, capacity, temperature_min, temperature_max } = req.body;
        db.prepare(`UPDATE warehouse_zones SET name = COALESCE(?, name), type = COALESCE(?, type), capacity = COALESCE(?, capacity), temperature_min = COALESCE(?, temperature_min), temperature_max = COALESCE(?, temperature_max) WHERE id = ?`)
            .run(name, type, capacity, temperature_min, temperature_max, req.params.zoneId);

        const updated = db.prepare(`SELECT * FROM warehouse_zones WHERE id = ?`).get(req.params.zoneId);
        return apiResponse(res, 200, updated, "Zone updated successfully");
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

router.delete("/:warehouseId/zones/:zoneId", (req, res) => {
    try {
        const zone = db.prepare(`SELECT z.* FROM warehouse_zones z JOIN warehouses w ON z.warehouse_id = w.id WHERE z.id = ? AND w.tenant_id = ?`).get(req.params.zoneId, req.tenantId);
        if (!zone) return apiError(res, 404, "NOT_FOUND", "Zone not found");
        db.prepare(`DELETE FROM warehouse_zones WHERE id = ?`).run(req.params.zoneId);
        return apiResponse(res, 200, null, "Zone deleted successfully");
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// SHELF LOCATIONS CRUD
// ============================================================
router.get("/:warehouseId/zones/:zoneId/shelves", (req, res) => {
    try {
        const shelves = db.prepare(`SELECT * FROM shelf_locations WHERE zone_id = ? ORDER BY aisle, rack, shelf, bin`).all(req.params.zoneId);
        return apiResponse(res, 200, shelves, "Shelves retrieved successfully");
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

router.post("/:warehouseId/zones/:zoneId/shelves", (req, res) => {
    try {
        const { aisle, rack, shelf, bin, capacity } = req.body;
        const id = uuidv4();
        db.prepare(`INSERT INTO shelf_locations (id, zone_id, aisle, rack, shelf, bin, capacity) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(id, req.params.zoneId, aisle || null, rack || null, shelf || null, bin || null, capacity || 0);
        const location = db.prepare(`SELECT * FROM shelf_locations WHERE id = ?`).get(id);
        return apiResponse(res, 201, location, "Shelf location created successfully");
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// GET /api/v1/warehouses/distance — Calculate distance between two warehouses
// ============================================================
router.get("/utils/distance", (req, res) => {
    try {
        const { from_id, to_id } = req.query;
        if (!from_id || !to_id) return apiError(res, 400, "VALIDATION_ERROR", "from_id and to_id are required");

        const wh1 = db.prepare(`SELECT * FROM warehouses WHERE id = ? AND tenant_id = ?`).get(from_id, req.tenantId);
        const wh2 = db.prepare(`SELECT * FROM warehouses WHERE id = ? AND tenant_id = ?`).get(to_id, req.tenantId);

        if (!wh1 || !wh2) return apiError(res, 404, "NOT_FOUND", "One or both warehouses not found");
        if (!wh1.latitude || !wh2.latitude) return apiError(res, 400, "VALIDATION_ERROR", "Geo-coordinates not set for one or both warehouses");

        const distance = calcDistance(wh1.latitude, wh1.longitude, wh2.latitude, wh2.longitude);
        return apiResponse(res, 200, { from: wh1.name, to: wh2.name, distance_km: Math.round(distance * 100) / 100 }, "Distance calculated");
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

module.exports = router;
