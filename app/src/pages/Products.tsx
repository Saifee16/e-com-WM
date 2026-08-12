import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
  X,
  Search,
  ShoppingCart,
  Smartphone,
  SlidersHorizontal,
} from 'lucide-react';
import { priceRanges, storageOptions } from '../data/products';
import type { Product } from '../types';
import { formatPrice } from '../utils/format';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { productsAPI } from '../services/api';
import type { Pagination, ProductQueryParams } from '../services/api';
import { getApiErrorMessage } from '../utils/api-error';
import ProductRating from '../components/product/ProductRating';

const PAGE_SIZE = 20;

const conditionOptions: Array<{ value: NonNullable<ProductQueryParams['condition']>; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'used', label: 'Used' },
  { value: 'refurbished', label: 'Refurbished' },
];

const getRequestedCondition = (value: string | null): ProductQueryParams['condition'] | '' =>
  conditionOptions.some((option) => option.value === value)
    ? (value as ProductQueryParams['condition'])
    : '';

const conditionLabels: Record<NonNullable<ProductQueryParams['condition']>, string> = {
  new: 'New',
  used: 'Used',
  refurbished: 'Refurbished',
};

const getPrimaryImage = (product: Product) => product.images.find(Boolean);

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });
  const [brands, setBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<{ name: string; slug: string }[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const [selectedBrands, setSelectedBrands] = useState<string[]>(() =>
    searchParams.get('brand')?.split(',').filter(Boolean) ?? [],
  );
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('');
  const [selectedStorage, setSelectedStorage] = useState<string>('');
  const [selectedCondition, setSelectedCondition] = useState<ProductQueryParams['condition'] | ''>(() =>
    getRequestedCondition(searchParams.get('condition')),
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(() => searchParams.get('category') ?? '');
  const [sortOption, setSortOption] = useState<NonNullable<ProductQueryParams['sort']>>(() => {
    const requestedSort = searchParams.get('sort');
    return requestedSort === 'price-low' ||
      requestedSort === 'price-high' ||
      requestedSort === 'rating'
      ? requestedSort
      : 'newest';
  });
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [featuredOnly, setFeaturedOnly] = useState(() => searchParams.get('featured') === 'true');
  const [currentPage, setCurrentPage] = useState(() => {
    const requestedPage = Number(searchParams.get('page'));
    return Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  });

  useEffect(() => {
    let isActive = true;

    const loadFilterOptions = async () => {
      try {
        const [brandsResponse, categoriesResponse] = await Promise.all([
          productsAPI.getBrands(),
          productsAPI.getCategories(),
        ]);

        if (isActive) {
          setBrands(brandsResponse.data.data.map((brand: { name: string }) => brand.name));
          setCategories(categoriesResponse.data.data);
        }
      } catch {
        showToast('Failed to load products', 'error');
      }
    };

    void loadFilterOptions();

    return () => {
      isActive = false;
    };
  }, [showToast]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    let isActive = true;

    const loadProducts = async () => {
      const priceRange = priceRanges.find((range) => range.label === selectedPriceRange);

      try {
        setIsLoadingProducts(true);
        setProductsError(null);
        const response = await productsAPI.getProducts({
          page: currentPage,
          limit: PAGE_SIZE,
          sort: sortOption,
          search: debouncedSearch || undefined,
          brand: selectedBrands.length > 0 ? selectedBrands.join(',') : undefined,
          category: selectedCategory || undefined,
          featured: featuredOnly || undefined,
          minPrice: priceRange?.min,
          maxPrice:
            priceRange?.max !== undefined && Number.isFinite(priceRange.max)
              ? priceRange.max
              : undefined,
          storage: selectedStorage || undefined,
          condition: selectedCondition || undefined,
        });

        if (isActive) {
          setProducts(response.data.data.items);
          setPagination(response.data.data.pagination);
        }
      } catch (loadError) {
        if (isActive) {
          setProducts([]);
          setProductsError(getApiErrorMessage(loadError, 'Unable to load products.'));
        }
      } finally {
        if (isActive) {
          setIsLoadingProducts(false);
        }
      }
    };

    void loadProducts();

    return () => {
      isActive = false;
    };
  }, [
    currentPage,
    debouncedSearch,
    featuredOnly,
    reloadVersion,
    selectedBrands,
    selectedCategory,
    selectedCondition,
    selectedPriceRange,
    selectedStorage,
    sortOption,
  ]);

  useEffect(() => {
    const nextParams = new URLSearchParams();

    if (debouncedSearch) nextParams.set('search', debouncedSearch);
    if (selectedBrands.length > 0) nextParams.set('brand', selectedBrands.join(','));
    if (selectedCategory) nextParams.set('category', selectedCategory);
    if (selectedCondition) nextParams.set('condition', selectedCondition);
    if (sortOption !== 'newest') nextParams.set('sort', sortOption);
    if (featuredOnly) nextParams.set('featured', 'true');
    if (currentPage > 1) nextParams.set('page', String(currentPage));

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [
    currentPage,
    debouncedSearch,
    featuredOnly,
    searchParams,
    selectedBrands,
    selectedCategory,
    selectedCondition,
    setSearchParams,
    sortOption,
  ]);

  const handleAddToCart = async (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await addToCart(product, 1);
    } catch {
      // CartContext shows the backend error toast.
    }
  };

  const toggleBrand = (brand: string) => {
    setCurrentPage(1);
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const clearFilters = () => {
    setSelectedBrands([]);
    setSelectedPriceRange('');
    setSelectedStorage('');
    setSelectedCondition('');
    setSelectedCategory('');
    setSearchQuery('');
    setFeaturedOnly(false);
    setCurrentPage(1);
  };

  const activeFiltersCount =
    selectedBrands.length +
    (selectedPriceRange ? 1 : 0) +
    (selectedStorage ? 1 : 0) +
    (selectedCondition ? 1 : 0) +
    (selectedCategory ? 1 : 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">All Products</h1>
          <p className="text-gray-500">
            Showing {products.length} of {pagination.total} products
          </p>
        </div>

        {/* Search and Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search products..."
              className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
                isFilterOpen ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span className="hidden sm:inline">Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            <select
              value={sortOption}
              onChange={(event) => {
                setSortOption(event.target.value as NonNullable<ProductQueryParams['sort']>);
                setCurrentPage(1);
              }}
              className="px-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
            <div className="flex bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {selectedBrands.map((brand) => (
              <span
                key={brand}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm"
              >
                {brand}
                <button onClick={() => toggleBrand(brand)}>
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
            {selectedPriceRange && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm">
                {selectedPriceRange}
                <button
                  onClick={() => {
                    setSelectedPriceRange('');
                    setCurrentPage(1);
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            )}
            {selectedStorage && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm">
                {selectedStorage}
                <button
                  onClick={() => {
                    setSelectedStorage('');
                    setCurrentPage(1);
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            )}
            {selectedCondition && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm">
                {conditionLabels[selectedCondition]}
                <button
                  onClick={() => {
                    setSelectedCondition('');
                    setCurrentPage(1);
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            )}
            {selectedCategory && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm">
                {categories.find((category) => category.slug === selectedCategory)?.name ?? selectedCategory}
                <button
                  onClick={() => {
                    setSelectedCategory('');
                    setCurrentPage(1);
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <AnimatePresence>
            {isFilterOpen && (
              <motion.aside
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-64 flex-shrink-0 hidden lg:block"
              >
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-24">
                  {/* Brand Filter */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Brand</h3>
                    <div className="space-y-2">
                      {brands.map((brand) => (
                        <label key={brand} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedBrands.includes(brand)}
                            onChange={() => toggleBrand(brand)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{brand}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Category Filter */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Product Type</h3>
                    <div className="space-y-2">
                      {categories.map((category) => (
                        <label key={category.slug} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="category"
                            checked={selectedCategory === category.slug}
                            onChange={() => {
                              setSelectedCategory(category.slug);
                              setCurrentPage(1);
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{category.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Price Filter */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Price Range</h3>
                    <div className="space-y-2">
                      {priceRanges.map((range) => (
                        <label key={range.label} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="price"
                            checked={selectedPriceRange === range.label}
                            onChange={() => {
                              setSelectedPriceRange(range.label);
                              setCurrentPage(1);
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{range.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Storage Filter */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Storage</h3>
                    <div className="space-y-2">
                      {storageOptions.map((storage) => (
                        <label key={storage} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="storage"
                            checked={selectedStorage === storage}
                            onChange={() => {
                              setSelectedStorage(storage);
                              setCurrentPage(1);
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{storage}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Condition Filter */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Condition</h3>
                    <div className="space-y-2">
                      {conditionOptions.map((condition) => (
                        <label key={condition.value} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="condition"
                            checked={selectedCondition === condition.value}
                            onChange={() => {
                              setSelectedCondition(condition.value);
                              setCurrentPage(1);
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{condition.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Products Grid */}
          <div className="flex-1">
            {isLoadingProducts ? (
              <div className="text-center py-16 text-gray-500">Loading products...</div>
            ) : productsError ? (
              <div className="text-center py-16">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Products could not be loaded</h3>
                <p className="text-gray-500 mb-5">{productsError}</p>
                <button
                  type="button"
                  onClick={() => setReloadVersion((version) => version + 1)}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
                >
                  Try again
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
                <p className="max-w-full px-4 text-center text-gray-500">
                  Try adjusting your filters or search query
                </p>
              </div>
            ) : (
              <div
                className={`grid gap-6 ${
                  viewMode === 'grid'
                    ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
                    : 'grid-cols-1'
                }`}
              >
                {products.map((product, index) => (
                  <motion.div
                    key={product._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <ProductCard
                      product={product}
                      viewMode={viewMode}
                      onAddToCart={handleAddToCart}
                    />
                  </motion.div>
                ))}
              </div>
            )}

            {!isLoadingProducts && !productsError && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  type="button"
                  disabled={!pagination.hasPreviousPage}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  className="inline-flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:border-blue-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  disabled={!pagination.hasNextPage}
                  onClick={() => setCurrentPage((page) => page + 1)}
                  className="inline-flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:border-blue-300"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductCard = ({
  product,
  viewMode,
  onAddToCart,
}: {
  product: Product;
  viewMode: 'grid' | 'list';
  onAddToCart: (e: React.MouseEvent, product: Product) => void;
}) => {
  const image = getPrimaryImage(product);

  if (viewMode === 'list') {
    return (
      <Link to={`/products/${product._id}`} className="group">
        <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-950/10">
          <div className="relative hidden w-48 shrink-0 overflow-hidden bg-slate-100 sm:block">
            {image ? (
              <img
                src={image}
                alt={product.name}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-sky-50 text-blue-700">
                <SmartphoneFallback />
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <div className="flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="rounded-md bg-sky-50 px-2 py-1 text-blue-700">
                  {product.brand}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">
                  {conditionLabels[product.condition]}
                </span>
                {product.specifications.storage && (
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">
                    {product.specifications.storage}
                  </span>
                )}
                {product.ptaApproved && <span className="font-medium text-emerald-700">PTA approved</span>}
              </div>
              <h3 className="mb-2 font-semibold text-slate-950 transition group-hover:text-blue-700">
                {product.name}
              </h3>
              <p className="mb-3 line-clamp-2 text-sm leading-6 text-slate-500">{product.description}</p>
              <ProductRating product={product} />
            </div>
            <div className="flex items-center gap-4 sm:flex-col sm:items-end">
              <div className="sm:text-right">
                <span className="text-2xl font-bold text-slate-950">{formatPrice(product.price)}</span>
                {product.originalPrice && (
                  <span className="block text-sm text-slate-400 line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => onAddToCart(e, product)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 active:translate-y-px"
              >
                <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                Add to cart
              </button>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/products/${product._id}`} className="group">
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-xl hover:shadow-sky-950/10">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          {image ? (
            <img
              src={image}
              alt={product.name}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-sky-50 text-blue-700">
              <SmartphoneFallback />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-md bg-sky-50 px-2 py-1 text-blue-700">
              {product.brand}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">
              {conditionLabels[product.condition]}
            </span>
            {product.specifications.storage && (
              <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">
                {product.specifications.storage}
              </span>
            )}
          </div>
          <h3 className="line-clamp-2 min-h-[3.5rem] text-lg font-semibold leading-7 text-slate-950 transition group-hover:text-blue-700">
            {product.name}
          </h3>
          <ProductRating product={product} className="mt-3" compact />
          <div className="mt-auto pt-5">
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <span className="text-xl font-bold text-slate-950">{formatPrice(product.price)}</span>
              {product.originalPrice && (
                <span className="pb-0.5 text-sm text-slate-400 line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
            {product.originalPrice && product.originalPrice > product.price && (
              <p className="mb-3 text-sm font-medium text-emerald-700">
                Save {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
              </p>
            )}
            <button
              type="button"
              onClick={(e) => onAddToCart(e, product)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 active:translate-y-px"
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              Add to cart
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
};

const SmartphoneFallback = () => (
  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-sky-200 bg-white">
    <Smartphone className="h-5 w-5" aria-hidden="true" />
  </div>
);

export default Products;
