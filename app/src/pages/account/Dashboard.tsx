import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShoppingBag,
  Heart,
  MapPin,
  User,
  Package,
  Clock,
  ChevronRight,
  Star,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { products } from '../../data/products';
import type { Product } from '../../types';
import { formatPrice } from '../../utils/format';

interface RecentOrder {
  _id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items: Array<{
    name: string;
    image: string;
  }>;
}

const recentOrders: RecentOrder[] = [
  {
    _id: '1',
    orderNumber: 'WAH-ABC123',
    status: 'delivered',
    total: 599999,
    createdAt: '2025-02-15',
    items: [{ name: 'iPhone 16 Pro Max', image: products[0].images[0] }],
  },
  {
    _id: '2',
    orderNumber: 'WAH-DEF456',
    status: 'processing',
    total: 349999,
    createdAt: '2025-02-18',
    items: [{ name: 'Google Pixel 9 Pro XL', image: products[4].images[0] }],
  },
];

const wishlistItems: Product[] = products.slice(0, 3);

const Dashboard = () => {
  const { user } = useAuth();

  const stats = [
    { icon: ShoppingBag, label: 'Total Orders', value: '12', color: 'bg-blue-100 text-blue-600' },
    { icon: Heart, label: 'Wishlist Items', value: wishlistItems.length.toString(), color: 'bg-pink-100 text-pink-600' },
    { icon: Star, label: 'Reviews', value: '5', color: 'bg-yellow-100 text-yellow-600' },
    { icon: Package, label: 'Delivered', value: '10', color: 'bg-green-100 text-green-600' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-600';
      case 'processing':
        return 'bg-blue-100 text-blue-600';
      case 'shipped':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white"
      >
        <h2 className="text-2xl font-bold mb-2">
          Welcome back, {user?.firstName}!
        </h2>
        <p className="text-blue-100">
          Here's what's happening with your account today.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl p-6 border border-gray-200"
          >
            <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-gray-500">{stat.label}</p>
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
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Recent Orders</h3>
            <Link
              to="/account/orders"
              className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center gap-1"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentOrders.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No orders yet
              </div>
            ) : (
              recentOrders.map((order) => (
                <div key={order._id} className="p-4 flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={order.items[0].image}
                      alt={order.items[0].name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{order.orderNumber}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                    <p className="font-medium text-gray-900 mt-1">
                      {formatPrice(order.total)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Wishlist Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Wishlist</h3>
            <Link
              to="/account/wishlist"
              className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center gap-1"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {wishlistItems.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                Your wishlist is empty
              </div>
            ) : (
              wishlistItems.map((item) => (
                <Link
                  key={item._id}
                  to={`/products/${item._id}`}
                  className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={item.images[0]}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 line-clamp-1">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.brand}</p>
                  </div>
                  <p className="font-medium text-blue-600">
                    {formatPrice(item.price)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: ShoppingBag, label: 'Browse Products', link: '/products', color: 'bg-blue-100 text-blue-600' },
            { icon: MapPin, label: 'Manage Addresses', link: '/account/addresses', color: 'bg-green-100 text-green-600' },
            { icon: User, label: 'Edit Profile', link: '/account/settings', color: 'bg-purple-100 text-purple-600' },
            { icon: Clock, label: 'Order History', link: '/account/orders', color: 'bg-orange-100 text-orange-600' },
          ].map((action) => (
            <Link
              key={action.label}
              to={action.link}
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center`}>
                <action.icon className="w-6 h-6" />
              </div>
              <span className="font-medium text-gray-900">{action.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
