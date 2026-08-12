import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CreditCard,
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
import { productsAPI } from '../services/api';
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

const valueItems = [
  {
    icon: Store,
    title: 'Trusted Cell Phones Outlet',
    description: 'A local Wahab Mobiles experience for shoppers in Hyderabad.',
  },
  {
    icon: Smartphone,
    title: 'New and used choices',
    description: 'Browse new, used and refurbished options from the live catalogue.',
  },
  {
    icon: ShieldCheck,
    title: 'PTA status visible',
    description: 'Product pages show PTA approval details where they are available.',
  },
  {
    icon: CreditCard,
    title: 'Cash on delivery',
    description: 'Choose the checkout flow already supported by Wahab Mobiles.',
  },
];

const discoveryTiles = [
  {
    title: 'Brand new phones',
    description: 'Go straight to box-pack and newly listed phones from the catalogue.',
    to: '/products?condition=new',
    icon: ShoppingBag,
  },
  {
    title: 'Used phones',
    description: 'Filter for used devices and confirm condition before you visit or order.',
    to: '/products?condition=used',
    icon: Tags,
  },
];

const conditionLabels: Record<Product['condition'], string> = {
  new: 'New',
  used: 'Used',
  refurbished: 'Refurbished',
};

const getPrimaryImage = (product: Product) => product.images.find(Boolean);

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isHomeLoading, setIsHomeLoading] = useState(true);
  const [homeError, setHomeError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadHomeData = async () => {
      try {
        setIsHomeLoading(true);
        setHomeError(null);
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
            path: `/products?brand=${encodeURIComponent(brand.name)}`,
          })),
        );
      } catch {
        if (active) {
          setFeaturedProducts([]);
          setBrands([]);
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

  return (
    <div className="min-h-[100dvh] bg-[#f7fbff] text-slate-950">
      <section className="border-b border-sky-100 bg-gradient-to-b from-white to-sky-50/80">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-16">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <img
                src="/assets/wahab-logo.jpg"
                alt="Wahab Mobiles logo"
                className="h-14 w-14 rounded-full border border-sky-100 object-cover shadow-sm"
              />
              <div>
                <p className="text-sm font-semibold text-sky-700">Hyderabad • Trusted Mobile Outlet</p>
                <p className="text-sm text-slate-500">New, used and refurbished phones</p>
              </div>
            </div>
            <h1 className="mt-6 max-w-[12ch] text-4xl font-extrabold leading-[1.04] text-slate-950 sm:text-5xl lg:text-6xl">
              Wahab Mobiles
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              A Trusted Cell Phones Outlet in Hyderabad for new and used phones, with live pricing and checkout.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/products"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition hover:bg-blue-800 active:translate-y-px"
              >
                Browse products
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href={CONTACT_PHONE_NUMBERS[0].href}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-sky-300 hover:text-blue-700 active:translate-y-px"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                Call {CONTACT_PHONE_NUMBERS[0].label}
              </a>
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

      <section className="bg-[#f7fbff] py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">Shop by brand</h2>
            <p className="mt-3 text-slate-600">
              Jump into the brands Wahab Mobiles customers ask for most, using the live catalogue when it is available.
            </p>
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

      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">Featured products</h2>
            <p className="mt-3 text-slate-600">Phones selected from the live Wahab Mobiles catalogue.</p>
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
              <Link to="/products" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
                Open products
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8">
              <Search className="h-8 w-8 text-slate-400" aria-hidden="true" />
              <h3 className="mt-4 text-xl font-semibold text-slate-950">No featured products are published yet</h3>
              <p className="mt-2 max-w-xl text-slate-600">
                The homepage will show real featured phones here as soon as they are marked featured in admin.
              </p>
              <Link to="/products" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
                Browse all products
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {featuredProducts.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
              <div className="mt-8">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:border-sky-300 hover:bg-sky-50 active:translate-y-px"
                >
                  View full catalogue
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="bg-slate-950 py-14 text-white sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div className="max-w-xl">
            <h2 className="text-3xl font-bold tracking-tight">New or used, start with the right filter</h2>
            <p className="mt-3 text-slate-300">
              Use condition filters to narrow the catalogue before calling about stock, color, storage and PTA status.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {discoveryTiles.map((tile) => (
              <Link
                key={tile.title}
                to={tile.to}
                className="group rounded-lg border border-white/10 bg-white/[0.06] p-5 transition hover:-translate-y-0.5 hover:border-cyan-300/60 hover:bg-white/[0.09]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-300 text-slate-950">
                  <tile.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-xl font-semibold">{tile.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{tile.description}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 group-hover:text-white">
                  Browse this section
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_0.95fr] lg:px-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">Why WM</h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              The site supports online browsing, while the shop gives local customers a direct place to verify phones.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                'Live product pages with price, condition and stock information.',
                'Direct phone and WhatsApp contact for current availability.',
                'Customer accounts for orders, wishlist and support tickets.',
                'A visible Hyderabad shop presence backed by real store photography.',
              ].map((item) => (
                <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <BadgeCheck className="h-5 w-5 text-blue-700" aria-hidden="true" />
                  <p className="mt-3 text-sm leading-6 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-sky-100 bg-sky-50 p-4">
            <img
              src="/assets/wahab-logo.jpg"
              alt="Wahab Mobiles Trusted Cell Phones Outlet logo"
              className="mx-auto h-52 w-52 rounded-full object-cover shadow-xl shadow-sky-950/10"
            />
            <div className="mt-5 rounded-lg bg-white p-5">
              <p className="text-sm font-semibold text-sky-700">Local shop details</p>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <p className="flex gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
                  <span>{SHOP_ADDRESS}</span>
                </p>
                {CONTACT_PHONE_NUMBERS.map((phone) => (
                  <a key={phone.href} href={phone.href} className="flex gap-3 transition hover:text-blue-700">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
                    <span>{phone.label}</span>
                  </a>
                ))}
                <a href={`mailto:${CONTACT_EMAIL}`} className="flex gap-3 transition hover:text-blue-700">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
                  <span>{CONTACT_EMAIL}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#eef7ff] py-14 sm:py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_auto] lg:px-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">Want to confirm a model?</h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Call or message Wahab Mobiles before visiting to confirm current stock, condition, storage, color and price.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <a
              href={SHOP_WHATSAPP_URL}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition hover:bg-blue-800 active:translate-y-px"
            >
              Message on WhatsApp
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href={SHOP_MAPS_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-200 bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:border-sky-300 hover:bg-sky-50 active:translate-y-px"
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
        <div className="mt-3 flex items-center gap-1.5 text-sm text-slate-600">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
          <span>{product.rating}</span>
          <span>({product.numReviews})</span>
        </div>
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
