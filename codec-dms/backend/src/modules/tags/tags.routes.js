const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../../config/database');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

// GET /api/tags — list all tags
router.get('/', authenticate, async (req, res, next) => {
    try {
        const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
        res.json({ tags });
    } catch (err) { next(err); }
});

// POST /api/tags — create tag
router.post(
    '/',
    authenticate,
    [body('name').trim().notEmpty(), body('color').optional().isHexColor()],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
            const tag = await prisma.tag.upsert({
                where: { name: req.body.name },
                create: { name: req.body.name, color: req.body.color || '#6366f1' },
                update: {},
            });
            res.status(201).json({ tag });
        } catch (err) { next(err); }
    }
);

// POST /api/tags/:tagId/attach/:documentId
router.post('/:tagId/attach/:documentId', authenticate, async (req, res, next) => {
    try {
        await prisma.documentTag.upsert({
            where: { documentId_tagId: { documentId: req.params.documentId, tagId: req.params.tagId } },
            create: { documentId: req.params.documentId, tagId: req.params.tagId },
            update: {},
        });
        res.json({ message: 'Tag attached' });
    } catch (err) { next(err); }
});

// DELETE /api/tags/:tagId/detach/:documentId
router.delete('/:tagId/detach/:documentId', authenticate, async (req, res, next) => {
    try {
        await prisma.documentTag.delete({
            where: { documentId_tagId: { documentId: req.params.documentId, tagId: req.params.tagId } },
        });
        res.json({ message: 'Tag detached' });
    } catch (err) { next(err); }
});

module.exports = router;
