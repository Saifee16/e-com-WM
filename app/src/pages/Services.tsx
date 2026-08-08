import { motion } from 'framer-motion';
import {
  Truck,
  Shield,
  RotateCcw,
  Wrench,
  Headphones,
  CreditCard,
  Check,
  Clock,
  Package,
} from 'lucide-react';
import { CONTACT_EMAIL, CONTACT_PHONE_NUMBERS } from '../config/contact';

const Services = () => {
  const services = [
    {
      icon: Truck,
      title: 'Free Shipping',
      description: 'Enjoy free shipping on all orders above Rs. 100,000. We deliver nationwide across Pakistan.',
      features: ['Nationwide delivery', 'Express shipping available', 'Real-time tracking', 'Secure packaging'],
    },
    {
      icon: Shield,
      title: 'PTA Approved Devices',
      description: 'All our smartphones are 100% PTA approved with official warranty and documentation.',
      features: ['100% genuine products', 'Official warranty', 'PTA verification', 'Tax paid devices'],
    },
    {
      icon: RotateCcw,
      title: 'Easy Returns',
      description: 'Not satisfied? Return your purchase within 7 days for a full refund or exchange.',
      features: ['7-day return window', 'No questions asked', 'Full refund', 'Easy process'],
    },
    {
      icon: Wrench,
      title: 'Repair Services',
      description: 'Expert repair services for all major smartphone brands with genuine parts.',
      features: ['Certified technicians', 'Genuine parts', 'Warranty on repairs', 'Quick turnaround'],
    },
    {
      icon: Headphones,
      title: '24/7 Support',
      description: 'Our dedicated support team is available round the clock to assist you.',
      features: ['Phone support', 'Live chat', 'Email support', 'Quick response'],
    },
    {
      icon: CreditCard,
      title: 'Secure Payments',
      description: 'Straightforward Cash on Delivery with no online gateway or stored payment details.',
      features: ['Cash on Delivery', 'Pay the courier', 'No card storage', 'Manual refunds'],
    },
  ];

  const shippingInfo = [
    {
      method: 'Standard Shipping',
      time: '3-5 business days',
      cost: 'Rs. 500',
      free: 'Free on orders over Rs. 100,000',
    },
    {
      method: 'Express Shipping',
      time: '1-2 business days',
      cost: 'Rs. 1,500',
      free: 'Not available',
    },
    {
      method: 'Store Pickup',
      time: 'Same day',
      cost: 'Free',
      free: 'Always free',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section id="services" className="relative bg-gradient-to-r from-blue-600 to-blue-800 py-24 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Our Services
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              We go the extra mile to ensure you have the best shopping experience
            </p>
          </motion.div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-lg transition-shadow"
              >
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                  <service.icon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{service.title}</h3>
                <p className="text-gray-600 mb-6">{service.description}</p>
                <ul className="space-y-2">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Shipping Info */}
      <section id="shipping" className="py-16 bg-white scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Shipping Information</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Choose the shipping method that works best for you
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Shipping Method</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Delivery Time</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Cost</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Free Shipping</th>
                </tr>
              </thead>
              <tbody>
                {shippingInfo.map((info) => (
                  <tr key={info.method} className="border-b border-gray-100">
                    <td className="py-4 px-6 font-medium text-gray-900">{info.method}</td>
                    <td className="py-4 px-6 text-gray-600">{info.time}</td>
                    <td className="py-4 px-6 text-gray-600">{info.cost}</td>
                    <td className="py-4 px-6 text-gray-600">{info.free}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Returns Section */}
      <section id="returns" className="py-16 bg-gray-50 scroll-mt-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Returns</h2>
          <p className="text-gray-600 leading-relaxed">
            Returns are accepted within 7 days for eligible products in original condition with packaging,
            invoice, and accessories. Contact support before sending any item back so the team can review
            the order and guide the next step.
          </p>
        </div>
      </section>

      {/* Warranty Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Warranty & Protection</h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Every device purchased from Wahab Mobiles comes with comprehensive warranty coverage. 
                We partner directly with manufacturers to ensure you receive authentic warranty services.
              </p>
              <div className="space-y-4">
                {[
                  'Official manufacturer warranty',
                  '1-year standard coverage',
                  'Extended warranty options',
                  'Easy claim process',
                  'Genuine replacement parts',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-3xl p-8 shadow-lg"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <Shield className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Warranty Coverage</h3>
                  <p className="text-gray-500">Complete protection for your device</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900">Standard Warranty</span>
                  </div>
                  <p className="text-sm text-gray-600">1 year manufacturer warranty on all devices</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900">Extended Protection</span>
                  </div>
                  <p className="text-sm text-gray-600">Optional 2-year extended warranty available</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Wrench className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900">Repair Services</span>
                  </div>
                  <p className="text-sm text-gray-600">Certified repair centers nationwide</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Need Help?
            </h2>
            <p className="text-blue-100 mb-8">
              Our support team is available 24/7 to assist you with any questions or concerns.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={CONTACT_PHONE_NUMBERS[0].href}
                className="px-8 py-4 bg-white text-blue-600 rounded-full font-semibold hover:bg-gray-100 transition-colors"
              >
                Call Us Now
              </a>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="px-8 py-4 border-2 border-white text-white rounded-full font-semibold hover:bg-white/10 transition-colors"
              >
                Email Support
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Services;
