import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Star,
  Store,
  Tags,
} from 'lucide-react';
import type { Product } from '../types';
import { businessAPI, productsAPI } from '../services/api';
import type { GoogleBusinessReviews } from '../services/api';
import StorefrontProductCard from '../components/product/StorefrontProductCard';
import { priceRanges } from '../data/products';
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

const conditions = [
  {
    title: 'Brand new phones',
    label: 'New',
    description: 'Browse sealed and new devices when they are published.',
    to: '/products?condition=new',
    icon: ShoppingBag,
    className: 'lg:row-span-2 lg:min-h-[284px]',
  },
  {
    title: 'Used phones',
    label: 'Used',
    description: 'Compare condition, storage, price and PTA status.',
    to: '/products?condition=used',
    icon: Tags,
    className: '',
  },
  {
    title: 'Refurbished phones',
    label: 'Refurbished',
    description: 'See refurbished options from the live catalogue.',
    to: '/products?condition=refurbished',
    icon: BadgeCheck,
    className: '',
  },
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

          <div className="rounded-xl border border-white/15 bg-white p-4 text-slate-950 shadow-[0_24px_70px_rgba(0,20,52,0.32)] sm:p-5">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-sm font-extrabold text-slate-950">Start shopping</p>
                <p className="mt-1 hidden text-xs text-slate-500 sm:block">Choose a condition or a popular brand</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Smartphone className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {conditions.map((condition) => (
                <Link
                  key={condition.label}
                  to={condition.to}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-3 text-center text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  {condition.label}
                </Link>
              ))}
            </div>
            <div className="mt-4 hidden flex-wrap gap-2 sm:flex">
              {displayedBrands.slice(0, 5).map((brand) => (
                <Link
                  key={brand.name}
                  to={brand.path}
                  className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
                >
                  {brand.name}
                </Link>
              ))}
            </div>
            <Link to="/products" className="mt-4 flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-100">
              Search the full catalogue
              <Search className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
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

      <section className="py-11 sm:py-14">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Shop by condition" description="Go straight to the phones that match how you want to buy." />
          <div className="mt-7 grid gap-4 lg:grid-cols-[1.1fr_.9fr] lg:grid-rows-2">
            {conditions.map((condition, index) => (
              <Link
                key={condition.title}
                to={condition.to}
                className={`group flex min-h-36 items-center justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-[0_16px_40px_rgba(15,46,82,0.08)] sm:p-6 ${condition.className}`}
              >
                <div className="max-w-sm">
                  <p className="text-xs font-bold text-blue-700">{condition.label}</p>
                  <h3 className={`mt-2 font-extrabold text-slate-950 group-hover:text-blue-700 ${index === 0 ? 'text-2xl sm:text-3xl' : 'text-xl'}`}>
                    {condition.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{condition.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-blue-700">
                    Browse phones
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </div>
                <div className={`ml-4 flex shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ${index === 0 ? 'h-24 w-24 sm:h-32 sm:w-32' : 'h-16 w-16'}`}>
                  <condition.icon className={index === 0 ? 'h-10 w-10 sm:h-12 sm:w-12' : 'h-7 w-7'} aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

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

      <section className="py-11 sm:py-14">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-5">
            <SectionHeading title="Featured phones" description="Products selected from the live Wahab Mobiles catalogue." />
            <Link to="/products" className="hidden shrink-0 items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-800 sm:inline-flex">
              View catalogue
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {isHomeLoading ? (
            <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
              {Array.from({ length: 4 }).map((_, index) => <ProductSkeleton key={index} />)}
            </div>
          ) : homeError ? (
            <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-6">
              <p className="font-bold text-amber-950">Catalogue preview unavailable</p>
              <p className="mt-2 text-sm text-amber-900">{homeError}</p>
              <Link to="/products" className="mt-4 inline-flex text-sm font-bold text-amber-950 underline">Open catalogue</Link>
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="mt-7 grid overflow-hidden rounded-xl border border-slate-200 bg-white md:grid-cols-[1fr_auto]">
              <div className="p-6 sm:p-8">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <Search className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-xl font-extrabold text-slate-950">No phones are listed right now</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  New products will appear here automatically when the catalogue is published. You can still browse by condition or contact the shop.
                </p>
              </div>
              <div className="flex flex-col justify-center gap-3 border-t border-slate-200 bg-slate-50 p-6 md:min-w-64 md:border-l md:border-t-0">
                <Link to="/products" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800">
                  Open catalogue
                </Link>
                <a href={CONTACT_PHONE_NUMBERS[0].href} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700">
                  Call the shop
                </a>
              </div>
            </div>
          ) : (
            <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
              {featuredProducts.map((product) => (
                <StorefrontProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
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
            <div className="mt-6 flex flex-col gap-3 min-[430px]:flex-row">
              <a href={SHOP_MAPS_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-bold text-white hover:bg-blue-800">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Open map
              </a>
              <Link to="/about#about-us" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-5 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700">
                About the store
              </Link>
            </div>
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

const ProductSkeleton = () => (
  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4">
    <div className="aspect-[1/0.88] animate-pulse rounded-lg bg-slate-100" />
    <div className="mt-4 h-3 w-1/3 animate-pulse rounded bg-slate-100" />
    <div className="mt-3 h-5 w-4/5 animate-pulse rounded bg-slate-100" />
    <div className="mt-2 h-5 w-2/3 animate-pulse rounded bg-slate-100" />
    <div className="mt-5 h-6 w-1/2 animate-pulse rounded bg-slate-100" />
  </div>
);

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
