const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, adminOnly } = require('../middleware/auth');

// User routes (require authentication)
router.get('/wishlist', auth, userController.getWishlist);
router.post('/wishlist/:productId', auth, userController.addToWishlist);
router.delete('/wishlist/:productId', auth, userController.removeFromWishlist);
router.put('/preferences', auth, userController.updatePreferences);

// Admin routes
router.get('/', auth, adminOnly, userController.getAllUsers);
router.get('/:id', auth, adminOnly, userController.getUserById);
router.put('/:id', auth, adminOnly, userController.updateUser);
router.delete('/:id', auth, adminOnly, userController.deleteUser);

module.exports = router;
