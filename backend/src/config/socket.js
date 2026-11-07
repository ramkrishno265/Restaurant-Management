const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*", // বা আপনার ফ্রন্টএন্ড URL যেমন "http://localhost:5173"
            methods: ["GET", "POST", "PATCH"],
            credentials: true
        },
        transports: ['websocket', 'polling']
    });

    io.on('connection', (socket) => {
        console.log('⚡ Client Connected:', socket.id);

        socket.on('join_admin', (room) => {
            socket.join('admin');
            console.log(`📌 Admin joined room: admin`);
        });

        socket.on('join_table', (room) => {
            socket.join(room);
            console.log(`📌 Client joined room: ${room}`);
        });

        socket.on('disconnect', () => {
            console.log('❌ Client Disconnected:', socket.id);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

module.exports = { initSocket, getIO };