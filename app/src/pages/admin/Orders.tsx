import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Eye,
  X,
  ChevronDown,
} from 'lucide-react';
import { formatPrice, formatDate } from '../../utils/format';

type AdminOrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

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

const AdminOrders = () => {
  const [orders, setOrders] = useState<AdminOrderRow[]>([
    { _id: '1', orderNumber: 'WAH-001', customer: 'John Doe', email: 'john@example.com', total: 599999, status: 'delivered', date: '2025-02-22', items: 1 },
    { _id: '2', orderNumber: 'WAH-002', customer: 'Jane Smith', email: 'jane@example.com', total: 349999, status: 'processing', date: '2025-02-22', items: 1 },
    { _id: '3', orderNumber: 'WAH-003', customer: 'Ali Khan', email: 'ali@example.com', total: 579999, status: 'shipped', date: '2025-02-21', items: 2 },
    { _id: '4', orderNumber: 'WAH-004', customer: 'Sarah Ahmed', email: 'sarah@example.com', total: 499999, status: 'pending', date: '2025-02-21', items: 1 },
    { _id: '5', orderNumber: 'WAH-005', customer: 'Mike Johnson', email: 'mike@example.com', total: 299999, status: 'delivered', date: '2025-02-20', items: 1 },
    { _id: '6', orderNumber: 'WAH-006', customer: 'Emma Wilson', email: 'emma@example.com', total: 699999, status: 'processing', date: '2025-02-20', items: 1 },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderRow | null>(null);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

  const updateOrderStatus = (orderId: string, newStatus: AdminOrderStatus) => {
    setOrders(orders.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o)));
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orders..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
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
                  <div>
                    <p className="font-medium text-gray-900">{order.customer}</p>
                    <p className="text-sm text-gray-500">{order.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">{order.items}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{formatPrice(order.total)}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">{formatDate(order.date)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <div className="relative group">
                      <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <ChevronDown className="w-5 h-5" />
                      </button>
                      <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        {(['pending', 'processing', 'shipped', 'delivered', 'cancelled'] satisfies AdminOrderStatus[]).map((status) => (
                          <button
                            key={status}
                            onClick={() => updateOrderStatus(order._id, status)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl capitalize"
                          >
                            Mark as {status}
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

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
};

const OrderDetailModal = ({ order, onClose }: { order: AdminOrderRow; onClose: () => void }) => {
  return (
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
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Order Details</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
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
            <span className={`px-4 py-2 rounded-full text-sm font-medium capitalize ${
              order.status === 'delivered' ? 'bg-green-100 text-green-600' :
              order.status === 'processing' ? 'bg-blue-100 text-blue-600' :
              order.status === 'shipped' ? 'bg-purple-100 text-purple-600' :
              'bg-yellow-100 text-yellow-600'
            }`}>
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
            onClick={onClose}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AdminOrders;
