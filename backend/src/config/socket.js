const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
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

        // 👈 ১. join_table ইভেন্ট
        socket.on('join_table', (room) => {
            socket.join(room);
            console.log(`📌 Client joined room: ${room}`);
        });

        // 👈 ২. join_room ইভেন্টও যোগ করা হলো (ফ্লেক্সিবিলিটির জন্য)
        socket.on('join_room', (room) => {
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