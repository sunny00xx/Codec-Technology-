const express = require("express");
const router = express.Router();
const db = require("../database");
const { authMiddleware, apiResponse, apiError } = require("../middleware/auth");

router.use(authMiddleware);

// ════════════════════════════════════════════════════════════
//  DEMAND FORECASTING ENGINE
// ════════════════════════════════════════════════════════════

/**
 * Simple linear regression: y = mx + b
 * Returns { slope, intercept, r2, predict(x) }
 */
function linearRegression(xs, ys) {
    const n = xs.length;
    if (n < 2) return { slope: 0, intercept: ys[0] || 0, r2: 0, predict: () => ys[0] || 0 };
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
    const sumXX = xs.reduce((a, x) => a + x * x, 0);
    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0, predict: () => sumY / n };
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    // R² calculation
    const meanY = sumY / n;
    const ssRes = ys.reduce((a, y, i) => a + (y - (slope * xs[i] + intercept)) ** 2, 0);
    const ssTot = ys.reduce((a, y) => a + (y - meanY) ** 2, 0);
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return { slope, intercept, r2, predict: (x) => Math.max(0, Math.round(slope * x + intercept)) };
}

/**
 * Moving average (window-based)
 */
function movingAverage(data, window = 3) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
        const start = Math.max(0, i - window + 1);
        const slice = data.slice(start, i + 1);
        result.push(Math.round(slice.reduce((a, b) => a + b, 0) / slice.length));
    }
    return result;
}

/**
 * Seasonal adjustment coefficients
 * Computes ratio of each month's average to overall average
 */
function seasonalCoefficients(monthlyData) {
    // monthlyData: array of { month: "01"..."12", qty }
    const monthMap = {};
    for (const d of monthlyData) {
        const m = d.month.slice(-2); // last 2 chars = month
        if (!monthMap[m]) monthMap[m] = [];
        monthMap[m].push(d.qty);
    }
    const overallAvg = monthlyData.length > 0 ? monthlyData.reduce((a, d) => a + d.qty, 0) / monthlyData.length : 1;
    const coeffs = {};
    for (let m = 1; m <= 12; m++) {
        const key = String(m).padStart(2, "0");
        const arr = monthMap[key] || [];
        const avg = arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : overallAvg;
        coeffs[key] = overallAvg > 0 ? +(avg / overallAvg).toFixed(3) : 1;
    }
    return coeffs;
}

