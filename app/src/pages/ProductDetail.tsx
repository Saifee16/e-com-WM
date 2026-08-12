import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Star,
  Heart,
  Share2,
  Check,
  Shield,
  Truck,
  RotateCcw,
  Minus,
  Plus,
  ShoppingCart,
  ChevronRight,
} from 'lucide-react';
import type { Product } from '../types';
import { formatPrice } from '../utils/format';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { productsAPI, wishlistAPI } from '../services/api';
import AuthModal from '../components/auth/AuthModal';
import ProductRating from '../components/product/ProductRating';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews'>('description');
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return;
      try {
        setIsLoadingProduct(true);
        const response = await productsAPI.getProductById(id);
        const loadedProduct = response.data.data as Product;
        setProduct(loadedProduct);
        setSelectedImage(0);
        const relatedResponse = await productsAPI.getProducts({ brand: loadedProduct.brand, limit: 5 });
        setRelatedProducts(
          relatedResponse.data.data.items.filter((item) => item._id !== loadedProduct._id).slice(0, 4),
        );
      } catch {
        setProduct(null);
      } finally {
        setIsLoadingProduct(false);
      }
    };

    loadProduct();
  }, [id]);

  const handleAddToCart = async () => {
    if (product) {
      try {
        await addToCart(product, quantity);
      } catch {
        // CartContext shows the backend error toast.
      }
    }
  };

  const handleBuyNow = async () => {
    if (product) {
      if (!isAuthenticated) {
        setIsAuthModalOpen(true);
        return;
      }
      try {
        await addToCart(product, quantity);
        navigate('/checkout');
      } catch {
        // CartContext shows the backend error toast.
      }
    }
  };

  const completeBuyNowAfterAuth = async () => {
    if (!product) return;
    await addToCart(product, quantity);
    navigate('/checkout');
  };

  const handleWishlist = async () => {
    if (!product) return;
    if (!isAuthenticated) return setIsAuthModalOpen(true);
    try {
      if (isWishlisted) await wishlistAPI.remove(product._id);
      else await wishlistAPI.add(product._id);
      setIsWishlisted((value) => !value);
      showToast(isWishlisted ? 'Removed from wishlist' : 'Saved to wishlist', 'success');
    } catch {
      showToast('Failed to update wishlist', 'error');
    }
  };

  const handleReviewSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!product) return;
    if (!isAuthenticated) return setIsAuthModalOpen(true);
    setIsSubmittingReview(true);
    try {
      await productsAPI.submitReview(product._id, {
        rating: reviewRating,
        ...(reviewTitle.trim() ? { title: reviewTitle.trim() } : {}),
        body: reviewBody,
      });
      const response = await productsAPI.getProductById(product._id);
      setProduct(response.data.data as Product);
      setReviewTitle('');
      setReviewBody('');
      showToast('Review submitted', 'success');
    } catch {
      showToast('You may only review a product once', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoadingProduct) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading product...</div>;
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h2>
          <Link to="/products" className="text-blue-600 hover:underline">
            Browse all products
          </Link>
        </div>
      </div>
    );
  }

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/products" className="hover:text-blue-600">Products</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900">{product.name}</span>
        </nav>

        {/* Product Details */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mb-12">
          <div className="grid lg:grid-cols-2 gap-8 p-8">
            {/* Image Gallery */}
            <div>
              <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-4">
                <img
                  src={product.images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {discount > 0 && (
                  <div className="absolute top-4 left-4 px-4 py-2 bg-red-500 text-white font-bold rounded-full">
                    -{discount}%
                  </div>
                )}
                {product.ptaApproved && (
                  <div className="absolute top-4 right-4 px-4 py-2 bg-green-500 text-white font-medium rounded-full flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    PTA Approved
                  </div>
                )}
              </div>
              
              {/* Thumbnail Gallery */}
              {product.images.length > 1 && (
                <div className="flex gap-2 justify-center">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-colors ${
                        selectedImage === index ? 'border-blue-600' : 'border-transparent'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.name} - ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                  {product.brand}
                </span>
                <span className="text-gray-500">{product.specifications.storage}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                  product.condition === 'new' ? 'bg-green-100 text-green-600' :
                  product.condition === 'used' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-purple-100 text-purple-600'
                }`}>
                  {product.condition}
                </span>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>

              <div className="flex items-center gap-4 mb-6">
                <ProductRating product={product} />
                <span className="text-gray-300">|</span>
                <span className={`text-sm font-medium ${product.countInStock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {product.countInStock > 0 ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>

              <div className="flex items-baseline gap-4 mb-6">
                <span className="text-4xl font-bold text-gray-900">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice && (
                  <span className="text-xl text-gray-400 line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>

              <p className="text-gray-600 mb-8">{product.description}</p>

              {/* Quantity Selector */}
              <div className="flex items-center gap-4 mb-8">
                <span className="font-medium text-gray-700">Quantity:</span>
                <div className="flex items-center border border-gray-200 rounded-xl">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 hover:bg-gray-50 transition-colors"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.countInStock, quantity + 1))}
                    className="p-3 hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mb-8">
                <button
                  onClick={handleAddToCart}
                  disabled={product.countInStock === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={product.countInStock === 0}
                  className="flex-1 px-6 py-4 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors disabled:border-gray-300 disabled:text-gray-300 disabled:cursor-not-allowed"
                >
                  Buy Now
                </button>
                <button onClick={handleWishlist} aria-label="Toggle wishlist" className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                  <Heart className={`w-6 h-6 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                </button>
                <button className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                  <Share2 className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="text-center">
                  <Shield className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                  <span className="text-xs text-gray-600">
                    {product.ptaApproved ? 'PTA approved' : 'PTA not approved'}
                  </span>
                </div>
                <div className="text-center">
                  <Truck className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                  <span className="text-xs text-gray-600">Shipping at checkout</span>
                </div>
                <div className="text-center">
                  <RotateCcw className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                  <span className="text-xs text-gray-600">7-day request window</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mb-12">
          {/* Tab Headers */}
          <div className="flex border-b border-gray-200">
              {([
                { key: 'description', label: 'Description' },
                { key: 'specs', label: 'Specifications' },
                { key: 'reviews', label: `Reviews (${product.numReviews})` },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-6 py-4 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'description' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="prose max-w-none"
              >
                <p className="text-gray-600 leading-relaxed">{product.description}</p>
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Key Features</h3>
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {product.tags.map((tag) => (
                      <li key={tag} className="flex items-center gap-2 text-gray-600">
                        <Check className="w-5 h-5 text-green-500" />
                        <span className="capitalize">{tag.replace('-', ' ')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}

            {activeTab === 'specs' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    value && (
                      <div key={key} className="flex justify-between p-4 bg-gray-50 rounded-xl">
                        <span className="text-gray-500 capitalize">{key}</span>
                        <span className="font-medium text-gray-900">{value}</span>
                      </div>
                    )
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'reviews' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <form onSubmit={handleReviewSubmit} className="mb-8 rounded-2xl bg-gray-50 p-5">
                  <h3 className="font-semibold text-gray-900">Write a review</h3>
                  <div className="mt-3 flex gap-1" aria-label="Rating">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button key={rating} type="button" aria-label={`${rating} stars`} onClick={() => setReviewRating(rating)}>
                        <Star className={`h-6 w-6 ${rating <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                      </button>
                    ))}
                  </div>
                  <input value={reviewTitle} onChange={(event) => setReviewTitle(event.target.value)} maxLength={120} placeholder="Review title (optional)" className="mt-4 w-full rounded-xl border border-gray-200 bg-white px-4 py-3" />
                  <textarea aria-label="Review" required minLength={2} maxLength={2000} value={reviewBody} onChange={(event) => setReviewBody(event.target.value)} placeholder="Share your experience" className="mt-3 min-h-28 w-full rounded-xl border border-gray-200 bg-white px-4 py-3" />
                  <button disabled={isSubmittingReview} className="mt-3 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white disabled:opacity-50">{isSubmittingReview ? 'Submitting…' : 'Submit review'}</button>
                </form>
                {product.reviews.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No reviews yet. Be the first to review!</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {product.reviews.map((review) => (
                      <div key={review._id} className="border-b border-gray-100 pb-6 last:border-0">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="font-medium text-blue-600">
                              {review.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{review.name}</p>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-600">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <Link
                  key={relatedProduct._id}
                  to={`/products/${relatedProduct._id}`}
                  className="group"
                >
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-square bg-gray-100 overflow-hidden">
                      <img
                        src={relatedProduct.images[0]}
                        alt={relatedProduct.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 mb-2 line-clamp-1">
                        {relatedProduct.name}
                      </h3>
                      <p className="text-lg font-bold text-blue-600">
                        {formatPrice(relatedProduct.price)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={completeBuyNowAfterAuth}
      />
    </div>
  );
};

export default ProductDetail;
