import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  ImagePlus,
} from 'lucide-react';
import { formatPrice } from '../../utils/format';
import { useToast } from '../../contexts/ToastContext';
import type { Product } from '../../types';
import { productsAPI } from '../../services/api';
import { getApiErrorMessage } from '../../utils/api-error';
import {
  MAX_PRODUCT_IMAGES,
  ProductFormValidationError,
  createProductFormState,
  toProductCreateRequest,
  validateProductImageSelection,
  type ProductFormState,
  type VariantFormState,
} from './product-form';

const comparisonFields = [
  { key: 'display', label: 'Display', placeholder: 'e.g. 6.7-inch AMOLED, 120Hz' },
  { key: 'processor', label: 'Processor', placeholder: 'e.g. Snapdragon 8 Gen 3' },
  { key: 'ram', label: 'RAM', placeholder: 'e.g. 12GB' },
  { key: 'battery', label: 'Battery', placeholder: 'e.g. 5,000mAh, 65W charging' },
  { key: 'camera', label: 'Camera', placeholder: 'e.g. 50MP main + 12MP ultra-wide' },
  { key: 'os', label: 'Operating System', placeholder: 'e.g. Android 15' },
  { key: 'network', label: 'Network', placeholder: 'e.g. 5G, dual SIM' },
] as const satisfies ReadonlyArray<{
  key: 'display' | 'processor' | 'ram' | 'battery' | 'camera' | 'os' | 'network';
  label: string;
  placeholder: string;
}>;

