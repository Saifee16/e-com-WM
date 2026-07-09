import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  ShoppingBag,
  DollarSign,
  Package,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { formatPrice, formatNumber } from '../../utils/format';

const AdminDashboard = () => {
  const [stats] = useState({
    totalRevenue: 12500000,
    totalOrders: 156,
    totalCustomers: 89,
    totalProducts: 50,
  });

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  useEffect(() => {
    // Mock recent orders
    setRecentOrders([
      { _id: '1', orderNumber: 'WAH-001', customer: 'John Doe', total: 599999, status: 'delivered', date: '2025-02-22' },
      { _id: '2', orderNumber: 'WAH-002', customer: 'Jane Smith', total: 349999, status: 'processing', date: '2025-02-22' },
      { _id: '3', orderNumber: 'WAH-003', customer: 'Ali Khan', total: 579999, status: 'shipped', date: '2025-02-21' },
      { _id: '4', orderNumber: 'WAH-004', customer: 'Sarah Ahmed', total: 499999, status: 'pending', date: '2025-02-21' },
      { _id: '5', orderNumber: 'WAH-005', customer: 'Mike Johnson', total: 299999, status: 'delivered', date: '2025-02-20' },
    ]);

    // Mock top products
    setTopProducts([
      { name: 'iPhone 16 Pro Max', sales: 45, revenue: 26999955 },
      { name: 'Samsung Galaxy S24 Ultra', sales: 38, revenue: 22039962 },
      { name: 'Google Pixel 9 Pro XL', sales: 32, revenue: 11199968 },
      { name: 'OnePlus 12', sales: 28, revenue: 8399972 },
    ]);
  }, []);

  const statCards = [
    { title: 'Total Revenue', value: stats.totalRevenue, icon: DollarSign, change: '+12%', up: true, color: 'bg-green-100 text-green-600' },
    { title: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag, change: '+8%', up: true, color: 'bg-blue-100 text-blue-600' },
    { title: 'Customers', value: stats.totalCustomers, icon: Users, change: '+15%', up: true, color: 'bg-purple-100 text-purple-600' },
    { title: 'Products', value: stats.totalProducts, icon: Package, change: '+3%', up: true, color: 'bg-orange-100 text-orange-600' },
  ];

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
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-500">Welcome back to your admin panel</p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl p-6 border border-gray-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className={`flex items-center gap-1 text-sm ${stat.up ? 'text-green-600' : 'text-red-600'}`}>
                {stat.up ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                {stat.change}
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {stat.title === 'Total Revenue' ? formatPrice(stat.value) : formatNumber(stat.value)}
            </p>
            <p className="text-gray-500">{stat.title}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Recent Orders</h3>
          </div>
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
                {recentOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{order.orderNumber}</td>
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
        </motion.div>

        {/* Top Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Top Selling Products</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center font-bold text-blue-600">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.sales} sales</p>
                  </div>
                  <p className="font-bold text-gray-900">{formatPrice(product.revenue)}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
