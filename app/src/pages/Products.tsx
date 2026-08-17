import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { priceRanges, storageOptions } from '../data/products';
import type { Category, Product } from '../types';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { productsAPI } from '../services/api';
import type { Pagination, ProductQueryParams } from '../services/api';
import { getApiErrorMessage } from '../utils/api-error';
import StorefrontProductCard from '../components/product/StorefrontProductCard';
import { CONTACT_PHONE_NUMBERS } from '../config/contact';
import { flattenCategories } from '../config/category-catalog';
import { getCategoryBySlug } from '../components/layout/navigation-data';
import Seo, { buildCategoryMetadata } from '../seo/seo';

const PAGE_SIZE = 20;

const conditionOptions: Array<{
  value: NonNullable<ProductQueryParams['condition']>;
  label: string;
}> = [
  { value: 'new', label: 'New' },
  { value: 'used', label: 'Used' },
  { value: 'refurbished', label: 'Refurbished' },
];

const conditionLabels: Record<
  NonNullable<ProductQueryParams['condition']>,
  string
> = {
  new: 'New',
  used: 'Used',
  refurbished: 'Refurbished',
};

const getRequestedCondition = (
  value: string | null,
): ProductQueryParams['condition'] | '' =>
  conditionOptions.some((option) => option.value === value)
    ? (value as ProductQueryParams['condition'])
    : '';

const getRequestedPrice = (value: string | null) =>
  priceRanges.some((range) => range.label === value) ? value ?? '' : '';

// This stateless route helper is exported for focused route-parser coverage.
// eslint-disable-next-line react-refresh/only-export-components
export const getRouteCategory = (pathname: string) => {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] === 'phones' || segments[0] === 'smart-watches' || segments[0] === 'gadgets') {
    return segments[1] ?? segments[0];
  }
  return '';
};

