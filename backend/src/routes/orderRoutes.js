const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// ১. Create / Place New Order
router.post('/', orderController.placeOrder);

// ২. Get Active Order for Specific Table (রিলোড সাথে ব্যাকগ্রাউন্ড সিঙ্কের জন্য) 👈
router.get('/active/:tableId', orderController.getActiveCustomerOrder);

// ৩. Update/Append Items to Existing Order
router.patch('/:id/items', orderController.updateOrderItems);

// ৪. Get Active Orders (Admin & Kitchen)
router.get('/', orderController.getOrders);

// ৫. Update Order Status
router.patch('/:id/status', orderController.updateOrderStatus);

// ৬. Cancel Full Order
router.patch('/:id/cancel', orderController.cancelOrder);

module.exports = router;