const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const db = require("../database");
const { authMiddleware, apiResponse, apiError } = require("../middleware/auth");

router.use(authMiddleware);

// ── Helpers ───────────────────────────────────────────────────
function trackingNumber() {
    return `TRK-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`;
}

const CARRIERS = ["FedEx", "DHL", "UPS", "BlueDart", "EcomExpress", "Delhivery", "DTDC"];
const LIFECYCLE = ["created", "pickup_scheduled", "picked_up", "in_transit", "out_for_delivery", "delivered", "exception"];
const VALID_TRANSITIONS = {
    created: ["pickup_scheduled", "cancelled"],
    pickup_scheduled: ["picked_up", "exception", "cancelled"],
    picked_up: ["in_transit", "exception"],
    in_transit: ["out_for_delivery", "exception"],
    out_for_delivery: ["delivered", "exception"],
    exception: ["in_transit", "out_for_delivery"],
};

// ── Emit event to WebSocket hub ──────────────────────────────
function emitEvent(req, eventType, payload) {
    try {
        if (req.app.get("wsHub")) {
            req.app.get("wsHub").broadcast(req.tenantId, { type: eventType, data: payload, timestamp: new Date().toISOString() });
        }
    } catch (_) { }
    // Persist event log
    try {
        db.prepare(`INSERT INTO event_log (id, tenant_id, event_type, payload, created_at) VALUES (?, ?, ?, ?, datetime('now'))`)
            .run(uuidv4(), req.tenantId, eventType, JSON.stringify(payload));
    } catch (_) { }
}