const categoryHref = (category: Category) => {
  const routeRoots = new Set(['phones', 'smart-watches', 'gadgets']);
  if (category.parentSlug && routeRoots.has(category.parentSlug)) return `/${category.parentSlug}/${category.slug}`;
  if (routeRoots.has(category.slug)) return `/${category.slug}`;
  return `/products?category=${encodeURIComponent(category.slug)}`;
};

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const routeCategory = getRouteCategory(location.pathname);

  const pendingUrlSyncRef = useRef<string | null>(
    searchParams.toString(),
  );

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
  const [categories, setCategories] = useState<Category[]>([]);
  const categoryOptions = flattenCategories(categories);
  const routeCategoryData = getCategoryBySlug(categories, routeCategory);

  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  const { addToCart } = useCart();
  const { showToast } = useToast();

  const [selectedBrands, setSelectedBrands] = useState<string[]>(() =>
    searchParams.get('brand')?.split(',').filter(Boolean) ?? [],
  );

  const [selectedPriceRange, setSelectedPriceRange] = useState(() =>
    getRequestedPrice(searchParams.get('price')),
  );

  const [selectedStorage, setSelectedStorage] = useState(
    () => searchParams.get('storage') ?? '',
  );

  const [selectedCondition, setSelectedCondition] = useState<
    ProductQueryParams['condition'] | ''
  >(() => getRequestedCondition(searchParams.get('condition')));

  const [selectedCategory, setSelectedCategory] = useState(
    () => searchParams.get('category') ?? routeCategory,
  );

  const [sortOption, setSortOption] = useState<
    NonNullable<ProductQueryParams['sort']>
  >(() => {
    const requestedSort = searchParams.get('sort');

    return requestedSort === 'price-low' ||
      requestedSort === 'price-high' ||
      requestedSort === 'rating'
      ? requestedSort
      : 'newest';
  });

  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get('search') ?? '',
  );

  const [debouncedSearch, setDebouncedSearch] =
    useState(searchQuery);

  const [featuredOnly, setFeaturedOnly] = useState(
    () => searchParams.get('featured') === 'true',
  );

  const [discountedOnly, setDiscountedOnly] = useState(
    () => searchParams.get('discounted') === 'true',
  );

  const [ptaApprovedOnly, setPtaApprovedOnly] = useState(
    () => searchParams.get('ptaApproved') === 'true',
  );

  const [currentPage, setCurrentPage] = useState(() => {
    const requestedPage = Number(searchParams.get('page'));

    return Number.isInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  });

  useEffect(() => {
    pendingUrlSyncRef.current = searchParams.toString();

    setSearchQuery(searchParams.get('search') ?? '');

    setSelectedBrands(
      searchParams.get('brand')?.split(',').filter(Boolean) ?? [],
    );

    setSelectedCategory(searchParams.get('category') ?? routeCategory);

    setSelectedCondition(
      getRequestedCondition(searchParams.get('condition')),
    );

    setSelectedPriceRange(
      getRequestedPrice(searchParams.get('price')),
    );

    setSelectedStorage(searchParams.get('storage') ?? '');

    setFeaturedOnly(
      searchParams.get('featured') === 'true',
    );

    setDiscountedOnly(
      searchParams.get('discounted') === 'true',
    );

    setPtaApprovedOnly(
      searchParams.get('ptaApproved') === 'true',
    );

    const requestedSort = searchParams.get('sort');

    setSortOption(
      requestedSort === 'price-low' ||
        requestedSort === 'price-high' ||
        requestedSort === 'rating'
        ? requestedSort
        : 'newest',
    );

    const requestedPage = Number(searchParams.get('page'));

    setCurrentPage(
      Number.isInteger(requestedPage) && requestedPage > 0
        ? requestedPage
        : 1,
    );
  }, [routeCategory, searchParams]);

  useEffect(() => {
    let isActive = true;

    const loadFilterOptions = async () => {
      try {
        const [brandsResponse, categoriesResponse] =
          await Promise.all([
            productsAPI.getBrands(),
            productsAPI.getCategories(),
          ]);

        if (isActive) {
          setBrands(
            brandsResponse.data.data.map(
              (brand: { name: string }) => brand.name,
            ),
          );

          setCategories(categoriesResponse.data.data);
        }
      } catch {
        showToast('Failed to load filter options', 'error');
      }
    };

    void loadFilterOptions();

    return () => {
      isActive = false;
    };
  }, [showToast]);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedSearch(searchQuery.trim()),
      300,
    );

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    let isActive = true;

    const loadProducts = async () => {
      const priceRange = priceRanges.find(
        (range) => range.label === selectedPriceRange,
      );

      try {
        setIsLoadingProducts(true);
        setProductsError(null);

        const response = await productsAPI.getProducts({
          page: currentPage,
          limit: PAGE_SIZE,
          sort: sortOption,
          search: debouncedSearch || undefined,
          brand:
            selectedBrands.length > 0
              ? selectedBrands.join(',')
              : undefined,
          category: selectedCategory || undefined,
          featured: featuredOnly || undefined,
          discounted: discountedOnly || undefined,
          ptaApproved: ptaApprovedOnly || undefined,
          minPrice: priceRange?.min,
          maxPrice:
            priceRange?.max !== undefined &&
            Number.isFinite(priceRange.max)
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

          setProductsError(
            getApiErrorMessage(
              loadError,
              'Unable to load products.',
            ),
          );
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
    discountedOnly,
    featuredOnly,
    ptaApprovedOnly,
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

    if (debouncedSearch) {
      nextParams.set('search', debouncedSearch);
    }

    if (selectedBrands.length > 0) {
      nextParams.set('brand', selectedBrands.join(','));
    }

    if (selectedCategory && selectedCategory !== routeCategory) {
      nextParams.set('category', selectedCategory);
    }

    if (selectedCondition) {
      nextParams.set('condition', selectedCondition);
    }

    if (selectedPriceRange) {
      nextParams.set('price', selectedPriceRange);
    }

    if (selectedStorage) {
      nextParams.set('storage', selectedStorage);
    }

    if (sortOption !== 'newest') {
      nextParams.set('sort', sortOption);
    }

    if (featuredOnly) {
      nextParams.set('featured', 'true');
    }

    if (discountedOnly) {
      nextParams.set('discounted', 'true');
    }

    if (ptaApprovedOnly) {
      nextParams.set('ptaApproved', 'true');
    }

    if (currentPage > 1) {
      nextParams.set('page', String(currentPage));
    }

    const nextParamsString = nextParams.toString();

    if (pendingUrlSyncRef.current !== null) {
      if (
        nextParamsString === pendingUrlSyncRef.current
      ) {
        pendingUrlSyncRef.current = null;
      }

      return;
    }

    if (
      nextParamsString !==
      new URLSearchParams(window.location.search).toString()
    ) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [
    currentPage,
    debouncedSearch,
    discountedOnly,
    featuredOnly,
    ptaApprovedOnly,
    selectedBrands,
    selectedCategory,
    selectedCondition,
    selectedPriceRange,
    routeCategory,
    selectedStorage,
    setSearchParams,
    sortOption,
  ]);

  const handleAddToCart = async (
    event: React.MouseEvent<HTMLButtonElement>,
    product: Product,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      await addToCart(product, 1);
    } catch {
      // CartContext displays the backend error.
    }
  };

  const handleBuyNow = async (
    event: React.MouseEvent<HTMLButtonElement>,
    product: Product,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      await addToCart(product, 1);
      navigate('/checkout');
    } catch {
      // CartContext displays the backend error.
    }
  };

  const toggleBrand = (brand: string) => {
    setCurrentPage(1);

    setSelectedBrands((current) =>
      current.includes(brand)
        ? current.filter((item) => item !== brand)
        : [...current, brand],
    );
  };

  const clearFilters = () => {
    setSelectedBrands([]);
    setSelectedPriceRange('');
    setSelectedStorage('');
    setSelectedCondition('');
    setSelectedCategory(routeCategory);
    setSearchQuery('');
    setFeaturedOnly(false);
    setDiscountedOnly(false);
    setPtaApprovedOnly(false);
    setCurrentPage(1);
  };

  const hasOptionalFilters =
    Boolean(debouncedSearch) ||
    selectedBrands.length > 0 ||
    Boolean(selectedPriceRange) ||
    Boolean(selectedStorage) ||
    Boolean(selectedCondition) ||
    featuredOnly ||
    discountedOnly ||
    ptaApprovedOnly;

  const activeFiltersCount =
    selectedBrands.length +
    (selectedPriceRange ? 1 : 0) +
    (selectedStorage ? 1 : 0) +
    (selectedCondition ? 1 : 0) +
    (selectedCategory && selectedCategory !== routeCategory ? 1 : 0) +
    (featuredOnly ? 1 : 0) +
    (discountedOnly ? 1 : 0) +
    (ptaApprovedOnly ? 1 : 0);

  const hasActiveSearch = hasOptionalFilters || activeFiltersCount > 0;
  const isEmptyRouteCategory =
    Boolean(routeCategory) &&
    selectedCategory === routeCategory &&
    !hasOptionalFilters;

  const renderFilters = () => (
    <div className="space-y-6">
      <FilterGroup title="Condition">
        {conditionOptions.map((condition) => (
          <FilterRadio
            key={condition.value}
            name="condition"
            label={condition.label}
            checked={
              selectedCondition === condition.value
            }
            onChange={() => {
              setSelectedCondition(condition.value);
              setCurrentPage(1);
            }}
          />
        ))}
      </FilterGroup>

      {brands.length > 0 && (
        <FilterGroup title="Brand">
          <div className="max-h-48 space-y-2 overflow-y-auto pr-2">
            {brands.map((brand) => (
              <label
                key={brand}
                className="flex min-h-8 cursor-pointer items-center gap-3 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(brand)}
                  onChange={() => toggleBrand(brand)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                />

                {brand}
              </label>
            ))}
          </div>
        </FilterGroup>
      )}

      {categories.length > 0 && (
        <FilterGroup title="Product type">
          {categoryOptions.map((category) => (
            <FilterRadio
              key={category.slug}
              name="category"
              label={`${category.parentSlug ? '↳ ' : ''}${category.name}`}
              checked={
                selectedCategory === category.slug
              }
              onChange={() => {
                setSelectedCategory(category.slug);
                setCurrentPage(1);
              }}
            />
          ))}
        </FilterGroup>
      )}

      <FilterGroup title="Price">
        {priceRanges.map((range) => (
          <FilterRadio
            key={range.label}
            name="price"
            label={range.label}
            checked={
              selectedPriceRange === range.label
            }
            onChange={() => {
              setSelectedPriceRange(range.label);
              setCurrentPage(1);
            }}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Storage">
        <div className="grid grid-cols-2 gap-2">
          {storageOptions.map((storage) => (
            <button
              key={storage}
              type="button"
              onClick={() => {
                setSelectedStorage(
                  selectedStorage === storage
                    ? ''
                    : storage,
                );
                setCurrentPage(1);
              }}
              className={`min-h-9 rounded-lg border px-2 text-xs font-bold ${
                selectedStorage === storage
                  ? 'border-blue-700 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
              }`}
            >
              {storage}
            </button>
          ))}
        </div>
      </FilterGroup>

      <label className="flex min-h-10 cursor-pointer items-center gap-3 border-t border-slate-200 pt-5 text-sm font-bold text-slate-700">
        <input
          type="checkbox"
          checked={featuredOnly}
          onChange={(event) => {
            setFeaturedOnly(event.target.checked);
            setCurrentPage(1);
          }}
          className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
        />

        Featured products only
      </label>

      <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm font-bold text-slate-700">
        <input
          type="checkbox"
          checked={discountedOnly}
          onChange={(event) => {
            setDiscountedOnly(event.target.checked);
            setCurrentPage(1);
          }}
          className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
        />

        Discounted products only
      </label>

      <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm font-bold text-slate-700">
        <input
          type="checkbox"
          checked={ptaApprovedOnly}
          onChange={(event) => {
            setPtaApprovedOnly(event.target.checked);
            setCurrentPage(1);
          }}
          className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
        />

        PTA approved only
      </label>

      {hasActiveSearch && (
        <button
          type="button"
          onClick={clearFilters}
          className="w-full rounded-lg border border-slate-300 py-2.5 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-[#f5f8fc] py-8 sm:py-10">
      <Seo
        metadata={{
          ...buildCategoryMetadata(routeCategoryData, location.pathname),
          robots: searchParams.toString() ? 'noindex,follow' : undefined,
        }}
      />
      <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Shop products
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              {isLoadingProducts
                ? 'Loading the live catalogue'
                : `${pagination.total} ${
                    pagination.total === 1
                      ? 'product'
                      : 'products'
                  } available`}
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              to="/products?condition=new"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-blue-300 hover:text-blue-700"
            >
              New
            </Link>

            <Link
              to="/products?condition=used"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-blue-300 hover:text-blue-700"
            >
              Used
            </Link>

            <Link
              to="/products?condition=refurbished"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-blue-300 hover:text-blue-700"
            >
              Refurbished
            </Link>
          </div>
        </div>

        {categories.length > 0 && (
          <nav className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Browse categories">
            {categoryOptions.map((category) => (
              <Link
                key={category.id}
                to={categoryHref(category)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${selectedCategory === category.slug ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700'}`}
              >
                {category.parentSlug ? '↳ ' : ''}{category.name}
              </Link>
            ))}
          </nav>
        )}

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_10px_30px_rgba(15,46,82,0.05)] sm:p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <label className="relative block">
              <span className="sr-only">
                Search the catalogue
              </span>

              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />

              <input
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by model, brand or keyword"
                className="h-12 w-full rounded-lg border border-slate-300 bg-slate-50 pl-11 pr-4 text-sm placeholder:text-slate-500 focus:border-blue-600 focus:bg-white focus:ring-blue-600"
              />
            </label>

            <div className="grid grid-cols-[1fr_auto] gap-2">
              <label
                className="sr-only"
                htmlFor="sort-products"
              >
                Sort products
              </label>

              <select
                id="sort-products"
                value={sortOption}
                onChange={(event) => {
                  setSortOption(
                    event.target
                      .value as NonNullable<
                      ProductQueryParams['sort']
                    >,
                  );

                  setCurrentPage(1);
                }}
                className="h-12 min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 focus:border-blue-600 focus:ring-blue-600 sm:min-w-48"
              >
                <option value="newest">
                  Newest first
                </option>

                <option value="price-low">
                  Price: low to high
                </option>

                <option value="price-high">
                  Price: high to low
                </option>

                <option value="rating">
                  Highest rated
                </option>
              </select>

              <div className="flex h-12 overflow-hidden rounded-lg border border-slate-300 bg-white">
                <ViewButton
                  label="Grid view"
                  active={viewMode === 'grid'}
                  onClick={() => setViewMode('grid')}
                  icon={Grid3X3}
                />

                <ViewButton
                  label="List view"
                  active={viewMode === 'list'}
                  onClick={() => setViewMode('list')}
                  icon={List}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800 lg:hidden"
            >
              <SlidersHorizontal
                className="h-4 w-4"
                aria-hidden="true"
              />

              Filters

              {activeFiltersCount > 0 && (
                <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] text-blue-700">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {hasActiveSearch && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {debouncedSearch && (
              <FilterChip
                label={`Search: ${debouncedSearch}`}
                onRemove={() => setSearchQuery('')}
              />
            )}

            {selectedBrands.map((brand) => (
              <FilterChip
                key={brand}
                label={brand}
                onRemove={() => toggleBrand(brand)}
              />
            ))}

            {selectedCondition && (
              <FilterChip
                label={
                  conditionLabels[selectedCondition]
                }
                onRemove={() =>
                  setSelectedCondition('')
                }
              />
            )}

            {selectedPriceRange && (
              <FilterChip
                label={selectedPriceRange}
                onRemove={() =>
                  setSelectedPriceRange('')
                }
              />
            )}

            {selectedStorage && (
              <FilterChip
                label={selectedStorage}
                onRemove={() =>
                  setSelectedStorage('')
                }
              />
            )}

            {selectedCategory && (
              <FilterChip
                label={
                  categoryOptions.find(
                    (category) =>
                      category.slug ===
                      selectedCategory,
                  )?.name ?? selectedCategory
                }
                onRemove={() =>
                  setSelectedCategory('')
                }
              />
            )}

            {featuredOnly && (
              <FilterChip
                label="Featured"
                onRemove={() =>
                  setFeaturedOnly(false)
                }
              />
            )}

            {discountedOnly && (
              <FilterChip
                label="Discounted"
                onRemove={() => setDiscountedOnly(false)}
              />
            )}

            {ptaApprovedOnly && (
              <FilterChip
                label="PTA approved"
                onRemove={() => setPtaApprovedOnly(false)}
              />
            )}

            <button
              type="button"
              onClick={clearFilters}
              className="min-h-8 px-2 text-xs font-bold text-slate-500 underline decoration-slate-300 underline-offset-4 hover:text-blue-700"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[248px_minmax(0,1fr)]">
          <aside
            className="hidden lg:block"
            aria-label="Product filters"
          >
            <div className="sticky top-36 rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-4">
                <h2 className="font-extrabold text-slate-950">
                  Filter products
                </h2>

                {activeFiltersCount > 0 && (
                  <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                    {activeFiltersCount}
                  </span>
                )}
              </div>

              {renderFilters()}
            </div>
          </aside>

          <main className="min-w-0">
            {isLoadingProducts ? (
              <div
                className={`grid items-start gap-3 sm:gap-5 ${
                  viewMode === 'grid'
                    ? 'grid-cols-2 xl:grid-cols-3'
                    : 'grid-cols-1'
                }`}
                aria-label="Loading products"
              >
                {Array.from({
                  length:
                    viewMode === 'grid' ? 6 : 3,
                }).map((_, index) => (
                  <ProductSkeleton
                    key={index}
                    view={viewMode}
                  />
                ))}
              </div>
            ) : productsError ? (
              <div className="rounded-xl border border-red-200 bg-white px-6 py-14 text-center">
                <AlertCircle
                  className="mx-auto h-9 w-9 text-red-500"
                  aria-hidden="true"
                />

                <h2 className="mt-4 text-xl font-extrabold text-slate-950">
                  Products could not be loaded
                </h2>

                <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
                  {productsError}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setReloadVersion(
                      (version) => version + 1,
                    )
                  }
                  className="mt-5 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-800"
                >
                  Try again
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="p-7 text-center sm:p-12">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Search
                      className="h-5 w-5"
                      aria-hidden="true"
                    />
                  </div>

                  <h2 className="mt-5 text-xl font-extrabold text-slate-950">
                    {isEmptyRouteCategory
                      ? 'No products are available in this category yet.'
                      : hasActiveSearch
                        ? 'No products match these filters'
                        : 'The catalogue is currently empty'}
                  </h2>

                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                    {isEmptyRouteCategory
                      ? 'Browse all products to explore the full catalogue.'
                      : hasActiveSearch
                        ? 'Clear a filter or try a broader search.'
                        : 'Products will appear here automatically when they are published. Contact the shop to ask about current stock.'}
                  </p>

                  <div className="mt-6 flex flex-col justify-center gap-3 min-[430px]:flex-row">
                    {isEmptyRouteCategory ? (
                      <Link
                        to="/products"
                        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-bold text-white hover:bg-blue-800"
                      >
                        Browse all products
                      </Link>
                    ) : hasActiveSearch ? (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-bold text-white hover:bg-blue-800"
                      >
                        Clear filters
                      </button>
                    ) : (
                      <a
                        href={
                          CONTACT_PHONE_NUMBERS[0]
                            .href
                        }
                        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-bold text-white hover:bg-blue-800"
                      >
                        Call the shop
                      </a>
                    )}

                    <Link
                      to="/support#contact"
                      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-5 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                    >
                      Contact support
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`grid items-start gap-3 sm:gap-5 ${
                  viewMode === 'grid'
                    ? 'grid-cols-2 xl:grid-cols-3'
                    : 'grid-cols-1'
                }`}
              >
                {products.map((product) => (
                  <StorefrontProductCard
                    key={product._id}
                    product={product}
                    view={viewMode}
                    onAddToCart={
                      handleAddToCart
                    }
                    onBuyNow={handleBuyNow}
                  />
                ))}
              </div>
            )}

            {!isLoadingProducts &&
              !productsError &&
              pagination.totalPages > 1 && (
                <nav
                  className="mt-9 flex items-center justify-center gap-2"
                  aria-label="Product pages"
                >
                  <button
                    type="button"
                    disabled={
                      !pagination.hasPreviousPage
                    }
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.max(1, page - 1),
                      )
                    }
                    className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft
                      className="h-4 w-4"
                      aria-hidden="true"
                    />

                    <span className="hidden min-[430px]:inline">
                      Previous
                    </span>
                  </button>

                  <span className="px-3 text-sm font-semibold text-slate-600">
                    Page {pagination.page} of{' '}
                    {pagination.totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={
                      !pagination.hasNextPage
                    }
                    onClick={() =>
                      setCurrentPage(
                        (page) => page + 1,
                      )
                    }
                    className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="hidden min-[430px]:inline">
                      Next
                    </span>

                    <ChevronRight
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                  </button>
                </nav>
              )}
          </main>
        </div>
      </div>

      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-slate-950/45 lg:hidden"
            onClick={() =>
              setIsFilterOpen(false)
            }
          >
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{
                type: 'tween',
                duration: 0.22,
              }}
              onClick={(event) =>
                event.stopPropagation()
              }
              className="flex h-full w-[min(88vw,360px)] flex-col bg-white shadow-2xl"
              aria-label="Product filters"
            >
              <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
                <h2 className="font-extrabold text-slate-950">
                  Filter products
                </h2>

                <button
                  type="button"
                  onClick={() =>
                    setIsFilterOpen(false)
                  }
                  aria-label="Close filters"
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  <X
                    className="h-5 w-5"
                    aria-hidden="true"
                  />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {renderFilters()}
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-200 p-4">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="min-h-11 rounded-lg border border-slate-300 text-sm font-bold text-slate-700"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setIsFilterOpen(false)
                  }
                  className="min-h-11 rounded-lg bg-blue-700 text-sm font-bold text-white"
                >
                  View results
                </button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FilterGroup = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <fieldset>
    <legend className="mb-3 text-sm font-extrabold text-slate-950">
      {title}
    </legend>

    <div className="space-y-2">
      {children}
    </div>
  </fieldset>
);

const FilterRadio = ({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) => (
  <label className="flex min-h-8 cursor-pointer items-center gap-3 text-sm text-slate-700">
    <input
      type="radio"
      name={name}
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 border-slate-300 text-blue-700 focus:ring-blue-600"
    />

    {label}
  </label>
);

const FilterChip = ({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) => (
  <span className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-xs font-bold text-blue-700">
    {label}

    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove ${label} filter`}
      className="rounded p-0.5 hover:bg-blue-100"
    >
      <X
        className="h-3.5 w-3.5"
        aria-hidden="true"
      />
    </button>
  </span>
);

const ViewButton = ({
  label,
  active,
  onClick,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: typeof Grid3X3;
}) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={active}
    onClick={onClick}
    className={`flex w-11 items-center justify-center transition ${
      active
        ? 'bg-blue-50 text-blue-700'
        : 'text-slate-500 hover:text-blue-700'
    }`}
  >
    <Icon
      className="h-5 w-5"
      aria-hidden="true"
    />
  </button>
);

const ProductSkeleton = ({
  view,
}: {
  view: 'grid' | 'list';
}) => (
  <div
    className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${
      view === 'list'
        ? 'grid sm:grid-cols-[180px_1fr]'
        : 'p-3.5 sm:p-4'
    }`}
  >
    <div
      className={`${
        view === 'list'
          ? 'hidden min-h-48 sm:block'
          : 'aspect-[1/0.88] rounded-lg'
      } animate-pulse bg-slate-100`}
    />

    <div
      className={
        view === 'list' ? 'p-5' : ''
      }
    >
      <div className="mt-4 h-3 w-1/3 animate-pulse rounded bg-slate-100" />
      <div className="mt-3 h-5 w-4/5 animate-pulse rounded bg-slate-100" />
      <div className="mt-2 h-5 w-2/3 animate-pulse rounded bg-slate-100" />
      <div className="mt-5 h-6 w-1/2 animate-pulse rounded bg-slate-100" />
    </div>
  </div>
);

export default Products;
