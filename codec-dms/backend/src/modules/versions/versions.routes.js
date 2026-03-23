const express = require('express');
const prisma = require('../../config/database');
const { authenticate } = require('../../middleware/auth');
const auditLog = require('../../middleware/auditLog');
const { getPresignedUrl } = require('../../utils/s3Utils');

const router = express.Router();

// GET /api/versions/:documentId — list all versions
router.get('/:documentId', authenticate, async (req, res, next) => {
    try {
        const doc = await prisma.document.findFirst({
            where: { id: req.params.documentId, isDeleted: false, OR: [{ ownerId: req.user.id }, { permissions: { some: { userId: req.user.id } } }] },
        });
        if (!doc) return res.status(404).json({ error: 'Document not found' });

        const versions = await prisma.documentVersion.findMany({
            where: { documentId: req.params.documentId },
            orderBy: { versionNumber: 'desc' },
            include: { createdBy: { select: { id: true, name: true, avatarColor: true } } },
        });

        res.json({ versions });
    } catch (err) {
        next(err);
    }
});

// POST /api/versions/:documentId/restore/:versionId
router.post(
    '/:documentId/restore/:versionId',
    authenticate,
    auditLog('DOCUMENT_VERSION_RESTORE', 'DOCUMENT'),
    async (req, res, next) => {
        try {
            const doc = await prisma.document.findFirst({
                where: { id: req.params.documentId, isDeleted: false, OR: [{ ownerId: req.user.id }, { permissions: { some: { userId: req.user.id, role: { in: ['EDITOR', 'ADMIN'] } } } }] },
            });
            if (!doc) return res.status(403).json({ error: 'Access denied' });

            const version = await prisma.documentVersion.findFirst({
                where: { id: req.params.versionId, documentId: req.params.documentId },
            });
            if (!version) return res.status(404).json({ error: 'Version not found' });

            // Create a new version that is a copy of the restored version
            const latestVersion = await prisma.documentVersion.findFirst({
                where: { documentId: req.params.documentId },
                orderBy: { versionNumber: 'desc' },
            });

            const newVersion = await prisma.documentVersion.create({
                data: {
                    documentId: req.params.documentId,
                    versionNumber: (latestVersion?.versionNumber || 0) + 1,
                    s3Key: version.s3Key,
                    size: version.size,
                    changeNote: `Restored from version ${version.versionNumber}`,
                    createdById: req.user.id,
                },
            });

            await prisma.document.update({
                where: { id: req.params.documentId },
                data: { s3Key: version.s3Key, size: version.size },
            });

            const presignedUrl = await getPresignedUrl(version.s3Key);
            res.json({ version: newVersion, presignedUrl });
        } catch (err) {
            next(err);
        }
    }
);

module.exports = router;
