import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ChevronDown,
  Eye,
  LoaderCircle,
  Search,
  X,
} from 'lucide-react';
import { ordersAPI } from '../../services/api';
import type { ApiOrder } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getApiErrorMessage } from '../../utils/api-error';
import { formatPrice, formatDate } from '../../utils/format';

type AdminOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

interface AdminOrderRow {
  _id: string;
  orderNumber: string;
  customer: string;
  email: string;
  total: number;
  status: AdminOrderStatus;
  date: string;
  items: number;
}

const statuses: AdminOrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];
const mutableStatuses: AdminOrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

const statusLabel = (status: AdminOrderStatus) => {
  if (status === 'delivered') return 'Completed';
  if (status === 'cancelled') return 'Incomplete / Cancelled';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const mapOrderToRow = (order: ApiOrder): AdminOrderRow => ({
  _id: order.id,
  orderNumber: order.orderNumber,
  customer: order.shippingAddress.fullName ?? 'Guest customer',
  email: order.shippingAddress.email ?? order.guestEmail ?? 'No email recorded',
  total: order.total,
  status: order.status as AdminOrderStatus,
  date: order.createdAt,
  items: order.items.reduce((total, item) => total + item.quantity, 0),
});

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

const AdminOrders = () => {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let isActive = true;

    const loadOrders = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await ordersAPI.getAllOrders();

        if (isActive) {
          setOrders(response.data.data.map(mapOrderToRow));
        }
      } catch (loadError) {
        if (isActive) {
          setError(getApiErrorMessage(loadError, 'Unable to load orders.'));
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
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const matchesSearch =
      normalizedSearch.length === 0 ||
      order.orderNumber.toLowerCase().includes(normalizedSearch) ||
      order.customer.toLowerCase().includes(normalizedSearch) ||
      order.email.toLowerCase().includes(normalizedSearch);
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const updateOrderStatus = async (orderId: string, newStatus: AdminOrderStatus) => {
    const currentOrder = orders.find((order) => order._id === orderId);
    if (!currentOrder || currentOrder.status === newStatus) return;

    try {
      setUpdatingOrderId(orderId);
      const response = await ordersAPI.updateOrderStatus(orderId, newStatus.toUpperCase());
      const updatedOrder = mapOrderToRow(response.data.data);
      setOrders((current) => current.map((order) => (order._id === orderId ? updatedOrder : order)));
      setSelectedOrder((current) => (current?._id === orderId ? updatedOrder : current));
      showToast(`Order ${updatedOrder.orderNumber} marked as ${newStatus}`, 'success');
    } catch (updateError) {
      showToast(getApiErrorMessage(updateError, 'Order status could not be updated.'), 'error');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
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
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <LoaderCircle className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading orders...</p>
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-500">
            {orders.length === 0 ? 'No orders have been placed yet.' : 'Try adjusting the filters.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Order</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Customer</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Items</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Total</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Date</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{order.orderNumber}</td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{order.customer}</p>
                    <p className="text-sm text-gray-500">{order.email}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{order.items}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{formatPrice(order.total)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                      {statusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{formatDate(order.date)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        aria-label={`View ${order.orderNumber}`}
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <div className="relative group">
                        <button
                          type="button"
                          disabled={updatingOrderId === order._id}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                          aria-label={`Update ${order.orderNumber} status`}
                        >
                          {updatingOrderId === order._id ? (
                            <LoaderCircle className="w-5 h-5 animate-spin" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                        <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                          {mutableStatuses.map((status) => (
                            <button
                              type="button"
                              key={status}
                              disabled={status === order.status || updatingOrderId === order._id}
                              onClick={() => void updateOrderStatus(order._id, status)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl capitalize disabled:opacity-40"
                            >
                              Mark as {statusLabel(status)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
};

const OrderDetailModal = ({ order, onClose }: { order: AdminOrderRow; onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white rounded-3xl shadow-xl w-full max-w-lg"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">Order Details</h3>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
          aria-label="Close order details"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Order Number</p>
            <p className="font-bold text-gray-900">{order.orderNumber}</p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium capitalize ${getStatusColor(order.status)}`}>
            {order.status}
          </span>
        </div>

        <div>
          <p className="text-sm text-gray-500 mb-2">Customer</p>
          <p className="font-medium text-gray-900">{order.customer}</p>
          <p className="text-gray-600">{order.email}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Items</p>
            <p className="font-medium text-gray-900">{order.items}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Total</p>
            <p className="font-medium text-gray-900">{formatPrice(order.total)}</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-500 mb-1">Order Date</p>
          <p className="font-medium text-gray-900">{formatDate(order.date)}</p>
        </div>
      </div>

      <div className="p-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          Close
        </button>
      </div>
    </motion.div>
  </motion.div>
);

export default AdminOrders;
