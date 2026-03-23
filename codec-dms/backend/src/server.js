require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');

const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');


const { initSocket } = require('./config/socket');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./modules/auth/auth.routes');
const documentRoutes = require('./modules/documents/documents.routes');
const versionRoutes = require('./modules/versions/versions.routes');
const permissionRoutes = require('./modules/permissions/permissions.routes');
const searchRoutes = require('./modules/search/search.routes');
const tagRoutes = require('./modules/tags/tags.routes');
const auditRoutes = require('./modules/audit/audit.routes');

const app = express();
const server = http.createServer(app);

// Global BigInt serialization fix
app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (data) {
        const stringifyBigInts = (obj) => {
            if (obj === null || obj === undefined) return obj;
            if (typeof obj === 'bigint') return obj.toString();
            if (Array.isArray(obj)) return obj.map(stringifyBigInts);
            if (typeof obj === 'object') {
                return Object.fromEntries(
                    Object.entries(obj).map(([key, value]) => [key, stringifyBigInts(value)])
                );
            }
            return obj;
        };
        return originalJson.call(this, stringifyBigInts(data));
    };
    next();
});

// Request tracing - VERY TOP to see what's happening

app.use((req, res, next) => {
    if (req.originalUrl.includes('/api/')) {
        console.log(`[REQ-START] ${req.method} ${req.originalUrl} - Type: ${req.headers['content-type'] || 'none'}`);
    }
    next();
});


// Init Socket.io
initSocket(server);


// Security & middleware
app.use(
    cors({
        origin: true,
        credentials: true,
    })
);
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    xFrameOptions: false,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cookieParser());


// Body parsing - skip if already handled or multipart OR if it's an upload path
app.use((req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    const isMultipart = contentType.includes('multipart/form-data');
    const isUploadPath = req.originalUrl.includes('/upload') || req.originalUrl.includes('/version');

    if (isMultipart || isUploadPath) return next();
    express.json({ limit: '10mb' })(req, res, next);
});

app.use((req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    const isMultipart = contentType.includes('multipart/form-data');
    const isUploadPath = req.originalUrl.includes('/upload') || req.originalUrl.includes('/version');

    if (isMultipart || isUploadPath) return next();
    express.urlencoded({ extended: true })(req, res, next);
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000, // Hardcoded high for dev
    message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/versions', versionRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/audit', auditRoutes);

// 404
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log(`📁 Created uploads directory at ${uploadsDir}`);
    }

    console.log(`\n🚀 CODEC DMS Server running on http://localhost:${PORT}`);
    console.log(`🔌 Socket.io ready`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = { app, server };
