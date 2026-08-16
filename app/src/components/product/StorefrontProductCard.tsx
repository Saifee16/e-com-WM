import { Link } from 'react-router-dom';
import { ShoppingCart, Smartphone, Zap } from 'lucide-react';
import type { Product } from '../../types';
import { formatPrice } from '../../utils/format';
import ProductRating from './ProductRating';

type ProductActionHandler = (
  event: React.MouseEvent<HTMLButtonElement>,
  product: Product,
) => void | Promise<void>;

type StorefrontProductCardProps = {
  product: Product;
  view?: 'grid' | 'list';
  onAddToCart?: ProductActionHandler;
  onBuyNow?: ProductActionHandler;
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
  onBuyNow,
}: StorefrontProductCardProps) => {
  const image = getPrimaryImage(product);

  const hasDiscount = Boolean(
    product.originalPrice &&
      product.originalPrice > product.price &&
      product.price > 0,
  );

  const discount = hasDiscount
    ? Math.round(
        ((product.originalPrice! - product.price) /
          product.originalPrice!) *
          100,
      )
    : null;

  const isOutOfStock = product.countInStock <= 0;

  if (view === 'list') {
    return (
      <Link
        to={`/products/${product._id}`}
        className="group grid overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-blue-300 hover:shadow-[0_16px_40px_rgba(15,46,82,0.09)] sm:grid-cols-[180px_1fr]"
      >
        <ProductImage
          product={product}
          image={image}
          className="hidden min-h-48 sm:flex"
        />

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

          <div className="flex shrink-0 flex-col items-end gap-3 sm:min-w-48">
            <PriceBlock
              product={product}
              discount={discount}
              align="right"
            />

            {isOutOfStock ? (
              <span className="text-sm font-semibold text-slate-500">
                Out of stock
              </span>
            ) : (
              (onBuyNow || onAddToCart) && (
                <div className="flex w-full gap-2 sm:w-auto">
                  {onBuyNow && (
                    <BuyNowButton
                      product={product}
                      isOutOfStock={isOutOfStock}
                      onBuyNow={onBuyNow}
                    />
                  )}

                  {onAddToCart && (
                    <AddToCartButton
                      product={product}
                      isOutOfStock={isOutOfStock}
                      onAddToCart={onAddToCart}
                    />
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/products/${product._id}`}
      className="group flex h-fit min-w-0 self-start flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_16px_40px_rgba(15,46,82,0.09)]"
    >
      <div className="relative">
        <ProductImage
          product={product}
          image={image}
          className="aspect-[1/0.84] p-3"
        />

        {discount !== null && discount > 0 && (
          <span className="absolute right-2 top-2 rounded-md bg-blue-700 px-2 py-1 text-[11px] font-bold text-white">
            {discount}% OFF
          </span>
        )}
      </div>

      <div className="flex flex-col p-3 sm:p-3.5">
        <ProductMeta product={product} compact />

        <h3 className="mt-2 line-clamp-2 text-[15px] font-bold leading-5 text-slate-950 transition group-hover:text-blue-700 sm:text-base">
          {product.name}
        </h3>

        <ProductRating
          product={product}
          className="mt-1.5"
          compact
        />

        <div className="pt-1.5">
          <PriceBlock product={product} discount={null} />

          {isOutOfStock ? (
            <p className="mt-2 border-t border-slate-100 pt-2 text-xs font-semibold text-slate-500">
              Out of stock
            </p>
          ) : (
            (onBuyNow || onAddToCart) && (
              <div
                className={`mt-2 grid gap-2 border-t border-slate-100 pt-2 ${
                  onBuyNow && onAddToCart
                    ? 'grid-cols-2'
                    : 'grid-cols-1'
                }`}
              >
                {onBuyNow && (
                  <BuyNowButton
                    product={product}
                    isOutOfStock={isOutOfStock}
                    onBuyNow={onBuyNow}
                    compact
                  />
                )}

                {onAddToCart && (
                  <AddToCartButton
                    product={product}
                    isOutOfStock={isOutOfStock}
                    onAddToCart={onAddToCart}
                    compact
                  />
                )}
              </div>
            )
          )}
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
  <div
    className={`flex items-center justify-center overflow-hidden bg-slate-50 ${className}`}
  >
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

const ProductMeta = ({
  product,
  compact = false,
}: {
  product: Product;
  compact?: boolean;
}) => (
  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold sm:text-xs">
    <span className="text-blue-700">{product.brand}</span>

    <span className="h-3 w-px bg-slate-200" aria-hidden="true" />

    <span className="text-slate-600">
      {conditionLabels[product.condition]}
    </span>

    {product.specifications.storage && (
      <>
        <span className="h-3 w-px bg-slate-200" aria-hidden="true" />
        <span className="text-slate-600">
          {product.specifications.storage}
        </span>
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

    {product.originalPrice &&
      product.originalPrice > product.price && (
        <div
          className={`mt-0.5 flex flex-wrap items-center gap-2 ${
            align === 'right' ? 'justify-end' : ''
          }`}
        >
          <span className="text-xs text-slate-400 line-through">
            {formatPrice(product.originalPrice)}
          </span>

          {discount !== null && discount > 0 && (
            <span className="text-xs font-semibold text-emerald-700">
              Save {discount}%
            </span>
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
  onAddToCart: ProductActionHandler;
  compact?: boolean;
}) => (
  <button
    type="button"
    disabled={isOutOfStock}
    onClick={(event) => {
      event.preventDefault();
      event.stopPropagation();
      void onAddToCart(event, product);
    }}
    className={`inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg bg-blue-700 font-semibold text-white transition hover:bg-blue-800 active:translate-y-px disabled:cursor-not-allowed disabled:bg-slate-300 ${
      compact ? 'h-9 px-2 text-xs' : 'px-4 py-2.5 text-sm'
    }`}
    aria-label={`Add ${product.name} to cart`}
  >
    <ShoppingCart className="h-4 w-4 shrink-0" aria-hidden="true" />
    <span>Add</span>
  </button>
);

const BuyNowButton = ({
  product,
  isOutOfStock,
  onBuyNow,
  compact = false,
}: {
  product: Product;
  isOutOfStock: boolean;
  onBuyNow: ProductActionHandler;
  compact?: boolean;
}) => (
  <button
    type="button"
    disabled={isOutOfStock}
    onClick={(event) => {
      event.preventDefault();
      event.stopPropagation();
      void onBuyNow(event, product);
    }}
    className={`inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-blue-700 bg-white font-semibold text-blue-700 transition hover:bg-blue-50 active:translate-y-px disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400 ${
      compact ? 'h-9 px-2 text-xs' : 'px-4 py-2.5 text-sm'
    }`}
    aria-label={`Buy ${product.name} now`}
  >
    <Zap className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    <span>Buy now</span>
  </button>
);

export default StorefrontProductCard;