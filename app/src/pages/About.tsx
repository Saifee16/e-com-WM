import { motion } from 'framer-motion';
import {
  Shield,
  Award,
  Users,
  TrendingUp,
  Phone,
  MapPin,
  Mail,
  Clock,
} from 'lucide-react';
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_NUMBERS,
  SHOP_ADDRESS,
  SHOP_LOCATION_LABEL,
  SHOP_MAPS_URL,
} from '../config/contact';

const About = () => {
  const stats = [
    { value: '10K+', label: 'Happy Customers' },
    { value: '50+', label: 'Products Available' },
    { value: '5+', label: 'Years Experience' },
    { value: '99%', label: 'Satisfaction Rate' },
  ];

  const values = [
    {
      icon: Shield,
      title: 'Trust & Transparency',
      description: 'We believe in honest pricing and genuine products. Every device is PTA approved with full warranty.',
    },
    {
      icon: Award,
      title: 'Quality First',
      description: 'We only sell premium smartphones from trusted brands, ensuring the best experience for our customers.',
    },
    {
      icon: Users,
      title: 'Customer Focused',
      description: 'Our customers are at the heart of everything we do. We strive to exceed expectations every time.',
    },
    {
      icon: TrendingUp,
      title: 'Continuous Improvement',
      description: 'We constantly evolve our services and product offerings to stay ahead in the market.',
    },
  ];

  const team = [
    {
      name: 'Wahab Ahmad',
      role: 'Founder & CEO',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    },
    {
      name: 'Sarah Khan',
      role: 'Operations Manager',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
    },
    {
      name: 'Ali Hassan',
      role: 'Technical Lead',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section id="about-us" className="relative bg-gradient-to-r from-blue-600 to-blue-800 py-24 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              About Wahab Mobiles
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Your trusted destination for premium PTA-approved smartphones in Pakistan.
              Quality guaranteed, prices unmatched.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <p className="text-4xl font-bold text-blue-600 mb-2">{stat.value}</p>
                <p className="text-gray-600">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section id="careers" className="py-16 bg-gray-50 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Founded in 2020, Wahab Mobiles started with a simple mission: to provide Pakistanis 
                with access to genuine, PTA-approved smartphones at competitive prices. What began 
                as a small shop in Hyderabad has grown into one of the most trusted mobile retailers
                in the country.
              </p>
              <p className="text-gray-600 mb-4 leading-relaxed">
                We understand that buying a smartphone is a significant investment. That's why we 
                go above and beyond to ensure every device we sell meets the highest standards of 
                quality and authenticity.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Today, we serve thousands of satisfied customers across Pakistan, offering the latest 
                smartphones from Apple, Samsung, Google, OnePlus, and more. Our commitment to 
                customer satisfaction remains at the core of everything we do.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-video rounded-3xl overflow-hidden shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80"
                  alt="Our Store"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Values</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              These core principles guide everything we do at Wahab Mobiles
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-6 bg-gray-50 rounded-2xl"
              >
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-sm text-gray-600">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Meet Our Team</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              The people behind Wahab Mobiles. Career openings and hiring updates will be posted here.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="font-semibold text-gray-900">{member.name}</h3>
                <p className="text-gray-500">{member.role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="privacy-policy" className="py-16 bg-white scroll-mt-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Privacy Policy</h2>
          <p className="text-gray-600 leading-relaxed">
            Customer information is used only for account access, order processing, delivery coordination,
            and support follow-up. Contact requests are stored for admin review and are not sold to third parties.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 bg-white scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Get in Touch</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Have questions? We'd love to hear from you.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Phone, title: 'Phone', info: CONTACT_PHONE_NUMBERS.map((phone) => phone.label).join(' • ') },
              { icon: Mail, title: 'Email', info: CONTACT_EMAIL },
              { icon: MapPin, title: 'Location', info: SHOP_LOCATION_LABEL, detail: SHOP_ADDRESS, href: SHOP_MAPS_URL },
              { icon: Clock, title: 'Hours', info: 'Mon-Sat: 10AM - 8PM' },
            ].map((contact, index) => (
              <motion.div
                key={contact.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-6 bg-gray-50 rounded-2xl"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <contact.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{contact.title}</h3>
                {contact.href ? (
                  <a
                    href={contact.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    {contact.info}
                  </a>
                ) : (
                  <p className="text-gray-600">{contact.info}</p>
                )}
                {contact.detail && <p className="mt-2 text-sm text-gray-500">{contact.detail}</p>}
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