// ── GET /api/v1/shipments ─────────────────────────────────────
router.get("/", (req, res) => {
    try {
        const { status, carrier, search, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let q = `
            SELECT s.*, w.name as origin_warehouse_name, u.full_name as created_by_name,
                   COUNT(DISTINCT se.id) as event_count,
                   (SELECT COUNT(*) FROM shipment_exceptions ex WHERE ex.shipment_id = s.id AND ex.resolved = 0) as open_exceptions
            FROM shipments s
            LEFT JOIN warehouses w ON s.origin_warehouse_id = w.id
            LEFT JOIN users u ON s.created_by = u.id
            LEFT JOIN shipment_events se ON se.shipment_id = s.id
            WHERE s.tenant_id = ?
        `;
        const params = [req.tenantId];
        if (status) { q += ` AND s.status = ?`; params.push(status); }
        if (carrier) { q += ` AND s.carrier = ?`; params.push(carrier); }
        if (search) { q += ` AND (s.tracking_number LIKE ? OR s.destination_city LIKE ? OR s.recipient_name LIKE ?)`; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        const total = db.prepare(`SELECT COUNT(*) as c FROM shipments WHERE tenant_id = ?`).get(req.tenantId).c;
        q += ` GROUP BY s.id ORDER BY s.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);
        return apiResponse(res, 200, db.prepare(q).all(...params), "Shipments retrieved", { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) });
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});

// ── POST /api/v1/shipments ────────────────────────────────────
router.post("/", (req, res) => {
    try {
        const { origin_warehouse_id, destination_address, destination_city, destination_state, destination_country, destination_zip, recipient_name, recipient_phone, carrier, service_type, weight, dimensions, estimated_delivery, notes, items } = req.body;
        if (!destination_city || !carrier) return apiError(res, 400, "VALIDATION_ERROR", "destination_city and carrier are required");

        const id = uuidv4();
        const tn = trackingNumber();
        db.prepare(`
            INSERT INTO shipments (id, tenant_id, tracking_number, origin_warehouse_id, destination_address, destination_city, destination_state, destination_country, destination_zip, recipient_name, recipient_phone, carrier, service_type, weight, dimensions, status, estimated_delivery, notes, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'created', ?, ?, ?)
        `).run(id, req.tenantId, tn, origin_warehouse_id || null, destination_address || null, destination_city, destination_state || null, destination_country || "India", destination_zip || null, recipient_name || null, recipient_phone || null, carrier, service_type || "standard", weight || null, dimensions ? JSON.stringify(dimensions) : null, estimated_delivery || null, notes || null, req.user.id);

        // Link shipment items
        if (Array.isArray(items) && items.length > 0) {
            for (const item of items) {
                db.prepare(`INSERT INTO shipment_items (id, shipment_id, product_id, quantity, description) VALUES (?, ?, ?, ?, ?)`)
                    .run(uuidv4(), id, item.product_id || null, item.quantity || 1, item.description || null);
            }
        }

        // Create initial event
        db.prepare(`INSERT INTO shipment_events (id, shipment_id, tenant_id, event_type, status, description, location) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), id, req.tenantId, "CREATED", "created", "Shipment created and pending pickup", destination_city);

        db.prepare(`INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, entity_id, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), req.tenantId, req.user.id, "CREATE", "shipment", id, req.ip);

        emitEvent(req, "SHIPMENT_CREATED", { id, tracking_number: tn, carrier, destination_city });
        return apiResponse(res, 201, db.prepare(`SELECT * FROM shipments WHERE id = ?`).get(id), "Shipment created");
    } catch (err) { console.error("[Shipments] Create error:", err); return apiError(res, 500, "SERVER_ERROR", err.message); }
});

// ── GET /api/v1/shipments/:id ─────────────────────────────────
router.get("/:id", (req, res) => {
    try {
        const shipment = db.prepare(`
            SELECT s.*, w.name as origin_warehouse_name, u.full_name as created_by_name
            FROM shipments s
            LEFT JOIN warehouses w ON s.origin_warehouse_id = w.id
            LEFT JOIN users u ON s.created_by = u.id
            WHERE s.id = ? AND s.tenant_id = ?
        `).get(req.params.id, req.tenantId);
        if (!shipment) return apiError(res, 404, "NOT_FOUND", "Shipment not found");

        const events = db.prepare(`SELECT * FROM shipment_events WHERE shipment_id = ? ORDER BY created_at ASC`).all(req.params.id);
        const exceptions = db.prepare(`SELECT * FROM shipment_exceptions WHERE shipment_id = ? ORDER BY created_at DESC`).all(req.params.id);
        const gpsLogs = db.prepare(`SELECT * FROM shipment_gps_logs WHERE shipment_id = ? ORDER BY recorded_at DESC LIMIT 20`).all(req.params.id);
        const items = db.prepare(`SELECT si.*, p.name as product_name, p.sku FROM shipment_items si LEFT JOIN products p ON si.product_id = p.id WHERE si.shipment_id = ?`).all(req.params.id);

        return apiResponse(res, 200, { ...shipment, events, exceptions, gps_logs: gpsLogs, items }, "Shipment retrieved");
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});

// ── PUT /api/v1/shipments/:id ─────────────────────────────────
router.put("/:id", (req, res) => {
    try {
        const shipment = db.prepare(`SELECT * FROM shipments WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!shipment) return apiError(res, 404, "NOT_FOUND", "Shipment not found");
        const { carrier, service_type, estimated_delivery, notes, recipient_name, recipient_phone } = req.body;
        db.prepare(`UPDATE shipments SET carrier = COALESCE(?, carrier), service_type = COALESCE(?, service_type), estimated_delivery = COALESCE(?, estimated_delivery), notes = COALESCE(?, notes), recipient_name = COALESCE(?, recipient_name), recipient_phone = COALESCE(?, recipient_phone), updated_at = datetime('now') WHERE id = ?`)
            .run(carrier, service_type, estimated_delivery, notes, recipient_name, recipient_phone, req.params.id);
        return apiResponse(res, 200, db.prepare(`SELECT * FROM shipments WHERE id = ?`).get(req.params.id), "Shipment updated");
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});

// ── POST /api/v1/shipments/:id/status ────────────────────────
router.post("/:id/status", (req, res) => {
    try {
        const shipment = db.prepare(`SELECT * FROM shipments WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!shipment) return apiError(res, 404, "NOT_FOUND", "Shipment not found");

        const { status, description, location, latitude, longitude } = req.body;
        const allowed = VALID_TRANSITIONS[shipment.status] || [];
        if (!allowed.includes(status)) return apiError(res, 400, "INVALID_TRANSITION", `Cannot transition from '${shipment.status}' to '${status}'`);

        // Update shipment
        const updates = { status, updated_at: "datetime('now')" };
        if (status === "delivered") {
            db.prepare(`UPDATE shipments SET status = ?, actual_delivery = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(status, req.params.id);
        } else {
            db.prepare(`UPDATE shipments SET status = ?, current_location = ?, updated_at = datetime('now') WHERE id = ?`).run(status, location || shipment.current_location, req.params.id);
        }

        // Log event
        db.prepare(`INSERT INTO shipment_events (id, shipment_id, tenant_id, event_type, status, description, location, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), req.params.id, req.tenantId, `STATUS_${status.toUpperCase()}`, status, description || `Shipment status updated to ${status}`, location || null, latitude || null, longitude || null);

        // Log GPS if provided
        if (latitude && longitude) {
            db.prepare(`INSERT INTO shipment_gps_logs (id, shipment_id, latitude, longitude, location_name, recorded_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`)
                .run(uuidv4(), req.params.id, latitude, longitude, location || null);
        }

        // Exception detection
        if (status === "exception") {
            db.prepare(`INSERT INTO shipment_exceptions (id, shipment_id, tenant_id, exception_type, description, detected_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`)
                .run(uuidv4(), req.params.id, req.tenantId, "STATUS_EXCEPTION", description || "Shipment encountered an exception", new Date().toISOString());
            emitEvent(req, "SHIPMENT_EXCEPTION", { id: req.params.id, tracking_number: shipment.tracking_number, description });
        } else if (status === "delivered") {
            // Check if late
            if (shipment.estimated_delivery && new Date() > new Date(shipment.estimated_delivery)) {
                emitEvent(req, "SHIPMENT_DELAYED", { id: req.params.id, tracking_number: shipment.tracking_number, estimated: shipment.estimated_delivery });
            }
            emitEvent(req, "SHIPMENT_DELIVERED", { id: req.params.id, tracking_number: shipment.tracking_number });
        } else {
            emitEvent(req, `SHIPMENT_${status.toUpperCase()}`, { id: req.params.id, tracking_number: shipment.tracking_number, location });
        }

        return apiResponse(res, 200, { id: req.params.id, status, events_logged: 1 }, `Shipment status updated to ${status}`);
    } catch (err) { console.error("[Shipments] Status error:", err); return apiError(res, 500, "SERVER_ERROR", err.message); }
});

// ── POST /api/v1/shipments/:id/gps ───────────────────────────
router.post("/:id/gps", (req, res) => {
    try {
        const shipment = db.prepare(`SELECT * FROM shipments WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!shipment) return apiError(res, 404, "NOT_FOUND", "Shipment not found");
        const { latitude, longitude, location_name, speed_kmh } = req.body;
        if (!latitude || !longitude) return apiError(res, 400, "VALIDATION_ERROR", "latitude and longitude required");

        db.prepare(`INSERT INTO shipment_gps_logs (id, shipment_id, latitude, longitude, location_name, speed_kmh, recorded_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`)
            .run(uuidv4(), req.params.id, latitude, longitude, location_name || null, speed_kmh || null);
        db.prepare(`UPDATE shipments SET current_location = ?, current_lat = ?, current_lng = ?, updated_at = datetime('now') WHERE id = ?`)
            .run(location_name || shipment.current_location, latitude, longitude, req.params.id);

        emitEvent(req, "SHIPMENT_GPS_UPDATE", { id: req.params.id, tracking_number: shipment.tracking_number, latitude, longitude, location_name });
        return apiResponse(res, 200, { latitude, longitude, location_name }, "GPS location updated");
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});

// ── POST /api/v1/shipments/:id/simulate-gps ──────────────────
router.post("/:id/simulate-gps", (req, res) => {
    try {
        const shipment = db.prepare(`SELECT * FROM shipments WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!shipment) return apiError(res, 404, "NOT_FOUND", "Shipment not found");

        // Simulate waypoints along a route
        const waypoints = [
            { lat: 28.6139 + (Math.random() * 0.1 - 0.05), lng: 77.2090 + (Math.random() * 0.1), name: "Delhi Hub", speed: 65 },
            { lat: 26.9124 + (Math.random() * 0.1), lng: 75.7873 + (Math.random() * 0.1), name: "Jaipur Transit", speed: 75 },
            { lat: 23.0225 + (Math.random() * 0.1), lng: 72.5714 + (Math.random() * 0.1), name: "Ahmedabad Hub", speed: 60 },
            { lat: 19.0760 + (Math.random() * 0.1), lng: 72.8777 + (Math.random() * 0.1), name: "Mumbai Sorting Center", speed: 40 },
        ];

        const insertBatch = db.transaction(() => {
            for (const wp of waypoints) {
                db.prepare(`INSERT INTO shipment_gps_logs (id, shipment_id, latitude, longitude, location_name, speed_kmh, recorded_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' hours'))`)
                    .run(uuidv4(), req.params.id, wp.lat, wp.lng, wp.name, wp.speed, waypoints.indexOf(wp));
            }
            const last = waypoints[waypoints.length - 1];
            db.prepare(`UPDATE shipments SET current_location = ?, current_lat = ?, current_lng = ?, updated_at = datetime('now') WHERE id = ?`)
                .run(last.name, last.lat, last.lng, req.params.id);
        });
        insertBatch();

        return apiResponse(res, 200, { waypoints_added: waypoints.length, waypoints }, "GPS simulation complete");
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});

// ── POST /api/v1/shipments/:id/pod ───────────────────────────
router.post("/:id/pod", (req, res) => {
    try {
        const shipment = db.prepare(`SELECT * FROM shipments WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!shipment) return apiError(res, 404, "NOT_FOUND", "Shipment not found");
        const { received_by, signature_url, image_url, notes, latitude, longitude } = req.body;
        if (!received_by) return apiError(res, 400, "VALIDATION_ERROR", "received_by is required");

        db.prepare(`
            INSERT INTO proof_of_delivery (id, shipment_id, tenant_id, received_by, signature_url, image_url, notes, latitude, longitude, delivered_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(uuidv4(), req.params.id, req.tenantId, received_by, signature_url || null, image_url || null, notes || null, latitude || null, longitude || null);

        db.prepare(`UPDATE shipments SET status = 'delivered', actual_delivery = datetime('now'), pod_collected = 1, updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
        db.prepare(`INSERT INTO shipment_events (id, shipment_id, tenant_id, event_type, status, description, location) VALUES (?, ?, ?, 'POD_COLLECTED', 'delivered', ?, ?)`)
            .run(uuidv4(), req.params.id, req.tenantId, `Proof of delivery collected. Received by: ${received_by}`, shipment.destination_city);

        emitEvent(req, "SHIPMENT_POD_COLLECTED", { id: req.params.id, tracking_number: shipment.tracking_number, received_by });
        return apiResponse(res, 200, { pod: true, received_by }, "Proof of delivery recorded");
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});

// ── PATCH /api/v1/shipments/:id/exceptions/:exId/resolve ─────
router.patch("/:id/exceptions/:exId/resolve", (req, res) => {
    try {
        const { resolution_notes } = req.body;
        db.prepare(`UPDATE shipment_exceptions SET resolved = 1, resolved_at = datetime('now'), resolution_notes = ? WHERE id = ? AND shipment_id = ?`)
            .run(resolution_notes || null, req.params.exId, req.params.id);
        emitEvent(req, "EXCEPTION_RESOLVED", { shipment_id: req.params.id, exception_id: req.params.exId });
        return apiResponse(res, 200, { resolved: true }, "Exception resolved");
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});

// ── GET /api/v1/shipments/stats/overview ─────────────────────
router.get("/stats/overview", (req, res) => {
    try {
        const total = db.prepare(`SELECT COUNT(*) as c FROM shipments WHERE tenant_id = ?`).get(req.tenantId).c;
        const inTransit = db.prepare(`SELECT COUNT(*) as c FROM shipments WHERE tenant_id = ? AND status IN ('picked_up','in_transit','out_for_delivery')`).get(req.tenantId).c;
        const delivered = db.prepare(`SELECT COUNT(*) as c FROM shipments WHERE tenant_id = ? AND status = 'delivered'`).get(req.tenantId).c;
        const exceptions = db.prepare(`SELECT COUNT(*) as c FROM shipments WHERE tenant_id = ? AND status = 'exception'`).get(req.tenantId).c;
        const overdue = db.prepare(`SELECT COUNT(*) as c FROM shipments WHERE tenant_id = ? AND status NOT IN ('delivered','cancelled') AND estimated_delivery < datetime('now')`).get(req.tenantId).c;
        const openExceptions = db.prepare(`SELECT COUNT(*) as c FROM shipment_exceptions WHERE tenant_id = ? AND resolved = 0`).get(req.tenantId).c;
        const byCarrier = db.prepare(`SELECT carrier, COUNT(*) as shipments, SUM(CASE WHEN status='delivered' THEN 1 ELSE 0 END) as delivered FROM shipments WHERE tenant_id = ? GROUP BY carrier ORDER BY shipments DESC`).all(req.tenantId);
        const recentEvents = db.prepare(`SELECT se.*, s.tracking_number FROM shipment_events se JOIN shipments s ON se.shipment_id = s.id WHERE s.tenant_id = ? ORDER BY se.created_at DESC LIMIT 15`).all(req.tenantId);
        return apiResponse(res, 200, { total, in_transit: inTransit, delivered, exceptions, overdue, open_exceptions: openExceptions, by_carrier: byCarrier, recent_events: recentEvents }, "Shipment stats");
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});

// ── GET /api/v1/shipments/utils/event-log ────────────────────
router.get("/utils/event-log", (req, res) => {
    try {
        const events = db.prepare(`SELECT * FROM event_log WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50`).all(req.tenantId);
        return apiResponse(res, 200, events, "Event log retrieved");
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});

module.exports = router;
