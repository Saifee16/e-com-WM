import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Banknote,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Star,
  Store,
} from 'lucide-react';
import type { Product } from '../types';
import { businessAPI, productsAPI } from '../services/api';
import type { GoogleBusinessReviews } from '../services/api';
import StorefrontProductCard from '../components/product/StorefrontProductCard';
import { priceRanges } from '../data/products';
import { formatPrice } from '../utils/format';
import {
  CONTACT_PHONE_NUMBERS,
  SHOP_ADDRESS,
  SHOP_MAPS_URL,
  SHOP_WHATSAPP_URL,
} from '../config/contact';

type Brand = {
  name: string;
  count: number | null;
  path: string;
};

const brandFallbacks = ['iPhone', 'Samsung', 'Honor', 'Xiaomi', 'Redmi'];

const businessStats = [
  { value: 'Since 2009', label: 'Serving Hyderabad' },
  { value: '20,000+', label: 'Customers served' },
  { value: '95%', label: 'Customer satisfaction' },
];

const conditionLinks = [
  { label: 'New', description: 'Brand new phones', to: '/products?condition=new' },
  { label: 'Used', description: 'Pre-owned phones', to: '/products?condition=used' },
  { label: 'Refurbished', description: 'Restored phones', to: '/products?condition=refurbished' },
  { label: 'All phones', description: 'Full catalogue', to: '/products' },
];

