import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  DollarSign,
  LoaderCircle,
  MessageSquare,
  Package,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import type { AdminDashboardData } from '../../services/api';
import { getApiErrorMessage } from '../../utils/api-error';
import { formatDate, formatNumber, formatPrice } from '../../utils/format';

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

const AdminDashboard = () => {
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let isActive = true;

    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await adminAPI.getDashboardStats();

        if (isActive) {
          setDashboard(response.data.data);
        }
      } catch (loadError) {
        if (isActive) {
          setError(getApiErrorMessage(loadError, 'Unable to load dashboard data.'));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      isActive = false;
    };
  }, [reloadVersion]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <LoaderCircle className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Loading live dashboard data...</p>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-12 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Dashboard could not be loaded</h2>
        <p className="text-gray-500 mb-5">{error ?? 'Dashboard data is unavailable.'}</p>
        <button
          type="button"
          onClick={() => setReloadVersion((version) => version + 1)}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Revenue',
      value: formatPrice(dashboard.revenue),
      icon: DollarSign,
      color: 'bg-green-100 text-green-600',
    },
    {
      title: 'Total Orders',
      value: formatNumber(dashboard.orders),
      icon: ShoppingBag,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      title: 'Users',
      value: formatNumber(dashboard.users),
      icon: Users,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      title: 'Products',
      value: formatNumber(dashboard.products),
      icon: Package,
      color: 'bg-orange-100 text-orange-600',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
          <p className="text-gray-500">Live totals from the store database</p>
        </div>
        <div className="inline-flex items-center gap-2 text-sm text-gray-600">
          <MessageSquare className="w-4 h-4" />
          {dashboard.newContactMessages} new contact message
          {dashboard.newContactMessages === 1 ? '' : 's'}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="bg-white rounded-2xl p-6 border border-gray-200"
          >
            <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-gray-500">{stat.title}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Recent Orders</h3>
          </div>
          {dashboard.recentOrders.length === 0 ? (
            <p className="p-8 text-center text-gray-500">No orders have been placed yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Order</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Customer</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Total</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dashboard.recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{order.orderNumber}</p>
                        <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{order.customer}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{formatPrice(order.total)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Top Selling Products</h3>
          </div>
          {dashboard.topProducts.length === 0 ? (
            <p className="p-8 text-center text-gray-500">Sales data will appear after the first order.</p>
          ) : (
            <div className="p-6">
              <div className="space-y-4">
                {dashboard.topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center font-bold text-blue-600">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.sales} sold</p>
                    </div>
                    <p className="font-bold text-gray-900">{formatPrice(product.revenue)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
