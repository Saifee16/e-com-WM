import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Shield,
  Smartphone,
  Star,
  Truck,
} from 'lucide-react';
import type { Product } from '../types';
import { productsAPI } from '../services/api';
import { formatPrice } from '../utils/format';

type Brand = { name: string; count: number };

const features = [
  { icon: Shield, title: 'PTA Approved', description: 'Every eligible device is verified before it is listed.' },
  { icon: Truck, title: 'Free Shipping', description: 'Free delivery on all orders above Rs. 100,000.' },
  { icon: RotateCcw, title: '7-Day Returns', description: 'Start a return request directly from your account.' },
  { icon: Star, title: 'Straightforward Prices', description: 'See the current price and any saving before checkout.' },
];

const brandThemes = [
  'from-blue-50 to-white border-blue-100 text-blue-800',
  'from-sky-50 to-white border-sky-100 text-sky-800',
  'from-indigo-50 to-white border-indigo-100 text-indigo-800',
  'from-cyan-50 to-white border-cyan-100 text-cyan-800',
  'from-violet-50 to-white border-violet-100 text-violet-800',
  'from-slate-100 to-white border-slate-200 text-slate-800',
];

const Home = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    let active = true;

    const loadHomeData = async () => {
      try {
        const [featuredResponse, brandsResponse] = await Promise.all([
          productsAPI.getFeaturedProducts(),
          productsAPI.getBrands(),
        ]);

        if (!active) return;
        setFeaturedProducts((featuredResponse.data.data as Product[]).slice(0, 6));
        setBrands(
          brandsResponse.data.data.map((brand: { name: string; productCount: number }) => ({
            name: brand.name,
            count: brand.productCount,
          })),
        );
      } catch {
        if (active) {
          setFeaturedProducts([]);
          setBrands([]);
        }
      }
    };

    void loadHomeData();
    return () => { active = false; };
  }, []);

  const heroProducts = useMemo(() => featuredProducts.slice(0, 3), [featuredProducts]);
  const slideCount = Math.max(heroProducts.length, 1);
  const activeProduct = heroProducts[currentSlide] ?? null;

  useEffect(() => {
    setCurrentSlide((slide) => Math.min(slide, slideCount - 1));
  }, [slideCount]);

  useEffect(() => {
    if (heroProducts.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setCurrentSlide((slide) => (slide + 1) % heroProducts.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [heroProducts.length]);

  const moveSlide = (direction: 1 | -1) => {
    setCurrentSlide((slide) => (slide + direction + slideCount) % slideCount);
  };

  return (
    <div className="min-h-[100dvh] bg-white">
      <section className="relative isolate overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_25%,rgba(37,99,235,0.35),transparent_32%),radial-gradient(circle_at_16%_82%,rgba(14,165,233,0.2),transparent_28%)]" />
        <div className="relative mx-auto grid min-h-[540px] max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:min-h-[570px] lg:grid-cols-[1fr_0.9fr] lg:px-8">
          <div className="max-w-xl">
            <p className="mb-4 text-sm font-semibold text-blue-200">Wahab Mobiles</p>
            <h1 className="max-w-[13ch] text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              {activeProduct?.name ?? 'Your next phone, sorted.'}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
              {activeProduct
                ? `${activeProduct.brand} with clear pricing, product details, and a simple checkout.`
                : 'Shop PTA-approved smartphones with clear pricing, product details, and a simple checkout.'}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              {activeProduct && <p className="text-2xl font-bold text-white">{formatPrice(activeProduct.price)}</p>}
              {activeProduct?.originalPrice && activeProduct.originalPrice > activeProduct.price && (
                <p className="text-sm text-slate-400 line-through">{formatPrice(activeProduct.originalPrice)}</p>
              )}
              {activeProduct?.ptaApproved && <span className="text-sm font-medium text-emerald-300">PTA approved</span>}
            </div>
            <Link
              to={activeProduct ? `/products/${activeProduct._id}` : '/products'}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-blue-950/30 transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              {activeProduct ? 'View phone' : 'Browse products'}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute inset-6 rounded-[2rem] bg-blue-500/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-sm sm:p-6">
              <AnimatePresence mode="wait">
                {activeProduct?.images[0] ? (
                  <motion.img
                    key={activeProduct._id}
                    src={activeProduct.images[0]}
                    alt={activeProduct.name}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.03 }}
                    transition={{ duration: 0.28 }}
                    className="aspect-[4/3] w-full rounded-[1.35rem] object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-blue-500 to-indigo-700">
                    <Smartphone className="h-24 w-24 text-white/80" aria-hidden="true" />
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {heroProducts.length > 1 && (
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2">
            <button type="button" aria-label="Previous featured phone" onClick={() => moveSlide(-1)} className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"><ChevronLeft className="h-5 w-5" /></button>
            {heroProducts.map((product, index) => (
              <button key={product._id} type="button" aria-label={`Show ${product.name}`} onClick={() => setCurrentSlide(index)} className={`h-2 rounded-full transition-all ${currentSlide === index ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'}`} />
            ))}
            <button type="button" aria-label="Next featured phone" onClick={() => moveSlide(1)} className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"><ChevronRight className="h-5 w-5" /></button>
          </div>
        )}
      </section>

      <section className="border-b border-slate-100 bg-white py-12">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-8 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          {features.map((feature) => (
            <div key={feature.title} className="flex gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><feature.icon className="h-5 w-5" /></div>
              <div><h2 className="font-semibold text-slate-900">{feature.title}</h2><p className="mt-1 text-sm leading-5 text-slate-500">{feature.description}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-9 flex items-end justify-between gap-4">
            <div><h2 className="text-3xl font-bold tracking-tight text-slate-950">Featured products</h2><p className="mt-2 text-slate-600">Phones currently selected from our live catalogue.</p></div>
            <Link to="/products" className="hidden items-center gap-2 font-semibold text-blue-700 hover:text-blue-800 sm:inline-flex">View all<ArrowRight className="h-4 w-4" /></Link>
          </div>
          {featuredProducts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><p className="text-slate-600">Products are loading. You can browse the full catalogue now.</p><Link to="/products" className="mt-4 inline-flex font-semibold text-blue-700 hover:text-blue-800">Browse products</Link></div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{featuredProducts.map((product) => <ProductCard key={product._id} product={product} />)}</div>
          )}
          <div className="mt-8 text-center sm:hidden"><Link to="/products" className="inline-flex items-center gap-2 font-semibold text-blue-700">View all products<ArrowRight className="h-4 w-4" /></Link></div>
        </div>
      </section>

      {brands.length > 0 && <section className="bg-white py-16 sm:py-20"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="mb-9"><h2 className="text-3xl font-bold tracking-tight text-slate-950">Shop by brand</h2><p className="mt-2 text-slate-600">Go straight to the phones you already know.</p></div><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">{brands.map((brand, index) => <Link key={brand.name} to={`/products?brand=${encodeURIComponent(brand.name)}`} className={`rounded-2xl border bg-gradient-to-br p-5 transition-transform hover:-translate-y-1 hover:shadow-lg ${brandThemes[index % brandThemes.length]}`}><p className="text-lg font-bold">{brand.name}</p><p className="mt-6 text-sm text-slate-600">{brand.count} {brand.count === 1 ? 'product' : 'products'}</p></Link>)}</div></div></section>}

      <section className="bg-blue-700 py-16 sm:py-20"><div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8"><h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Ready to upgrade your phone?</h2><p className="mx-auto mt-4 max-w-2xl text-lg text-blue-100">Browse premium PTA-approved smartphones and find the right fit for you.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link to="/products" className="rounded-xl bg-white px-6 py-3.5 font-semibold text-blue-700 transition-colors hover:bg-blue-50">Shop now</Link><Link to="/about" className="rounded-xl border border-white/70 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-white/10">Learn more</Link></div></div></section>
    </div>
  );
};

const ProductCard = ({ product }: { product: Product }) => (
  <Link to={`/products/${product._id}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-xl">
    <div className="aspect-[4/3] overflow-hidden bg-slate-100"><img src={product.images[0]} alt={product.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" /></div>
    <div className="flex flex-1 flex-col p-5"><div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium text-blue-700">{product.brand}</span><span className="text-slate-500">{product.specifications.storage}</span></div><h3 className="mt-3 line-clamp-2 text-lg font-semibold text-slate-950 transition-colors group-hover:text-blue-700">{product.name}</h3><div className="mt-3 flex items-center gap-1.5 text-sm text-slate-600"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /><span>{product.rating}</span><span>({product.numReviews})</span></div><div className="mt-5 flex items-end gap-3"><p className="text-xl font-bold text-slate-950">{formatPrice(product.price)}</p>{product.originalPrice && product.originalPrice > product.price && <p className="pb-0.5 text-sm text-slate-400 line-through">{formatPrice(product.originalPrice)}</p>}</div>{product.ptaApproved && <p className="mt-3 text-sm font-medium text-emerald-700">PTA approved</p>}</div>
  </Link>
);

export default Home;
