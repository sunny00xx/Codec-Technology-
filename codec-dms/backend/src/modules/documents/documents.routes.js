const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../../config/database');
const { authenticate } = require('../../middleware/auth');
const auditLog = require('../../middleware/auditLog');
const { uploadToS3, downloadFromS3, deleteFromS3, getPresignedUrl } = require('../../utils/s3Utils');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

// Helper: check document access
const checkAccess = async (documentId, userId, requiredRole = null) => {
    const doc = await prisma.document.findFirst({
        where: { id: documentId, isDeleted: false },
        include: { permissions: true },
    });
    if (!doc) return null;
    if (doc.ownerId === userId) return { doc, role: 'ADMIN' };

    const perm = doc.permissions.find((p) => p.userId === userId);
    if (!perm) return null;
    if (requiredRole === 'EDITOR' && perm.role === 'VIEWER') return null;
    return { doc, role: perm.role };
};

// POST /api/documents/upload
router.post(
    '/upload',
    authenticate,
    (req, res, next) => {
        upload.any()(req, res, (err) => {
            if (err) {
                console.error('[MULTER ERROR] /upload:', err);
                return res.status(400).json({ error: `File upload error: ${err.message}` });
            }
            next();
        });
    },
    auditLog('DOCUMENT_UPLOAD', 'DOCUMENT'),
    async (req, res, next) => {
        console.log('--- UPLOAD DEBUG START ---');
        console.log('Method:', req.method);
        console.log('URL:', req.originalUrl);
        console.log('Content-Type:', req.headers['content-type']);
        console.log('Files count:', req.files ? req.files.length : 0);
        if (req.files && req.files.length > 0) {
            req.files.forEach((f, i) => {
                console.log(`File [${i}]:`, {
                    fieldname: f.fieldname,
                    originalname: f.originalname,
                    mimetype: f.mimetype,
                    size: f.size
                });
            });
            // Map first file to req.file for compatibility with rest of logic
            req.file = req.files[0];
        }
        console.log('Body keys:', Object.keys(req.body || {}));
        console.log('--- UPLOAD DEBUG END ---');
        try {
            if (!req.file) return res.status(400).json({ error: 'No file provided' });

            const { name, description, tags } = req.body;
            const docId = uuidv4();
            const s3Key = `documents/${req.user.id}/${docId}/v1_${req.file.originalname}`;

            await uploadToS3(s3Key, req.file.buffer, req.file.mimetype);

            const document = await prisma.document.create({
                data: {
                    id: docId,
                    name: name || req.file.originalname,
                    description,
                    mimeType: req.file.mimetype,
                    size: req.file.size,
                    s3Key,
                    s3Bucket: process.env.AWS_BUCKET_NAME,
                    ownerId: req.user.id,
                    versions: {
                        create: {
                            versionNumber: 1,
                            s3Key,
                            size: req.file.size,
                            changeNote: 'Initial upload',
                            createdById: req.user.id,
                        },
                    },
                },
                include: { versions: true, tags: { include: { tag: true } } },
            });

            // Handle tags
            if (tags) {
                const tagNames = JSON.parse(tags);
                for (const tagName of tagNames) {
                    const tag = await prisma.tag.upsert({
                        where: { name: tagName },
                        create: { name: tagName },
                        update: {},
                    });
                    await prisma.documentTag.upsert({
                        where: { documentId_tagId: { documentId: docId, tagId: tag.id } },
                        create: { documentId: docId, tagId: tag.id },
                        update: {},
                    });
                }
            }

            res.status(201).json({ document });
        } catch (err) {
            next(err);
        }
    }
);

// GET /api/documents — list accessible documents
router.get('/', authenticate, async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const [documents, total] = await Promise.all([
            prisma.document.findMany({
                where: {
                    isDeleted: false,
                    OR: [
                        { ownerId: req.user.id },
                        { permissions: { some: { userId: req.user.id } } },
                    ],
                },
                include: {
                    owner: { select: { id: true, name: true, email: true, avatarColor: true } },
                    tags: { include: { tag: true } },
                    versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
                    _count: { select: { versions: true } },
                },
                orderBy: { updatedAt: 'desc' },
                skip: Number(skip),
                take: Number(limit),
            }),
            prisma.document.count({
                where: {
                    isDeleted: false,
                    OR: [
                        { ownerId: req.user.id },
                        { permissions: { some: { userId: req.user.id } } },
                    ],
                },
            }),
        ]);

        res.json({ documents, total, page: Number(page), limit: Number(limit) });
    } catch (err) {
        next(err);
    }
});

// GET /api/documents/trash — list soft-deleted documents
router.get('/trash', authenticate, async (req, res, next) => {
    try {
        const documents = await prisma.document.findMany({
            where: {
                isDeleted: true,
                ownerId: req.user.id,
            },
            include: {
                owner: { select: { id: true, name: true, email: true, avatarColor: true } },
                tags: { include: { tag: true } },
                _count: { select: { versions: true } },
            },
            orderBy: { deletedAt: 'desc' },
        });
        res.json({ documents });
    } catch (err) {
        next(err);
    }
});