const priceLinks = priceRanges.slice(0, 4).map((range) => ({
  label: range.label,
  to: `/products?price=${encodeURIComponent(range.label)}`,
}));

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [reviews, setReviews] = useState<GoogleBusinessReviews | null>(null);
  const [isHomeLoading, setIsHomeLoading] = useState(true);
  const [homeError, setHomeError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadHomeData = async () => {
      try {
        setIsHomeLoading(true);
        setHomeError(null);
        const [featuredResponse, brandsResponse, reviewsResponse] = await Promise.allSettled([
          productsAPI.getFeaturedProducts(),
          productsAPI.getBrands(),
          businessAPI.getGoogleReviews(),
        ]);

        if (!active) return;

        if (featuredResponse.status === 'fulfilled') {
          setFeaturedProducts((featuredResponse.value.data.data as Product[]).slice(0, 8));
        }

        if (brandsResponse.status === 'fulfilled') {
          setBrands(
            brandsResponse.value.data.data.map((brand: { name: string; productCount: number }) => ({
              name: brand.name,
              count: brand.productCount,
              path: `/products?brand=${encodeURIComponent(brand.name)}`,
            })),
          );
        }

        if (reviewsResponse.status === 'fulfilled') {
          setReviews(reviewsResponse.value.data.data);
        }

        if (featuredResponse.status === 'rejected' || brandsResponse.status === 'rejected') {
          setHomeError('Live catalogue details could not be loaded.');
        }
      } catch {
        if (active) {
          setFeaturedProducts([]);
          setBrands([]);
          setReviews(null);
          setHomeError('Live catalogue details could not be loaded.');
        }
      } finally {
        if (active) setIsHomeLoading(false);
      }
    };

    void loadHomeData();
    return () => {
      active = false;
    };
  }, []);

  const displayedBrands = (
    brands.length > 0
      ? brands
      : brandFallbacks.map((name) => ({
          name,
          count: null,
          path: name === 'iPhone' ? '/products?search=iPhone' : `/products?brand=${encodeURIComponent(name)}`,
        }))
  ).slice(0, 8);
  const reviewCards = reviews?.reviews.filter((review) => review.text.trim()).slice(0, 3) ?? [];
  const reviewsUrl = reviews?.googleMapsUri ?? SHOP_MAPS_URL;
  const heroProduct = featuredProducts[0];
  const remainingFeaturedProducts = featuredProducts.slice(1, 5);

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#f5f8fc] text-slate-950">
      <section className="bg-[#082f63] text-white">
        <div className="mx-auto grid max-w-[1400px] items-center gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-9 md:py-11 lg:grid-cols-[1.02fr_.98fr] lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-bold text-blue-200">Wahab Mobiles, Hyderabad</p>
            <h1 className="mt-3 max-w-[12ch] text-4xl font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-5xl lg:text-[58px]">
              Find the right phone, faster.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-blue-100 sm:text-lg">
              Shop new, used and refurbished phones with clear prices, condition details and PTA status.
            </p>
            <div className="mt-7 grid grid-cols-2 gap-3">
              <Link
                to="/products"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-[#0b3f82] transition hover:bg-blue-50 active:translate-y-px"
              >
                Shop phones
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                to="/products?condition=used"
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-blue-300/60 px-5 text-sm font-bold text-white transition hover:bg-white/10 active:translate-y-px"
              >
                Used phones
              </Link>
            </div>
          </div>

          <FeaturedHeroProduct product={heroProduct} isLoading={isHomeLoading} error={homeError} />
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white" aria-label="Shop by phone condition">
        <div className="mx-auto grid max-w-[1400px] grid-cols-2 px-4 py-3 sm:grid-cols-4 sm:px-6 lg:px-8">
          {conditionLinks.map((condition, index) => (
            <Link
              key={condition.label}
              to={condition.to}
              className={`group flex min-h-14 items-center justify-between gap-3 px-3 py-2 transition hover:bg-blue-50 sm:px-4 ${
                index % 2 === 1 ? 'border-l border-slate-200' : ''
              } ${index > 1 ? 'border-t border-slate-200 sm:border-t-0' : ''} ${index > 0 ? 'sm:border-l sm:border-slate-200' : ''}`}
            >
              <span>
                <span className="block text-sm font-extrabold text-slate-950 group-hover:text-blue-700">{condition.label}</span>
                <span className="mt-0.5 hidden text-xs font-medium text-slate-500 min-[430px]:block">{condition.description}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-blue-700 transition group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 divide-y divide-slate-200 px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-8">
          {businessStats.map((stat) => (
            <div key={stat.value} className="flex items-baseline gap-3 py-4 sm:justify-center sm:px-4">
              <strong className="text-lg font-extrabold text-[#0b3f82]">{stat.value}</strong>
              <span className="text-xs font-semibold text-slate-500 sm:text-sm">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {remainingFeaturedProducts.length > 0 && (
        <section className="py-11 sm:py-14">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-5">
              <SectionHeading title="More featured phones" description="More picks from the live Wahab Mobiles catalogue." />
              <Link to="/products" className="hidden shrink-0 items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-800 sm:inline-flex">
                View catalogue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
              {remainingFeaturedProducts.map((product) => (
                <StorefrontProductCard key={product._id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="border-y border-slate-200 bg-white py-11 sm:py-14">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-5">
            <SectionHeading title="Shop by brand" description="Open a brand catalogue without digging through menus." />
            <Link to="/products" className="hidden shrink-0 items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-800 sm:inline-flex">
              All phones
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {displayedBrands.map((brand) => (
              <Link
                key={brand.name}
                to={brand.path}
                className="group flex min-h-24 flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <span className="font-extrabold text-slate-950 group-hover:text-blue-700">{brand.name}</span>
                <span className="mt-4 text-xs font-semibold text-slate-500">
                  {brand.count === null ? 'Browse' : `${brand.count} ${brand.count === 1 ? 'phone' : 'phones'}`}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-10">
        <div className="mx-auto grid max-w-[1400px] gap-6 px-4 sm:px-6 lg:grid-cols-[.72fr_1.28fr] lg:items-center lg:px-8">
          <div>
            <Banknote className="h-6 w-6 text-blue-700" aria-hidden="true" />
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">Browse by budget</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Use price filters to narrow the live catalogue.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {priceLinks.map((price) => (
              <Link key={price.label} to={price.to} className="flex min-h-16 items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">
                {price.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#082f63] py-11 text-white sm:py-14">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr]">
            <div>
              <ShieldCheck className="h-7 w-7 text-blue-200" aria-hidden="true" />
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight">A real local shop, online.</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-blue-100">
                Check product details online, then order, call or visit the Saddar Cantt store.
              </p>
              <a href={reviewsUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-white hover:text-blue-100">
                View Wahab Mobiles on Google Maps
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <TrustItem icon={Store} title="Physical store" description="Visit the Wahab Mobiles shop in Hyderabad." />
              <TrustItem icon={ShieldCheck} title="Clear PTA status" description="PTA status is shown per published product." />
              <TrustItem icon={ShoppingBag} title="Online shopping" description="Use cart, checkout, account and support tools." />
            </div>
          </div>

          {reviews?.configured && reviews.rating && (
            <div className="mt-9 border-t border-white/15 pt-8">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-2xl font-extrabold">Google customer reviews</h2>
                  <div className="mt-2 flex items-center gap-3 text-sm text-blue-100">
                    <ReviewStars rating={reviews.rating} />
                    <span>{reviews.rating.toFixed(1)} from {reviews.userRatingCount} reviews</span>
                  </div>
                </div>
                <a href={reviewsUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-white underline decoration-blue-300 underline-offset-4">See all reviews</a>
              </div>
              {reviewCards.length > 0 && (
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {reviewCards.map((review) => (
                    <article key={review.id} className="rounded-xl border border-white/15 bg-white/[0.07] p-5">
                      {review.rating !== null && <ReviewStars rating={review.rating} />}
                      <p className="mt-4 line-clamp-3 text-sm leading-6 text-blue-50">{review.text}</p>
                      <p className="mt-4 text-xs font-bold text-white">{review.authorName}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-11 sm:py-14">
        <div className="mx-auto grid max-w-[1400px] items-center gap-7 px-4 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8">
          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2 shadow-[0_18px_50px_rgba(15,46,82,0.1)]">
            <img
              src="/assets/wahab-shop.jpg"
              alt="Wahab Mobiles shop interior in Hyderabad"
              className="aspect-[16/10] w-full rounded-lg object-cover"
              loading="lazy"
            />
          </figure>
          <div className="lg:pl-6">
            <p className="text-sm font-bold text-blue-700">Visit Wahab Mobiles</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">See the shop behind the storefront.</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">{SHOP_ADDRESS}</p>
            <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-[0_18px_50px_rgba(15,46,82,0.1)]">
              <iframe
                title="Wahab Mobiles location in Hyderabad"
                src={`https://www.google.com/maps?q=${encodeURIComponent(SHOP_ADDRESS)}&output=embed`}
                className="aspect-[16/10] w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <Link to="/about#about-us" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-5 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700">
              About the store
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-[#f5f8fc] py-9">
        <div className="mx-auto flex max-w-[1400px] flex-col justify-between gap-5 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-950">Need help choosing a phone?</h2>
            <p className="mt-2 text-sm text-slate-600">Ask about current stock, condition, storage, color, price and PTA status.</p>
          </div>
          <div className="flex flex-col gap-3 min-[430px]:flex-row">
            <a href={SHOP_WHATSAPP_URL} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-bold text-white hover:bg-blue-800">Message on WhatsApp</a>
            <a href={CONTACT_PHONE_NUMBERS[0].href} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700">
              <Phone className="h-4 w-4" aria-hidden="true" />
              Call the shop
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

const SectionHeading = ({ title, description }: { title: string; description: string }) => (
  <div className="max-w-2xl">
    <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">{title}</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
  </div>
);

const conditionLabels: Record<Product['condition'], string> = {
  new: 'New',
  used: 'Used',
  refurbished: 'Refurbished',
};

const FeaturedHeroProduct = ({
  product,
  isLoading,
  error,
}: {
  product?: Product;
  isLoading: boolean;
  error: string | null;
}) => {
  if (isLoading) {
    return (
      <div className="min-h-[310px] rounded-xl border border-white/15 bg-white p-5 shadow-[0_24px_70px_rgba(0,20,52,0.32)] sm:min-h-[340px]" aria-label="Loading featured phone">
        <div className="grid h-full gap-5 sm:grid-cols-[.92fr_1.08fr] sm:items-center">
          <div className="min-h-44 animate-pulse rounded-lg bg-slate-100" />
          <div>
            <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
            <div className="mt-4 h-7 w-4/5 animate-pulse rounded bg-slate-100" />
            <div className="mt-3 h-5 w-1/2 animate-pulse rounded bg-slate-100" />
            <div className="mt-7 h-11 w-full animate-pulse rounded-lg bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-[310px] flex-col justify-between rounded-xl border border-white/15 bg-white p-5 text-slate-950 shadow-[0_24px_70px_rgba(0,20,52,0.32)] sm:min-h-[340px] sm:p-7">
        <div>
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Smartphone className="h-7 w-7" aria-hidden="true" />
          </div>
          <h2 className="mt-6 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {error ? 'Catalogue preview unavailable' : 'New phones arriving soon'}
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">
            Browse the catalogue or ask the shop about current phone availability.
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-3 min-[430px]:flex-row">
          <Link to="/products" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-bold text-white hover:bg-blue-800">
            Browse phones
          </Link>
          <a href={SHOP_WHATSAPP_URL} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-slate-300 px-5 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700">
            Message the shop
          </a>
        </div>
      </div>
    );
  }

  const image = product.images.find(Boolean);
  const hasDiscount = Boolean(product.originalPrice && product.originalPrice > product.price && product.price > 0);
  const discount = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : null;
  const productMeta = [
    product.brand,
    product.specifications.storage,
    conditionLabels[product.condition],
    product.ptaApproved ? 'PTA approved' : 'Non-PTA',
  ].filter(Boolean);

  return (
    <article className="grid min-h-[310px] overflow-hidden rounded-xl border border-white/15 bg-white text-slate-950 shadow-[0_24px_70px_rgba(0,20,52,0.32)] sm:min-h-[340px] sm:grid-cols-[.92fr_1.08fr]">
      <div className="flex min-h-52 items-center justify-center bg-slate-50 p-5 sm:min-h-full sm:p-7">
        {image ? (
          <img src={image} alt={product.name} className="h-48 w-full object-contain sm:h-64" loading="eager" />
        ) : (
          <div className="flex h-full min-h-44 w-full items-center justify-center text-blue-700">
            <Smartphone className="h-12 w-12" aria-hidden="true" />
            <span className="sr-only">Product image unavailable</span>
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col justify-center p-5 sm:p-6">
        <p className="flex flex-wrap gap-x-2 gap-y-1 text-xs font-semibold text-slate-600">
          {productMeta.map((item, index) => (
            <span key={`${item}-${index}`} className="inline-flex items-center gap-2">
              {index > 0 && <span className="h-3 w-px bg-slate-300" aria-hidden="true" />}
              <span className={item === product.brand ? 'text-blue-700' : undefined}>{item}</span>
            </span>
          ))}
        </p>
        <h2 className="mt-3 line-clamp-2 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{product.name}</h2>
        <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {product.price > 0 ? (
            <strong className="text-2xl font-extrabold text-slate-950">{formatPrice(product.price)}</strong>
          ) : (
            <strong className="text-lg font-extrabold text-slate-950">Contact for price</strong>
          )}
          {hasDiscount && (
            <span className="text-sm text-slate-400 line-through">{formatPrice(product.originalPrice!)}</span>
          )}
          {discount !== null && discount > 0 && (
            <span className="text-xs font-bold text-emerald-700">Save {discount}%</span>
          )}
        </div>
        <Link to={`/products/${product._id}`} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-bold text-white hover:bg-blue-800">
          View phone
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
};

const TrustItem = ({ icon: Icon, title, description }: { icon: typeof Store; title: string; description: string }) => (
  <div className="border-l border-white/20 pl-5">
    <Icon className="h-5 w-5 text-blue-200" aria-hidden="true" />
    <h3 className="mt-4 font-extrabold text-white">{title}</h3>
    <p className="mt-2 text-sm leading-6 text-blue-100">{description}</p>
  </div>
);

const ReviewStars = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Star key={star} className={`h-4 w-4 ${star <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-blue-300'}`} aria-hidden="true" />
    ))}
  </div>
);

export default Home;
