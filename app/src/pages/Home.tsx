import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  Mail,
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
import ProductRating from '../components/product/ProductRating';
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_NUMBERS,
  SHOP_ADDRESS,
  SHOP_MAPS_URL,
  SHOP_WHATSAPP_URL,
} from '../config/contact';
import { formatPrice } from '../utils/format';

type Brand = {
  name: string;
  count: number | null;
  path: string;
};

const brandFallbacks = ['iPhone', 'Samsung', 'Honor', 'Xiaomi', 'Redmi'];

const stats = [
  'Established March 2009',
  '20,000+ Customers Served',
  '95% Customer Satisfaction',
];

const valueItems = [
  {
    icon: Store,
    title: 'Local shop',
    description: 'A physical Wahab Mobiles store in Saddar Cantt Hyderabad.',
  },
  {
    icon: Smartphone,
    title: 'New, used, refurbished',
    description: 'Browse by phone condition from the live catalogue.',
  },
  {
    icon: ShieldCheck,
    title: 'PTA status visible',
    description: 'Every listing shows the PTA status set by admin.',
  },
  {
    icon: ShoppingBag,
    title: 'Online checkout',
    description: 'Cart, account, support, and cash-on-delivery checkout.',
  },
];

const discoveryTiles = [
  {
    title: 'Brand new phones',
    description: 'Start with new devices when they are published.',
    to: '/products?condition=new',
    icon: ShoppingBag,
  },
  {
    title: 'Used phones',
    description: 'Filter used inventory before calling or visiting.',
    to: '/products?condition=used',
    icon: Tags,
  },
  {
    title: 'Refurbished phones',
    description: 'View refurbished options with condition and PTA details.',
    to: '/products?condition=refurbished',
    icon: BadgeCheck,
  },
];

const conditionLabels: Record<Product['condition'], string> = {
  new: 'New',
  used: 'Used',
  refurbished: 'Refurbished',
};

const getPrimaryImage = (product: Product) => product.images.find(Boolean);

