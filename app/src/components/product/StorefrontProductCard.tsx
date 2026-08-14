import { Link } from 'react-router-dom';
import { ShoppingCart, Smartphone } from 'lucide-react';
import type { Product } from '../../types';
import { formatPrice } from '../../utils/format';
import ProductRating from './ProductRating';

type StorefrontProductCardProps = {
  product: Product;
  view?: 'grid' | 'list';
  onAddToCart?: (event: React.MouseEvent, product: Product) => void;
};

const conditionLabels: Record<Product['condition'], string> = {
  new: 'New',
  used: 'Used',
  refurbished: 'Refurbished',
};

const getPrimaryImage = (product: Product) => product.images.find(Boolean);

const StorefrontProductCard = ({
  product,
  view = 'grid',
  onAddToCart,
}: StorefrontProductCardProps) => {
  const image = getPrimaryImage(product);
  const hasDiscount = Boolean(
    product.originalPrice && product.originalPrice > product.price && product.price > 0,
  );
  const discount = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : null;
  const isOutOfStock = product.countInStock <= 0;

  if (view === 'list') {
    return (
      <Link
        to={`/products/${product._id}`}
        className="group grid overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-blue-300 hover:shadow-[0_16px_40px_rgba(15,46,82,0.09)] sm:grid-cols-[180px_1fr]"
      >
        <ProductImage product={product} image={image} className="hidden min-h-48 sm:flex" />
        <div className="flex min-w-0 flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0 flex-1">
            <ProductMeta product={product} />
            <h3 className="mt-3 text-lg font-bold leading-6 text-slate-950 transition group-hover:text-blue-700">
              {product.name}
            </h3>
            <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 text-slate-600">
              {product.description}
            </p>
            <ProductRating product={product} className="mt-3" />
          </div>
          <div className="flex shrink-0 items-end justify-between gap-4 sm:min-w-44 sm:flex-col sm:items-end">
            <PriceBlock product={product} discount={discount} align="right" />
            {onAddToCart && (
              <AddToCartButton
                product={product}
                isOutOfStock={isOutOfStock}
                onAddToCart={onAddToCart}
              />
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/products/${product._id}`}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_16px_40px_rgba(15,46,82,0.09)]"
    >
      <div className="relative">
        <ProductImage product={product} image={image} className="aspect-[1/0.88]" />
        {discount !== null && discount > 0 && (
          <span className="absolute left-3 top-3 rounded-md bg-blue-700 px-2 py-1 text-[11px] font-bold text-white">
            {discount}% off
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <ProductMeta product={product} compact />
        <h3 className="mt-3 line-clamp-2 min-h-12 text-[15px] font-bold leading-6 text-slate-950 transition group-hover:text-blue-700 sm:text-base">
          {product.name}
        </h3>
        <ProductRating product={product} className="mt-2.5" compact />
        <div className="mt-auto pt-4">
          <PriceBlock product={product} discount={null} />
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <span className={`text-xs font-semibold ${isOutOfStock ? 'text-slate-500' : 'text-emerald-700'}`}>
              {isOutOfStock ? 'Out of stock' : 'In stock'}
            </span>
            {onAddToCart && (
              <AddToCartButton
                product={product}
                isOutOfStock={isOutOfStock}
                onAddToCart={onAddToCart}
                compact
              />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

const ProductImage = ({
  product,
  image,
  className,
}: {
  product: Product;
  image?: string;
  className: string;
}) => (
  <div className={`flex items-center justify-center overflow-hidden bg-slate-50 p-4 ${className}`}>
    {image ? (
      <img
        src={image}
        alt={product.name}
        className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.025]"
        loading="lazy"
      />
    ) : (
      <div className="flex h-full w-full items-center justify-center text-blue-700">
        <Smartphone className="h-10 w-10" aria-hidden="true" />
        <span className="sr-only">Product image unavailable</span>
      </div>
    )}
  </div>
);

const ProductMeta = ({ product, compact = false }: { product: Product; compact?: boolean }) => (
  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold sm:text-xs">
    <span className="text-blue-700">{product.brand}</span>
    <span className="h-3 w-px bg-slate-200" aria-hidden="true" />
    <span className="text-slate-600">{conditionLabels[product.condition]}</span>
    {product.specifications.storage && (
      <>
        <span className="h-3 w-px bg-slate-200" aria-hidden="true" />
        <span className="text-slate-600">{product.specifications.storage}</span>
      </>
    )}
    {!compact && product.ptaApproved && (
      <>
        <span className="h-3 w-px bg-slate-200" aria-hidden="true" />
        <span className="text-emerald-700">PTA approved</span>
      </>
    )}
  </div>
);

const PriceBlock = ({
  product,
  discount,
  align = 'left',
}: {
  product: Product;
  discount: number | null;
  align?: 'left' | 'right';
}) => (
  <div className={align === 'right' ? 'text-right' : undefined}>
    <p className="text-lg font-extrabold tracking-tight text-slate-950 sm:text-xl">
      {formatPrice(product.price)}
    </p>
    {product.originalPrice && product.originalPrice > product.price && (
      <div className={`mt-1 flex flex-wrap items-center gap-2 ${align === 'right' ? 'justify-end' : ''}`}>
        <span className="text-xs text-slate-400 line-through">{formatPrice(product.originalPrice)}</span>
        {discount !== null && discount > 0 && (
          <span className="text-xs font-semibold text-emerald-700">Save {discount}%</span>
        )}
      </div>
    )}
  </div>
);

const AddToCartButton = ({
  product,
  isOutOfStock,
  onAddToCart,
  compact = false,
}: {
  product: Product;
  isOutOfStock: boolean;
  onAddToCart: (event: React.MouseEvent, product: Product) => void;
  compact?: boolean;
}) => (
  <button
    type="button"
    disabled={isOutOfStock}
    onClick={(event) => onAddToCart(event, product)}
    className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-700 font-semibold text-white transition hover:bg-blue-800 active:translate-y-px disabled:cursor-not-allowed disabled:bg-slate-300 ${
      compact ? 'h-9 px-3 text-xs' : 'px-4 py-2.5 text-sm'
    }`}
    aria-label={`Add ${product.name} to cart`}
  >
    <ShoppingCart className="h-4 w-4" aria-hidden="true" />
    <span className={compact ? 'hidden min-[430px]:inline' : ''}>{compact ? 'Add' : 'Add to cart'}</span>
  </button>
);

export default StorefrontProductCard;
