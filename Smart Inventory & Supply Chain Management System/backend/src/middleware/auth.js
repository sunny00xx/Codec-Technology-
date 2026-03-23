const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "fallback_refresh";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

/**
 * Generate access token
 */
function generateAccessToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Generate refresh token
 */
function generateRefreshToken(payload) {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

/**
 * Verify access token
 */
function verifyAccessToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

/**
 * Verify refresh token
 */
function verifyRefreshToken(token) {
    return jwt.verify(token, JWT_REFRESH_SECRET);
}

/**
 * Auth middleware — validates JWT and attaches user + tenant to req
 */
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            error: {
                code: "UNAUTHORIZED",
                message: "Access token is required",
            },
        });
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = verifyAccessToken(token);
        req.user = {
            id: decoded.userId,
            email: decoded.email,
            tenantId: decoded.tenantId,
            roleId: decoded.roleId,
            fullName: decoded.fullName,
        };
        req.tenantId = decoded.tenantId;
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            error: {
                code: "TOKEN_EXPIRED",
                message: "Access token is invalid or expired",
            },
        });
    }
}

/**
 * Standard API response format
 */
function apiResponse(res, statusCode, data, message, meta) {
    const response = {
        success: statusCode >= 200 && statusCode < 300,
        data: data || null,
        message: message || null,
    };
    if (meta) response.meta = meta;
    return res.status(statusCode).json(response);
}

/**
 * Error response
 */
function apiError(res, statusCode, code, message, details) {
    return res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            details: details || undefined,
        },
    });
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    authMiddleware,
    apiResponse,
    apiError,
};
