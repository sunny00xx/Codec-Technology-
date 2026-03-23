const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const db = require("../database");
const { authMiddleware, apiResponse, apiError } = require("../middleware/auth");

router.use(authMiddleware);

// ============================================================
// HELPERS
// ============================================================
function generateSKU(name, categoryId) {
    const prefix = name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4).padEnd(4, "X");
    const suffix = Date.now().toString(36).toUpperCase().slice(-5);
    return `${prefix}-${suffix}`;
}

function generateBarcode(sku) {
    // Simple EAN-like pattern based on SKU hash code
    const hash = sku.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return `${8900000000000 + (hash % 9999999)}`;
}

// ============================================================
// CATEGORIES
// ============================================================
router.get("/categories", (req, res) => {
    try {
        const categories = db.prepare(`
            SELECT c.*, COUNT(p.id) as product_count 
            FROM product_categories c 
            LEFT JOIN products p ON p.category_id = c.id AND p.tenant_id = c.tenant_id
            WHERE c.tenant_id = ? 
            GROUP BY c.id 
            ORDER BY c.name
        `).all(req.tenantId);
        return apiResponse(res, 200, categories, "Categories retrieved");
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

router.post("/categories", (req, res) => {
    try {
        const { name, parent_id, description } = req.body;
        if (!name) return apiError(res, 400, "VALIDATION_ERROR", "Category name is required");

        const id = uuidv4();
        db.prepare(`INSERT INTO product_categories (id, tenant_id, name, parent_id, description) VALUES (?, ?, ?, ?, ?)`)
            .run(id, req.tenantId, name, parent_id || null, description || null);
        const cat = db.prepare(`SELECT * FROM product_categories WHERE id = ?`).get(id);
        return apiResponse(res, 201, cat, "Category created successfully");
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

router.put("/categories/:id", (req, res) => {
    try {
        const cat = db.prepare(`SELECT * FROM product_categories WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!cat) return apiError(res, 404, "NOT_FOUND", "Category not found");
        const { name, parent_id, description } = req.body;
        db.prepare(`UPDATE product_categories SET name = COALESCE(?, name), parent_id = ?, description = COALESCE(?, description) WHERE id = ?`)
            .run(name, parent_id !== undefined ? parent_id : cat.parent_id, description, req.params.id);
        return apiResponse(res, 200, db.prepare(`SELECT * FROM product_categories WHERE id = ?`).get(req.params.id), "Category updated");
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

router.delete("/categories/:id", (req, res) => {
    try {
        const cat = db.prepare(`SELECT * FROM product_categories WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!cat) return apiError(res, 404, "NOT_FOUND", "Category not found");
        const productCount = db.prepare(`SELECT COUNT(*) as c FROM products WHERE category_id = ?`).get(req.params.id).c;
        if (productCount > 0) return apiError(res, 409, "CONFLICT", "Cannot delete category with products");
        db.prepare(`DELETE FROM product_categories WHERE id = ?`).run(req.params.id);
        return apiResponse(res, 200, null, "Category deleted");
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// PRODUCTS - LIST
// ============================================================
router.get("/", (req, res) => {
    try {
        const { search, category_id, is_active, low_stock, sort = "created_at", order = "desc", page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let whereClause = `WHERE p.tenant_id = ?`;
        const params = [req.tenantId];

        if (search) {
            whereClause += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (category_id) { whereClause += ` AND p.category_id = ?`; params.push(category_id); }
        if (is_active !== undefined) { whereClause += ` AND p.is_active = ?`; params.push(is_active === "true" ? 1 : 0); }

        const validSorts = { name: "p.name", sku: "p.sku", base_price: "p.base_price", created_at: "p.created_at" };
        const sortCol = validSorts[sort] || "p.created_at";

        const totalQuery = `SELECT COUNT(*) as count FROM products p ${whereClause}`;
        const total = db.prepare(totalQuery).get(...params).count;

        const query = `
            SELECT p.*, c.name as category_name,
                COALESCE((SELECT SUM(il.quantity) FROM inventory_ledgers il WHERE il.product_id = p.id AND il.tenant_id = p.tenant_id), 0) as total_stock,
                COUNT(DISTINCT pv.id) as variant_count
            FROM products p
            LEFT JOIN product_categories c ON p.category_id = c.id
            LEFT JOIN product_variants pv ON pv.product_id = p.id
            ${whereClause}
            GROUP BY p.id
            ORDER BY ${sortCol} ${order.toUpperCase() === "ASC" ? "ASC" : "DESC"}
            LIMIT ? OFFSET ?
        `;
        params.push(parseInt(limit), offset);
        let products = db.prepare(query).all(...params);

        if (low_stock === "true") {
            products = products.filter((p) => p.total_stock <= p.reorder_point && p.reorder_point > 0);
        }

        return apiResponse(res, 200, products, "Products retrieved successfully", {
            page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)),
        });
    } catch (err) {
        console.error("[Products] List error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// PRODUCTS - CREATE
// ============================================================
router.post("/", (req, res) => {
    try {
        const {
            name, category_id, description, unit, base_price, cost_price,
            weight, dimensions, image_url, min_stock, max_stock, reorder_point,
            safety_stock, lead_time_days, variants
        } = req.body;

        if (!name) return apiError(res, 400, "VALIDATION_ERROR", "Product name is required");

        const id = uuidv4();
        const sku = generateSKU(name, category_id);
        const barcode = generateBarcode(sku);

        db.prepare(`
            INSERT INTO products (id, tenant_id, category_id, sku, name, description, unit, base_price, cost_price, weight, dimensions, image_url, barcode, min_stock, max_stock, reorder_point, safety_stock, lead_time_days)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, req.tenantId, category_id || null, sku, name, description || null, unit || "pcs",
            base_price || 0, cost_price || 0, weight || null, dimensions || null, image_url || null,
            barcode, min_stock || 0, max_stock || 0, reorder_point || 0, safety_stock || 0, lead_time_days || 7);

        // Create variants if provided
        if (variants && Array.isArray(variants)) {
            for (const v of variants) {
                db.prepare(`INSERT INTO product_variants (id, product_id, sku_suffix, attributes, price_modifier) VALUES (?, ?, ?, ?, ?)`)
                    .run(uuidv4(), id, v.sku_suffix || null, JSON.stringify(v.attributes || {}), v.price_modifier || 0);
            }
        }

        db.prepare(`INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, entity_id, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), req.tenantId, req.user.id, "CREATE", "product", id, req.ip);

        const product = db.prepare(`SELECT p.*, c.name as category_name FROM products p LEFT JOIN product_categories c ON p.category_id = c.id WHERE p.id = ?`).get(id);
        const productVariants = db.prepare(`SELECT * FROM product_variants WHERE product_id = ?`).all(id);
        return apiResponse(res, 201, { ...product, variants: productVariants }, "Product created successfully");
    } catch (err) {
        console.error("[Products] Create error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// PRODUCTS - GET ONE
// ============================================================
router.get("/:id", (req, res) => {
    try {
        const product = db.prepare(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN product_categories c ON p.category_id = c.id
            WHERE p.id = ? AND p.tenant_id = ?
        `).get(req.params.id, req.tenantId);

        if (!product) return apiError(res, 404, "NOT_FOUND", "Product not found");

        const variants = db.prepare(`SELECT * FROM product_variants WHERE product_id = ?`).all(req.params.id);
        const stockByWarehouse = db.prepare(`
            SELECT il.*, w.name as warehouse_name 
            FROM inventory_ledgers il 
            JOIN warehouses w ON il.warehouse_id = w.id
            WHERE il.product_id = ? AND il.tenant_id = ?
        `).all(req.params.id, req.tenantId);

        const recentMovements = db.prepare(`
            SELECT sm.*, w.name as warehouse_name 
            FROM stock_movements sm 
            JOIN warehouses w ON sm.warehouse_id = w.id
            WHERE sm.product_id = ? AND sm.tenant_id = ?
            ORDER BY sm.created_at DESC LIMIT 10
        `).all(req.params.id, req.tenantId);

        const totalStock = stockByWarehouse.reduce((acc, s) => acc + s.quantity, 0);

        return apiResponse(res, 200, { ...product, variants, stock_by_warehouse: stockByWarehouse, total_stock: totalStock, recent_movements: recentMovements }, "Product retrieved successfully");
    } catch (err) {
        console.error("[Products] Get error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// PRODUCTS - UPDATE
// ============================================================
router.put("/:id", (req, res) => {
    try {
        const product = db.prepare(`SELECT * FROM products WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!product) return apiError(res, 404, "NOT_FOUND", "Product not found");

        const { name, category_id, description, unit, base_price, cost_price, weight, dimensions, image_url, min_stock, max_stock, reorder_point, safety_stock, lead_time_days, is_active } = req.body;

        db.prepare(`
            UPDATE products SET 
                name = COALESCE(?, name), category_id = COALESCE(?, category_id), description = COALESCE(?, description),
                unit = COALESCE(?, unit), base_price = COALESCE(?, base_price), cost_price = COALESCE(?, cost_price),
                weight = COALESCE(?, weight), dimensions = COALESCE(?, dimensions), image_url = COALESCE(?, image_url),
                min_stock = COALESCE(?, min_stock), max_stock = COALESCE(?, max_stock), reorder_point = COALESCE(?, reorder_point),
                safety_stock = COALESCE(?, safety_stock), lead_time_days = COALESCE(?, lead_time_days),
                is_active = COALESCE(?, is_active), updated_at = datetime('now')
            WHERE id = ? AND tenant_id = ?
        `).run(name, category_id, description, unit, base_price, cost_price, weight, dimensions, image_url,
            min_stock, max_stock, reorder_point, safety_stock, lead_time_days,
            is_active !== undefined ? (is_active ? 1 : 0) : null, req.params.id, req.tenantId);

        db.prepare(`INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, entity_id, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), req.tenantId, req.user.id, "UPDATE", "product", req.params.id, req.ip);

        const updated = db.prepare(`SELECT p.*, c.name as category_name FROM products p LEFT JOIN product_categories c ON p.category_id = c.id WHERE p.id = ?`).get(req.params.id);
        return apiResponse(res, 200, updated, "Product updated successfully");
    } catch (err) {
        console.error("[Products] Update error:", err);
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// PRODUCTS - DELETE
// ============================================================
router.delete("/:id", (req, res) => {
    try {
        const product = db.prepare(`SELECT * FROM products WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!product) return apiError(res, 404, "NOT_FOUND", "Product not found");

        const stockCount = db.prepare(`SELECT SUM(quantity) as total FROM inventory_ledgers WHERE product_id = ?`).get(req.params.id).total || 0;
        if (stockCount > 0) return apiError(res, 409, "CONFLICT", "Cannot delete product with active stock");

        db.prepare(`DELETE FROM products WHERE id = ? AND tenant_id = ?`).run(req.params.id, req.tenantId);
        return apiResponse(res, 200, null, "Product deleted successfully");
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// VARIANTS CRUD
// ============================================================
router.get("/:id/variants", (req, res) => {
    try {
        const product = db.prepare(`SELECT * FROM products WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!product) return apiError(res, 404, "NOT_FOUND", "Product not found");
        const variants = db.prepare(`SELECT * FROM product_variants WHERE product_id = ?`).all(req.params.id);
        return apiResponse(res, 200, variants, "Variants retrieved");
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

router.post("/:id/variants", (req, res) => {
    try {
        const product = db.prepare(`SELECT * FROM products WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!product) return apiError(res, 404, "NOT_FOUND", "Product not found");
        const { sku_suffix, attributes, price_modifier } = req.body;
        const id = uuidv4();
        db.prepare(`INSERT INTO product_variants (id, product_id, sku_suffix, attributes, price_modifier) VALUES (?, ?, ?, ?, ?)`)
            .run(id, req.params.id, sku_suffix || null, JSON.stringify(attributes || {}), price_modifier || 0);
        return apiResponse(res, 201, db.prepare(`SELECT * FROM product_variants WHERE id = ?`).get(id), "Variant created");
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

router.put("/:id/variants/:variantId", (req, res) => {
    try {
        const { sku_suffix, attributes, price_modifier, is_active } = req.body;
        db.prepare(`UPDATE product_variants SET sku_suffix = COALESCE(?, sku_suffix), attributes = COALESCE(?, attributes), price_modifier = COALESCE(?, price_modifier), is_active = COALESCE(?, is_active) WHERE id = ? AND product_id = ?`)
            .run(sku_suffix, attributes ? JSON.stringify(attributes) : null, price_modifier, is_active !== undefined ? (is_active ? 1 : 0) : null, req.params.variantId, req.params.id);
        return apiResponse(res, 200, db.prepare(`SELECT * FROM product_variants WHERE id = ?`).get(req.params.variantId), "Variant updated");
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

router.delete("/:id/variants/:variantId", (req, res) => {
    try {
        db.prepare(`DELETE FROM product_variants WHERE id = ? AND product_id = ?`).run(req.params.variantId, req.params.id);
        return apiResponse(res, 200, null, "Variant deleted");
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// BARCODE GENERATION
// ============================================================
router.get("/:id/barcode", (req, res) => {
    try {
        const product = db.prepare(`SELECT * FROM products WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!product) return apiError(res, 404, "NOT_FOUND", "Product not found");
        return apiResponse(res, 200, { sku: product.sku, barcode: product.barcode, qr_data: `NEXUSFLOW:PRODUCT:${product.sku}:${product.id}` }, "Barcode generated");
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// CSV EXPORT
// ============================================================
router.get("/export/csv", (req, res) => {
    try {
        const products = db.prepare(`
            SELECT p.sku, p.name, c.name as category, p.unit, p.base_price, p.cost_price, p.reorder_point, p.safety_stock, p.lead_time_days, p.is_active
            FROM products p LEFT JOIN product_categories c ON p.category_id = c.id
            WHERE p.tenant_id = ?
            ORDER BY p.name
        `).all(req.tenantId);

        const headers = ["SKU", "Name", "Category", "Unit", "Base Price", "Cost Price", "Reorder Point", "Safety Stock", "Lead Time (days)", "Active"];
        const rows = products.map((p) => [p.sku, p.name, p.category || "", p.unit, p.base_price, p.cost_price, p.reorder_point, p.safety_stock, p.lead_time_days, p.is_active ? "Yes" : "No"]);
        const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=products.csv");
        return res.send(csv);
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

// ============================================================
// CSV IMPORT
// ============================================================
router.post("/import/csv", (req, res) => {
    try {
        const { rows } = req.body; // Expect [{name, category, sku, unit, base_price, cost_price, reorder_point}]
        if (!rows || !Array.isArray(rows)) return apiError(res, 400, "VALIDATION_ERROR", "rows array is required");

        const created = [];
        const errors = [];

        for (const [i, row] of rows.entries()) {
            try {
                if (!row.name) { errors.push({ row: i, error: "Name is required" }); continue; }
                const id = uuidv4();
                const sku = row.sku || generateSKU(row.name, null);
                const barcode = generateBarcode(sku);

                let categoryId = null;
                if (row.category) {
                    let cat = db.prepare(`SELECT id FROM product_categories WHERE name = ? AND tenant_id = ?`).get(row.category, req.tenantId);
                    if (!cat) {
                        const catId = uuidv4();
                        db.prepare(`INSERT INTO product_categories (id, tenant_id, name) VALUES (?, ?, ?)`).run(catId, req.tenantId, row.category);
                        categoryId = catId;
                    } else {
                        categoryId = cat.id;
                    }
                }

                db.prepare(`INSERT INTO products (id, tenant_id, category_id, sku, name, unit, base_price, cost_price, reorder_point, safety_stock, lead_time_days, barcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                    .run(id, req.tenantId, categoryId, sku, row.name, row.unit || "pcs", row.base_price || 0, row.cost_price || 0, row.reorder_point || 0, row.safety_stock || 0, row.lead_time_days || 7, barcode);
                created.push({ id, sku, name: row.name });
            } catch (rowErr) {
                errors.push({ row: i, error: rowErr.message });
            }
        }

        return apiResponse(res, 200, { created_count: created.length, error_count: errors.length, created, errors }, "CSV import completed");
    } catch (err) {
        return apiError(res, 500, "SERVER_ERROR", err.message);
    }
});

module.exports = router;
