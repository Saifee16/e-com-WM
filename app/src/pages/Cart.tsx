import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CartDrawer from '../components/cart/CartDrawer';

const Cart = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      navigate('/products', { replace: true });
    }
  }, [isOpen, navigate]);

  return (
    <div className="min-h-[70dvh] bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium text-blue-600">Cart review</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-950">Your cart opens in the side panel</h1>
        <p className="mt-3 text-gray-600">
          Pricing, stock, shipping, and tax are refreshed from the backend before checkout.
        </p>
      </div>
      <CartDrawer open={isOpen} onOpenChange={setIsOpen} />
    </div>
  );
};

export default Cart;
