import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';
import { formatPrice } from '../../utils/format';
import { useToast } from '../../contexts/ToastContext';
import type { Product } from '../../types';
import { productsAPI } from '../../services/api';

const AdminProducts = () => {
  const { showToast } = useToast();
  const [productList, setProductList] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const loadProducts = async () => {
    try {
      const response = await productsAPI.getProducts({ limit: 100 });
      setProductList(response.data.data.items);
    } catch {
      showToast('Failed to load products', 'error');
    }
  };

  useEffect(() => {
    void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProducts = productList.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id: string) => {
    productsAPI
      .deleteProduct(id)
      .then(() => {
        showToast('Product deleted', 'success');
        loadProducts();
      })
      .catch(() => showToast('Failed to delete product', 'error'));
  };

  const getStatusColor = (count: number) => {
    if (count === 0) return 'text-red-600';
    if (count < 5) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Products</h2>
        <button
          onClick={() => setIsAddingProduct(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Product
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Product</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Brand</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Price</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Stock</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Status</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredProducts.map((product) => (
              <tr key={product._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.specifications.storage}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm">
                    {product.brand}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-gray-900">
                  {formatPrice(product.price)}
                </td>
                <td className="px-6 py-4">
                  <span className={`font-medium ${getStatusColor(product.countInStock)}`}>
                    {product.countInStock}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    product.isFeatured ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {product.isFeatured ? 'Featured' : 'Standard'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingProduct(product)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(product._id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Product Modal */}
      <ProductModal
        key={editingProduct?._id ?? (isAddingProduct ? 'new' : 'closed')}
        isOpen={isAddingProduct || !!editingProduct}
        onClose={() => {
          setIsAddingProduct(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        onSaved={loadProducts}
      />
    </div>
  );
};

// Product Modal Component
const ProductModal = ({
  isOpen,
  onClose,
  product,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSaved: () => Promise<void>;
}) => {
  const { showToast } = useToast();
  const isEditing = !!product;
  const [formData, setFormData] = useState({
    name: product?.name ?? '',
    brand: product?.brand ?? 'Apple',
    category: product?.categoryName ?? product?.category ?? 'Smartphones',
    price: product?.price ?? 0,
    originalPrice: product?.originalPrice ?? 0,
    countInStock: product?.countInStock ?? 0,
    description: product?.description ?? '',
    storage: product?.specifications.storage ?? '',
    color: product?.specifications.color ?? '',
    imageUrl: product?.images[0] ?? '',
    condition: product?.condition ?? 'new',
    isFeatured: product?.isFeatured ?? false,
    status: product?.status ?? 'ACTIVE',
  });

  const updateField = (field: keyof typeof formData, value: string | number | boolean) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
          className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">
              {isEditing ? 'Edit Product' : 'Add New Product'}
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const payload = {
                ...formData,
                imageUrl: formData.imageUrl || undefined,
                originalPrice: formData.originalPrice || undefined,
              };
              const request = isEditing
                ? productsAPI.updateProduct(product._id, payload)
                : productsAPI.createProduct(payload);
              request
                .then(async () => {
                  showToast(isEditing ? 'Product updated' : 'Product added', 'success');
                  await onSaved();
                  onClose();
                })
                .catch(() => showToast(isEditing ? 'Failed to update product' : 'Failed to add product', 'error'));
            }}
            className="p-6 space-y-6"
          >
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand
                </label>
                <select
                  value={formData.brand}
                  onChange={(event) => updateField('brand', event.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Apple</option>
                  <option>Samsung</option>
                  <option>Google</option>
                  <option>OnePlus</option>
                  <option>Xiaomi</option>
                  <option>OPPO</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Type
              </label>
              <select
                value={formData.category}
                onChange={(event) => updateField('category', event.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>Smartphones</option>
                <option>Smart Watches</option>
                <option>Gadgets</option>
                <option>Headphones</option>
                <option>Speakers</option>
              </select>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (PKR)
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(event) => updateField('price', Number(event.target.value))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  value={formData.countInStock}
                  onChange={(event) => updateField('countInStock', Number(event.target.value))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(event) => updateField('description', event.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Storage
                </label>
                <select
                  value={formData.storage}
                  onChange={(event) => updateField('storage', event.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>64GB</option>
                  <option>128GB</option>
                  <option>256GB</option>
                  <option>512GB</option>
                  <option>1TB</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RAM
                </label>
                <select className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>4GB</option>
                  <option>6GB</option>
                  <option>8GB</option>
                  <option>12GB</option>
                  <option>16GB</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(event) => updateField('color', event.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={true}
                  readOnly
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <span className="text-gray-700">PTA Approved</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isFeatured}
                  onChange={(event) => updateField('isFeatured', event.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <span className="text-gray-700">Featured Product</span>
              </label>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                {isEditing ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdminProducts;
