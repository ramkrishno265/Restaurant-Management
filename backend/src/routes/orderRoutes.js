const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// ১. Create / Place New Order
router.post('/', orderController.placeOrder);

// ২. Get Active Orders for Specific Table
router.get('/active/:tableId', orderController.getActiveCustomerOrder);

// ৩. Update/Append Items to Existing Order
router.patch('/:id/items', orderController.updateOrderItems);

// 👈 ৪. Single Item Remove Route (যা ৪-০-৪ দিচ্ছিল)
router.delete('/:orderId/items/:itemId', orderController.removeItemFromOrder);

// ৫. Get Active Orders (Admin & Kitchen)
router.get('/', orderController.getOrders);

// ৬. Update Order Status
router.patch('/:id/status', orderController.updateOrderStatus);

// ৭. Cancel Full Order
router.patch('/:id/cancel', orderController.cancelOrder);

module.exports = router;