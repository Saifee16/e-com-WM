import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ShoppingBag, Heart, MapPin, User, Package, Clock, ChevronRight, Star, LoaderCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ordersAPI, wishlistAPI } from '../../services/api';
import type { AccountDashboardData } from '../../services/api';
import type { Product } from '../../types';
import { formatPrice } from '../../utils/format';
import { getProductPath } from '../../utils/product-url';
import { getApiErrorMessage } from '../../utils/api-error';

const getStatusColor = (status: string) => {
  if (status === 'delivered') return 'bg-green-100 text-green-600';
  if (status === 'processing' || status === 'confirmed') return 'bg-blue-100 text-blue-600';
  if (status === 'shipped') return 'bg-purple-100 text-purple-600';
  if (status === 'cancelled' || status === 'refunded') return 'bg-red-100 text-red-600';
  return 'bg-yellow-100 text-yellow-700';
};

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<AccountDashboardData | null>(null);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let active = true;
    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [dashboardResponse, wishlistResponse] = await Promise.all([
          ordersAPI.getAccountDashboard(),
          wishlistAPI.get(),
        ]);
        if (active) {
          setDashboard(dashboardResponse.data.data);
          setWishlist(wishlistResponse.data.data.slice(0, 3));
        }
      } catch (loadError) {
        if (active) setError(getApiErrorMessage(loadError, 'Unable to load your account activity.'));
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void loadDashboard();
    return () => { active = false; };
  }, [reloadVersion]);

  if (isLoading) return <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center"><LoaderCircle className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" /><p className="text-gray-500">Loading your account activity…</p></div>;
  if (error || !dashboard) return <div className="bg-white rounded-2xl border border-red-200 p-12 text-center"><AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" /><p className="text-gray-600 mb-4">{error ?? 'Your dashboard is unavailable.'}</p><button type="button" onClick={() => setReloadVersion((value) => value + 1)} className="px-4 py-2 bg-blue-600 text-white rounded-xl">Try again</button></div>;

  const stats = [
    { icon: ShoppingBag, label: 'Total Orders', value: dashboard.stats.totalOrders, color: 'bg-blue-100 text-blue-600' },
    { icon: Heart, label: 'Wishlist Items', value: dashboard.stats.wishlistItems, color: 'bg-pink-100 text-pink-600' },
    { icon: Star, label: 'Reviews', value: dashboard.stats.reviews, color: 'bg-yellow-100 text-yellow-600' },
    { icon: Package, label: 'Completed', value: dashboard.stats.deliveredOrders, color: 'bg-green-100 text-green-600' },
  ];

  return <div className="space-y-8">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white"><h2 className="text-2xl font-bold mb-2">Welcome back, {user?.firstName}!</h2><p className="text-blue-100">Your live orders, wishlist, and reviews are shown below.</p></motion.div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{stats.map((stat, index) => <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }} className="bg-white rounded-xl p-6 border border-gray-200"><div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center mb-4`}><stat.icon className="w-6 h-6" /></div><p className="text-2xl font-bold text-gray-900">{stat.value}</p><p className="text-gray-500">{stat.label}</p></motion.div>)}</div>
    <div className="grid lg:grid-cols-2 gap-8">
      <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden"><div className="p-6 border-b flex items-center justify-between"><h3 className="text-lg font-bold">Recent Orders</h3><Link to="/account/orders" className="text-blue-600 text-sm font-medium flex items-center gap-1">View All <ChevronRight className="w-4 h-4" /></Link></div>{dashboard.recentOrders.length === 0 ? <p className="p-8 text-center text-gray-500">No orders yet.</p> : <div className="divide-y divide-gray-100">{dashboard.recentOrders.map((order) => <div key={order.id} className="p-4 flex items-center gap-4"><div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">{order.items[0]?.image ? <img src={order.items[0].image} alt={order.items[0].name} className="w-full h-full object-cover" /> : <Package className="m-4 w-6 h-6 text-gray-400" />}</div><div className="flex-1 min-w-0"><p className="font-medium text-gray-900">{order.orderNumber}</p><p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p></div><div className="text-right"><span className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>{order.status}</span><p className="font-medium text-gray-900 mt-1">{formatPrice(order.total)}</p></div></div>)}</div>}</section>
      <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden"><div className="p-6 border-b flex items-center justify-between"><h3 className="text-lg font-bold">Wishlist</h3><Link to="/account/wishlist" className="text-blue-600 text-sm font-medium flex items-center gap-1">View All <ChevronRight className="w-4 h-4" /></Link></div>{wishlist.length === 0 ? <p className="p-8 text-center text-gray-500">Your wishlist is empty.</p> : <div className="divide-y divide-gray-100">{wishlist.map((item) => <Link key={item._id} to={getProductPath(item)} className="p-4 flex items-center gap-4 hover:bg-gray-50"><img src={item.images[0]} alt={item.name} className="w-14 h-14 bg-gray-100 rounded-lg object-cover" /><div className="flex-1 min-w-0"><p className="font-medium text-gray-900 line-clamp-1">{item.name}</p><p className="text-sm text-gray-500">{item.brand}</p></div><p className="font-medium text-blue-600">{formatPrice(item.price)}</p></Link>)}</div>}</section>
    </div>
    <section><h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{[{ icon: ShoppingBag, label: 'Browse Products', link: '/products', color: 'bg-blue-100 text-blue-600' }, { icon: MapPin, label: 'Manage Addresses', link: '/account/addresses', color: 'bg-green-100 text-green-600' }, { icon: User, label: 'Edit Profile', link: '/account/settings', color: 'bg-purple-100 text-purple-600' }, { icon: Clock, label: 'Order History', link: '/account/orders', color: 'bg-orange-100 text-orange-600' }].map((action) => <Link key={action.label} to={action.link} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md"><div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center`}><action.icon className="w-6 h-6" /></div><span className="font-medium text-gray-900">{action.label}</span></Link>)}</div></section>
  </div>;
};

export default Dashboard;
