const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Get user's cart
exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    
    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] });
    }
    
    const totals = cart.calculateTotals();
    
    res.json({
      success: true,
      data: {
        items: cart.items,
        totals,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Add item to cart
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    
    // Get product details
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
    
    if (product.countInStock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Not enough stock available',
      });
    }
    
    // Find or create cart
    let cart = await Cart.findOne({ user: req.user.id });
    
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
    }
    
    // Add item
    await cart.addItem({
      product: productId,
      name: product.name,
      image: product.images[0],
      price: product.price,
      quantity,
      brand: product.brand,
      specs: `${product.specifications?.storage || ''}, ${product.specifications?.color || ''}`,
      ptaApproved: product.ptaApproved,
    });
    
    const totals = cart.calculateTotals();
    
    res.json({
      success: true,
      message: 'Item added to cart',
      data: {
        items: cart.items,
        totals,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update item quantity
exports.updateQuantity = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    
    const cart = await Cart.findOne({ user: req.user.id });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }
    
    await cart.updateQuantity(productId, quantity);
    
    const totals = cart.calculateTotals();
    
    res.json({
      success: true,
      message: 'Quantity updated',
      data: {
        items: cart.items,
        totals,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const cart = await Cart.findOne({ user: req.user.id });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }
    
    await cart.removeItem(productId);
    
    const totals = cart.calculateTotals();
    
    res.json({
      success: true,
      message: 'Item removed from cart',
      data: {
        items: cart.items,
        totals,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Clear cart
exports.clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    
    if (cart) {
      await cart.clear();
    }
    
    res.json({
      success: true,
      message: 'Cart cleared',
      data: {
        items: [],
        totals: { subtotal: 0, itemCount: 0, shipping: 0, tax: 0, total: 0 },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Apply promo code
exports.applyPromoCode = async (req, res) => {
  try {
    const { code } = req.body;
    
    // Define promo codes
    const promoCodes = {
      'WAHAB10': 0.10,
      'PTA25': 0.25,
      'GENZ15': 0.15,
      'WELCOME10': 0.10,
    };
    
    const discountRate = promoCodes[code.toUpperCase()];
    
    if (!discountRate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid promo code',
      });
    }
    
    const cart = await Cart.findOne({ user: req.user.id });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }
    
    const totals = cart.calculateTotals();
    const discount = totals.subtotal * discountRate;
    
    res.json({
      success: true,
      message: 'Promo code applied',
      data: {
        code: code.toUpperCase(),
        discount,
        discountRate,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
