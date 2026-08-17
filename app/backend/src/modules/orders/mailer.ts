import { env } from '../../config/env.js';
import { z } from 'zod';

const resendEmailsUrl = 'https://api.resend.com/emails';
const recipientSchema = z.string().email();

type OrderEmailItem = {
  name: string;
  variant: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export interface OrderEmailDetails {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  items: OrderEmailItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  shippingMethod: string;
  shippingAddress: string;
  trackingNumber?: string;
  cancellationReason?: string;
}

type CustomerOrderStatus = 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[character]!);

const formatAmount = (amount: number) => `PKR ${amount.toLocaleString('en-PK')}`;

const formatShippingMethod = (method: string) => method.charAt(0).toUpperCase() + method.slice(1);

const orderLines = (order: OrderEmailDetails) => order.items.map((item) => {
  const variant = item.variant ? ` (${item.variant})` : '';
  const sku = item.sku ? ` [${item.sku}]` : '';
  return `${item.quantity} x ${item.name}${variant}${sku} at ${formatAmount(item.unitPrice)} = ${formatAmount(item.lineTotal)}`;
});

const orderTotals = (order: OrderEmailDetails) => [
  `Subtotal: ${formatAmount(order.subtotal)}`,
  ...(order.discount > 0 ? [`Discount: -${formatAmount(order.discount)}`] : []),
  `Shipping: ${formatAmount(order.shipping)}`,
  `Tax: ${formatAmount(order.tax)}`,
  `Total: ${formatAmount(order.total)}`,
];

const orderSummaryText = (order: OrderEmailDetails) => [
  `Order number: ${order.orderNumber}`,
  '',
  'Items:',
  ...orderLines(order),
  '',
  ...orderTotals(order),
  '',
  `Shipping method: ${formatShippingMethod(order.shippingMethod)}`,
  `Shipping address: ${order.shippingAddress}`,
  'Payment: Cash on delivery (COD)',
].join('\n');

const orderSummaryHtml = (order: OrderEmailDetails) => {
  const items = order.items.map((item) => `
    <li>${escapeHtml(`${item.quantity} x ${item.name}${item.variant ? ` (${item.variant})` : ''}${item.sku ? ` [${item.sku}]` : ''}`)}: ${escapeHtml(formatAmount(item.lineTotal))}</li>
  `).join('');
  const totals = orderTotals(order).map((line) => `<li>${escapeHtml(line)}</li>`).join('');

  return `
    <p><strong>Order number:</strong> ${escapeHtml(order.orderNumber)}</p>
    <p><strong>Items</strong></p>
    <ul>${items}</ul>
    <p><strong>Totals</strong></p>
    <ul>${totals}</ul>
    <p><strong>Shipping method:</strong> ${escapeHtml(formatShippingMethod(order.shippingMethod))}<br>
    <strong>Shipping address:</strong> ${escapeHtml(order.shippingAddress)}<br>
    <strong>Payment:</strong> Cash on delivery (COD)</p>
  `.trim();
};

const sendEmail = async ({
  to,
  subject,
  text,
  html,
  idempotencyKey,
  replyTo,
}: {
  to: string[];
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
  replyTo?: string;
}) => {
  if (!env.RESEND_API_KEY || !env.SUPPORT_EMAIL) {
    throw new Error('Order notification email is not configured');
  }

  const recipients = to.map((recipient) => recipientSchema.parse(recipient));
  const validatedReplyTo = replyTo ? recipientSchema.parse(replyTo) : undefined;

  const response = await fetch(resendEmailsUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: recipients,
      ...(validatedReplyTo ? { reply_to: validatedReplyTo } : {}),
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend order notification failed with status ${response.status}`);
  }
};

export const sendOrderPlacedEmails = async (order: OrderEmailDetails) => {
  const summaryText = orderSummaryText(order);
  const summaryHtml = orderSummaryHtml(order);
  const customerText = [
    'Thank you for your order with Wahab Mobiles.',
    '',
    summaryText,
    '',
    'Your order is awaiting confirmation. We will contact you if anything else is needed before processing.',
  ].join('\n');
  const customerHtml = `
    <p>Thank you for your order with Wahab Mobiles.</p>
    ${summaryHtml}
    <p>Your order is awaiting confirmation. We will contact you if anything else is needed before processing.</p>
  `.trim();
  const storeText = [
    'A new order was placed in the Wahab Mobiles store.',
    '',
    `Customer: ${order.customer.name}`,
    `Email: ${order.customer.email}`,
    `Phone: ${order.customer.phone}`,
    '',
    summaryText,
    '',
    `Admin Portal: ${env.FRONTEND_URL.replace(/\/+$/, '')}/admin/orders`,
  ].join('\n');
  const storeHtml = `
    <p>A new order was placed in the Wahab Mobiles store.</p>
    <p><strong>Customer:</strong> ${escapeHtml(order.customer.name)}<br>
    <strong>Email:</strong> ${escapeHtml(order.customer.email)}<br>
    <strong>Phone:</strong> ${escapeHtml(order.customer.phone)}</p>
    ${summaryHtml}
    <p><a href="${escapeHtml(`${env.FRONTEND_URL.replace(/\/+$/, '')}/admin/orders`)}">Open Orders in the Admin Portal</a></p>
  `.trim();

  await Promise.all([
    sendEmail({
      to: [order.customer.email],
      subject: `Order received: ${order.orderNumber}`,
      text: customerText,
      html: customerHtml,
      idempotencyKey: `order-${order.id}-placed-customer`,
    }),
    sendEmail({
      to: [env.SUPPORT_EMAIL!],
      replyTo: order.customer.email,
      subject: `New order: ${order.orderNumber}`,
      text: storeText,
      html: storeHtml,
      idempotencyKey: `order-${order.id}-placed-store`,
    }),
  ]);
};

const statusMessage: Record<CustomerOrderStatus, string> = {
  CONFIRMED: 'Your order has been confirmed and will be prepared for processing.',
  PROCESSING: 'Your order is being prepared.',
  SHIPPED: 'Your order has been shipped.',
  DELIVERED: 'Your order has been marked as delivered.',
  CANCELLED: 'Your order has been cancelled.',
};

export const sendOrderStatusEmail = async (order: OrderEmailDetails, status: CustomerOrderStatus) => {
  const message = statusMessage[status];
  const summaryText = orderSummaryText(order);
  const summaryHtml = orderSummaryHtml(order);
  const tracking = status === 'SHIPPED' && order.trackingNumber
    ? `Tracking number: ${order.trackingNumber}`
    : undefined;
  const cancellation = status === 'CANCELLED' && order.cancellationReason
    ? `Cancellation reason: ${order.cancellationReason}`
    : undefined;
  const text = [
    `Update for order ${order.orderNumber}`,
    '',
    message,
    ...(tracking ? ['', tracking] : []),
    ...(cancellation ? ['', cancellation] : []),
    '',
    summaryText,
  ].join('\n');
  const html = `
    <p><strong>Order update:</strong> ${escapeHtml(order.orderNumber)}</p>
    <p>${escapeHtml(message)}</p>
    ${tracking ? `<p>${escapeHtml(tracking)}</p>` : ''}
    ${cancellation ? `<p>${escapeHtml(cancellation)}</p>` : ''}
    ${summaryHtml}
  `.trim();

  await sendEmail({
    to: [order.customer.email],
    subject: `Order ${order.orderNumber}: ${formatShippingMethod(status.toLowerCase())}`,
    text,
    html,
    idempotencyKey: `order-${order.id}-status-${status.toLowerCase()}`,
  });
};
