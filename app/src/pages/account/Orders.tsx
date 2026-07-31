import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ChevronRight,
  LoaderCircle,
  Package,
  Search,
} from 'lucide-react';
import { ordersAPI } from '../../services/api';
import type { ApiOrder } from '../../services/api';
import { getApiErrorMessage } from '../../utils/api-error';
import { formatPrice, formatDate } from '../../utils/format';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'delivered':
      return 'bg-green-100 text-green-600';
    case 'confirmed':
    case 'processing':
      return 'bg-blue-100 text-blue-600';
    case 'shipped':
      return 'bg-purple-100 text-purple-600';
    case 'pending':
      return 'bg-yellow-100 text-yellow-600';
    case 'cancelled':
    case 'refunded':
      return 'bg-red-100 text-red-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

const getStatusLabel = (status: string) =>
  status
    .split('_')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');

const Orders = () => {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let isActive = true;

    const loadOrders = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await ordersAPI.getMyOrders();

        if (isActive) {
          setOrders(response.data.data);
        }
      } catch (loadError) {
        if (isActive) {
          setError(getApiErrorMessage(loadError, 'Unable to load your orders.'));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadOrders();

    return () => {
      isActive = false;
    };
  }, [reloadVersion]);

  const filteredOrders = orders.filter((order) => {
    const matchesFilter = filter === 'all' || order.status === filter;
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const matchesSearch =
      normalizedSearch.length === 0 ||
      order.orderNumber.toLowerCase().includes(normalizedSearch) ||
      order.items.some((item) => item.name.toLowerCase().includes(normalizedSearch));
    return matchesFilter && matchesSearch;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Orders</h2>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search orders..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <LoaderCircle className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading your orders...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-red-200 p-12 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Orders could not be loaded</h3>
          <p className="text-gray-500 mb-5">{error}</p>
          <button
            type="button"
            onClick={() => setReloadVersion((version) => version + 1)}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
          >
            Try again
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-500">
            {orders.length === 0
              ? 'You have no orders yet'
              : 'Try adjusting your search or status filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
            >
              <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Order Number</p>
                      <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                    </div>
                    <div className="hidden sm:block w-px h-10 bg-gray-200" />
                    <div>
                      <p className="text-sm text-gray-500">Order Date</p>
                      <p className="font-medium text-gray-900">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="hidden sm:block w-px h-10 bg-gray-200" />
                    <div>
                      <p className="text-sm text-gray-500">Total</p>
                      <p className="font-medium text-gray-900">{formatPrice(order.total)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                    <Link
                      to={`/account/orders/${order.id}`}
                      className="flex items-center gap-1 text-blue-600 font-medium hover:text-blue-700"
                    >
                      Details
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                {order.items.map((item, itemIndex) => (
                  <div key={`${item.product}-${itemIndex}`} className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 line-clamp-1">{item.name}</p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium text-gray-900">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
