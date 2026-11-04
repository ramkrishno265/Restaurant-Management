const express = require('express');
const router = express.Router();
const {
  getMenu,
  createMenuItem,
  updateMenuItem,
  toggleAvailability,
  deleteMenuItem,
} = require('../controllers/menuController');

// All Menu Items (Get & Create)
router.get('/', getMenu);
router.post('/items', createMenuItem);

// Specific Item Actions (Update, Toggle Stock, Delete)
router.put('/items/:id', updateMenuItem);
router.patch('/items/:id/toggle', toggleAvailability);
router.delete('/items/:id', deleteMenuItem);

module.exports = router;