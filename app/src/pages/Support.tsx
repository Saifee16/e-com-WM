import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Phone,
  Mail,
  MessageCircle,
  ChevronDown,
  HelpCircle,
  FileText,
  Shield,
  Truck,
  CreditCard,
  RefreshCcw,
  Send,
  MapPin,
} from 'lucide-react';
import { contactAPI, ordersAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_NUMBERS,
  SHOP_ADDRESS,
  SHOP_LOCATION_LABEL,
  SHOP_MAPS_URL,
  SHOP_WHATSAPP_URL,
} from '../config/contact';

const Support = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [guestReturn, setGuestReturn] = useState({ orderNumber: '', email: '', reason: '', details: '' });
  const { showToast } = useToast();

  const faqs = [
    {
      category: 'Orders & Shipping',
      icon: Truck,
      questions: [
        {
          q: 'Which delivery options are available?',
          a: 'Checkout offers standard shipping, express shipping and store pickup. Contact the shop to confirm timing for a specific order.',
        },
        {
          q: 'Do you offer free shipping?',
          a: 'Standard shipping is free when the order subtotal is Rs. 100,000 or more. Checkout shows the final shipping charge before the order is placed.',
        },
        {
          q: 'Can I track my order?',
          a: 'Your order history shows the recorded order status and a tracking number when one has been added by the store team.',
        },
      ],
    },
    {
      category: 'Returns & Refunds',
      icon: RefreshCcw,
      questions: [
        {
          q: 'What is your return policy?',
          a: 'Eligible delivered orders can submit a return request within seven days of delivery. Every request is reviewed before approval.',
        },
        {
          q: 'How do I initiate a return?',
          a: 'Signed-in customers can use order history. Guest customers can use the guest return form on this page with their order number and checkout email.',
        },
        {
          q: 'Does a return request guarantee a refund?',
          a: 'No. Submitting a request starts a review. Any approved refund is recorded and coordinated manually by the support team.',
        },
      ],
    },
    {
      category: 'Products & PTA Status',
      icon: Shield,
      questions: [
        {
          q: 'Are all devices PTA approved?',
          a: 'PTA approval is not assumed for every device. Check the status shown on the individual product listing and confirm it before purchase.',
        },
        {
          q: 'Is warranty coverage the same for every phone?',
          a: 'No universal warranty is promised on this site. Confirm the coverage for the specific new, used or refurbished device before purchase.',
        },
        {
          q: 'How can I confirm PTA status?',
          a: 'Review the product listing, ask the shop to confirm the device, and use official PTA verification channels before purchase.',
        },
      ],
    },
    {
      category: 'Payments',
      icon: CreditCard,
      questions: [
        {
          q: 'What payment methods do you accept?',
          a: 'Cash on Delivery (COD) is the only payment method. Refunds are handled manually by the support team.',
        },
        {
          q: 'Is my payment information secure?',
          a: 'The current checkout does not request or store card details because Cash on Delivery is the only payment method.',
        },
        {
          q: 'Can I pay in installments?',
          a: 'No installment option is offered by the current checkout.',
        },
      ],
    },
  ];

  const contactMethods = [
    {
      icon: Phone,
      title: 'Phone Support',
      info: CONTACT_PHONE_NUMBERS.map((phone) => phone.label).join(' | '),
      description: 'Call the shop directly',
      action: 'Call Now',
      href: CONTACT_PHONE_NUMBERS[0].href,
    },
    {
      icon: Mail,
      title: 'Email Support',
      info: CONTACT_EMAIL,
      description: 'Send a support message',
      action: 'Send Email',
      href: `mailto:${CONTACT_EMAIL}`,
    },
    {
      icon: MessageCircle,
      title: 'WhatsApp',
      info: CONTACT_PHONE_NUMBERS[0].label,
      description: 'Message the shop directly',
      action: 'Open WhatsApp',
      href: SHOP_WHATSAPP_URL,
    },
    {
      icon: MapPin,
      title: 'Shop Location',
      info: SHOP_LOCATION_LABEL,
      description: SHOP_ADDRESS,
      action: 'Open in Maps',
      href: SHOP_MAPS_URL,
      newTab: true,
    },
  ];

  const handleContactSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await contactAPI.submit(contactForm);
      showToast('Message submitted for admin review', 'success');
      setContactForm({ name: '', email: '', subject: '', message: '' });
    } catch {
      showToast('Failed to submit your message', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestReturn = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await ordersAPI.requestGuestReturn(guestReturn.orderNumber, {
        email: guestReturn.email,
        reason: guestReturn.reason,
        ...(guestReturn.details ? { details: guestReturn.details } : {}),
      });
      setGuestReturn({ orderNumber: '', email: '', reason: '', details: '' });
      showToast('Guest return request submitted', 'success');
    } catch {
      showToast('Order is not eligible or could not be matched', 'error');
    } finally { setIsSubmitting(false); }
  };

  const filteredFaqs = faqs.map((category) => ({
    ...category,
    questions: category.questions.filter(
      (q) =>
        q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((category) => category.questions.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-blue-800 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              How Can We Help?
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
              Find answers to common questions or get in touch with our support team
            </p>

            {/* Search */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for answers..."
                className="w-full pl-14 pr-4 py-4 rounded-2xl text-lg focus:outline-none focus:ring-4 focus:ring-white/30"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Methods */}
      <section id="contact" className="py-16 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {contactMethods.map((method, index) => (
              <motion.div
                key={method.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center hover:shadow-lg transition-shadow"
              >
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <method.icon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{method.title}</h3>
                <p className="text-lg text-blue-600 font-medium mb-1">{method.info}</p>
                <p className="text-gray-500 mb-6">{method.description}</p>
                <a
                  href={method.href}
                  target={method.newTab ? '_blank' : undefined}
                  rel={method.newTab ? 'noreferrer' : undefined}
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  {method.action}
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="pb-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleContactSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <input
                required
                value={contactForm.name}
                onChange={(event) => setContactForm({ ...contactForm, name: event.target.value })}
                placeholder="Name"
                className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                required
                type="email"
                value={contactForm.email}
                onChange={(event) => setContactForm({ ...contactForm, email: event.target.value })}
                placeholder="Email"
                className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <input
              required
              value={contactForm.subject}
              onChange={(event) => setContactForm({ ...contactForm, subject: event.target.value })}
              placeholder="Subject"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              required
              rows={5}
              value={contactForm.message}
              onChange={(event) => setContactForm({ ...contactForm, message: event.target.value })}
              placeholder="Message"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:bg-gray-300 inline-flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              {isSubmitting ? 'Submitting...' : 'Submit Message'}
            </button>
          </form>
          <form id="guest-return" onSubmit={handleGuestReturn} className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-5 scroll-mt-24">
            <div><h2 className="text-xl font-bold text-gray-900">Guest order return</h2><p className="mt-1 text-sm text-gray-500">Use the order number and checkout email for a delivered guest order.</p></div>
            <div className="grid sm:grid-cols-2 gap-5"><input aria-label="Order number" required value={guestReturn.orderNumber} onChange={(event) => setGuestReturn({ ...guestReturn, orderNumber: event.target.value })} placeholder="Order number" className="px-4 py-3 border border-gray-200 rounded-xl" /><input aria-label="Order email" type="email" required value={guestReturn.email} onChange={(event) => setGuestReturn({ ...guestReturn, email: event.target.value })} placeholder="Checkout email" className="px-4 py-3 border border-gray-200 rounded-xl" /></div>
            <input aria-label="Return reason" required minLength={3} value={guestReturn.reason} onChange={(event) => setGuestReturn({ ...guestReturn, reason: event.target.value })} placeholder="Return reason" className="w-full px-4 py-3 border border-gray-200 rounded-xl" />
            <textarea aria-label="Return details" value={guestReturn.details} onChange={(event) => setGuestReturn({ ...guestReturn, details: event.target.value })} placeholder="Additional details" className="w-full px-4 py-3 border border-gray-200 rounded-xl" />
            <button disabled={isSubmitting} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-50">Submit guest return</button>
          </form>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faqs" className="py-16 bg-white scroll-mt-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-500">
              Find quick answers to common questions
            </p>
          </div>

          {searchQuery && filteredFaqs.length === 0 ? (
            <div className="text-center py-12">
              <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No results found for "{searchQuery}"</p>
            </div>
          ) : (
            <div className="space-y-8">
              {(searchQuery ? filteredFaqs : faqs).map((category, categoryIndex) => (
                <div key={category.category}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <category.icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{category.category}</h3>
                  </div>
                  <div className="space-y-3">
                    {category.questions.map((faq, faqIndex) => {
                      const globalIndex = categoryIndex * 100 + faqIndex;
                      return (
                        <div
                          key={faq.q}
                          className="border border-gray-200 rounded-xl overflow-hidden"
                        >
                          <button
                            onClick={() => setOpenFaq(openFaq === globalIndex ? null : globalIndex)}
                            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                          >
                            <span className="font-medium text-gray-900">{faq.q}</span>
                            <ChevronDown
                              className={`w-5 h-5 text-gray-500 transition-transform ${
                                openFaq === globalIndex ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                          <AnimatePresence>
                            {openFaq === globalIndex && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 pt-0 text-gray-600 border-t border-gray-100">
                                  {faq.a}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Quick Links</h2>
            <p className="text-gray-500">
              Useful resources and information
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: FileText, title: 'Terms of Service', link: '/terms' },
              { icon: Shield, title: 'Privacy Policy', link: '/privacy' },
              { icon: Truck, title: 'Shipping Info', link: '/services#shipping' },
              { icon: RefreshCcw, title: 'Return Policy', link: '/returns' },
            ].map((item, index) => (
              <motion.a
                key={item.title}
                href={item.link}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 p-6 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-blue-600" />
                </div>
                <span className="font-medium text-gray-900">{item.title}</span>
              </motion.a>
            ))}
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
              Still Need Help?
            </h2>
            <p className="text-blue-100 mb-8">
              Our support team is ready to assist you with any questions or concerns.
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-block px-8 py-4 bg-white text-blue-600 rounded-full font-semibold hover:bg-gray-100 transition-colors"
            >
              Contact Support
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Support;
