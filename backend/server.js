const http = require('http');
const app = require('./src/app');
const { initSocket } = require('./src/config/socket');
require('dotenv').config();

const server = http.createServer(app);

// Socket.io Init
initSocket(server);

const PORT = process.env.PORT || 5000;

// Port Conflict (EADDRINUSE) Handling
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`⚠️ Port ${PORT} is currently busy. Trying again in 1 second...`);
    setTimeout(() => {
      server.close();
      server.listen(PORT);
    }, 1000);
  } else {
    console.error('Server error:', error);
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Nodemon Restart-এর সময় পোর্ট সঠিকভাবে ছেড়ে দেওয়ার ব্যবস্থা
process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});