// ═══════════════════════════════════════════════════════════
// COMPREHENSIVE REAL-TIME DATA SEED SCRIPT
// Seeds realistic data across ALL tables for live dashboards
// ═══════════════════════════════════════════════════════════
const { v4: uuidv4 } = require("uuid");
const db = require("./src/database");

// Helper to generate dates in the past N days
function pastDate(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString();
}
function pastDateStr(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
}
function futureDate(daysAhead) {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString();
}
function randomEl(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomFloat(min, max, decimals = 2) { return +(Math.random() * (max - min) + min).toFixed(decimals); }

db._initPromise.then(() => {
    console.log("Starting comprehensive data seed...");

    // ── TENANT IDs ───────────────────────────────────────────
    const TENANTS = [
        "89cd9579-659f-43f5-a8c3-d0d42aabc44b",  // demo tenant
        "c7600c92-e2f8-47ab-857d-e8bdfe4d99d1"   // akshata tenant
    ];

    // Existing user IDs for each tenant
    const USERS = {
        "89cd9579-659f-43f5-a8c3-d0d42aabc44b": ["28111e7c-4b38-4e1f-ac77-bbdc525a6f98", "84757769-9afa-4679-9c3c-93cb54c2bced"],
        "c7600c92-e2f8-47ab-857d-e8bdfe4d99d1": ["96335c87-2fbb-4ef7-9263-420291042f44"]
    };

    for (const tid of TENANTS) {
        console.log("\n=== Seeding tenant:", tid, "===");
        const users = USERS[tid] || [];
        const userId = users[0];

        // ── GET EXISTING ENTITIES ─────────────────────────────
        const warehouses = db.prepare("SELECT id FROM warehouses WHERE tenant_id = ?").all(tid).map(r => r.id);
        const products = db.prepare("SELECT id, sku, name, cost_price, base_price, reorder_point FROM products WHERE tenant_id = ?").all(tid);
        const suppliers = db.prepare("SELECT id, name FROM suppliers WHERE tenant_id = ?").all(tid);
        const categories = db.prepare("SELECT id FROM product_categories WHERE tenant_id = ?").all(tid).map(r => r.id);
        const shipments = db.prepare("SELECT id, origin_warehouse_id, tracking_number FROM shipments WHERE tenant_id = ?").all(tid);
        const purchaseOrders = db.prepare("SELECT id, supplier_id, warehouse_id, po_number FROM purchase_orders WHERE tenant_id = ?").all(tid);
        const ledgers = db.prepare("SELECT id, product_id, warehouse_id FROM inventory_ledgers WHERE tenant_id = ?").all(tid);

        if (warehouses.length === 0 || products.length === 0 || suppliers.length === 0) {
            console.log("  Skipping - not enough base data");
            continue;
        }

        // ═══════════════════════════════════════════════════════
        // 1. STOCK MOVEMENTS — 18 months of realistic IN/OUT data
        // ═══════════════════════════════════════════════════════
        console.log("  Seeding stock_movements...");
        const existingMovements = db.prepare("SELECT COUNT(*) as c FROM stock_movements WHERE tenant_id = ?").get(tid).c;
        if (existingMovements < 50) {
            const movementTypes = ["IN", "OUT"];
            const refTypes = ["purchase_order", "shipment", "adjustment", "return", "transfer"];
            for (let dayOffset = 540; dayOffset >= 0; dayOffset -= randomInt(1, 3)) {
                // 2-5 movements per period
                const numMovements = randomInt(2, 5);
                for (let m = 0; m < numMovements; m++) {
                    const prod = randomEl(products);
                    const wh = randomEl(warehouses);
                    const type = randomEl(movementTypes);
                    const qty = type === "IN" ? randomInt(20, 200) : randomInt(5, 80);
                    const ledger = ledgers.find(l => l.product_id === prod.id && l.warehouse_id === wh) || ledgers[0];

                    db.prepare(`INSERT OR IGNORE INTO stock_movements (id, tenant_id, ledger_id, product_id, warehouse_id, type, quantity, reference_type, reference_id, notes, performed_by, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
                        uuidv4(), tid, ledger ? ledger.id : null, prod.id, wh, type, qty,
                        randomEl(refTypes), uuidv4(), type === "IN" ? "Stock received" : "Stock dispatched",
                        userId, pastDate(dayOffset + randomFloat(0, 1, 1))
                    );
                }
            }
            console.log("    ✓ Stock movements seeded");
        }

        // ═══════════════════════════════════════════════════════
        // 2. PURCHASE ORDER ITEMS — link products to POs
        // ═══════════════════════════════════════════════════════
        console.log("  Seeding purchase_order_items...");
        const existingPOItems = db.prepare("SELECT COUNT(*) as c FROM purchase_order_items").get().c;
        if (existingPOItems < 20) {
            for (const po of purchaseOrders) {
                const numItems = randomInt(1, 4);
                for (let i = 0; i < numItems; i++) {
                    const prod = randomEl(products);
                    const qty = randomInt(10, 100);
                    const unitPrice = prod.cost_price || randomFloat(5, 200);
                    try {
                        db.prepare(`INSERT INTO purchase_order_items (id, po_id, product_id, quantity, unit_price, line_total, quantity_received, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
                            uuidv4(), po.id, prod.id, qty, unitPrice, +(qty * unitPrice).toFixed(2),
                            po.id.includes("received") ? qty : randomInt(0, qty), pastDate(randomInt(1, 60))
                        );
                    } catch (e) { /* duplicate — skip */ }
                }
            }
            console.log("    ✓ Purchase order items seeded");
        }

        // ═══════════════════════════════════════════════════════
        // 3. GOODS RECEIPT NOTES
        // ═══════════════════════════════════════════════════════
        console.log("  Seeding goods_receipt_notes...");
        const existingGRN = db.prepare("SELECT COUNT(*) as c FROM goods_receipt_notes WHERE tenant_id = ?").get(tid).c;
        if (existingGRN < 5) {
            const receivedPOs = purchaseOrders.filter(p => ["received", "completed"].includes(p.po_number.includes("received") ? "received" : ""));
            // Use all POs
            for (let i = 0; i < Math.min(purchaseOrders.length, 8); i++) {
                const po = purchaseOrders[i];
                const sup = suppliers[0];
                const wh = randomEl(warehouses);
                try {
                    db.prepare(`INSERT INTO goods_receipt_notes (id, tenant_id, grn_number, po_id, supplier_id, warehouse_id, received_by, received_date, quantity_received, quality_passed, delivery_note, vehicle_number, notes, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
                        uuidv4(), tid, "GRN-" + (3000 + i), po.id, sup.id, wh, userId,
                        pastDate(randomInt(1, 30)), randomInt(50, 300), randomInt(40, 300),
                        "Delivery note " + (i + 1), "MH-" + randomInt(10, 99) + "-" + String.fromCharCode(65 + i) + randomInt(1000, 9999),
                        "Quality check passed", pastDate(randomInt(1, 30))
                    );
                } catch (e) { /* skip duplicates */ }
            }
            console.log("    ✓ Goods receipt notes seeded");
        }

        // ═══════════════════════════════════════════════════════
        // 4. SHIPMENT ITEMS — link products to shipments
        // ═══════════════════════════════════════════════════════
        console.log("  Seeding shipment_items...");
        for (const ship of shipments) {
            const existing = db.prepare("SELECT COUNT(*) as c FROM shipment_items WHERE shipment_id = ?").get(ship.id).c;
            if (existing > 0) continue;
            const numItems = randomInt(1, 3);
            for (let i = 0; i < numItems; i++) {
                const prod = randomEl(products);
                db.prepare(`INSERT INTO shipment_items (id, shipment_id, product_id, quantity, description, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)`).run(
                    uuidv4(), ship.id, prod.id, randomInt(5, 50), prod.name + " shipment", pastDate(randomInt(1, 30))
                );
            }
        }
        console.log("    ✓ Shipment items seeded");

        // ═══════════════════════════════════════════════════════
        // 5. SHIPMENT EVENTS — tracking history
        // ═══════════════════════════════════════════════════════
        console.log("  Seeding shipment_events...");
        const cities = ["Mumbai", "Pune", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Kolkata", "Ahmedabad"];
        const eventTypes = ["picked_up", "in_transit", "hub_arrived", "hub_departed", "out_for_delivery", "delivered"];
        for (const ship of shipments) {
            const existing = db.prepare("SELECT COUNT(*) as c FROM shipment_events WHERE shipment_id = ?").get(ship.id).c;
            if (existing > 2) continue;
            const numEvents = randomInt(2, 6);
            for (let i = 0; i < numEvents; i++) {
                const city = randomEl(cities);
                db.prepare(`INSERT INTO shipment_events (id, shipment_id, tenant_id, event_type, status, description, location, latitude, longitude, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
                    uuidv4(), ship.id, tid, eventTypes[Math.min(i, eventTypes.length - 1)],
                    eventTypes[Math.min(i, eventTypes.length - 1)],
                    "Package " + eventTypes[Math.min(i, eventTypes.length - 1)].replace(/_/g, " ") + " at " + city,
                    city, randomFloat(18.5, 28.6), randomFloat(72.8, 88.3),
                    pastDate(30 - i * 3)
                );
            }
        }
        console.log("    ✓ Shipment events seeded");

        // ═══════════════════════════════════════════════════════
        // 6. SHIPMENT EXCEPTIONS
        // ═══════════════════════════════════════════════════════
        console.log("  Seeding shipment_exceptions...");
        const exceptionTypes = ["delay", "damage", "wrong_address", "customs_hold", "weather_delay", "lost_package"];
        for (let i = 0; i < Math.min(4, shipments.length); i++) {
            const ship = shipments[i];
            const existing = db.prepare("SELECT COUNT(*) as c FROM shipment_exceptions WHERE shipment_id = ?").get(ship.id).c;
            if (existing > 0) continue;
            if (Math.random() > 0.6) continue; // 40% chance of exception
            const excType = randomEl(exceptionTypes);
            const resolved = Math.random() > 0.4 ? 1 : 0;
            db.prepare(`INSERT INTO shipment_exceptions (id, shipment_id, tenant_id, exception_type, description, detected_at, resolved, resolved_at, resolution_notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
                uuidv4(), ship.id, tid, excType,
                excType === "delay" ? "Shipment delayed due to traffic congestion" :
                    excType === "damage" ? "Minor package damage detected at sorting hub" :
                        excType === "weather_delay" ? "Delayed due to heavy rainfall" :
                            "Exception recorded for shipment",
                pastDate(randomInt(5, 15)), resolved,
                resolved ? pastDate(randomInt(1, 4)) : null,
                resolved ? "Issue resolved and shipment rerouted" : null,
                pastDate(randomInt(5, 15))
            );
        }
        console.log("    ✓ Shipment exceptions seeded");

        // ═══════════════════════════════════════════════════════
        // 7. SHIPMENT GPS LOGS
        // ═══════════════════════════════════════════════════════
        console.log("  Seeding shipment_gps_logs...");
        const gpsRoutes = [
            { lat: 19.076, lng: 72.877, name: "Mumbai" },
            { lat: 18.520, lng: 73.856, name: "Pune" },
            { lat: 17.385, lng: 78.486, name: "Hyderabad" },
            { lat: 12.971, lng: 77.594, name: "Bangalore" },
            { lat: 13.082, lng: 80.271, name: "Chennai" },
        ];
        for (const ship of shipments) {
            const existing = db.prepare("SELECT COUNT(*) as c FROM shipment_gps_logs WHERE shipment_id = ?").get(ship.id).c;
            if (existing > 0) continue;
            // 5-10 GPS points per shipment
            for (let g = 0; g < randomInt(5, 10); g++) {
                const point = gpsRoutes[g % gpsRoutes.length];
                db.prepare(`INSERT INTO shipment_gps_logs (id, shipment_id, latitude, longitude, location_name, speed_kmh, recorded_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
                    uuidv4(), ship.id,
                    point.lat + randomFloat(-0.5, 0.5, 4),
                    point.lng + randomFloat(-0.5, 0.5, 4),
                    point.name + " - " + (g % 2 === 0 ? "Highway" : "City Center"),
                    randomFloat(30, 90, 1),
                    pastDate(20 - g * 2)
                );
            }
        }
        console.log("    ✓ GPS logs seeded");

        // ═══════════════════════════════════════════════════════
        // 8. PROOF OF DELIVERY
        // ═══════════════════════════════════════════════════════
        console.log("  Seeding proof_of_delivery...");
        const deliveredShipments = shipments.filter(s => s.tracking_number);
        for (let i = 0; i < Math.min(3, deliveredShipments.length); i++) {
            const ship = deliveredShipments[i];
            const existing = db.prepare("SELECT COUNT(*) as c FROM proof_of_delivery WHERE shipment_id = ?").get(ship.id).c;
            if (existing > 0) continue;
            db.prepare(`INSERT INTO proof_of_delivery (id, shipment_id, tenant_id, received_by, signature_url, image_url, notes, latitude, longitude, delivered_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
                uuidv4(), ship.id, tid,
                randomEl(["Rajesh Kumar", "Priya Sharma", "Amit Patel", "Sneha Reddy", "Vikram Singh"]),
                "/signatures/sig_" + i + ".png", "/pod/pod_" + i + ".jpg",
                "Delivered in good condition. No damage observed.",
                randomFloat(18.5, 19.2, 4), randomFloat(72.8, 73.9, 4),
                pastDate(randomInt(1, 10))
            );
        }
        console.log("    ✓ Proof of delivery seeded");

        // ═══════════════════════════════════════════════════════
        // 9. PRODUCT VARIANTS
        // ═══════════════════════════════════════════════════════
        console.log("  Seeding product_variants...");
        const existingVariants = db.prepare("SELECT COUNT(*) as c FROM product_variants").get().c;
        if (existingVariants < 5) {
            const colors = ["Red", "Blue", "Black", "Silver", "White"];
            const sizes = ["S", "M", "L", "XL"];
            for (let i = 0; i < Math.min(6, products.length); i++) {
                const prod = products[i];
                const numVariants = randomInt(2, 4);
                for (let v = 0; v < numVariants; v++) {
                    const color = randomEl(colors);
                    const size = randomEl(sizes);
                    try {
                        db.prepare(`INSERT INTO product_variants (id, product_id, sku_suffix, attributes, price_modifier, is_active, created_at)
                            VALUES (?, ?, ?, ?, ?, 1, ?)`).run(
                            uuidv4(), prod.id, "-" + color.charAt(0) + size,
                            JSON.stringify({ color, size }), randomFloat(-5, 15, 2),
                            pastDate(randomInt(10, 60))
                        );
                    } catch (e) { /* skip */ }
                }
            }
            console.log("    ✓ Product variants seeded");
        }

        // ═══════════════════════════════════════════════════════
        // 10. SUPPLIER SCORECARDS — monthly performance
        // ═══════════════════════════════════════════════════════
        console.log("  Seeding supplier_scorecards...");
        for (const sup of suppliers) {
            const existingSC = db.prepare("SELECT COUNT(*) as c FROM supplier_scorecards WHERE supplier_id = ?").get(sup.id).c;
            if (existingSC > 3) continue;
            for (let monthAgo = 0; monthAgo < 6; monthAgo++) {
                const d = new Date();
                d.setMonth(d.getMonth() - monthAgo);
                const period = d.toISOString().slice(0, 7);
                try {
                    db.prepare(`INSERT INTO supplier_scorecards (id, supplier_id, on_time_rate, quality_rate, price_score, overall_score, total_orders, period, calculated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
                        uuidv4(), sup.id,
                        randomFloat(70, 99), randomFloat(85, 100), randomFloat(60, 95),
                        randomFloat(75, 95), randomInt(5, 30), period, pastDate(monthAgo * 30)
                    );
                } catch (e) { /* skip */ }
            }
        }
        console.log("    ✓ Supplier scorecards seeded");

        // ═══════════════════════════════════════════════════════
        // 11. AUDIT LOGS — comprehensive activity trail
        // ═══════════════════════════════════════════════════════
        console.log("  Seeding audit_logs...");
        const existingAudit = db.prepare("SELECT COUNT(*) as c FROM audit_logs WHERE tenant_id = ?").get(tid).c;
        if (existingAudit < 50) {
            const actions = ["CREATE", "UPDATE", "DELETE", "VIEW", "EXPORT", "APPROVE", "REJECT", "LOGIN"];
            const entities = ["product", "warehouse", "supplier", "purchase_order", "shipment", "inventory", "user", "report"];
            for (let i = 0; i < 80; i++) {
                const action = randomEl(actions);
                const entity = randomEl(entities);
                db.prepare(`INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, entity_id, old_values, new_values, ip_address, user_agent, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
                    uuidv4(), tid, randomEl(users), action, entity, uuidv4(),
                    action === "UPDATE" ? JSON.stringify({ status: "draft" }) : null,
                    action === "UPDATE" ? JSON.stringify({ status: "active" }) : action === "CREATE" ? JSON.stringify({ name: entity + "_" + i }) : null,
                    "192.168.1." + randomInt(1, 254),
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    pastDate(randomInt(0, 90))
                );
            }
            console.log("    ✓ Audit logs seeded");
        }

        // ═══════════════════════════════════════════════════════
        // 12. EVENT LOG
        // ═══════════════════════════════════════════════════════
        console.log("  Seeding event_log...");
        const existingEvents = db.prepare("SELECT COUNT(*) as c FROM event_log WHERE tenant_id = ?").get(tid).c;
        if (existingEvents < 10) {
            const eventTypes = [
                "stock_alert", "low_stock_warning", "reorder_triggered", "shipment_delayed",
                "supplier_rating_changed", "po_approved", "grn_created", "inventory_adjustment"
            ];
            for (let i = 0; i < 20; i++) {
                const evtType = randomEl(eventTypes);
                db.prepare(`INSERT INTO event_log (id, tenant_id, event_type, payload, created_at)
                    VALUES (?, ?, ?, ?, ?)`).run(
                    uuidv4(), tid, evtType,
                    JSON.stringify({
                        message: evtType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
                        product: products.length > 0 ? randomEl(products).name : "Unknown",
                        severity: randomEl(["info", "warning", "critical"]),
                        value: randomInt(1, 500)
                    }),
                    pastDate(randomInt(0, 30))
                );
            }
            console.log("    ✓ Event log seeded");
        }

        // ═══════════════════════════════════════════════════════
        // 13. PROVENANCE LEDGER (blockchain-style audit trail)
        // ═══════════════════════════════════════════════════════
        console.log("  Seeding provenance_ledger...");
        const existingProv = db.prepare("SELECT COUNT(*) as c FROM provenance_ledger WHERE tenant_id = ?").get(tid).c;
        if (existingProv < 10) {
            let prevHash = "0000000000000000000000000000000000000000";
            const provActions = ["CREATED", "TRANSFERRED", "INSPECTED", "SHIPPED", "RECEIVED", "PROCESSED"];
            for (let i = 0; i < 30; i++) {
                const entityType = randomEl(["product", "shipment", "inventory", "purchase_order"]);
                const entityId = products.length > 0 ? randomEl(products).id : uuidv4();
                const action = randomEl(provActions);
                const hash = require("crypto").createHash("sha256")
                    .update(prevHash + entityType + entityId + action + i)
                    .digest("hex").slice(0, 40);
                db.prepare(`INSERT INTO provenance_ledger (id, tenant_id, block_number, previous_hash, hash, entity_type, entity_id, action, data, actor, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
                    uuidv4(), tid, i + 1, prevHash, hash, entityType, entityId, action,
                    JSON.stringify({
                        description: action + " " + entityType,
                        location: randomEl(cities),
                        verified: Math.random() > 0.3
                    }),
                    userId, pastDate(30 - i)
                );
                prevHash = hash;
            }
            console.log("    ✓ Provenance ledger seeded");
        }

        // ═══════════════════════════════════════════════════════
        // 14. UPDATE INVENTORY LEDGER EXPIRY / BATCH DATA
        // ═══════════════════════════════════════════════════════
        console.log("  Updating inventory ledger metadata...");
        const allLedgers = db.prepare("SELECT id FROM inventory_ledgers WHERE tenant_id = ?").all(tid);
        for (const l of allLedgers) {
            const batchNo = "BAT-" + new Date().getFullYear() + "-" + randomInt(1000, 9999);
            const lotNo = "LOT-" + String.fromCharCode(65 + randomInt(0, 25)) + randomInt(100, 999);
            const expiry = futureDate(randomInt(30, 365));
            const mfgDate = pastDate(randomInt(30, 180));
            db.prepare(`UPDATE inventory_ledgers SET batch_no = ?, lot_no = ?, expiry_date = ?, manufacturing_date = ?, unit_cost = ? WHERE id = ?`).run(
                batchNo, lotNo, expiry, mfgDate, randomFloat(5, 150, 2), l.id
            );
        }
        console.log("    ✓ Ledger metadata updated");

        // ═══════════════════════════════════════════════════════
        // 15. ADD MORE PURCHASE REQUISITIONS
        // ═══════════════════════════════════════════════════════
        console.log("  Seeding purchase_requisitions...");
        const existingPR = db.prepare("SELECT COUNT(*) as c FROM purchase_requisitions WHERE tenant_id = ?").get(tid).c;
        if (existingPR < 8) {
            const prStatuses = ["pending", "approved", "rejected", "converted"];
            const priorities = ["low", "medium", "high", "critical"];
            for (let i = 0; i < 8; i++) {
                const prId = uuidv4();
                const status = prStatuses[i % prStatuses.length];
                try {
                    db.prepare(`INSERT INTO purchase_requisitions (id, tenant_id, pr_number, warehouse_id, requested_by, approved_by, approved_at, status, priority, total_quantity, estimated_total, notes, auto_generated, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
                        prId, tid, "PR-" + (5000 + i), randomEl(warehouses), userId,
                        status === "approved" ? userId : null,
                        status === "approved" ? pastDate(randomInt(1, 10)) : null,
                        status, randomEl(priorities), randomInt(50, 500),
                        randomFloat(500, 15000), "Auto-reorder for low stock items",
                        Math.random() > 0.5 ? 1 : 0, pastDate(randomInt(1, 45))
                    );

                    // Add items to PR
                    for (let j = 0; j < randomInt(1, 3); j++) {
                        const prod = randomEl(products);
                        db.prepare(`INSERT INTO purchase_requisition_items (id, requisition_id, product_id, quantity, estimated_unit_cost, notes, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
                            uuidv4(), prId, prod.id, randomInt(10, 100),
                            prod.cost_price || randomFloat(5, 100),
                            "Replenishment needed", pastDate(randomInt(1, 45))
                        );
                    }
                } catch (e) { /* skip duplicates */ }
            }
            console.log("    ✓ Purchase requisitions seeded");
        }

        // ═══════════════════════════════════════════════════════
        // 16. UPDATE SHIPMENTS WITH REAL LOCATIONS & DATA
        // ═══════════════════════════════════════════════════════
        console.log("  Updating shipments with real data...");
        const allShipments = db.prepare("SELECT id, status FROM shipments WHERE tenant_id = ?").all(tid);
        const carriers = ["BlueDart", "DTDC", "DHL Express", "FedEx India", "Delhivery", "Ecom Express"];
        const destCities = ["Mumbai", "Pune", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Kolkata", "Ahmedabad", "Jaipur", "Lucknow"];
        const recipients = ["Rajesh Kumar", "Priya Sharma", "Amit Patel", "Sneha Reddy", "Vikram Singh", "Anita Desai", "Suresh Nair"];
        for (const ship of allShipments) {
            const city = randomEl(destCities);
            db.prepare(`UPDATE shipments SET carrier = ?, destination_city = ?, destination_state = ?, destination_country = ?, recipient_name = ?, recipient_phone = ?, weight = ?, dimensions = ?, estimated_delivery = ?, origin_warehouse_id = COALESCE(origin_warehouse_id, ?) WHERE id = ?`).run(
                randomEl(carriers), city,
                city === "Mumbai" ? "Maharashtra" : city === "Pune" ? "Maharashtra" : city === "Delhi" ? "Delhi" : city === "Bangalore" ? "Karnataka" : "Tamil Nadu",
                "India", randomEl(recipients), "+91 " + randomInt(70000, 99999) + randomInt(10000, 99999),
                randomFloat(0.5, 50, 1), randomInt(10, 60) + "x" + randomInt(10, 40) + "x" + randomInt(5, 30) + "cm",
                futureDate(randomInt(1, 14)), randomEl(warehouses),
                ship.id
            );
        }
        console.log("    ✓ Shipments updated");

        // ═══════════════════════════════════════════════════════
        // 17. UPDATE SUPPLIERS WITH COMPLETE DATA
        // ═══════════════════════════════════════════════════════
        console.log("  Updating suppliers with complete data...");
        const supplierCities = [
            { city: "Mumbai", state: "Maharashtra", country: "India" },
            { city: "Shenzhen", state: "Guangdong", country: "China" },
            { city: "Stuttgart", state: "Baden-Württemberg", country: "Germany" },
            { city: "Detroit", state: "Michigan", country: "USA" },
            { city: "Tokyo", state: "Kanto", country: "Japan" },
            { city: "Pune", state: "Maharashtra", country: "India" },
            { city: "Seoul", state: "Gyeonggi", country: "South Korea" }
        ];
        const paymentTerms = ["NET15", "NET30", "NET45", "NET60", "COD"];
        const contacts = ["John Chen", "Hans Mueller", "Takeshi Yamamoto", "Maria Santos", "Raj Patel", "Li Wei", "Kim Soo-jin"];

        for (let i = 0; i < suppliers.length; i++) {
            const sup = suppliers[i];
            const loc = supplierCities[i % supplierCities.length];
            db.prepare(`UPDATE suppliers SET email = ?, phone = ?, city = ?, state = ?, country = ?, contact_person = ?, payment_terms = ?, rating = ?, lead_time_days = ?, website = ?, contract_start_date = ?, contract_end_date = ? WHERE id = ?`).run(
                sup.name.toLowerCase().replace(/\s+/g, ".") + "@supplier.com",
                "+91 " + randomInt(70000, 99999) + randomInt(10000, 99999),
                loc.city, loc.state, loc.country,
                randomEl(contacts), randomEl(paymentTerms),
                randomFloat(3.0, 4.9, 1), randomInt(3, 21),
                "https://" + sup.name.toLowerCase().replace(/\s+/g, "") + ".com",
                pastDateStr(randomInt(180, 365)), futureDate(randomInt(90, 365)).slice(0, 10),
                sup.id
            );
        }
        console.log("    ✓ Suppliers updated");

        console.log("  ✅ Tenant " + tid + " seeding complete!");
    }

    console.log("\n════════════════════════════════════════════");
    console.log("  ALL DATA SEEDED SUCCESSFULLY!");
    console.log("════════════════════════════════════════════");

    // Final counts
    const finalTables = ["stock_movements", "purchase_order_items", "goods_receipt_notes", "shipment_items", "shipment_events", "shipment_exceptions", "shipment_gps_logs", "proof_of_delivery", "product_variants", "supplier_scorecards", "audit_logs", "event_log", "provenance_ledger", "purchase_requisitions", "purchase_requisition_items"];
    console.log("\nFinal data counts:");
    for (const t of finalTables) {
        const c = db.prepare("SELECT COUNT(*) as c FROM " + t).get().c;
        console.log("  " + t + ": " + c);
    }

    process.exit(0);
}).catch(err => { console.error("SEED ERROR:", err); process.exit(1); });
