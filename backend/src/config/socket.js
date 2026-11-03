const { Server } = require('socket.io');

let io;

exports.initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
  });

  io.on('connection', (socket) => {
    // Customer table room join handler
    socket.on('join_table', (roomName) => {
      socket.join(roomName);
    });

    // Admin dashboard room join handler
    socket.on('join_admin', () => {
      socket.join('admin');
    });

    socket.on('disconnect', () => {
      // Disconnect handling if needed
    });
  });

  return io;
};

exports.getIO = () => io;