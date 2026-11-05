const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// ১. Create / Place New Order
router.post('/', orderController.placeOrder);

// ২. Update/Append Items to Existing Order (নতুন খাবার যোগ করার জন্য) 👈
router.patch('/:id/items', orderController.updateOrderItems);

// ৩. Get Active Orders (Admin & Kitchen)
router.get('/', orderController.getOrders);

// ৪. Update Order Status (PENDING -> COOKING -> SERVED etc.)
router.patch('/:id/status', orderController.updateOrderStatus);

// ৫. Cancel Full Order (অর্ডার সম্পূর্ণ বাতিল করার জন্য) 👈
router.patch('/:id/cancel', orderController.cancelOrder);

module.exports = router;