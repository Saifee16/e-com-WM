const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth, adminOnly } = require('../middleware/auth');

// All admin routes require authentication and admin privileges
router.get('/dashboard', auth, adminOnly, adminController.getDashboardStats);
router.get('/sales-report', auth, adminOnly, adminController.getSalesReport);
router.get('/top-products', auth, adminOnly, adminController.getTopProducts);
router.get('/top-customers', auth, adminOnly, adminController.getTopCustomers);

module.exports = router;
