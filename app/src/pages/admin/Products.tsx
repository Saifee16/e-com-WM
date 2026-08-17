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
import type { Category, Product } from '../../types';
import { productsAPI } from '../../services/api';
import { getApiErrorMessage } from '../../utils/api-error';
import { flattenCategories, getCategorySpecificationFields, isPhoneCategory } from '../../config/category-catalog';
import {
  MAX_PRODUCT_IMAGES,
  ProductFormValidationError,
  createProductFormState,
  toProductCreateRequest,
  normalizePhoneValue,
  phoneCellKey,
  validateProductImageSelection,
  type ProductFormState,
  type PhoneMemoryConfiguration,
  type VariantFormState,
} from './product-form';

const PAGE_SIZE = 25;
const productStatuses = ['ALL', 'ACTIVE', 'DRAFT', 'ARCHIVED', 'DISCARDED'] as const;
type ProductStatusFilter = (typeof productStatuses)[number];
type ProductStatusCounts = Record<ProductStatusFilter, number>;
const emptyStatusCounts: ProductStatusCounts = { ALL: 0, ACTIVE: 0, DRAFT: 0, ARCHIVED: 0, DISCARDED: 0 };

const AdminProducts = () => {
  const { showToast } = useToast();
  const [productList, setProductList] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>('ALL');
  const [brandFilter, setBrandFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusCounts, setStatusCounts] = useState<ProductStatusCounts>(emptyStatusCounts);
  const [brands, setBrands] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isManagingCategories, setIsManagingCategories] = useState(false);

  const loadProducts = async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const response = await productsAPI.getAdminProducts({
        page,
        limit: PAGE_SIZE,
        ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
        ...(brandFilter ? { brand: brandFilter } : {}),
        ...(statusFilter === 'ALL' ? {} : { status: statusFilter }),
      });
      setProductList(response.data.data.items);
      setTotal(response.data.data.pagination.total);
      setTotalPages(response.data.data.pagination.totalPages);
      setStatusCounts(response.data.data.statusCounts ?? emptyStatusCounts);
    } catch {
      setLoadError(true);
      showToast('Failed to load products', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadBrands = async () => {
    try {
      const response = await productsAPI.getAdminBrands();
      setBrands(response.data.data);
    } catch {
      showToast('Failed to load brands', 'error');
    }
  };

  const loadCategories = async () => {
    try {
      const response = await productsAPI.getAdminCategories();
      setCategories(response.data.data);
    } catch {
      showToast('Failed to load categories', 'error');
    }
  };

  useEffect(() => {
    void loadCategories();
    void loadBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchQuery, statusFilter, brandFilter]);

  const handleDelete = (id: string) => {
    productsAPI
      .deleteProduct(id)
      .then(() => {
        showToast('Product discarded. It can be restored from the Discarded tab.', 'success');
        loadProducts();
      })
      .catch(() => showToast('Failed to delete product', 'error'));
  };

  const restoreProduct = (id: string) => {
    productsAPI
      .updateProduct(id, { status: 'DRAFT' })
      .then(() => {
        showToast('Product restored as a draft.', 'success');
        void loadProducts();
      })
      .catch(() => showToast('Failed to restore product', 'error'));
  };

  const getStatusColor = (count: number) => {
    if (count === 0) return 'text-red-600';
    if (count < 5) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getPublicationStatusColor = (status: Product['status']) => {
    if (status === 'DRAFT') return 'bg-amber-100 text-amber-700';
    if (status === 'ARCHIVED') return 'bg-gray-200 text-gray-700';
    if (status === 'DISCARDED') return 'bg-red-100 text-red-700';
    return 'bg-green-100 text-green-700';
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Products</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsManagingCategories((current) => !current)}
            className="rounded-xl border border-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
          >
            {isManagingCategories ? 'Hide categories' : 'Manage categories'}
          </button>
          <button
            onClick={() => setIsAddingProduct(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </div>
      </div>

      {isManagingCategories && (
        <CategoryManager categories={categories} onChanged={loadCategories} />
      )}

      <div className="mb-4 flex flex-wrap gap-2" aria-label="Product status tabs">
        {productStatuses.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => { setStatusFilter(status); setPage(1); }}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${statusFilter === status ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'}`}
          >
            {status[0] + status.slice(1).toLowerCase()} ({statusCounts[status]})
          </button>
        ))}
      </div>

      <p className="mb-4 text-sm font-medium text-gray-600">Total products: {statusCounts.ALL}</p>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          placeholder="Search products..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <label className="mb-6 block max-w-sm text-sm font-medium text-gray-700">
        Brand
        <select value={brandFilter} onChange={(event) => { setBrandFilter(event.target.value); setPage(1); }} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3">
          <option value="">All Brands</option>
          {brands.map((brand) => <option key={brand.id} value={brand.slug}>{brand.name}</option>)}
        </select>
      </label>

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
            {productList.map((product) => (
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
                      aria-label={`Discard ${product.name}`}
                      title={`Discard ${product.name}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    {(product.status === 'ARCHIVED' || product.status === 'DISCARDED') && (
                      <button type="button" onClick={() => restoreProduct(product._id)} className="rounded-lg px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50">Restore</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && !loadError && productList.length === 0 && <p className="p-6 text-center text-sm text-gray-500">No products match these filters.</p>}
        {loadError && <p className="p-6 text-center text-sm text-red-600">Products could not be loaded. Try again.</p>}
        {isLoading && <p className="p-6 text-center text-sm text-gray-500">Loading products…</p>}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-3 text-sm">
          <span>{total} results · Page {page} of {totalPages}</span>
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      <ProductModal
        key={editingProduct?._id ?? (isAddingProduct ? 'new' : 'closed')}
        isOpen={isAddingProduct || !!editingProduct}
        onClose={() => {
          setIsAddingProduct(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        categories={flattenCategories(categories)}
        brands={brands.map((brand) => brand.name)}
        onSaved={loadProducts}
      />
    </div>
  );
};

// Product Modal Component
export const ProductModal = ({
  isOpen,
  onClose,
  product,
  categories,
  brands,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  categories: Category[];
  brands: string[];
  onSaved: () => Promise<void>;
}) => {
  const { showToast } = useToast();
  const isEditing = !!product;
  const [formData, setFormData] = useState<ProductFormState>(() => createProductFormState(product, categories));
  const [isSaving, setIsSaving] = useState(false);
  const [storageDraft, setStorageDraft] = useState('');
  const [colorDraft, setColorDraft] = useState('');
  const [phoneColorDraft, setPhoneColorDraft] = useState('');
  const isPhoneProduct = formData.phoneCategory || isPhoneCategory(formData.category, categories);
  const specificationFields = getCategorySpecificationFields(formData.category, categories);

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
  const generateVariantCombinations = () => {
    const storages = formData.variantStorageOptions.length ? formData.variantStorageOptions : [''];
    const colors = formData.variantColorOptions.length ? formData.variantColorOptions : [''];
    const currentVariants = new Map(formData.variants.map((variant) => [`${variant.storage}\u0000${variant.color}`, variant]));
    const generated: VariantFormState[] = storages.flatMap((storage) => colors.map((color) => {
      const existing = currentVariants.get(`${storage}\u0000${color}`);
      return existing ?? {
        clientId: crypto.randomUUID(),
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
      clientId: crypto.randomUUID(),
      sku: '', title: '', storage: '', color: '', condition: formData.condition, options: {},
      price: formData.price, originalPrice: formData.originalPrice, countInStock: formData.countInStock, isActive: true,
    }]);
  };

  const updateMemoryConfiguration = <Key extends keyof PhoneMemoryConfiguration>(
    clientId: string,
    field: Key,
    value: PhoneMemoryConfiguration[Key],
  ) => {
    updateField('memoryConfigurations', formData.memoryConfigurations.map((memory) => (
      memory.clientId === clientId ? { ...memory, [field]: value } : memory
    )));
  };

  const updatePhoneAvailability = (
    memoryClientId: string,
    colorClientId: string,
    cell: Partial<ProductFormState['phoneAvailability'][string]>,
  ) => {
    const key = phoneCellKey(memoryClientId, colorClientId);
    updateField('phoneAvailability', {
      ...formData.phoneAvailability,
      [key]: {
        ...(formData.phoneAvailability[key] ?? { enabled: false, countInStock: '0' }),
        ...cell,
      },
    });
  };

  const addMemoryConfiguration = () => {
    updateField('memoryConfigurations', [
      ...formData.memoryConfigurations,
      { clientId: crypto.randomUUID(), ram: '', storage: '', price: '', originalPrice: '' },
    ]);
  };

  const removeMemoryConfiguration = (memory: PhoneMemoryConfiguration) => {
    const affected = formData.variants.filter((variant) => (
      normalizePhoneValue(variant.options.RAM ?? '') === normalizePhoneValue(memory.ram)
      && normalizePhoneValue(variant.storage) === normalizePhoneValue(memory.storage)
    )).length;
    if (affected > 0 && !window.confirm(`Removing this memory option will deactivate ${affected} product combinations. Continue?`)) return;
    updateField('memoryConfigurations', formData.memoryConfigurations.filter((item) => item.clientId !== memory.clientId));
  };

  const addPhoneColor = () => {
    const value = normalizePhoneValue(phoneColorDraft);
    if (!value) return;
    if (formData.colors.some((color) => normalizePhoneValue(color.value).toLocaleLowerCase() === value.toLocaleLowerCase())) {
      showToast('Colors must be unique.', 'error');
      return;
    }
    updateField('colors', [...formData.colors, { clientId: crypto.randomUUID(), value }]);
    setPhoneColorDraft('');
  };

  const removePhoneColor = (color: ProductFormState['colors'][number]) => {
    const affected = formData.variants.filter((variant) => (
      normalizePhoneValue(variant.color).toLocaleLowerCase() === normalizePhoneValue(color.value).toLocaleLowerCase()
    )).length;
    if (affected > 0 && !window.confirm(`Removing this color will deactivate ${affected} product combinations. Continue?`)) return;
    updateField('colors', formData.colors.filter((item) => item.clientId !== color.clientId));
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
      setFormData((current) => ({ ...current, imageFiles: [...current.imageFiles, ...files], imagesChanged: true }));
    } catch (imageError) {
      showToast(
        imageError instanceof ProductFormValidationError ? imageError.message : 'Unable to select images',
        'error',
      );
    }
  };

  const removeExistingImage = (index: number) => {
    setFormData((current) => ({ ...current, existingImageUrls: current.existingImageUrls.filter((_, imageIndex) => imageIndex !== index), imagesChanged: true }));
  };

  const removeImageFile = (index: number) => {
    setFormData((current) => ({ ...current, imageFiles: current.imageFiles.filter((_, imageIndex) => imageIndex !== index), imagesChanged: true }));
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
                const basePayload = toProductCreateRequest({ ...formData, phoneCategory: isPhoneProduct });
                uploadedImageUrls = formData.imageFiles.length
                  ? await productsAPI.uploadProductImages(formData.imageFiles)
                  : [];
                const payload = {
                  ...basePayload,
                  ...(formData.imagesChanged || uploadedImageUrls.length
                    ? { images: [...formData.existingImageUrls, ...uploadedImageUrls] }
                    : {}),
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
                  {[...new Set([...brands, formData.brand].filter((brand) => brand && brand !== 'Other'))].map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                  <option value="Other">Other</option>
                </select>
                {formData.brand === 'Other' && <input aria-label="Custom brand name" value={formData.customBrand} onChange={(event) => updateField('customBrand', event.target.value)} placeholder="Custom brand name" maxLength={80} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3" required />}
              </div>
            </div>

            <div>
              <label htmlFor="product-category" className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                id="product-category"
                value={formData.category}
                onChange={(event) => {
                  const category = event.target.value;
                  setFormData((current) => ({
                    ...current,
                    category,
                    phoneCategory: isPhoneCategory(category, categories),
                  }));
                }}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select an existing category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.parentSlug ? '↳ ' : ''}{category.name}{category.isActive === false ? ' (inactive)' : ''}
                  </option>
                ))}
              </select>
              {categories.length === 0 && <p className="mt-2 text-xs text-amber-700">Create or activate a category before assigning this product.</p>}
            </div>

            {!isPhoneProduct && <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-4">
              <input
                type="checkbox"
                checked={formData.hasVariants}
                onChange={(event) => {
                  if (!event.target.checked && formData.variants.length > 1 && !window.confirm('Keep all variants active? Single-variant conversion is not automatic; remove or deactivate variants explicitly.')) return;
                  updateField('hasVariants', event.target.checked);
                }}
                className="h-5 w-5 rounded text-blue-600"
              />
              <span>
                <span className="block text-sm font-semibold text-gray-900">Does this product have variants?</span>
                <span className="block text-xs text-gray-500">Use one product for all storage, color, or future option combinations.</span>
              </span>
            </label>}

            {!isPhoneProduct && formData.hasVariants && (
              <section className="space-y-4 rounded-xl border border-gray-200 p-4" aria-labelledby="variant-builder-heading">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 id="variant-builder-heading" className="text-sm font-semibold text-gray-900">Variant builder</h4>
                    <p className="mt-1 text-xs text-gray-500">Add storage and color values, then generate editable combinations.</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={generateVariantCombinations} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">Generate combinations</button>
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
                        <tr key={variant.id ?? variant.clientId ?? `variant-${index}`} className="border-t border-gray-100">
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

            {isPhoneProduct && (
              <div className="space-y-6">
                <section className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/30 p-5" aria-labelledby="memory-price-heading">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 id="memory-price-heading" className="text-base font-semibold text-gray-900">Memory &amp; Price</h4>
                      <p className="mt-1 text-sm text-gray-500">Add each RAM and Storage / ROM price once. Colors inherit this price.</p>
                    </div>
                    <button type="button" onClick={addMemoryConfiguration} className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                      + Add memory option
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] text-left text-sm">
                      <thead className="text-xs uppercase tracking-wide text-gray-500">
                        <tr><th className="pb-2 pr-3">RAM</th><th className="pb-2 pr-3">Storage / ROM</th><th className="pb-2 pr-3">Sale price (PKR)</th><th className="pb-2 pr-3">Regular price (optional)</th><th className="pb-2" /></tr>
                      </thead>
                      <tbody>
                        {formData.memoryConfigurations.map((memory, index) => (
                          <tr key={memory.clientId} className="border-t border-blue-100">
                            <td className="py-2 pr-3"><input aria-label={`RAM option ${index + 1}`} value={memory.ram} onChange={(event) => updateMemoryConfiguration(memory.clientId, 'ram', event.target.value)} placeholder="e.g. 8GB" className="w-28 rounded-xl border border-gray-200 bg-white px-3 py-2" /></td>
                            <td className="py-2 pr-3"><input aria-label={`Storage option ${index + 1}`} value={memory.storage} onChange={(event) => updateMemoryConfiguration(memory.clientId, 'storage', event.target.value)} placeholder="e.g. 128GB" className="w-32 rounded-xl border border-gray-200 bg-white px-3 py-2" /></td>
                            <td className="py-2 pr-3"><input aria-label={`Sale price for memory option ${index + 1}`} type="number" min="0" step="1" value={memory.price} onChange={(event) => updateMemoryConfiguration(memory.clientId, 'price', event.target.value)} className="w-32 rounded-xl border border-gray-200 bg-white px-3 py-2" /></td>
                            <td className="py-2 pr-3"><input aria-label={`Regular price for memory option ${index + 1}`} type="number" min="0" step="1" value={memory.originalPrice} onChange={(event) => updateMemoryConfiguration(memory.clientId, 'originalPrice', event.target.value)} placeholder="Optional" className="w-36 rounded-xl border border-gray-200 bg-white px-3 py-2" /></td>
                            <td className="py-2 text-right"><button type="button" onClick={() => removeMemoryConfiguration(memory)} className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600" aria-label={`Remove memory option ${index + 1}`}><Trash2 className="h-4 w-4" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="space-y-4 rounded-2xl border border-gray-200 p-5" aria-labelledby="phone-colors-heading">
                  <div>
                    <h4 id="phone-colors-heading" className="text-base font-semibold text-gray-900">Colors</h4>
                    <p className="mt-1 text-sm text-gray-500">Enter each color once, then choose where it is available below.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {formData.colors.map((color) => (
                      <button key={color.clientId} type="button" onClick={() => removePhoneColor(color)} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-800 hover:border-red-300 hover:text-red-700" aria-label={`Remove color ${color.value}`}>
                        {color.value} <span aria-hidden="true">×</span>
                      </button>
                    ))}
                    <div className="flex gap-2">
                      <input aria-label="New phone color" value={phoneColorDraft} onChange={(event) => setPhoneColorDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addPhoneColor(); } }} placeholder="e.g. Awesome Black" className="w-44 rounded-xl border border-gray-200 px-3 py-2" />
                      <button type="button" onClick={addPhoneColor} className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">+ Add color</button>
                    </div>
                  </div>
                </section>

                <section className="space-y-4 rounded-2xl border border-gray-200 p-5" aria-labelledby="phone-availability-heading">
                  <div>
                    <h4 id="phone-availability-heading" className="text-base font-semibold text-gray-900">Availability &amp; Stock</h4>
                    <p className="mt-1 text-sm text-gray-500">Enable a cell to create that exact RAM + Storage / ROM + Color combination. Enabled stock 0 means sold out; disabled means unavailable.</p>
                  </div>
                  {formData.colors.length === 0 ? (
                    <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">Add at least one color to build the availability matrix.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-left text-sm">
                        <thead className="text-xs uppercase tracking-wide text-gray-500">
                          <tr><th className="pb-3 pr-3">RAM / Storage</th>{formData.colors.map((color) => <th key={color.clientId} className="pb-3 pr-3">{color.value}</th>)}</tr>
                        </thead>
                        <tbody>
                          {formData.memoryConfigurations.map((memory) => (
                            <tr key={memory.clientId} className="border-t border-gray-100 align-top">
                              <th className="py-3 pr-3 font-semibold text-gray-700">{memory.ram || 'RAM'} / {memory.storage || 'Storage'}</th>
                              {formData.colors.map((color) => {
                                const cell = formData.phoneAvailability[phoneCellKey(memory.clientId, color.clientId)] ?? { enabled: false, countInStock: '0' };
                                return (
                                  <td key={color.clientId} className="py-3 pr-3">
                                    <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                                      <input type="checkbox" checked={cell.enabled} onChange={(event) => updatePhoneAvailability(memory.clientId, color.clientId, { enabled: event.target.checked })} className="h-4 w-4 rounded text-blue-600" />
                                      {cell.enabled ? 'Available' : 'Unavailable'}
                                    </label>
                                    {cell.enabled && <input aria-label={`Stock for ${memory.ram} ${memory.storage} ${color.value}`} type="number" min="0" step="1" value={cell.countInStock} onChange={(event) => updatePhoneAvailability(memory.clientId, color.clientId, { countInStock: event.target.value })} className="mt-2 w-24 rounded-xl border border-gray-200 px-3 py-2" />}
                                    {cell.enabled && cell.countInStock === '0' && <span className="mt-1 block text-xs text-amber-700">Sold out</span>}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            )}

            {!isPhoneProduct && !formData.hasVariants && <div className="grid sm:grid-cols-3 gap-6">
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
                  {isPhoneProduct ? 'Phone specifications' : 'Category specifications'}
                </h4>
                <p className="mt-1 text-xs text-gray-500">
                  Only specifications relevant to the selected category are shown and saved.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {specificationFields.map((field) => (
                  <div key={field.key}>
                    <label htmlFor={`product-${field.key}`} className="mb-2 block text-sm font-medium text-gray-700">
                      {field.label}
                    </label>
                    <input
                      id={`product-${field.key}`}
                      type="text"
                      value={formData.specifications[field.key] ?? ''}
                      onChange={(event) => updateField('specifications', { ...formData.specifications, [field.key]: event.target.value })}
                      placeholder={field.placeholder}
                      maxLength={field.maxLength ?? 160}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
              {specificationFields.length === 0 && (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">No category-specific specification fields are configured for this category yet.</p>
              )}
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
                  <option value="DISCARDED">Discarded</option>
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

const CategoryManager = ({
  categories,
  onChanged,
}: {
  categories: Category[];
  onChanged: () => Promise<void>;
}) => {
  const { showToast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const flatCategories = flattenCategories(categories);

  const reset = () => {
    setEditingId(null);
    setName('');
    setParentId('');
    setIsActive(true);
  };

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setName(category.name);
    setParentId(category.parentId ?? '');
    setIsActive(category.isActive !== false);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        ...(parentId ? { parentId } : { parentId: null }),
        isActive,
      };
      if (editingId) await productsAPI.updateCategory(editingId, payload);
      else await productsAPI.createCategory(payload);
      showToast(editingId ? 'Category updated' : 'Category created', 'success');
      await onChanged();
      reset();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to save category'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5" aria-labelledby="category-manager-heading">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="category-manager-heading" className="text-lg font-bold text-gray-900">Category hierarchy</h3>
          <p className="mt-1 text-sm text-gray-500">Create and maintain real parent/child categories. Products remain linked when a category is renamed or deactivated.</p>
        </div>
        {editingId && <button type="button" onClick={reset} className="text-sm font-medium text-gray-600 hover:text-gray-900">Cancel edit</button>}
      </div>

      <form onSubmit={save} className="grid gap-3 rounded-xl bg-gray-50 p-4 sm:grid-cols-[1.2fr_1fr_auto_auto] sm:items-end">
        <label className="text-sm font-medium text-gray-700">
          Category name
          <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-normal" />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Parent category
          <select value={parentId} onChange={(event) => setParentId(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-normal">
            <option value="">Top level</option>
            {flatCategories.filter((category) => category.id !== editingId).map((category) => (
              <option key={category.id} value={category.id}>{category.parentSlug ? '↳ ' : ''}{category.name}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm font-medium text-gray-700">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="h-4 w-4" /> Active
        </label>
        <button type="submit" disabled={isSaving} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Create category'}
        </button>
      </form>

      <div className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-100">
        {flatCategories.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">No categories exist yet.</p>
        ) : flatCategories.map((category) => (
          <div key={category.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-gray-900">{category.parentSlug ? '↳ ' : ''}{category.name}</p>
              <p className="text-xs text-gray-500">/{category.slug} · {category.productCount} product{category.productCount === 1 ? '' : 's'}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${category.isActive === false ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>{category.isActive === false ? 'Inactive' : 'Active'}</span>
              <button type="button" onClick={() => startEditing(category)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Edit</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default AdminProducts;
