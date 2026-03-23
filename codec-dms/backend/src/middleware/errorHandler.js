const errorHandler = (err, req, res, next) => {
    console.error(err);

    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    if (err.code === 'P2002') {
        return res.status(409).json({ error: 'Resource already exists' });
    }
    if (err.code === 'P2025') {
        return res.status(404).json({ error: 'Resource not found' });
    }

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';

    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

module.exports = errorHandler;
