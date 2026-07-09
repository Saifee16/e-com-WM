import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart,
  ShoppingCart,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { products } from '../../data/products';
import { formatPrice } from '../../utils/format';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../contexts/ToastContext';

const Wishlist = () => {
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const { addToCart } = useCart();
  const { showToast } = useToast();

  useEffect(() => {
    // Mock wishlist items
    setWishlistItems(products.slice(0, 4));
  }, []);

  const removeFromWishlist = (id: string) => {
    setWishlistItems(wishlistItems.filter((item) => item._id !== id));
    showToast('Removed from wishlist', 'success');
  };

  const handleAddToCart = async (item: any) => {
    try {
      await addToCart(item, 1);
      showToast('Added to cart', 'success');
    } catch (error) {
      showToast('Failed to add to cart', 'error');
    }
  };

  if (wishlistItems.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Heart className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Your wishlist is empty</h2>
        <p className="text-gray-500 mb-8">
          Save items you love to your wishlist and find them easily later.
        </p>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors"
        >
          Browse Products
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Wishlist</h2>
        <p className="text-gray-500">{wishlistItems.length} items</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {wishlistItems.map((item, index) => (
          <motion.div
            key={item._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden group"
          >
            {/* Image */}
            <div className="relative aspect-square bg-gray-100 overflow-hidden">
              <Link to={`/products/${item._id}`}>
                <img
                  src={item.images[0]}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </Link>
              <button
                onClick={() => removeFromWishlist(item._id)}
                className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              {item.ptaApproved && (
                <div className="absolute top-4 left-4 px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                  PTA Approved
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-5">
              <Link to={`/products/${item._id}`}>
                <p className="text-sm text-blue-600 font-medium mb-1">{item.brand}</p>
                <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {item.name}
                </h3>
              </Link>
              <p className="text-sm text-gray-500 mb-3">{item.specifications.storage}</p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-gray-900">{formatPrice(item.price)}</span>
                <button
                  onClick={() => handleAddToCart(item)}
                  className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Wishlist;
