import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Smartphone,
  ArrowRight,
} from 'lucide-react';
import type { Product } from '../types';
import { formatPrice } from '../utils/format';
import { productsAPI } from '../services/api';

const Compare = () => {
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load compare list from localStorage
  useEffect(() => {
    const loadCompareProducts = async () => {
      const saved = localStorage.getItem('compareList');
      const ids = saved ? (JSON.parse(saved) as string[]) : [];
      const response = await productsAPI.getProducts();
      const loadedProducts = response.data.data as Product[];
      setAllProducts(loadedProducts);
      setCompareList(loadedProducts.filter((product) => ids.includes(product._id)));
      setIsHydrated(true);
    };

    loadCompareProducts().catch(() => {
      setAllProducts([]);
      setCompareList([]);
      setIsHydrated(true);
    });
  }, []);

  // Save compare list to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    const ids = compareList.map((p) => p._id);
    localStorage.setItem('compareList', JSON.stringify(ids));
  }, [compareList, isHydrated]);

  const addToCompare = (product: Product) => {
    if (compareList.length >= 4) {
      alert('You can compare up to 4 products at a time');
      return;
    }
    if (!compareList.find((p) => p._id === product._id)) {
      setCompareList([...compareList, product]);
    }
    setIsAddingProduct(false);
  };

  const removeFromCompare = (productId: string) => {
    setCompareList(compareList.filter((p) => p._id !== productId));
  };

  const clearCompare = () => {
    setCompareList([]);
  };

  const availableProducts = allProducts.filter(
    (p) => !compareList.find((cp) => cp._id === p._id)
  );

  if (compareList.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Smartphone className="w-16 h-16 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Products to Compare</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Add products to compare their specifications and find the perfect phone for you.
            </p>
            <button
              onClick={() => setIsAddingProduct(true)}
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Products
            </button>
          </motion.div>

          {/* Add Product Modal */}
          <AddProductModal
            isOpen={isAddingProduct}
            onClose={() => setIsAddingProduct(false)}
            products={availableProducts}
            onSelect={addToCompare}
          />
        </div>
      </div>
    );
  }

  const specs = [
    { key: 'brand', label: 'Brand' },
    { key: 'price', label: 'Price' },
    { key: 'display', label: 'Display', getValue: (p: Product) => p.specifications.display },
    { key: 'processor', label: 'Processor', getValue: (p: Product) => p.specifications.processor },
    { key: 'ram', label: 'RAM', getValue: (p: Product) => p.specifications.ram },
    { key: 'storage', label: 'Storage', getValue: (p: Product) => p.specifications.storage },
    { key: 'battery', label: 'Battery', getValue: (p: Product) => p.specifications.battery },
    { key: 'camera', label: 'Camera', getValue: (p: Product) => p.specifications.camera },
    { key: 'os', label: 'Operating System', getValue: (p: Product) => p.specifications.os },
    { key: 'network', label: 'Network', getValue: (p: Product) => p.specifications.network },
    { key: 'ptaApproved', label: 'PTA Approved', getValue: (p: Product) => (p.ptaApproved ? 'Yes' : 'No') },
    { key: 'condition', label: 'Condition', getValue: (p: Product) => p.condition },
    { key: 'rating', label: 'Rating', getValue: (p: Product) => `${p.rating}/5` },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Compare Products</h1>
            <p className="text-gray-500 mt-1">
              Comparing {compareList.length} product{compareList.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-3">
            {compareList.length < 4 && (
              <button
                onClick={() => setIsAddingProduct(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Product
              </button>
            )}
            <button
              onClick={clearCompare}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              <X className="w-5 h-5" />
              Clear All
            </button>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr>
                <th className="p-6 text-left font-semibold text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                  Feature
                </th>
                {compareList.map((product) => (
                  <th key={product._id} className="p-6 text-center min-w-[250px]">
                    <div className="relative">
                      <button
                        onClick={() => removeFromCompare(product._id)}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-red-100 text-red-500 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <Link to={`/products/${product._id}`}>
                        <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden mb-4">
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {specs.map((spec, index) => (
                <tr key={spec.key} className={index % 2 === 0 ? 'bg-gray-50/50' : ''}>
                  <td className="p-6 font-medium text-gray-700 bg-gray-50 sticky left-0 z-10">
                    {spec.label}
                  </td>
                  {compareList.map((product) => (
                    <td key={product._id} className="p-6 text-center">
                      {spec.key === 'price' ? (
                        <span className="text-xl font-bold text-blue-600">
                          {formatPrice(product.price)}
                        </span>
                      ) : spec.key === 'brand' ? (
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                          {product.brand}
                        </span>
                      ) : (
                        <span className="text-gray-600">
                          {spec.getValue ? spec.getValue(product) : (product as any)[spec.key] || '-'}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="p-6 font-medium text-gray-700 bg-gray-50 sticky left-0 z-10">
                  Action
                </td>
                {compareList.map((product) => (
                  <td key={product._id} className="p-6">
                    <Link
                      to={`/products/${product._id}`}
                      className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      View Details
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Add Product Modal */}
        <AddProductModal
          isOpen={isAddingProduct}
          onClose={() => setIsAddingProduct(false)}
          products={availableProducts}
          onSelect={addToCompare}
        />
      </div>
    </div>
  );
};

// Add Product Modal Component
const AddProductModal = ({
  isOpen,
  onClose,
  products,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelect: (product: Product) => void;
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Add Product to Compare</h3>
                <button
                  onClick={onClose}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Product List */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No products found</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {filteredProducts.map((product) => (
                    <button
                      key={product._id}
                      onClick={() => onSelect(product)}
                      className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                    >
                      <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 line-clamp-2">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.brand}</p>
                        <p className="text-lg font-bold text-blue-600 mt-1">
                          {formatPrice(product.price)}
                        </p>
                      </div>
                      <Plus className="w-6 h-6 text-blue-600" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Compare;