// ── GET /forecast/:productId ─────────────────────────────────
router.get("/forecast/:productId", (req, res, next) => {
    if (req.params.productId === "all") return next();
    try {
        const { productId } = req.params;
        const { months = 6 } = req.query;
        const forecastMonths = parseInt(months);

        const product = db.prepare(`SELECT * FROM products WHERE id = ? AND tenant_id = ?`).get(productId, req.tenantId);
        if (!product) return apiError(res, 404, "NOT_FOUND", "Product not found");

        // Historical monthly OUT movements (demand)
        const history = db.prepare(`
            SELECT strftime('%Y-%m', created_at) as month, SUM(quantity) as qty
            FROM stock_movements
            WHERE product_id = ? AND tenant_id = ? AND type = 'OUT' AND created_at >= date('now', '-18 months')
            GROUP BY month ORDER BY month
        `).all(productId, req.tenantId);

        if (history.length < 2) {
            return apiResponse(res, 200, {
                product: { id: product.id, name: product.name, sku: product.sku },
                history, forecast: [], accuracy: { r2: 0, mape: 0 },
                moving_average: [], seasonal_coefficients: {},
                message: "Insufficient history for forecasting (need 2+ months)"
            }, "Forecast generated");
        }

        // Prepare data for regression
        const xs = history.map((_, i) => i);
        const ys = history.map((h) => h.qty);
        const reg = linearRegression(xs, ys);
        const ma = movingAverage(ys, 3);
        const seasonal = seasonalCoefficients(history);

        // Generate forecast
        const forecast = [];
        const lastDate = new Date(history[history.length - 1].month + "-01");
        for (let i = 1; i <= forecastMonths; i++) {
            const futureDate = new Date(lastDate);
            futureDate.setMonth(futureDate.getMonth() + i);
            const monthStr = futureDate.toISOString().slice(0, 7);
            const monthNum = String(futureDate.getMonth() + 1).padStart(2, "0");
            const basePrediction = reg.predict(history.length + i - 1);
            const coeff = seasonal[monthNum] || 1;
            const adjusted = Math.max(0, Math.round(basePrediction * coeff));

            // Moving average prediction (use last MA value + trend)
            const maPred = ma.length > 0 ? Math.max(0, Math.round(ma[ma.length - 1] + reg.slope * i)) : adjusted;

            forecast.push({
                month: monthStr,
                regression: basePrediction,
                seasonal_adjusted: adjusted,
                moving_average: maPred,
                recommended: Math.round((adjusted + maPred) / 2), // ensemble
            });
        }

        // Accuracy metrics
        const mape = ys.length > 0
            ? ys.reduce((a, actual, i) => {
                const pred = reg.predict(i);
                return a + (actual > 0 ? Math.abs(actual - pred) / actual : 0);
            }, 0) / ys.length * 100
            : 0;

        return apiResponse(res, 200, {
            product: { id: product.id, name: product.name, sku: product.sku },
            history: history.map((h, i) => ({ ...h, predicted: reg.predict(i), ma: ma[i] })),
            forecast,
            accuracy: { r2: +reg.r2.toFixed(4), mape: +mape.toFixed(2), slope: +reg.slope.toFixed(2) },
            moving_average: ma,
            seasonal_coefficients: seasonal,
        }, "Forecast generated");
    } catch (err) { console.error("[AI] Forecast error:", err); return apiError(res, 500, "SERVER_ERROR", err.message); }
});

// ── GET /forecast/all ────────────────────────────────────────
router.get("/forecast/all", (req, res) => {
    try {
        // Get top 10 most-moved products and forecast each
        const topProducts = db.prepare(`
            SELECT p.id, p.name, p.sku, SUM(sm.quantity) as total_demand
            FROM stock_movements sm JOIN products p ON sm.product_id = p.id
            WHERE sm.tenant_id = ? AND sm.type = 'OUT' AND sm.created_at >= date('now', '-6 months')
            GROUP BY p.id ORDER BY total_demand DESC LIMIT 10
        `).all(req.tenantId);

        const forecasts = topProducts.map((prod) => {
            const history = db.prepare(`
                SELECT strftime('%Y-%m', created_at) as month, SUM(quantity) as qty
                FROM stock_movements WHERE product_id = ? AND tenant_id = ? AND type = 'OUT' AND created_at >= date('now', '-12 months')
                GROUP BY month ORDER BY month
            `).all(prod.id, req.tenantId);

            if (history.length < 2) return { product: prod, next_month_forecast: 0, trend: "flat" };

            const xs = history.map((_, i) => i);
            const ys = history.map((h) => h.qty);
            const reg = linearRegression(xs, ys);
            const nextPred = reg.predict(history.length);
            const trend = reg.slope > 1 ? "rising" : reg.slope < -1 ? "declining" : "flat";

            return { product: prod, next_month_forecast: nextPred, trend, r2: +reg.r2.toFixed(3), slope: +reg.slope.toFixed(2) };
        });

        return apiResponse(res, 200, forecasts, "All forecasts");
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});


// ════════════════════════════════════════════════════════════
//  ANOMALY DETECTION ENGINE
// ════════════════════════════════════════════════════════════

/**
 * Z-score anomaly detection
 * Flags values that deviate > threshold std deviations from mean
 */
function detectZScoreAnomalies(values, labels, threshold = 2) {
    const n = values.length;
    if (n < 3) return [];
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / n);
    if (std === 0) return [];
    const anomalies = [];
    for (let i = 0; i < n; i++) {
        const z = (values[i] - mean) / std;
        if (Math.abs(z) > threshold) {
            anomalies.push({ index: i, value: values[i], z_score: +z.toFixed(3), label: labels[i], severity: Math.abs(z) > 3 ? "critical" : "warning" });
        }
    }
    return anomalies;
}

