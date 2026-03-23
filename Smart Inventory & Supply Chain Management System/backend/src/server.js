const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

// Initialize database (async — we await before starting server)
const db = require("./database");

// Import routes
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const warehouseRoutes = require("./routes/warehouses");
const productRoutes = require("./routes/products");
const inventoryRoutes = require("./routes/inventory");
const supplierRoutes = require("./routes/suppliers");
const procurementRoutes = require("./routes/procurement");
const shipmentRoutes = require("./routes/shipments");
const analyticsRoutes = require("./routes/analytics");
const { router: rbacRoutes } = require("./routes/rbac");
const aiRoutes = require("./routes/ai");
const digitalTwinRoutes = require("./routes/digitaltwin");
const sustainabilityRoutes = require("./routes/sustainability");
const wsHub = require("./wsHub");
const http = require("http");

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 4000;

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(helmet());
app.use(cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// ============================================================
// RATE LIMITING (Simple in-memory)
// ============================================================
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute

app.use((req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const record = rateLimitMap.get(key);

    if (!record || now - record.startTime > RATE_LIMIT_WINDOW) {
        rateLimitMap.set(key, { count: 1, startTime: now });
        return next();
    }

    record.count++;
    if (record.count > RATE_LIMIT_MAX) {
        return res.status(429).json({
            success: false,
            error: {
                code: "RATE_LIMIT_EXCEEDED",
                message: "Too many requests. Please try again later.",
            },
        });
    }

    next();
});

// ============================================================
// ROUTES
// ============================================================
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "NexusFlow API Server",
        version: "1.0.0",
        docs: {
            auth: "/api/v1/auth",
            dashboard: "/api/v1/dashboard",
            warehouses: "/api/v1/warehouses",
            products: "/api/v1/products",
            inventory: "/api/v1/inventory",
            suppliers: "/api/v1/suppliers",
            procurement: "/api/v1/procurement",
            shipments: "/api/v1/shipments",
            analytics: "/api/v1/analytics",
            rbac: "/api/v1/rbac",
            ai: "/api/v1/ai",
            digital_twin: "/api/v1/digital-twin",
            sustainability: "/api/v1/sustainability",
        },
    });
});
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/warehouses", warehouseRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/suppliers", supplierRoutes);
app.use("/api/v1/procurement", procurementRoutes);
app.use("/api/v1/shipments", shipmentRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/rbac", rbacRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/digital-twin", digitalTwinRoutes);
app.use("/api/v1/sustainability", sustainabilityRoutes);

// Notification bell endpoint (reads wsHub in-memory buffer)
app.get("/api/v1/notifications", (req, res) => {
    const { authMiddleware } = require("./middleware/auth");
    // inline auth check
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED" } });
    try {
        const { verifyAccessToken } = require("./middleware/auth");
        const decoded = verifyAccessToken(token);
        const notifications = wsHub.getNotifications(decoded.tenantId);
        return res.json({ success: true, data: notifications, meta: { unread: notifications.filter((n) => !n.read).length } });
    } catch { return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED" } }); }
});

app.post("/api/v1/notifications/mark-read", (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ success: false });
    try {
        const { verifyAccessToken } = require("./middleware/auth");
        const decoded = verifyAccessToken(token);
        const { id, all } = req.body;
        if (all) wsHub.markAllRead(decoded.tenantId);
        else if (id) wsHub.markRead(decoded.tenantId, id);
        return res.json({ success: true });
    } catch { return res.status(401).json({ success: false }); }
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        data: {
            status: "healthy",
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            version: "1.0.0",
        },
    });
});

// API info
app.get("/api/v1", (req, res) => {
    res.json({
        success: true,
        data: {
            name: "NexusFlow API",
            version: "2.0.0",
            description: "Smart Inventory & Supply Chain Management System",
            endpoints: {
                auth: "/api/v1/auth",
                dashboard: "/api/v1/dashboard",
                warehouses: "/api/v1/warehouses",
                products: "/api/v1/products",
                inventory: "/api/v1/inventory",
                suppliers: "/api/v1/suppliers",
                procurement: "/api/v1/procurement",
            },
        },
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: "NOT_FOUND",
            message: `Route ${req.method} ${req.path} not found`,
        },
    });
});

// Global error handler
app.use((err, req, res, _next) => {
    console.error("[Server] Unhandled error:", err);
    res.status(500).json({
        success: false,
        error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred",
        },
    });
});

// ============================================================
// START SERVER (wait for DB, then http + WebSocket on same port)
// ============================================================
const httpServer = http.createServer(app);
wsHub.attach(httpServer);
app.set("wsHub", wsHub);

// Wait for sql.js DB to initialize, then start
db._initPromise.then(() => {
    httpServer.listen(PORT, () => {
        console.log(`
  ╔══════════════════════════════════════════════╗
  ║                                              ║
  ║   NexusFlow API Server                       ║
  ║   HTTP  → http://localhost:${PORT}           ║
  ║   WS    → ws://localhost:${PORT}/ws          ║
  ║   Env   → ${process.env.NODE_ENV || "development"}                   ║
  ║                                              ║
  ╚══════════════════════════════════════════════╝
  `);
    });
}).catch((err) => {
    console.error("[Server] Failed to initialize database:", err);
    process.exit(1);
});

module.exports = app;
