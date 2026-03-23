const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const prisma = require('../../config/database');
const auditLog = require('../../middleware/auditLog');

const router = express.Router();

const generateTokens = (user) => {
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        avatarColor: user.avatarColor,
    };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });
    const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
    return { accessToken, refreshToken };
};

// POST /api/auth/register
router.post(
    '/register',
    [
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 8 }),
        body('name').trim().notEmpty(),
    ],
    auditLog('USER_REGISTER', 'USER'),
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

            const { email, password, name } = req.body;

            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing) return res.status(409).json({ error: 'Email already in use' });

            const passwordHash = await bcrypt.hash(password, 12);
            const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'];
            const avatarColor = colors[Math.floor(Math.random() * colors.length)];

            const user = await prisma.user.create({
                data: { email, name, passwordHash, avatarColor },
            });

            const { accessToken, refreshToken } = generateTokens(user);

            res
                .cookie('refreshToken', refreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: 7 * 24 * 60 * 60 * 1000,
                })
                .status(201)
                .json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarColor }, accessToken });
        } catch (err) {
            next(err);
        }
    }
);

// POST /api/auth/login
router.post(
    '/login',
    [body('email').isEmail(), body('password').notEmpty()],
    auditLog('USER_LOGIN', 'USER'),
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

            const { email, password } = req.body;
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user) return res.status(401).json({ error: 'Invalid credentials' });

            const valid = await bcrypt.compare(password, user.passwordHash);
            if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

            const { accessToken, refreshToken } = generateTokens(user);

            res
                .cookie('refreshToken', refreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: 7 * 24 * 60 * 60 * 1000,
                })
                .json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarColor: user.avatarColor }, accessToken });
        } catch (err) {
            next(err);
        }
    }
);

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
    try {
        const token = req.cookies?.refreshToken;
        if (!token) return res.status(401).json({ error: 'No refresh token' });

        const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const user = await prisma.user.findUnique({ where: { id: payload.userId } });
        if (!user) return res.status(401).json({ error: 'User not found' });

        const { accessToken, refreshToken } = generateTokens(user);
        res
            .cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            })
            .json({ accessToken });
    } catch (err) {
        return res.status(401).json({ error: 'Invalid refresh token' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    res.clearCookie('refreshToken').json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', require('../../middleware/auth').authenticate, async (req, res) => {
    const { id, email, name, role, avatarColor, createdAt } = req.user;
    res.json({ id, email, name, role, avatarColor, createdAt });
});

module.exports = router;
