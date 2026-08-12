import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Plus, Search, Smartphone, X } from 'lucide-react';
import type { Product } from '../types';
import { productsAPI } from '../services/api';
import { formatPrice } from '../utils/format';

interface CompareSpec {
  key: string;
  label: string;
  tone?: 'price' | 'brand';
  getValue: (product: Product) => string | number | undefined;
}

const compareTabs = [
  { id: 'all', label: 'All products', matches: () => true },
  { id: 'smartphones', label: 'Smartphones', matches: (category: string) => /phone|mobile/.test(category) },
  { id: 'gadgets', label: 'Gadgets', matches: (category: string) => /gadget|tablet|laptop|accessor/.test(category) },
  { id: 'wearables', label: 'Wearables', matches: (category: string) => /wearable|watch|fitness|band/.test(category) },
  { id: 'headphones', label: 'Headphones', matches: (category: string) => /headphone|earbud|headset/.test(category) },
  { id: 'audio', label: 'Audio', matches: (category: string) => /speaker|audio/.test(category) },
] as const;

const specs: CompareSpec[] = [
  { key: 'brand', label: 'Brand', tone: 'brand', getValue: (product) => product.brand },
  { key: 'price', label: 'Price', tone: 'price', getValue: (product) => product.price },
  { key: 'display', label: 'Display', getValue: (product) => product.specifications.display },
  { key: 'processor', label: 'Processor', getValue: (product) => product.specifications.processor },
  { key: 'ram', label: 'RAM', getValue: (product) => product.specifications.ram },
  { key: 'storage', label: 'Storage', getValue: (product) => product.specifications.storage },
  { key: 'battery', label: 'Battery', getValue: (product) => product.specifications.battery },
  { key: 'camera', label: 'Camera', getValue: (product) => product.specifications.camera },
  { key: 'os', label: 'Operating System', getValue: (product) => product.specifications.os },
  { key: 'network', label: 'Network', getValue: (product) => product.specifications.network },
  { key: 'ptaApproved', label: 'PTA Approved', getValue: (product) => (product.ptaApproved ? 'Yes' : 'No') },
  { key: 'condition', label: 'Condition', getValue: (product) => product.condition },
  { key: 'rating', label: 'Rating', getValue: (product) => product.numReviews && product.rating !== null ? `${product.rating}/5` : 'No reviews yet' },
];

