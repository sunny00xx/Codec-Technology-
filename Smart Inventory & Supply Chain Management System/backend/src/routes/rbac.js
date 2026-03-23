const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const db = require("../database");
const { authMiddleware, apiResponse, apiError } = require("../middleware/auth");

router.use(authMiddleware);

// ── Permission definitions ───────────────────────────────────
const ALL_PERMISSIONS = {
    dashboard: { label: "Dashboard", actions: ["view"] },
    warehouses: { label: "Warehouses", actions: ["view", "create", "edit", "delete"] },
    products: { label: "Products", actions: ["view", "create", "edit", "delete", "import", "export"] },
    inventory: { label: "Inventory", actions: ["view", "adjust", "transfer"] },
    procurement: { label: "Procurement", actions: ["view", "create", "approve", "reject"] },
    suppliers: { label: "Suppliers", actions: ["view", "create", "edit", "delete", "blacklist"] },
    shipments: { label: "Shipments", actions: ["view", "create", "edit", "update_status"] },
    analytics: { label: "Analytics", actions: ["view", "export"] },
    users: { label: "Users", actions: ["view", "create", "edit", "delete", "assign_role"] },
    roles: { label: "Roles", actions: ["view", "create", "edit", "delete"] },
    settings: { label: "Settings", actions: ["view", "edit"] },
    audit: { label: "Audit Logs", actions: ["view"] },
};

// ── Permission check middleware factory ───────────────────────
function requirePermission(module, action) {
    return (req, res, next) => {
        const role = db.prepare(`SELECT permissions FROM roles WHERE id = ?`).get(req.user.roleId);
        if (!role) return apiError(res, 403, "FORBIDDEN", "Role not found");
        try {
            const perms = JSON.parse(role.permissions || "{}");
            // Admin or super_admin bypass
            if (perms["*"] || perms.admin) return next();
            const mPerms = perms[module];
            if (!mPerms) return apiError(res, 403, "FORBIDDEN", `No access to ${module}`);
            if (Array.isArray(mPerms) && mPerms.includes(action)) return next();
            if (mPerms === true || mPerms === "*") return next();
            return apiError(res, 403, "FORBIDDEN", `Missing '${action}' permission on '${module}'`);
        } catch { return next(); }
    };
}

// ── GET /permissions ─────────────────────────────────────────
router.get("/permissions", (req, res) => {
    return apiResponse(res, 200, ALL_PERMISSIONS, "Permission matrix");
});

