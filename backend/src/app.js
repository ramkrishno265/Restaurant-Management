const express = require('express');
const cors = require('cors');

const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const tableRoutes = require('./routes/tableRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const voiceOrderRoutes = require('./routes/voiceOrderRoutes');


const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Base Routes
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/service-requests', serviceRoutes);
app.use('/api', voiceOrderRoutes);

app.get('/', (req, res) => {
  res.send('Restaurant Management System API Running...');
});

module.exports = app;