// ── GET /anomalies ───────────────────────────────────────────
router.get("/anomalies", (req, res) => {
    try {
        const tid = req.tenantId;
        const alerts = [];

        // 1. Procurement price anomalies — Z-score on PO unit prices per product
        const poItems = db.prepare(`
            SELECT poi.product_id, p.name as product_name, p.sku, poi.unit_price, po.po_number, po.created_at
            FROM purchase_order_items poi
            JOIN purchase_orders po ON poi.po_id = po.id
            JOIN products p ON poi.product_id = p.id
            WHERE po.tenant_id = ?
            ORDER BY poi.product_id, po.created_at
        `).all(tid);

        const byProduct = {};
        for (const item of poItems) {
            if (!byProduct[item.product_id]) byProduct[item.product_id] = [];
            byProduct[item.product_id].push(item);
        }
        for (const [pid, items] of Object.entries(byProduct)) {
            if (items.length < 3) continue;
            const prices = items.map((i) => i.unit_price);
            const labels = items.map((i) => `PO ${i.po_number} on ${i.created_at?.slice(0, 10)}`);
            const anomalies = detectZScoreAnomalies(prices, labels, 2);
            for (const a of anomalies) {
                alerts.push({
                    type: "PRICE_ANOMALY",
                    severity: a.severity,
                    product: items[0].product_name,
                    sku: items[0].sku,
                    description: `Price $${a.value} on ${a.label} is ${a.z_score > 0 ? "above" : "below"} normal (z=${a.z_score})`,
                    value: a.value,
                    z_score: a.z_score,
                });
            }
        }

        // 2. Ghost inventory detection — items with stock but no movement in 90+ days
        const ghostItems = db.prepare(`
            SELECT p.name, p.sku, il.quantity, w.name as warehouse,
                   (SELECT MAX(sm.created_at) FROM stock_movements sm WHERE sm.product_id = il.product_id AND sm.warehouse_id = il.warehouse_id) as last_movement
            FROM inventory_ledgers il
            JOIN products p ON il.product_id = p.id
            LEFT JOIN warehouses w ON il.warehouse_id = w.id
            WHERE il.tenant_id = ? AND il.quantity > 0
        `).all(tid);

        for (const item of ghostItems) {
            if (!item.last_movement) {
                alerts.push({ type: "GHOST_INVENTORY", severity: "critical", product: item.name, sku: item.sku, description: `${item.quantity} units in ${item.warehouse || "unknown"} with NO recorded movements`, warehouse: item.warehouse });
            } else {
                const daysSince = Math.floor((Date.now() - new Date(item.last_movement).getTime()) / 86400000);
                if (daysSince > 90) {
                    alerts.push({ type: "GHOST_INVENTORY", severity: daysSince > 180 ? "critical" : "warning", product: item.name, sku: item.sku, description: `${item.quantity} units in ${item.warehouse || "unknown"} — no movement for ${daysSince} days`, warehouse: item.warehouse, days_stale: daysSince });
                }
            }
        }

        // 3. Duplicate vendor detection (fuzzy name matching)
        const suppliers = db.prepare(`SELECT id, name, supplier_code, city, country, email FROM suppliers WHERE tenant_id = ?`).all(tid);
        for (let i = 0; i < suppliers.length; i++) {
            for (let j = i + 1; j < suppliers.length; j++) {
                const sim = nameSimilarity(suppliers[i].name, suppliers[j].name);
                if (sim > 0.75 && suppliers[i].id !== suppliers[j].id) {
                    alerts.push({
                        type: "DUPLICATE_VENDOR",
                        severity: sim > 0.9 ? "critical" : "warning",
                        description: `"${suppliers[i].name}" and "${suppliers[j].name}" are ${Math.round(sim * 100)}% similar — possible duplicate`,
                        supplier_a: suppliers[i].name,
                        supplier_b: suppliers[j].name,
                        similarity: +sim.toFixed(3),
                    });
                }
            }
        }

        // 4. Quantity anomalies — unusually large stock movements
        const recentMoves = db.prepare(`
            SELECT sm.quantity, sm.type, sm.created_at, p.name as product_name, p.sku
            FROM stock_movements sm JOIN products p ON sm.product_id = p.id
            WHERE sm.tenant_id = ? AND sm.created_at >= date('now', '-3 months')
            ORDER BY sm.created_at
        `).all(tid);

        if (recentMoves.length >= 5) {
            const qtys = recentMoves.map((m) => m.quantity);
            const labels = recentMoves.map((m) => `${m.type} ${m.product_name} on ${m.created_at?.slice(0, 10)}`);
            const qtyAnomalies = detectZScoreAnomalies(qtys, labels, 2.5);
            for (const a of qtyAnomalies) {
                alerts.push({
                    type: "QUANTITY_ANOMALY",
                    severity: a.severity,
                    description: `Unusual quantity ${a.value} — ${a.label} (z=${a.z_score})`,
                    value: a.value,
                    z_score: a.z_score,
                });
            }
        }

        // Sort by severity (critical first)
        alerts.sort((a, b) => (a.severity === "critical" ? 0 : 1) - (b.severity === "critical" ? 0 : 1));

        const summary = {
            total: alerts.length,
            critical: alerts.filter((a) => a.severity === "critical").length,
            warning: alerts.filter((a) => a.severity === "warning").length,
            by_type: {
                price: alerts.filter((a) => a.type === "PRICE_ANOMALY").length,
                ghost: alerts.filter((a) => a.type === "GHOST_INVENTORY").length,
                duplicate: alerts.filter((a) => a.type === "DUPLICATE_VENDOR").length,
                quantity: alerts.filter((a) => a.type === "QUANTITY_ANOMALY").length,
            },
        };

        return apiResponse(res, 200, { alerts, summary }, "Anomaly detection complete");
    } catch (err) { console.error("[AI] Anomaly error:", err); return apiError(res, 500, "SERVER_ERROR", err.message); }
});

