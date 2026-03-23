const express = require('express');
const prisma = require('../../config/database');
const { authenticate, requireRole } = require('../../middleware/auth');

const router = express.Router();

// GET /api/audit/logs — admin only
router.get('/logs', authenticate, requireRole('ADMIN'), async (req, res, next) => {
    try {
        const { page = 1, limit = 50, action, userId, from, to } = req.query;
        const skip = (page - 1) * limit;

        const where = {};
        if (action) where.action = { contains: action, mode: 'insensitive' };
        if (userId) where.userId = userId;
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) where.createdAt.lte = new Date(to);
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: { user: { select: { id: true, name: true, email: true } } },
                orderBy: { createdAt: 'desc' },
                skip: Number(skip),
                take: Number(limit),
            }),
            prisma.auditLog.count({ where }),
        ]);

        res.json({ logs, total, page: Number(page), limit: Number(limit) });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