// ── ROLE CRUD ────────────────────────────────────────────────
router.get("/roles", (req, res) => {
    try {
        const roles = db.prepare(`SELECT r.*, (SELECT COUNT(*) FROM users u WHERE u.role_id = r.id) as user_count FROM roles r WHERE r.tenant_id = ? ORDER BY r.is_system DESC, r.name`).all(req.tenantId);
        const parsed = roles.map((r) => ({ ...r, permissions: JSON.parse(r.permissions || "{}") }));
        return apiResponse(res, 200, parsed, "Roles retrieved");
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});

router.post("/roles", (req, res) => {
    try {
        const { name, description, permissions } = req.body;
        if (!name) return apiError(res, 400, "VALIDATION_ERROR", "Role name is required");
        const id = uuidv4();
        db.prepare(`INSERT INTO roles (id, tenant_id, name, description, permissions) VALUES (?, ?, ?, ?, ?)`)
            .run(id, req.tenantId, name, description || null, JSON.stringify(permissions || {}));
        db.prepare(`INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, entity_id) VALUES (?, ?, ?, 'CREATE', 'role', ?)`)
            .run(uuidv4(), req.tenantId, req.user.id, id);
        return apiResponse(res, 201, { id, name, permissions }, "Role created");
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});

router.put("/roles/:id", (req, res) => {
    try {
        const role = db.prepare(`SELECT * FROM roles WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!role) return apiError(res, 404, "NOT_FOUND", "Role not found");
        if (role.is_system) return apiError(res, 400, "SYSTEM_ROLE", "System roles cannot be modified");
        const { name, description, permissions } = req.body;
        db.prepare(`UPDATE roles SET name = COALESCE(?, name), description = COALESCE(?, description), permissions = COALESCE(?, permissions) WHERE id = ?`)
            .run(name || null, description || null, permissions ? JSON.stringify(permissions) : null, req.params.id);
        db.prepare(`INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, entity_id) VALUES (?, ?, ?, 'UPDATE', 'role', ?)`)
            .run(uuidv4(), req.tenantId, req.user.id, req.params.id);
        return apiResponse(res, 200, { id: req.params.id, name: name || role.name }, "Role updated");
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});

router.delete("/roles/:id", (req, res) => {
    try {
        const role = db.prepare(`SELECT * FROM roles WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!role) return apiError(res, 404, "NOT_FOUND", "Role not found");
        if (role.is_system) return apiError(res, 400, "SYSTEM_ROLE", "System roles cannot be deleted");
        const userCount = db.prepare(`SELECT COUNT(*) as c FROM users WHERE role_id = ?`).get(req.params.id).c;
        if (userCount > 0) return apiError(res, 400, "HAS_USERS", `Role has ${userCount} assigned user(s). Reassign them first.`);
        db.prepare(`DELETE FROM roles WHERE id = ?`).run(req.params.id);
        return apiResponse(res, 200, null, "Role deleted");
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});

// ── USER MANAGEMENT ──────────────────────────────────────────
router.get("/users", (req, res) => {
    try {
        const { search, role_id, is_active } = req.query;
        let q = `SELECT u.id, u.email, u.full_name, u.phone, u.avatar_url, u.is_active, u.last_login, u.created_at, u.role_id, r.name as role_name
                  FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.tenant_id = ?`;
        const params = [req.tenantId];
        if (search) { q += ` AND (u.full_name LIKE ? OR u.email LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }
        if (role_id) { q += ` AND u.role_id = ?`; params.push(role_id); }
        if (is_active !== undefined) { q += ` AND u.is_active = ?`; params.push(is_active === "true" ? 1 : 0); }
        q += ` ORDER BY u.created_at DESC`;
        return apiResponse(res, 200, db.prepare(q).all(...params), "Users retrieved");
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});

router.put("/users/:id/role", (req, res) => {
    try {
        const { role_id } = req.body;
        if (!role_id) return apiError(res, 400, "VALIDATION_ERROR", "role_id is required");
        const user = db.prepare(`SELECT * FROM users WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!user) return apiError(res, 404, "NOT_FOUND", "User not found");
        const role = db.prepare(`SELECT * FROM roles WHERE id = ? AND tenant_id = ?`).get(role_id, req.tenantId);
        if (!role) return apiError(res, 404, "NOT_FOUND", "Role not found");
        db.prepare(`UPDATE users SET role_id = ?, updated_at = datetime('now') WHERE id = ?`).run(role_id, req.params.id);
        db.prepare(`INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, entity_id, new_values) VALUES (?, ?, ?, 'ASSIGN_ROLE', 'user', ?, ?)`)
            .run(uuidv4(), req.tenantId, req.user.id, req.params.id, JSON.stringify({ role_id, role_name: role.name }));
        return apiResponse(res, 200, { user_id: req.params.id, role_id, role_name: role.name }, "Role assigned");
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});

router.put("/users/:id/status", (req, res) => {
    try {
        const { is_active } = req.body;
        const user = db.prepare(`SELECT * FROM users WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
        if (!user) return apiError(res, 404, "NOT_FOUND", "User not found");
        if (user.id === req.user.id) return apiError(res, 400, "SELF_MODIFY", "Cannot deactivate yourself");
        db.prepare(`UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?`).run(is_active ? 1 : 0, req.params.id);
        db.prepare(`INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, entity_id) VALUES (?, ?, ?, ?, 'user', ?)`)
            .run(uuidv4(), req.tenantId, req.user.id, is_active ? "ACTIVATE" : "DEACTIVATE", req.params.id);
        return apiResponse(res, 200, null, `User ${is_active ? "activated" : "deactivated"}`);
    } catch (err) { return apiError(res, 500, "SERVER_ERROR", err.message); }
});

module.exports = { router, requirePermission, ALL_PERMISSIONS };