/**
 * Jaro-Winkler-ish similarity for vendor name matching
 */
function nameSimilarity(a, b) {
    if (!a || !b) return 0;
    a = a.toLowerCase().replace(/[^a-z0-9]/g, "");
    b = b.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;
    const longer = a.length >= b.length ? a : b;
    const shorter = a.length >= b.length ? b : a;
    const matchWindow = Math.floor(Math.max(longer.length, shorter.length) / 2) - 1;
    let matches = 0;
    const lUsed = new Array(longer.length).fill(false);
    const sUsed = new Array(shorter.length).fill(false);
    for (let i = 0; i < shorter.length; i++) {
        const start = Math.max(0, i - matchWindow);
        const end = Math.min(longer.length - 1, i + matchWindow);
        for (let j = start; j <= end; j++) {
            if (!lUsed[j] && shorter[i] === longer[j]) { lUsed[j] = true; sUsed[i] = true; matches++; break; }
        }
    }
    if (matches === 0) return 0;
    let transpositions = 0;
    let k = 0;
    for (let i = 0; i < shorter.length; i++) {
        if (!sUsed[i]) continue;
        while (!lUsed[k]) k++;
        if (shorter[i] !== longer[k]) transpositions++;
        k++;
    }
    const jaro = (matches / shorter.length + matches / longer.length + (matches - transpositions / 2) / matches) / 3;
    // Winkler prefix bonus
    let prefix = 0;
    for (let i = 0; i < Math.min(4, shorter.length); i++) {
        if (shorter[i] === longer[i]) prefix++;
        else break;
    }
    return +(jaro + prefix * 0.1 * (1 - jaro)).toFixed(4);
}

module.exports = router;
