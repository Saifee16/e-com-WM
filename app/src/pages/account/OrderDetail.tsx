import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Check,
  ChevronLeft,
  Clock,
  CreditCard,
  LoaderCircle,
  MapPin,
  Package,
  RefreshCcw,
  Truck,
  X,
} from 'lucide-react';
import { ordersAPI } from '../../services/api';
import type { ApiOrder } from '../../services/api';
import { getApiErrorMessage } from '../../utils/api-error';
import { formatPrice, formatDateTime } from '../../utils/format';

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

const getStatusIcon = (status: string) => {
  if (status === 'delivered') return Check;
  if (status === 'shipped') return Truck;
  if (status === 'cancelled' || status === 'refunded') return X;
  return Clock;
};

const formatStatus = (status: string) =>
  status
    .split('_')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [cancelReason, setCancelReason] = useState('Changed my mind');
  const [returnReason, setReturnReason] = useState('Item is not suitable');
  const [returnDetails, setReturnDetails] = useState('');
  const [actionError, setActionError] = useState('');
  const [isActing, setIsActing] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadOrder = async () => {
      if (!id) {
        setError('No order was selected.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const response = await ordersAPI.getOrderById(id);

        if (isActive) {
          setOrder(response.data.data);
        }
      } catch (loadError) {
        if (isActive) {
          setOrder(null);
          setError(getApiErrorMessage(loadError, 'Unable to load this order.'));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadOrder();

    return () => {
      isActive = false;
    };
  }, [id, reloadVersion]);

  const cancelOrder = async () => {
    if (!id) return;
    setIsActing(true);
    setActionError('');
    try {
      await ordersAPI.cancelOrder(id, cancelReason);
      setReloadVersion((version) => version + 1);
    } catch (cancelError) {
      setActionError(getApiErrorMessage(cancelError, 'Unable to cancel order'));
    } finally {
      setIsActing(false);
    }
  };

  const requestReturn = async () => {
    if (!id) return;
    setIsActing(true);
    setActionError('');
    try {
      await ordersAPI.requestReturn(id, { reason: returnReason, ...(returnDetails ? { details: returnDetails } : {}) });
      setReloadVersion((version) => version + 1);
    } catch (returnError) {
      setActionError(getApiErrorMessage(returnError, 'Unable to request return'));
    } finally {
      setIsActing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <LoaderCircle className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Loading order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div>
        <Link
          to="/account/orders"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Orders
        </Link>
        <div className="bg-white rounded-2xl border border-red-200 p-12 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Order could not be loaded</h2>
          <p className="text-gray-500 mb-5">{error ?? 'Order not found.'}</p>
          <button
            type="button"
            onClick={() => setReloadVersion((version) => version + 1)}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const StatusIcon = getStatusIcon(order.status);
  const shippingAddress = order.shippingAddress;
  const shippingMethod = shippingAddress.shippingMethod;

  return (
    <div>
      <Link
        to="/account/orders"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ChevronLeft className="w-5 h-5" />
        Back to Orders
      </Link>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {formatStatus(order.status)}
              </span>
            </div>
            <p className="text-gray-500">
              Placed on {formatDateTime(order.createdAt)}
            </p>
          </div>
          {order.trackingNumber && (
            <div className="sm:text-right">
              <p className="text-sm text-gray-500">Tracking Number</p>
              <p className="font-medium text-gray-900">{order.trackingNumber}</p>
            </div>
          )}
        </div>
      </div>

      {actionError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{actionError}</p>}
      {['pending', 'confirmed'].includes(order.status) && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="font-semibold text-gray-900">Cancel order</h3>
          <p className="mt-1 text-sm text-gray-600">Cancellation is available until processing begins.</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input aria-label="Cancellation reason" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} className="flex-1 rounded-xl border border-amber-200 bg-white px-4 py-2.5" />
            <button disabled={isActing || cancelReason.trim().length < 3} onClick={cancelOrder} className="rounded-xl bg-red-600 px-5 py-2.5 font-medium text-white disabled:opacity-50">Cancel order</button>
          </div>
        </div>
      )}
      {order.status === 'delivered' && !order.returnRequest && (
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <h3 className="flex items-center gap-2 font-semibold text-gray-900"><RefreshCcw className="h-5 w-5" /> Request a return</h3>
          <p className="mt-1 text-sm text-gray-600">Eligible orders can be requested within seven days of delivery.</p>
          <input aria-label="Return reason" value={returnReason} onChange={(event) => setReturnReason(event.target.value)} className="mt-3 w-full rounded-xl border border-blue-200 bg-white px-4 py-2.5" />
          <textarea aria-label="Return details" value={returnDetails} onChange={(event) => setReturnDetails(event.target.value)} placeholder="Additional details (optional)" className="mt-3 min-h-24 w-full rounded-xl border border-blue-200 bg-white px-4 py-2.5" />
          <button disabled={isActing || returnReason.trim().length < 3} onClick={requestReturn} className="mt-3 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white disabled:opacity-50">Submit return request</button>
        </div>
      )}
      {order.returnRequest && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-gray-900">Return request: {formatStatus(order.returnRequest.status)}</h3>
          <p className="mt-2 text-gray-600">{order.returnRequest.reason}</p>
          {order.returnRequest.resolutionNote && <p className="mt-2 text-sm text-gray-500">Admin note: {order.returnRequest.resolutionNote}</p>}
          {order.returnRequest.refundConfirmedAt && <p className="mt-2 text-sm font-medium text-green-700">Manual refund confirmed {formatDateTime(order.returnRequest.refundConfirmedAt)}</p>}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-200 p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Current Status</h3>
            <div className="flex items-start gap-4">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center ${getStatusColor(order.status)}`}>
                <StatusIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{formatStatus(order.status)}</p>
                <p className="text-sm text-gray-500">
                  This is the latest status stored for your order.
                </p>
                {order.notes && <p className="text-sm text-gray-600 mt-2">{order.notes}</p>}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-gray-200 p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-6">Order Items</h3>
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={`${item.product}-${index}`} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-24 h-24 bg-white rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-9 h-9 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Link
                      to={`/products/${item.product}`}
                      className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {item.name}
                    </Link>
                    {item.specs && <p className="text-sm text-gray-500 mt-1">{item.specs}</p>}
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      <p className="font-bold text-gray-900">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

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
                {shippingAddress.fullName && (
                  <p className="font-medium text-gray-900">{shippingAddress.fullName}</p>
                )}
                {shippingAddress.line1 && <p className="text-gray-600">{shippingAddress.line1}</p>}
                {(shippingAddress.city || shippingAddress.state || shippingAddress.postalCode) && (
                  <p className="text-gray-600">
                    {[shippingAddress.city, shippingAddress.state, shippingAddress.postalCode]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
                {shippingAddress.country && <p className="text-gray-600">{shippingAddress.country}</p>}
                {shippingAddress.phone && <p className="text-gray-600 mt-2">{shippingAddress.phone}</p>}
                {shippingAddress.email && <p className="text-gray-600">{shippingAddress.email}</p>}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="space-y-6">
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl border border-gray-200 p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Payment Status</h3>
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-gray-400" />
              <p className="font-medium text-gray-900">{formatStatus(order.paymentStatus)}</p>
            </div>
          </motion.div>

          {shippingMethod && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl border border-gray-200 p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Shipping Method</h3>
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-gray-400" />
                <p className="font-medium text-gray-900">{formatStatus(shippingMethod)}</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
