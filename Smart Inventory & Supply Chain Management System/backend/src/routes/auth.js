const express = require("express");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const db = require("../database");
const {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    authMiddleware,
    apiResponse,
    apiError,
} = require("../middleware/auth");

const router = express.Router();

// ============================================================
// POST /api/v1/auth/register
// Creates a new tenant (organization) and an admin user
// ============================================================
router.post("/register", (req, res) => {
    try {
        const { organizationName, fullName, email, password } = req.body;

        // Validation
        if (!organizationName || !fullName || !email || !password) {
            return apiError(res, 400, "VALIDATION_ERROR", "All fields are required", [
                !organizationName && { field: "organizationName", message: "Organization name is required" },
                !fullName && { field: "fullName", message: "Full name is required" },
                !email && { field: "email", message: "Email is required" },
                !password && { field: "password", message: "Password is required" },
            ].filter(Boolean));
        }

        if (password.length < 6) {
            return apiError(res, 400, "VALIDATION_ERROR", "Password must be at least 6 characters");
        }

        // Check if email already exists
        const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
        if (existingUser) {
            return apiError(res, 409, "DUPLICATE_EMAIL", "An account with this email already exists");
        }

        // Create tenant
        const tenantId = uuidv4();
        const slug = organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

        db.prepare(`
      INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?)
    `).run(tenantId, organizationName, slug + "-" + tenantId.slice(0, 8));

        // Create default Super Admin role
        const roleId = uuidv4();
        db.prepare(`
      INSERT INTO roles (id, tenant_id, name, description, permissions, is_system)
      VALUES (?, ?, 'Super Admin', 'Full system access', '{"all": true}', 1)
    `).run(roleId, tenantId);

        // Create additional default roles
        const roles = [
            { name: "Regional Manager", permissions: '{"inventory": "rw", "procurement": "approve", "reports": "full"}' },
            { name: "Warehouse Manager", permissions: '{"inventory": "full", "procurement": "create", "reports": "own"}' },
            { name: "Warehouse Picker", permissions: '{"inventory": "read"}' },
        ];
        for (const role of roles) {
            db.prepare(`
        INSERT INTO roles (id, tenant_id, name, permissions)
        VALUES (?, ?, ?, ?)
      `).run(uuidv4(), tenantId, role.name, role.permissions);
        }

        // Create admin user
        const userId = uuidv4();
        const passwordHash = bcrypt.hashSync(password, 12);

        db.prepare(`
      INSERT INTO users (id, tenant_id, role_id, email, password_hash, full_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, tenantId, roleId, email, passwordHash, fullName);

        // Generate tokens
        const tokenPayload = {
            userId,
            email,
            tenantId,
            roleId,
            fullName,
        };

        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        // Store refresh token
        db.prepare("UPDATE users SET refresh_token = ? WHERE id = ?").run(refreshToken, userId);

        // Audit log
        db.prepare(`
      INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, entity_id)
      VALUES (?, ?, ?, 'REGISTER', 'user', ?)
    `).run(uuidv4(), tenantId, userId, userId);

        return apiResponse(res, 201, {
            accessToken,
            refreshToken,
            user: {
                id: userId,
                email,
                fullName,
                role: "Super Admin",
                tenantId,
                organizationName,
            },
        }, "Account created successfully");
    } catch (err) {
        console.error("[Auth] Register error:", err);
        return apiError(res, 500, "INTERNAL_ERROR", "Registration failed");
    }
});

// ============================================================
// POST /api/v1/auth/login
// ============================================================
router.post("/login", (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return apiError(res, 400, "VALIDATION_ERROR", "Email and password are required");
        }

        // Find user
        const user = db.prepare(`
      SELECT u.*, r.name as role_name, t.name as org_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN tenants t ON u.tenant_id = t.id
      WHERE u.email = ? AND u.is_active = 1
    `).get(email);

        if (!user) {
            return apiError(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");
        }

        // Verify password
        const isValid = bcrypt.compareSync(password, user.password_hash);
        if (!isValid) {
            return apiError(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");
        }

        // Generate tokens
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            tenantId: user.tenant_id,
            roleId: user.role_id,
            fullName: user.full_name,
        };

        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        // Update refresh token and last login
        db.prepare("UPDATE users SET refresh_token = ?, last_login = datetime('now') WHERE id = ?")
            .run(refreshToken, user.id);

        // Audit log
        db.prepare(`
      INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, entity_id, ip_address)
      VALUES (?, ?, ?, 'LOGIN', 'user', ?, ?)
    `).run(uuidv4(), user.tenant_id, user.id, user.id, req.ip);

        return apiResponse(res, 200, {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role_name,
                tenantId: user.tenant_id,
                organizationName: user.org_name,
            },
        }, "Login successful");
    } catch (err) {
        console.error("[Auth] Login error:", err);
        return apiError(res, 500, "INTERNAL_ERROR", "Login failed");
    }
});

// ============================================================
// POST /api/v1/auth/refresh
// ============================================================
router.post("/refresh", (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return apiError(res, 400, "VALIDATION_ERROR", "Refresh token is required");
        }

        // Verify token
        const decoded = verifyRefreshToken(refreshToken);

        // Check if token matches stored one
        const user = db.prepare("SELECT * FROM users WHERE id = ? AND refresh_token = ?")
            .get(decoded.userId, refreshToken);

        if (!user) {
            return apiError(res, 401, "INVALID_TOKEN", "Invalid refresh token");
        }

        // Generate new tokens
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            tenantId: user.tenant_id,
            roleId: user.role_id,
            fullName: user.full_name,
        };

        const newAccessToken = generateAccessToken(tokenPayload);
        const newRefreshToken = generateRefreshToken(tokenPayload);

        // Rotate refresh token
        db.prepare("UPDATE users SET refresh_token = ? WHERE id = ?").run(newRefreshToken, user.id);

        return apiResponse(res, 200, {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        }, "Token refreshed");
    } catch (err) {
        return apiError(res, 401, "INVALID_TOKEN", "Refresh token is invalid or expired");
    }
});

// ============================================================
// GET /api/v1/auth/me — Get current user profile
// ============================================================
router.get("/me", authMiddleware, (req, res) => {
    try {
        const user = db.prepare(`
      SELECT u.id, u.email, u.full_name, u.phone, u.avatar_url, u.is_active, u.last_login, u.created_at,
             r.name as role_name, r.permissions,
             t.name as org_name, t.slug as org_slug, t.plan, t.settings as org_settings
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN tenants t ON u.tenant_id = t.id
      WHERE u.id = ? AND u.tenant_id = ?
    `).get(req.user.id, req.tenantId);

        if (!user) {
            return apiError(res, 404, "NOT_FOUND", "User not found");
        }

        return apiResponse(res, 200, {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            phone: user.phone,
            avatarUrl: user.avatar_url,
            role: user.role_name,
            permissions: JSON.parse(user.permissions || "{}"),
            organization: {
                name: user.org_name,
                slug: user.org_slug,
                plan: user.plan,
            },
            lastLogin: user.last_login,
            createdAt: user.created_at,
        });
    } catch (err) {
        console.error("[Auth] Me error:", err);
        return apiError(res, 500, "INTERNAL_ERROR", "Failed to fetch profile");
    }
});

// ============================================================
// POST /api/v1/auth/logout
// ============================================================
router.post("/logout", authMiddleware, (req, res) => {
    try {
        db.prepare("UPDATE users SET refresh_token = NULL WHERE id = ?").run(req.user.id);

        // Audit log
        db.prepare(`
      INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, entity_id)
      VALUES (?, ?, ?, 'LOGOUT', 'user', ?)
    `).run(uuidv4(), req.tenantId, req.user.id, req.user.id);

        return apiResponse(res, 200, null, "Logged out successfully");
    } catch (err) {
        return apiError(res, 500, "INTERNAL_ERROR", "Logout failed");
    }
});

module.exports = router;
