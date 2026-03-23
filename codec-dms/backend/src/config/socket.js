const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true,
        },
    });

    // Auth middleware for socket
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('Authentication error'));
        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = payload.userId;
            socket.userName = payload.name;
            socket.userColor = payload.avatarColor || '#6366f1';
            next();
        } catch {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.userId}`);

        // Join a document collaboration room
        socket.on('join-document', (documentId) => {
            socket.join(`doc:${documentId}`);
            socket.to(`doc:${documentId}`).emit('user-joined', {
                userId: socket.userId,
                name: socket.userName,
                color: socket.userColor,
            });

            // Send current users in room to new joiner
            const room = io.sockets.adapter.rooms.get(`doc:${documentId}`);
            const users = [];
            if (room) {
                for (const socketId of room) {
                    const s = io.sockets.sockets.get(socketId);
                    if (s && s.socketId !== socket.id) {
                        users.push({ userId: s.userId, name: s.userName, color: s.userColor });
                    }
                }
            }
            socket.emit('room-users', users);
        });

        // Leave a document room
        socket.on('leave-document', (documentId) => {
            socket.leave(`doc:${documentId}`);
            socket.to(`doc:${documentId}`).emit('user-left', { userId: socket.userId });
        });

        // Cursor position broadcast
        socket.on('cursor-move', ({ documentId, position }) => {
            socket.to(`doc:${documentId}`).emit('cursor-update', {
                userId: socket.userId,
                name: socket.userName,
                color: socket.userColor,
                position,
            });
        });

        // Document change broadcast (for collaborative editing)
        socket.on('document-change', ({ documentId, delta }) => {
            socket.to(`doc:${documentId}`).emit('document-updated', {
                userId: socket.userId,
                delta,
            });
        });

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.userId}`);
            // Notify all rooms this user was in
            io.emit('user-disconnected', { userId: socket.userId });
        });
    });

    return io;
};

const getIO = () => {
    if (!io) throw new Error('Socket.io not initialized');
    return io;
};

module.exports = { initSocket, getIO };
