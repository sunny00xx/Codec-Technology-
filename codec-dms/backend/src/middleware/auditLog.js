const prisma = require('../config/database');

const auditLog = (action, resourceType) => async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    res.json = function (data) {
        // Log after response
        setImmediate(async () => {
            try {
                const resourceId =
                    req.params.id ||
                    req.params.documentId ||
                    data?.document?.id ||
                    data?.id ||
                    null;

                await prisma.auditLog.create({
                    data: {
                        action,
                        resourceType,
                        resourceId: resourceId ? String(resourceId) : null,
                        metadata: JSON.stringify({
                            method: req.method,
                            path: req.path,
                            statusCode: res.statusCode,
                            body: req.body ? JSON.stringify(req.body, (key, value) =>
                                typeof value === 'bigint' ? value.toString() : value
                            ).slice(0, 500) : null,
                        }),
                        ipAddress: req.ip,
                        userAgent: req.headers['user-agent'],
                        userId: req.user?.id || null,
                    },
                });
            } catch (err) {
                console.error('Audit log error:', err.message);
            }
        });

        return originalJson(data);
    };

    next();
};

module.exports = auditLog;
