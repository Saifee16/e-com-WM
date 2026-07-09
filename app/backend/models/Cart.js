const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  brand: String,
  specs: String,
  ptaApproved: Boolean,
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  items: [cartItemSchema],
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Calculate totals
cartSchema.methods.calculateTotals = function() {
  const subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemCount = this.items.reduce((sum, item) => sum + item.quantity, 0);
  
  return {
    subtotal,
    itemCount,
    shipping: subtotal > 100000 ? 0 : 500,
    tax: subtotal * 0.02,
    total: subtotal + (subtotal > 100000 ? 0 : 500) + (subtotal * 0.02),
  };
};

// Add item to cart
cartSchema.methods.addItem = function(item) {
  const existingItemIndex = this.items.findIndex(
    i => i.product.toString() === item.product.toString()
  );
  
  if (existingItemIndex >= 0) {
    this.items[existingItemIndex].quantity += item.quantity;
  } else {
    this.items.push(item);
  }
  
  this.updatedAt = new Date();
  return this.save();
};

// Update item quantity
cartSchema.methods.updateQuantity = function(productId, quantity) {
  const itemIndex = this.items.findIndex(
    i => i.product.toString() === productId.toString()
  );
  
  if (itemIndex >= 0) {
    if (quantity <= 0) {
      this.items.splice(itemIndex, 1);
    } else {
      this.items[itemIndex].quantity = quantity;
    }
    this.updatedAt = new Date();
    return this.save();
  }
  
  throw new Error('Item not found in cart');
};

// Remove item from cart
cartSchema.methods.removeItem = function(productId) {
  this.items = this.items.filter(
    i => i.product.toString() !== productId.toString()
  );
  this.updatedAt = new Date();
  return this.save();
};

// Clear cart
cartSchema.methods.clear = function() {
  this.items = [];
  this.updatedAt = new Date();
  return this.save();
};

// TTL index to auto-clear abandoned carts after 30 days
cartSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('Cart', cartSchema);
