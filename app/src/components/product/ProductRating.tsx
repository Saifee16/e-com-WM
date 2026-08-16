import { Star } from 'lucide-react';
import type { Product } from '../../types';

interface ProductRatingProps {
  product: Pick<Product, 'rating' | 'numReviews'>;
  className?: string;
  compact?: boolean;
}

const ProductRating = ({ product, className = '', compact = false }: ProductRatingProps) => {
  if (!product.numReviews || product.rating === null) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 text-sm text-slate-600 ${className}`}>
      <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
      <span className="font-medium">{product.rating}</span>
      <span>
        {compact ? `(${product.numReviews})` : `(${product.numReviews} ${product.numReviews === 1 ? 'review' : 'reviews'})`}
      </span>
    </div>
  );
};

export default ProductRating;