const AdminProducts = () => {
  const { showToast } = useToast();
  const [productList, setProductList] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const loadProducts = async () => {
    try {
      const response = await productsAPI.getAdminProducts({ limit: 100 });
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

  const getPublicationStatusColor = (status: Product['status']) => {
    if (status === 'DRAFT') return 'bg-amber-100 text-amber-700';
    if (status === 'ARCHIVED') return 'bg-gray-200 text-gray-700';
    return 'bg-green-100 text-green-700';
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
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{formatPrice(product.price)}</p>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <p className="text-xs text-green-700">
                      Regular <span className="line-through text-gray-400">{formatPrice(product.originalPrice)}</span>
                      {' - '}{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% off
                    </p>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`font-medium ${getStatusColor(product.countInStock)}`}>
                    {product.countInStock}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPublicationStatusColor(product.status)}`}>
                      {product.status ?? 'ACTIVE'}
                    </span>
                    {product.isFeatured && (
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                        Featured
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingProduct(product)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      aria-label={`Edit ${product.name}`}
                      title={`Edit ${product.name}`}
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(product._id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label={`Delete ${product.name}`}
                      title={`Delete ${product.name}`}
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
  const [formData, setFormData] = useState<ProductFormState>(() => createProductFormState(product));
  const [isSaving, setIsSaving] = useState(false);
  const [storageDraft, setStorageDraft] = useState('');
  const [colorDraft, setColorDraft] = useState('');

  const updateField = <Key extends keyof ProductFormState>(field: Key, value: ProductFormState[Key]) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };
  const updateVariant = <Key extends keyof VariantFormState>(index: number, field: Key, value: VariantFormState[Key]) => {
    setFormData((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) => variantIndex === index ? { ...variant, [field]: value } : variant),
    }));
  };
  const addOptionValue = (field: 'variantStorageOptions' | 'variantColorOptions', value: string) => {
    const normalized = value.trim();
    if (!normalized) return;
    updateField(field, [...new Set([...formData[field], normalized])]);
  };
  const generatePhoneVariants = () => {
    const storages = formData.variantStorageOptions.length ? formData.variantStorageOptions : [''];
    const colors = formData.variantColorOptions.length ? formData.variantColorOptions : [''];
    const currentVariants = new Map(formData.variants.map((variant) => [`${variant.storage}\u0000${variant.color}`, variant]));
    const generated: VariantFormState[] = storages.flatMap((storage) => colors.map((color) => {
      const existing = currentVariants.get(`${storage}\u0000${color}`);
      return existing ?? {
        sku: '',
        title: [storage, color].filter(Boolean).join(' / ') || 'Default',
        storage,
        color,
        condition: formData.condition,
        options: {},
        price: formData.price,
        originalPrice: formData.originalPrice,
        countInStock: formData.countInStock,
        isActive: true,
      };
    }));
    updateField('variants', generated);
  };
  const addGenericVariant = () => {
    updateField('variants', [...formData.variants, {
      sku: '', title: '', storage: '', color: '', condition: formData.condition, options: {},
      price: formData.price, originalPrice: formData.originalPrice, countInStock: formData.countInStock, isActive: true,
    }]);
  };

  const imagePreviews = useMemo(
    () => formData.imageFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [formData.imageFiles],
  );
  const imageCount = formData.existingImageUrls.length + formData.imageFiles.length;

  useEffect(() => () => {
    imagePreviews.forEach(({ url }) => URL.revokeObjectURL(url));
  }, [imagePreviews]);

  const selectImageFiles = (files: File[]) => {
    try {
      validateProductImageSelection(formData.existingImageUrls, [...formData.imageFiles, ...files]);
      updateField('imageFiles', [...formData.imageFiles, ...files]);
    } catch (imageError) {
      showToast(
        imageError instanceof ProductFormValidationError ? imageError.message : 'Unable to select images',
        'error',
      );
    }
  };

  const removeExistingImage = (index: number) => {
    updateField('existingImageUrls', formData.existingImageUrls.filter((_, imageIndex) => imageIndex !== index));
  };

  const removeImageFile = (index: number) => {
    updateField('imageFiles', formData.imageFiles.filter((_, imageIndex) => imageIndex !== index));
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
            onSubmit={async (e) => {
              e.preventDefault();
              setIsSaving(true);
              let uploadedImageUrls: string[] = [];
              try {
                const basePayload = toProductCreateRequest(formData);
                uploadedImageUrls = formData.imageFiles.length
                  ? await productsAPI.uploadProductImages(formData.imageFiles)
                  : [];
                const payload = {
                  ...basePayload,
                  images: [...formData.existingImageUrls, ...uploadedImageUrls],
                };
                if (isEditing) {
                  await productsAPI.updateProduct(product._id, payload);
                } else {
                  await productsAPI.createProduct(payload);
                }
                showToast(isEditing ? 'Product updated' : 'Product added', 'success');
                await onSaved();
                onClose();
              } catch (saveError) {
                if (uploadedImageUrls.length) {
                  void productsAPI.deleteProductImages(uploadedImageUrls);
                }
                const fallback = isEditing ? 'Failed to update product' : 'Failed to add product';
                showToast(
                  saveError instanceof ProductFormValidationError
                    ? saveError.message
                    : getApiErrorMessage(saveError, fallback),
                  'error',
                );
              } finally {
                setIsSaving(false);
              }
            }}
            className="p-6 space-y-6"
          >
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name
                </label>
                <input
                  id="product-name"
                  type="text"
                  value={formData.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  required
                  maxLength={200}
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
                <option>Tablets</option>
                <option>Smart Watches</option>
                <option>Gadgets</option>
                <option>Wearables</option>
                <option>Headphones</option>
                <option>Speakers</option>
              </select>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-4">
              <input
                type="checkbox"
                checked={formData.hasVariants}
                onChange={(event) => updateField('hasVariants', event.target.checked)}
                className="h-5 w-5 rounded text-blue-600"
              />
              <span>
                <span className="block text-sm font-semibold text-gray-900">Does this product have variants?</span>
                <span className="block text-xs text-gray-500">Use one product for all storage, color, or future option combinations.</span>
              </span>
            </label>

            {formData.hasVariants && (
              <section className="space-y-4 rounded-xl border border-gray-200 p-4" aria-labelledby="variant-builder-heading">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 id="variant-builder-heading" className="text-sm font-semibold text-gray-900">Variant builder</h4>
                    <p className="mt-1 text-xs text-gray-500">Add storage and color values, then generate editable combinations.</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={generatePhoneVariants} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">Generate combinations</button>
                    <button type="button" onClick={addGenericVariant} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Add variant</button>
                  </div>
                </div>
                {(['variantStorageOptions', 'variantColorOptions'] as const).map((field) => {
                  const isStorage = field === 'variantStorageOptions';
                  const values = formData[field];
                  const draft = isStorage ? storageDraft : colorDraft;
                  const setDraft = isStorage ? setStorageDraft : setColorDraft;
                  return (
                    <div key={field}>
                      <p className="mb-2 text-sm font-medium text-gray-700">{isStorage ? 'Storage' : 'Color'}</p>
                      <div className="flex flex-wrap gap-2">
                        {values.map((value) => (
                          <button key={value} type="button" onClick={() => updateField(field, values.filter((item) => item !== value))} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-800 hover:border-red-300 hover:text-red-700">{value} <span aria-hidden="true">×</span></button>
                        ))}
                        <div className="flex gap-2">
                          <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addOptionValue(field, draft); setDraft(''); } }} placeholder={isStorage ? '128GB' : 'Black'} className="w-28 rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
                          <button type="button" onClick={() => { addOptionValue(field, draft); setDraft(''); }} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">+ Add</button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="text-xs text-gray-500"><tr><th className="pb-2">Storage</th><th className="pb-2">Color / options</th><th className="pb-2">Condition</th><th className="pb-2">Price</th><th className="pb-2">Regular price</th><th className="pb-2">Stock</th><th className="pb-2">SKU</th><th className="pb-2">Active</th><th className="pb-2"></th></tr></thead>
                    <tbody>
                      {formData.variants.map((variant, index) => (
                        <tr key={variant.id ?? `${variant.storage}-${variant.color}-${index}`} className="border-t border-gray-100">
                          <td className="py-2 pr-2"><input value={variant.storage} onChange={(event) => updateVariant(index, 'storage', event.target.value)} className="w-24 rounded border border-gray-300 px-2 py-1.5" /></td>
                          <td className="py-2 pr-2"><input value={variant.color} onChange={(event) => updateVariant(index, 'color', event.target.value)} placeholder="Color" className="w-28 rounded border border-gray-300 px-2 py-1.5" /><input value={Object.entries(variant.options).map(([key, value]) => `${key}: ${value}`).join(', ')} onChange={(event) => updateVariant(index, 'options', Object.fromEntries(event.target.value.split(',').map((item) => item.split(':').map((part) => part.trim())).filter((parts) => parts.length === 2 && parts[0] && parts[1]) as [string, string][]))} placeholder="Size: 44mm" className="mt-1 w-36 rounded border border-gray-300 px-2 py-1.5 text-xs" /></td>
                          <td className="py-2 pr-2"><select value={variant.condition} onChange={(event) => updateVariant(index, 'condition', event.target.value as VariantFormState['condition'])} className="rounded border border-gray-300 px-2 py-1.5"><option value="new">New</option><option value="used">Used</option><option value="refurbished">Refurbished</option></select></td>
                          <td className="py-2 pr-2"><input type="number" min="0" value={variant.price} onChange={(event) => updateVariant(index, 'price', event.target.value)} className="w-24 rounded border border-gray-300 px-2 py-1.5" /></td>
                          <td className="py-2 pr-2"><input type="number" min="0" value={variant.originalPrice} onChange={(event) => updateVariant(index, 'originalPrice', event.target.value)} className="w-24 rounded border border-gray-300 px-2 py-1.5" /></td>
                          <td className="py-2 pr-2"><input type="number" min="0" value={variant.countInStock} onChange={(event) => updateVariant(index, 'countInStock', event.target.value)} className="w-20 rounded border border-gray-300 px-2 py-1.5" /></td>
                          <td className="py-2 pr-2"><input value={variant.sku} onChange={(event) => updateVariant(index, 'sku', event.target.value)} placeholder="Auto if blank" className="w-32 rounded border border-gray-300 px-2 py-1.5" /></td>
                          <td className="py-2 pr-2"><input type="checkbox" checked={variant.isActive} onChange={(event) => updateVariant(index, 'isActive', event.target.checked)} className="h-4 w-4" /></td>
                          <td className="py-2 text-right"><button type="button" onClick={() => updateField('variants', formData.variants.filter((_, variantIndex) => variantIndex !== index))} className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600" aria-label={`Remove variant ${index + 1}`}><Trash2 className="h-4 w-4" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {!formData.hasVariants && <div className="grid sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sale Price (PKR)
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(event) => updateField('price', event.target.value)}
                  min="0"
                  step="1"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Regular Price (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.originalPrice}
                  onChange={(event) => updateField('originalPrice', event.target.value)}
                  placeholder="Optional, enables a discount"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">Set above the sale price to show a per-product discount.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  value={formData.countInStock}
                  onChange={(event) => updateField('countInStock', event.target.value)}
                  min="0"
                  step="1"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(event) => updateField('description', event.target.value)}
                required
                maxLength={5000}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Product Images</h4>
                  <p className="mt-1 text-xs text-gray-500">
                    Upload up to {MAX_PRODUCT_IMAGES} JPG, JPEG, or PNG files. The first image is primary.
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium text-gray-500">
                  {imageCount}/{MAX_PRODUCT_IMAGES}
                </span>
              </div>

              <label
                htmlFor="product-image-files"
                className={`flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-5 text-center transition-colors ${
                  imageCount >= MAX_PRODUCT_IMAGES
                    ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
                    : 'border-blue-200 bg-blue-50/50 text-blue-700 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                <ImagePlus className="mb-2 h-7 w-7" aria-hidden="true" />
                <span className="text-sm font-semibold">
                  {imageCount >= MAX_PRODUCT_IMAGES ? 'Maximum of 5 images reached' : 'Choose images from your device'}
                </span>
                <span className="mt-1 text-xs text-gray-500">Maximum 5 MB per image</span>
              </label>
              <input
                id="product-image-files"
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                multiple
                disabled={imageCount >= MAX_PRODUCT_IMAGES}
                className="sr-only"
                onChange={(event) => {
                  selectImageFiles(Array.from(event.target.files ?? []));
                  event.target.value = '';
                }}
              />

              {imageCount > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {formData.existingImageUrls.map((imageUrl, index) => (
                    <div key={imageUrl} className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                      <img src={imageUrl} alt={`Product image ${index + 1}`} className="aspect-square w-full object-cover" />
                      {index === 0 && (
                        <span className="absolute left-2 top-2 rounded-full bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white">
                          Primary
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeExistingImage(index)}
                        className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-gray-600 shadow-sm hover:text-red-600"
                        aria-label={`Remove image ${index + 1}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {imagePreviews.map(({ file, url }, index) => {
                    const imageNumber = formData.existingImageUrls.length + index + 1;
                    return (
                      <div key={`${file.name}-${file.lastModified}-${index}`} className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                        <div className="relative">
                          <img src={url} alt={`Selected product image ${imageNumber}`} className="aspect-square w-full object-cover" />
                          {imageNumber === 1 && (
                            <span className="absolute left-2 top-2 rounded-full bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white">
                              Primary
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeImageFile(index)}
                            className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-gray-600 shadow-sm hover:text-red-600"
                            aria-label={`Remove ${file.name}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="truncate px-2 py-2 text-xs text-gray-600" title={file.name}>{file.name}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {!formData.hasVariants && <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Storage
                </label>
                <select
                  value={formData.storage}
                  onChange={(event) => updateField('storage', event.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Not specified</option>
                  <option>64GB</option>
                  <option>128GB</option>
                  <option>256GB</option>
                  <option>512GB</option>
                  <option>1TB</option>
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
                  maxLength={80}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>}

            <section aria-labelledby="comparison-specifications-heading">
              <div className="mb-4">
                <h4 id="comparison-specifications-heading" className="text-sm font-semibold text-gray-900">
                  Comparison specifications
                </h4>
                <p className="mt-1 text-xs text-gray-500">
                  These details appear on the Compare page, so customers can make a meaningful side-by-side choice.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {comparisonFields.map((field) => (
                  <div key={field.key}>
                    <label htmlFor={`product-${field.key}`} className="mb-2 block text-sm font-medium text-gray-700">
                      {field.label}
                    </label>
                    <input
                      id={`product-${field.key}`}
                      type="text"
                      value={formData[field.key]}
                      onChange={(event) => updateField(field.key, event.target.value)}
                      placeholder={field.placeholder}
                      maxLength={field.key === 'camera' ? 240 : 160}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </section>

            <div className="grid gap-6 sm:grid-cols-3">
              <div>
                <label htmlFor="product-condition" className="mb-2 block text-sm font-medium text-gray-700">
                  Condition
                </label>
                <select
                  id="product-condition"
                  value={formData.condition}
                  onChange={(event) => updateField('condition', event.target.value as ProductFormState['condition'])}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="new">New</option>
                  <option value="used">Used</option>
                  <option value="refurbished">Refurbished</option>
                </select>
              </div>
              <div>
                <label htmlFor="product-status" className="mb-2 block text-sm font-medium text-gray-700">
                  Publication status
                </label>
                <select
                  id="product-status"
                  value={formData.status}
                  onChange={(event) => updateField('status', event.target.value as ProductFormState['status'])}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ACTIVE">Published</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <div>
                <label htmlFor="product-pta-status" className="mb-2 block text-sm font-medium text-gray-700">
                  PTA Status
                </label>
                <select
                  id="product-pta-status"
                  value={formData.ptaApproved ? 'approved' : 'not-approved'}
                  onChange={(event) => updateField('ptaApproved', event.target.value === 'approved')}
                  className="rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="approved">PTA Approved</option>
                  <option value="not-approved">Not PTA Approved</option>
                </select>
              </div>
              <label className="flex items-center gap-3 cursor-pointer sm:col-span-3">
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
                disabled={isSaving}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Saving…' : isEditing ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdminProducts;
