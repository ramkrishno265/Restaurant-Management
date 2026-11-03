const http = require('http');
const app = require('./src/app');
const { initSocket } = require('./src/config/socket');
require('dotenv').config();

const server = http.createServer(app);

// Socket.io Init
initSocket(server);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});