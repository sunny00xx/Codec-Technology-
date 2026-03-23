const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../../config/database');
const { authenticate } = require('../../middleware/auth');
const auditLog = require('../../middleware/auditLog');

const router = express.Router();

// POST /api/permissions/:documentId/share
router.post(
    '/:documentId/share',
    authenticate,
    [body('email').isEmail(), body('role').isIn(['VIEWER', 'EDITOR', 'ADMIN'])],
    auditLog('PERMISSION_GRANT', 'DOCUMENT'),
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

            const doc = await prisma.document.findFirst({
                where: { id: req.params.documentId, isDeleted: false, OR: [{ ownerId: req.user.id }, { permissions: { some: { userId: req.user.id, role: 'ADMIN' } } }] },
            });
            if (!doc) return res.status(403).json({ error: 'Access denied' });

            const targetUser = await prisma.user.findUnique({ where: { email: req.body.email } });
            if (!targetUser) return res.status(404).json({ error: 'User not found' });
            if (targetUser.id === doc.ownerId) return res.status(400).json({ error: 'Cannot change owner permissions' });

            const permission = await prisma.permission.upsert({
                where: { documentId_userId: { documentId: req.params.documentId, userId: targetUser.id } },
                create: { documentId: req.params.documentId, userId: targetUser.id, role: req.body.role },
                update: { role: req.body.role },
                include: { user: { select: { id: true, name: true, email: true, avatarColor: true } } },
            });

            res.status(201).json({ permission });
        } catch (err) {
            next(err);
        }
    }
);

// DELETE /api/permissions/:documentId/revoke/:userId
router.delete(
    '/:documentId/revoke/:userId',
    authenticate,
    auditLog('PERMISSION_REVOKE', 'DOCUMENT'),
    async (req, res, next) => {
        try {
            const doc = await prisma.document.findFirst({
                where: { id: req.params.documentId, isDeleted: false, OR: [{ ownerId: req.user.id }, { permissions: { some: { userId: req.user.id, role: 'ADMIN' } } }] },
            });
            if (!doc) return res.status(403).json({ error: 'Access denied' });

            await prisma.permission.delete({
                where: { documentId_userId: { documentId: req.params.documentId, userId: req.params.userId } },
            });

            res.json({ message: 'Permission revoked' });
        } catch (err) {
            next(err);
        }
    }
);

// GET /api/permissions/:documentId — list permissions
router.get('/:documentId', authenticate, async (req, res, next) => {
    try {
        const doc = await prisma.document.findFirst({
            where: { id: req.params.documentId, isDeleted: false, OR: [{ ownerId: req.user.id }, { permissions: { some: { userId: req.user.id } } }] },
        });
        if (!doc) return res.status(404).json({ error: 'Document not found' });

        const permissions = await prisma.permission.findMany({
            where: { documentId: req.params.documentId },
            include: { user: { select: { id: true, name: true, email: true, avatarColor: true } } },
        });

        res.json({ permissions });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