const Compare = () => {
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const loadCompareProducts = async () => {
      const saved = localStorage.getItem('compareList');
      const ids = saved ? (JSON.parse(saved) as string[]) : [];
      const response = await productsAPI.getProducts({ limit: 100 });
      const loadedProducts = response.data.data.items;
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

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem('compareList', JSON.stringify(compareList.map((product) => product._id)));
  }, [compareList, isHydrated]);

  const addToCompare = (product: Product) => {
    if (compareList.length >= 4) {
      window.alert('You can compare up to 4 products at a time.');
      return;
    }
    if (!compareList.some((item) => item._id === product._id)) {
      setCompareList((current) => [...current, product]);
    }
    setIsAddingProduct(false);
  };

  const availableProducts = allProducts.filter(
    (product) => !compareList.some((item) => item._id === product._id),
  );

  if (compareList.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-gray-100">
              <Smartphone className="h-16 w-16 text-gray-400" aria-hidden="true" />
            </div>
            <h1 className="mb-4 text-2xl font-bold text-gray-900">Compare products</h1>
            <p className="mx-auto mb-8 max-w-md text-gray-500">
              Choose up to four products here, then compare their price, display, processor, battery, camera, and more.
            </p>
            <button
              onClick={() => setIsAddingProduct(true)}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-8 py-4 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
              Choose products
            </button>
          </motion.div>
          <AddProductModal isOpen={isAddingProduct} onClose={() => setIsAddingProduct(false)} products={availableProducts} onSelect={addToCompare} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Compare products</h1>
            <p className="mt-1 text-gray-500">Comparing {compareList.length} of 4 products</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {compareList.length < 4 && (
              <button onClick={() => setIsAddingProduct(true)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700">
                <Plus className="h-5 w-5" aria-hidden="true" />
                Add product
              </button>
            )}
            <button onClick={() => setCompareList([])} className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50">
              <X className="h-5 w-5" aria-hidden="true" />
              Clear all
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-[190px] bg-gray-50 p-6 text-left font-semibold text-gray-900">Feature</th>
                {compareList.map((product) => (
                  <th key={product._id} className="min-w-[230px] p-6 text-center">
                    <div className="relative">
                      <button onClick={() => setCompareList((current) => current.filter((item) => item._id !== product._id))} aria-label={`Remove ${product.name} from comparison`} className="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-500 transition-colors hover:bg-red-200">
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <Link to={`/products/${product._id}`}>
                        <div className="mb-4 aspect-square overflow-hidden rounded-xl bg-gray-100">
                          <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                        </div>
                        <h2 className="line-clamp-2 font-semibold text-gray-900">{product.name}</h2>
                        <p className="mt-1 text-sm font-medium text-blue-600">{product.categoryName ?? product.category}</p>
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {specs.map((spec, index) => (
                <tr key={spec.key} className={index % 2 === 0 ? 'bg-gray-50/50' : ''}>
                  <td className="sticky left-0 z-10 bg-gray-50 p-5 font-medium text-gray-700">{spec.label}</td>
                  {compareList.map((product) => {
                    const value = spec.getValue(product);
                    return (
                      <td key={product._id} className="p-5 text-center">
                        {spec.tone === 'price' ? <span className="text-xl font-bold text-blue-600">{formatPrice(Number(value ?? 0))}</span> : spec.tone === 'brand' ? <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">{value ?? '-'}</span> : <span className="text-gray-600">{value ?? '-'}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td className="sticky left-0 z-10 bg-gray-50 p-5 font-medium text-gray-700">Action</td>
                {compareList.map((product) => (
                  <td key={product._id} className="p-5">
                    <Link to={`/products/${product._id}`} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700">
                      View details <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <AddProductModal isOpen={isAddingProduct} onClose={() => setIsAddingProduct(false)} products={availableProducts} onSelect={addToCompare} />
      </div>
    </div>
  );
};

const AddProductModal = ({ isOpen, onClose, products, onSelect }: { isOpen: boolean; onClose: () => void; products: Product[]; onSelect: (product: Product) => void }) => {
  const [activeTab, setActiveTab] = useState<(typeof compareTabs)[number]['id']>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const tab = compareTabs.find((item) => item.id === activeTab) ?? compareTabs[0];
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    const category = `${product.categoryName ?? ''} ${product.category}`.toLowerCase();
    const searchable = `${product.name} ${product.brand} ${category}`.toLowerCase();
    return tab.matches(category) && (!normalizedSearch || searchable.includes(normalizedSearch));
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="compare-picker-title">
            <div className="border-b border-gray-200 p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 id="compare-picker-title" className="text-xl font-bold text-gray-900">Choose products to compare</h2>
                  <p className="mt-1 text-sm text-gray-500">Browse by category, then search by product or brand.</p>
                </div>
                <button onClick={onClose} aria-label="Close product picker" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"><X className="h-5 w-5" aria-hidden="true" /></button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Product categories">
                {compareTabs.map((item) => (
                  <button key={item.id} role="tab" aria-selected={activeTab === item.id} onClick={() => setActiveTab(item.id)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700'}`}>{item.label}</button>
                ))}
              </div>
              <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); setSearchQuery(searchInput); }}>
                <label className="sr-only" htmlFor="compare-product-search">Search products</label>
                <input id="compare-product-search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search products or brands" className="min-w-0 flex-1 rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700"><Search className="h-5 w-5" aria-hidden="true" />Search</button>
              </form>
            </div>
            <div className="max-h-[52vh] overflow-y-auto p-6">
              {filteredProducts.length === 0 ? <div className="py-10 text-center"><p className="font-medium text-gray-900">No matching products</p><p className="mt-1 text-sm text-gray-500">Try another category or search term.</p></div> : <div className="grid gap-4 sm:grid-cols-2">
                {filteredProducts.map((product) => (
                  <button key={product._id} onClick={() => onSelect(product)} className="flex items-center gap-4 rounded-xl border border-gray-200 p-4 text-left transition-colors hover:border-blue-500 hover:bg-blue-50">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100"><img src={product.images[0]} alt="" className="h-full w-full object-cover" /></div>
                    <div className="min-w-0 flex-1"><p className="line-clamp-2 font-medium text-gray-900">{product.name}</p><p className="text-sm text-gray-500">{product.brand} / {product.categoryName ?? product.category}</p><p className="mt-1 text-lg font-bold text-blue-600">{formatPrice(product.price)}</p></div>
                    <Plus className="h-6 w-6 shrink-0 text-blue-600" aria-hidden="true" />
                  </button>
                ))}
              </div>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Compare;