// PATCH /api/documents/:id/restore — restore a soft-deleted document
router.patch('/:id/restore', authenticate, auditLog('DOCUMENT_RESTORE', 'DOCUMENT'), async (req, res, next) => {
    try {
        const doc = await prisma.document.findFirst({
            where: { id: req.params.id, isDeleted: true, ownerId: req.user.id },
        });
        if (!doc) return res.status(404).json({ error: 'Document not found in trash' });

        await prisma.document.update({
            where: { id: req.params.id },
            data: { isDeleted: false, deletedAt: null },
        });
        res.json({ message: 'Document restored' });
    } catch (err) {
        next(err);
    }
});

// DELETE /api/documents/:id/permanent — permanently delete a trashed document
router.delete('/:id/permanent', authenticate, auditLog('DOCUMENT_PERMANENT_DELETE', 'DOCUMENT'), async (req, res, next) => {
    try {
        const doc = await prisma.document.findFirst({
            where: { id: req.params.id, isDeleted: true, ownerId: req.user.id },
        });
        if (!doc) return res.status(404).json({ error: 'Document not found in trash' });

        // Delete the file from S3/local storage
        try {
            await deleteFromS3(doc.s3Key);
        } catch (e) {
            console.warn('Failed to delete file from storage:', e.message);
        }

        // Delete from database (cascades to versions, permissions, tags)
        await prisma.document.delete({ where: { id: req.params.id } });
        res.json({ message: 'Document permanently deleted' });
    } catch (err) {
        next(err);
    }
});

// GET /api/documents/:id — get document details + presigned URL
router.get('/:id', authenticate, auditLog('DOCUMENT_VIEW', 'DOCUMENT'), async (req, res, next) => {
    try {
        const access = await checkAccess(req.params.id, req.user.id);
        if (!access) return res.status(404).json({ error: 'Document not found' });

        const { doc } = access;
        const presignedUrl = await getPresignedUrl(doc.s3Key);

        const document = await prisma.document.findUnique({
            where: { id: req.params.id },
            include: {
                owner: { select: { id: true, name: true, email: true, avatarColor: true } },
                tags: { include: { tag: true } },
                versions: { orderBy: { versionNumber: 'desc' }, include: { createdBy: { select: { id: true, name: true } } } },
                permissions: { include: { user: { select: { id: true, name: true, email: true, avatarColor: true } } } },
            },
        });

        res.json({ document, presignedUrl, userRole: access.role });
    } catch (err) {
        next(err);
    }
});

// POST /api/documents/:id/version — upload new version
router.post(
    '/:id/version',
    authenticate,
    (req, res, next) => {
        upload.any()(req, res, (err) => {
            if (err) {
                console.error('[MULTER ERROR] /:id/version:', err);
                return res.status(400).json({ error: `File upload error: ${err.message}` });
            }
            next();
        });
    },
    auditLog('DOCUMENT_VERSION_CREATE', 'DOCUMENT'),
    async (req, res, next) => {
        console.log('--- VERSION UPLOAD DEBUG START ---');
        if (req.files && req.files.length > 0) {
            req.file = req.files[0];
        }
        console.log('File field exists:', !!req.file);
        console.log('--- VERSION UPLOAD DEBUG END ---');
        try {
            const access = await checkAccess(req.params.id, req.user.id, 'EDITOR');
            if (!access) return res.status(403).json({ error: 'Access denied' });

            if (!req.file) return res.status(400).json({ error: 'No file provided' });

            const { changeNote } = req.body;
            const { doc } = access;

            const latestVersion = await prisma.documentVersion.findFirst({
                where: { documentId: doc.id },
                orderBy: { versionNumber: 'desc' },
            });
            const nextVersion = (latestVersion?.versionNumber || 0) + 1;

            const s3Key = `documents/${doc.ownerId}/${doc.id}/v${nextVersion}_${req.file.originalname}`;
            await uploadToS3(s3Key, req.file.buffer, req.file.mimetype);

            const [updatedDoc, version] = await prisma.$transaction([
                prisma.document.update({
                    where: { id: doc.id },
                    data: { s3Key, size: req.file.size },
                }),
                prisma.documentVersion.create({
                    data: {
                        documentId: doc.id,
                        versionNumber: nextVersion,
                        s3Key,
                        size: req.file.size,
                        changeNote,
                        createdById: req.user.id,
                    },
                }),
            ]);

            res.status(201).json({ version, document: updatedDoc });
        } catch (err) {
            next(err);
        }
    }
);

// DELETE /api/documents/:id — soft delete
router.delete('/:id', authenticate, auditLog('DOCUMENT_DELETE', 'DOCUMENT'), async (req, res, next) => {
    try {
        const access = await checkAccess(req.params.id, req.user.id);
        if (!access || access.role !== 'ADMIN') return res.status(403).json({ error: 'Only owner or admin can delete' });

        await prisma.document.update({
            where: { id: req.params.id },
            data: { isDeleted: true, deletedAt: new Date() },
        });

        res.json({ message: 'Document deleted' });
    } catch (err) {
        next(err);
    }
});

// GET /api/documents/serve/:key — serve local decrypted file
router.get('/serve/:key', async (req, res, next) => {
    try {
        const { downloadFromS3 } = require('../../utils/s3Utils');
        const key = req.params.key.replace(/_/g, '/'); // Convert back to path
        const decrypted = await downloadFromS3(key);

        // Basic mime type detection
        const ext = key.split('.').pop().toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === 'pdf') contentType = 'application/pdf';
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) contentType = `image/${ext}`;

        res.setHeader('Content-Type', contentType);
        res.send(decrypted);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