const Stars = ({ rating }: { rating: number | null }) => (
  <div className="flex items-center gap-0.5" aria-label={rating ? `${rating} stars` : 'No rating'}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`h-4 w-4 ${rating && star <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
        aria-hidden="true"
      />
    ))}
  </div>
);

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
          setFeaturedProducts((featuredResponse.value.data.data as Product[]).slice(0, 6));
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
        if (active) {
          setIsHomeLoading(false);
        }
      }
    };

    void loadHomeData();

    return () => {
      active = false;
    };
  }, []);

  const displayedBrands =
    brands.length > 0
      ? brands
      : brandFallbacks.map((name) => ({
          name,
          count: null,
          path: name === 'iPhone' ? '/products?search=iPhone' : `/products?brand=${encodeURIComponent(name)}`,
        }));

  const reviewCards = reviews?.reviews.filter((review) => review.text.trim()).slice(0, 5) ?? [];
  const reviewsUrl = reviews?.googleMapsUri ?? SHOP_MAPS_URL;

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-slate-50 text-slate-950">
      <section className="border-b border-sky-100 bg-white">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-14">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <img
                src="/assets/wahab-logo.jpg"
                alt="Wahab Mobiles logo"
                className="h-14 w-14 rounded-full border border-sky-100 object-cover shadow-sm"
              />
              <div>
                <p className="text-sm font-semibold text-blue-700">Wahab Mobiles</p>
                <p className="text-sm text-slate-500">Trusted Cell Phones Outlet in Hyderabad</p>
              </div>
            </div>
            <h1 className="mt-6 max-w-[13ch] text-4xl font-extrabold leading-[1.04] text-slate-950 sm:text-5xl lg:text-6xl">
              Phones first. Details clear.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Shop new, used and refurbished phones from a real Hyderabad mobile store with live catalogue details.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/products"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition hover:bg-blue-800 active:translate-y-px sm:w-auto"
              >
                Browse products
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href={CONTACT_PHONE_NUMBERS[0].href}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-sky-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-sky-300 hover:text-blue-700 active:translate-y-px sm:w-auto"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                Call {CONTACT_PHONE_NUMBERS[0].label}
              </a>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                  {stat}
                </div>
              ))}
            </div>
          </div>

          <figure className="overflow-hidden rounded-xl border border-white bg-white p-2 shadow-2xl shadow-sky-950/10">
            <img
              src="/assets/wahab-shop.jpg"
              alt="Wahab Mobiles shop interior in Hyderabad"
              className="aspect-[16/11] w-full rounded-lg object-cover"
            />
          </figure>
        </div>
      </section>

      <section className="bg-white py-8">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {valueItems.map((item) => (
            <div key={item.title} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-blue-700">
                <item.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-950">{item.title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-12 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">Shop by brand</h2>
            <p className="mt-2 text-slate-600">Jump into commonly requested phone brands.</p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {displayedBrands.map((brand) => (
              <Link
                key={brand.name}
                to={brand.path}
                className="group rounded-lg border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-950/5"
              >
                <p className="text-lg font-bold text-slate-950 group-hover:text-blue-700">{brand.name}</p>
                <p className="mt-5 text-sm text-slate-500">
                  {brand.count === null
                    ? 'Browse catalogue'
                    : `${brand.count} ${brand.count === 1 ? 'product' : 'products'}`}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-12 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950">Featured products</h2>
              <p className="mt-2 text-slate-600">Real products will appear here when published from admin.</p>
            </div>
            <Link to="/products" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800">
              View full catalogue
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {isHomeLoading ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="aspect-[4/3] animate-pulse rounded-lg bg-slate-100" />
                  <div className="mt-4 h-4 w-1/3 animate-pulse rounded bg-slate-100" />
                  <div className="mt-3 h-6 w-4/5 animate-pulse rounded bg-slate-100" />
                  <div className="mt-5 h-5 w-1/2 animate-pulse rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : homeError ? (
            <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-6">
              <p className="font-semibold text-amber-950">Catalogue preview unavailable</p>
              <p className="mt-2 text-sm text-amber-900">{homeError}</p>
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white p-8">
              <Search className="h-8 w-8 text-slate-400" aria-hidden="true" />
              <h3 className="mt-4 text-xl font-semibold text-slate-950">No featured products are published yet</h3>
              <p className="mt-2 max-w-xl text-slate-600">
                The homepage will switch to real phone cards as soon as products are added and marked featured.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredProducts.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-12 sm:py-14">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">Shop by need</h2>
            <p className="mt-3 max-w-xl text-slate-600">
              Keep browsing practical: choose a condition, search a model, or contact the shop to confirm exact stock.
            </p>
            <div className="mt-6 space-y-3 text-sm text-slate-700">
              <p className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
                <span>{SHOP_ADDRESS}</span>
              </p>
              <p className="flex gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
                <span>Saturday to Thursday, 1:30 PM - 12 AM</span>
              </p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="flex gap-3 transition hover:text-blue-700">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
                <span>{CONTACT_EMAIL}</span>
              </a>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {discoveryTiles.map((tile) => (
              <Link
                key={tile.title}
                to={tile.to}
                className="group rounded-lg border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-white hover:shadow-lg hover:shadow-sky-950/5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-700 text-white">
                  <tile.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-950">{tile.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{tile.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-12 text-white sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">What our customers say</h2>
              <p className="mt-3 max-w-2xl text-slate-300">
                Google review data appears here through the official Places API when the API key and Place ID are configured.
              </p>
            </div>
            <a
              href={reviewsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-50 active:translate-y-px"
            >
              See all reviews on Google
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>

          {reviews?.configured && reviews.rating ? (
            <div className="mt-8 flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-3xl font-bold">{reviews.rating.toFixed(1)}</p>
                <p className="mt-1 text-sm text-slate-300">{reviews.userRatingCount} Google reviews</p>
              </div>
              <Stars rating={reviews.rating} />
            </div>
          ) : (
            <div className="mt-8 rounded-lg border border-white/10 bg-white/[0.06] p-5 text-sm text-slate-300">
              Google reviews are not configured yet. No ratings or reviews are being shown.
            </div>
          )}

          {reviewCards.length > 0 && (
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reviewCards.map((review) => (
                <article key={review.id} className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
                  <div className="flex items-center gap-3">
                    {review.authorPhotoUri ? (
                      <img
                        src={review.authorPhotoUri}
                        alt={review.authorName}
                        className="h-10 w-10 rounded-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-300 text-sm font-bold text-slate-950">
                        {review.authorName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <a href={review.authorUri ?? review.googleMapsUri ?? reviewsUrl} target="_blank" rel="noreferrer" className="font-semibold hover:text-cyan-200">
                        {review.authorName}
                      </a>
                      <p className="text-xs text-slate-400">{review.relativePublishTimeDescription ?? ''}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Stars rating={review.rating} />
                  </div>
                  <p className="mt-4 line-clamp-5 text-sm leading-6 text-slate-200">{review.text}</p>
                  <a href={review.googleMapsUri ?? reviewsUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-semibold text-cyan-200 hover:text-white">
                    Read on Google
                  </a>
                </article>
              ))}
            </div>
          )}
          <p className="mt-5 text-xs text-slate-400">Reviews from Google. Individual reviews are limited to what Google Places returns.</p>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-14">
        <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_auto] lg:px-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">Want to confirm a model?</h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Call or message before visiting to confirm current stock, condition, storage, color and price.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={SHOP_WHATSAPP_URL}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition hover:bg-blue-800 active:translate-y-px sm:w-auto"
            >
              Message on WhatsApp
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href={SHOP_MAPS_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-sky-200 bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:border-sky-300 hover:bg-sky-50 active:translate-y-px sm:w-auto"
            >
              Open map
              <MapPin className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

const ProductCard = ({ product }: { product: Product }) => {
  const image = getPrimaryImage(product);

  return (
    <Link
      to={`/products/${product._id}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-xl hover:shadow-sky-950/10"
    >
      <div className="aspect-[4/3] overflow-hidden bg-slate-100">
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-sky-50 text-blue-700">
            <Smartphone className="h-12 w-12" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="rounded-md bg-sky-50 px-2 py-1 text-blue-700">{product.brand}</span>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">
            {conditionLabels[product.condition]}
          </span>
          {product.specifications.storage && (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">
              {product.specifications.storage}
            </span>
          )}
        </div>
        <h3 className="mt-4 line-clamp-2 min-h-[3.5rem] text-lg font-semibold leading-7 text-slate-950 transition group-hover:text-blue-700">
          {product.name}
        </h3>
        <ProductRating product={product} className="mt-3" compact />
        <div className="mt-auto pt-5">
          <div className="flex flex-wrap items-end gap-3">
            <p className="text-xl font-bold text-slate-950">{formatPrice(product.price)}</p>
            {product.originalPrice && product.originalPrice > product.price && (
              <p className="pb-0.5 text-sm text-slate-400 line-through">{formatPrice(product.originalPrice)}</p>
            )}
          </div>
          {product.ptaApproved && <p className="mt-3 text-sm font-medium text-emerald-700">PTA approved</p>}
        </div>
      </div>
    </Link>
  );
};

export default Home;
