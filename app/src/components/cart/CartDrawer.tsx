import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShieldCheck, ShoppingBag, Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { useCart } from '../../contexts/CartContext';
import type { CartItem } from '../../types';
import { formatPrice } from '../../utils/format';

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getProductId = (item: CartItem) => (typeof item.product === 'string' ? item.product : item.product._id);

const CartDrawer = ({ open, onOpenChange }: CartDrawerProps) => {
  const { items, totals, isLoading, updateQuantity, removeFromCart, refreshCart } = useCart();
  const navigate = useNavigate();
  const hasItems = items.length > 0;

  const goToCheckout = () => {
    onOpenChange(false);
    navigate('/checkout');
  };

  const continueShopping = () => {
    onOpenChange(false);
    navigate('/products');
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (nextOpen) {
          void refreshCart();
        }
      }}
    >
      <SheetContent className="w-full gap-0 p-0 sm:max-w-[440px]">
        <SheetHeader className="border-b px-5 py-5">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <ShoppingBag className="h-5 w-5 text-blue-600" />
            Cart
          </SheetTitle>
          <SheetDescription>
            {hasItems ? `${totals.itemCount} item${totals.itemCount === 1 ? '' : 's'} ready for checkout` : 'Your cart is empty'}
          </SheetDescription>
        </SheetHeader>

        {!hasItems ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-gray-950">Your cart is empty</h3>
            <p className="mt-2 max-w-xs text-sm leading-6 text-gray-500">
              Add a device to your cart and it will appear here with live backend pricing and stock checks.
            </p>
            <Button onClick={continueShopping} className="mt-6 bg-blue-600 text-white hover:bg-blue-700">
              Browse products
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 overflow-hidden">
              <div className="divide-y px-5">
                {items.map((item) => {
                  const productId = getProductId(item);
                  return (
                    <div key={item.variantId} className="flex gap-4 py-5">
                      <Link
                        to={`/products/${productId}`}
                        onClick={() => onOpenChange(false)}
                        className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border bg-gray-50"
                      >
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      </Link>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link
                              to={`/products/${productId}`}
                              onClick={() => onOpenChange(false)}
                              className="line-clamp-2 text-sm font-semibold leading-5 text-gray-950 hover:text-blue-600"
                            >
                              {item.name}
                            </Link>
                            <p className="mt-1 text-xs text-gray-500">
                              {[item.brand, item.specs].filter(Boolean).join(' / ')}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void removeFromCart(item.variantId)}
                            className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="flex h-9 items-center rounded-md border bg-white">
                            <button
                              type="button"
                              onClick={() => void updateQuantity(item.variantId, item.quantity - 1)}
                              disabled={isLoading}
                              className="flex h-9 w-9 items-center justify-center rounded-l-md text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                              aria-label={`Decrease quantity for ${item.name}`}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-9 text-center text-sm font-semibold">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => void updateQuantity(item.variantId, item.quantity + 1)}
                              disabled={isLoading}
                              className="flex h-9 w-9 items-center justify-center rounded-r-md text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                              aria-label={`Increase quantity for ${item.name}`}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-950">{formatPrice(item.price * item.quantity)}</p>
                            <p className="text-xs text-gray-500">{formatPrice(item.price)} each</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <SheetFooter className="border-t bg-white px-5 py-5">
              <div className="w-full space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium text-gray-950">{formatPrice(totals.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className="font-medium text-gray-950">
                      {totals.shipping === 0 ? 'Free' : formatPrice(totals.shipping)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Tax</span>
                    <span className="font-medium text-gray-950">{formatPrice(totals.tax)}</span>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-gray-950">Total</span>
                  <span className="text-xl font-bold text-blue-600">{formatPrice(totals.total)}</span>
                </div>
                <Button
                  onClick={goToCheckout}
                  disabled={isLoading}
                  className="h-11 w-full bg-blue-600 text-white hover:bg-blue-700"
                >
                  Checkout
                </Button>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Stock and totals are verified by the backend
                </div>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
