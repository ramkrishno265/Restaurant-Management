const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
  });

  io.on('connection', (socket) => {
    console.log('⚡ New Client Connected:', socket.id);

    socket.on('join_dashboard', (role) => {
      socket.join(role);
      console.log(`Socket ${socket.id} joined '${role}' room`);
    });

    socket.on('join_table', (tableId) => {
      socket.join(`table_${tableId}`);
      console.log(`Socket ${socket.id} joined 'table_${tableId}' room`);
    });

    socket.on('disconnect', () => {
      console.log('❌ Client Disconnected:', socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized!');
  }
  return io;
};

module.exports = { initSocket, getIO };