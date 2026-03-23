const express = require('express');
const prisma = require('../../config/database');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

// GET /api/search?q=...&tags=...&type=...&from=...&to=...
router.get('/', authenticate, async (req, res, next) => {
    try {
        const { q, tags, type, from, to, page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const where = {
            isDeleted: false,
            OR: [
                { ownerId: req.user.id },
                { permissions: { some: { userId: req.user.id } } },
            ],
        };

        // Full-text search on name and description
        if (q) {
            where.AND = [
                {
                    OR: [
                        { name: { contains: q, mode: 'insensitive' } },
                        { description: { contains: q, mode: 'insensitive' } },
                    ],
                },
            ];
        }

        // Tag filter
        if (tags) {
            const tagList = tags.split(',').map((t) => t.trim());
            where.tags = { some: { tag: { name: { in: tagList } } } };
        }

        // MIME type filter
        if (type) {
            where.mimeType = { contains: type, mode: 'insensitive' };
        }

        // Date range filter
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) where.createdAt.lte = new Date(to);
        }

        const [documents, total] = await Promise.all([
            prisma.document.findMany({
                where,
                include: {
                    owner: { select: { id: true, name: true, avatarColor: true } },
                    tags: { include: { tag: true } },
                    versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
                    _count: { select: { versions: true } },
                },
                orderBy: { updatedAt: 'desc' },
                skip: Number(skip),
                take: Number(limit),
            }),
            prisma.document.count({ where }),
        ]);

        res.json({ documents, total, page: Number(page), limit: Number(limit), query: q });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
