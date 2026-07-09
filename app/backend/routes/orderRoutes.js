const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { auth, adminOnly } = require('../middleware/auth');

// User routes (require authentication)
router.post('/', auth, orderController.createOrder);
router.get('/my-orders', auth, orderController.getMyOrders);
router.get('/:id', auth, orderController.getOrderById);
router.put('/:id/cancel', auth, orderController.cancelOrder);

// Admin routes
router.get('/', auth, adminOnly, orderController.getAllOrders);
router.get('/stats/overview', auth, adminOnly, orderController.getOrderStats);
router.put('/:id/status', auth, adminOnly, orderController.updateOrderStatus);

module.exports = router;
