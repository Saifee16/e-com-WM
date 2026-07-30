import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Truck,
  MapPin,
  CreditCard,
  Check,
  Clock,
  X,
} from 'lucide-react';
import { products } from '../../data/products';
import { formatPrice, formatDateTime } from '../../utils/format';

interface MockOrderItem {
  product: string | { _id: string };
  name: string;
  image: string;
  price: number;
  quantity: number;
  brand?: string;
  specs?: string;
}

interface MockStatusHistoryItem {
  status: string;
  note: string;
  timestamp: string;
}

interface MockOrderDetail {
  _id: string;
  orderNumber: string;
  status: string;
  statusHistory: MockStatusHistoryItem[];
  items: MockOrderItem[];
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contactInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  paymentMethod: string;
  shippingMethod: string;
  shippingCost: number;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  trackingNumber: string;
  createdAt: string;
}

const getMockOrder = (id = 'mock-order'): MockOrderDetail => ({
  _id: id,
  orderNumber: 'WAH-ABC123',
  status: 'delivered',
  statusHistory: [
    { status: 'pending', timestamp: '2025-02-15T10:30:00', note: 'Order placed' },
    { status: 'processing', timestamp: '2025-02-15T11:00:00', note: 'Payment confirmed' },
    { status: 'shipped', timestamp: '2025-02-16T09:00:00', note: 'Order shipped' },
    { status: 'delivered', timestamp: '2025-02-18T14:30:00', note: 'Order delivered' },
  ],
  items: [
    {
      product: products[0],
      name: products[0].name,
      image: products[0].images[0],
      price: 599999,
      quantity: 1,
      brand: products[0].brand,
      specs: `${products[0].specifications.storage}, ${products[0].specifications.color}`,
    },
  ],
  shippingAddress: {
    street: '123 Main Street',
    city: 'Lahore',
    state: 'Punjab',
    zipCode: '54000',
    country: 'Pakistan',
  },
  contactInfo: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+92 300 1234567',
  },
  paymentMethod: 'card',
  shippingMethod: 'standard',
  shippingCost: 500,
  subtotal: 599999,
  tax: 11999,
  discount: 0,
  total: 612498,
  trackingNumber: 'TRK123456789',
  createdAt: '2025-02-15T10:30:00',
});

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const order = getMockOrder(id);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return Check;
      case 'cancelled':
        return X;
      default:
        return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-600';
      case 'processing':
        return 'bg-blue-100 text-blue-600';
      case 'shipped':
        return 'bg-purple-100 text-purple-600';
      case 'pending':
        return 'bg-yellow-100 text-yellow-600';
      case 'cancelled':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div>
      {/* Back Link */}
      <Link
        to="/account/orders"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ChevronLeft className="w-5 h-5" />
        Back to Orders
      </Link>

      {/* Order Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
            </div>
            <p className="text-gray-500">
              Placed on {formatDateTime(order.createdAt)}
            </p>
          </div>
          {order.trackingNumber && (
            <div className="text-right">
              <p className="text-sm text-gray-500">Tracking Number</p>
              <p className="font-medium text-gray-900">{order.trackingNumber}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-200 p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-6">Order Timeline</h3>
            <div className="relative">
              {order.statusHistory.map((status, index) => {
                const Icon = getStatusIcon(status.status);
                const isLast = index === order.statusHistory.length - 1;
                return (
                  <div key={index} className="flex gap-4 pb-8 last:pb-0">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isLast ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {!isLast && <div className="w-0.5 flex-1 bg-gray-200 mt-2" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-medium text-gray-900 capitalize">{status.status}</p>
                      <p className="text-sm text-gray-500">{status.note}</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {formatDateTime(status.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Order Items */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-gray-200 p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-6">Order Items</h3>
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-24 h-24 bg-white rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <Link
                      to={`/products/${typeof item.product === 'string' ? item.product : item.product._id}`}
                      className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {item.name}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1">{item.brand}</p>
                    <p className="text-sm text-gray-500">{item.specs}</p>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      <p className="font-bold text-gray-900">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Shipping Address */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-gray-200 p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Shipping Address</h3>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">
                  {order.contactInfo.firstName} {order.contactInfo.lastName}
                </p>
                <p className="text-gray-600">{order.shippingAddress.street}</p>
                <p className="text-gray-600">
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                </p>
                <p className="text-gray-600">{order.shippingAddress.country}</p>
                <p className="text-gray-600 mt-2">{order.contactInfo.phone}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl border border-gray-200 p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>{formatPrice(order.shippingCost)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>{formatPrice(order.tax)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                <span className="font-bold text-gray-900">Total</span>
                <span className="text-xl font-bold text-blue-600">{formatPrice(order.total)}</span>
              </div>
            </div>
          </motion.div>

          {/* Payment Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl border border-gray-200 p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Payment Information</h3>
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900 capitalize">
                  {order.paymentMethod === 'card' ? 'Credit/Debit Card' : order.paymentMethod}
                </p>
                <p className="text-sm text-gray-500">Payment completed</p>
              </div>
            </div>
          </motion.div>

          {/* Shipping Method */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl border border-gray-200 p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Shipping Method</h3>
            <div className="flex items-center gap-3">
              <Truck className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900 capitalize">
                  {order.shippingMethod} Shipping
                </p>
                <p className="text-sm text-gray-500">
                  {order.shippingMethod === 'standard' && '3-5 business days'}
                  {order.shippingMethod === 'express' && '1-2 business days'}
                  {order.shippingMethod === 'pickup' && 'Same day pickup'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Actions */}
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-2xl border border-gray-200 p-6"
            >
              <button className="w-full py-3 border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors">
                Cancel Order
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
