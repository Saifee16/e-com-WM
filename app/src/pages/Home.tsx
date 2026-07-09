import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Shield,
  Truck,
  RotateCcw,
  Star,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { Product } from '../types';
import { formatPrice } from '../utils/format';
import { productsAPI } from '../services/api';

// Hero Slider Data
const heroSlides = [
  {
    id: 1,
    title: 'iPhone 16 Pro Max',
    subtitle: 'The Most Advanced iPhone Ever',
    description: 'Experience the ultimate with A18 Pro chip, titanium design, and revolutionary camera system.',
    image: 'https://images.unsplash.com/photo-1696446701796-da61225697cc?w=1200&q=80',
    price: 599999,
    originalPrice: 649999,
    cta: 'Shop Now',
    link: '/products?search=iPhone%2016%20Pro%20Max',
  },
  {
    id: 2,
    title: 'Samsung Galaxy S24 Ultra',
    subtitle: 'Galaxy AI is Here',
    description: 'The most powerful Galaxy with AI capabilities, S Pen, and 200MP camera.',
    image: 'https://images.unsplash.com/photo-1610945265078-3858a0828671?w=1200&q=80',
    price: 579999,
    originalPrice: 629999,
    cta: 'Discover More',
    link: '/products?search=Samsung%20Galaxy%20S24%20Ultra',
  },
  {
    id: 3,
    title: 'Google Pixel 9 Pro XL',
    subtitle: 'The Best of Google AI',
    description: 'Advanced AI features meet stunning camera capabilities with the new Pixel.',
    image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=1200&q=80',
    price: 349999,
    originalPrice: 399999,
    cta: 'Learn More',
    link: '/products?search=Google%20Pixel',
  },
];

// Features Data
const features = [
  {
    icon: Shield,
    title: 'PTA Approved',
    description: 'All devices are 100% PTA approved with official warranty.',
  },
  {
    icon: Truck,
    title: 'Free Shipping',
    description: 'Free delivery on all orders above Rs. 100,000.',
  },
  {
    icon: RotateCcw,
    title: '7-Day Returns',
    description: 'Easy returns with no questions asked policy.',
  },
  {
    icon: Star,
    title: 'Best Prices',
    description: 'Competitive prices guaranteed on all products.',
  },
];

// Brands Data
const defaultBrands = [
  { name: 'Apple', image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&q=80', count: 15 },
  { name: 'Samsung', image: 'https://images.unsplash.com/photo-1610945265078-3858a0828671?w=400&q=80', count: 20 },
  { name: 'Google', image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&q=80', count: 8 },
  { name: 'OnePlus', image: 'https://images.unsplash.com/photo-1660463974457-370df63a4a5e?w=400&q=80', count: 12 },
  { name: 'Xiaomi', image: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400&q=80', count: 18 },
  { name: 'OPPO', image: 'https://images.unsplash.com/photo-1616348436168-de43ad0db179?w=400&q=80', count: 10 },
];

const Home = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState(defaultBrands);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [featuredResponse, brandsResponse] = await Promise.all([
          productsAPI.getFeaturedProducts(),
          productsAPI.getBrands(),
        ]);
        setFeaturedProducts((featuredResponse.data.data as Product[]).slice(0, 6));
        setBrands(
          brandsResponse.data.data.map((brand: { name: string; productCount: number }, index: number) => ({
            name: brand.name,
            count: brand.productCount,
            image: defaultBrands[index % defaultBrands.length].image,
          })),
        );
      } catch {
        setFeaturedProducts([]);
      }
    };

    loadHomeData();
  }, []);

  // Auto-slide
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[600px] lg:h-[700px] overflow-hidden">
        {heroSlides.map((slide, index) => (
          <motion.div
            key={slide.id}
            initial={{ opacity: 0 }}
            animate={{
              opacity: currentSlide === index ? 1 : 0,
              scale: currentSlide === index ? 1 : 1.1,
            }}
            transition={{ duration: 0.8 }}
            className={`absolute inset-0 ${currentSlide === index ? 'z-10' : 'z-0'}`}
          >
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.image})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
            </div>

            {/* Content */}
            <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{
                  opacity: currentSlide === index ? 1 : 0,
                  x: currentSlide === index ? 0 : -50,
                }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="max-w-xl text-white"
              >
                <span className="inline-block px-4 py-1.5 bg-blue-600 rounded-full text-sm font-medium mb-4">
                  {slide.subtitle}
                </span>
                <h1 className="text-4xl lg:text-6xl font-bold mb-4">{slide.title}</h1>
                <p className="text-lg text-gray-200 mb-6">{slide.description}</p>
                <div className="flex items-center gap-4 mb-8">
                  <span className="text-3xl font-bold text-blue-400">
                    {formatPrice(slide.price)}
                  </span>
                  <span className="text-xl text-gray-400 line-through">
                    {formatPrice(slide.originalPrice)}
                  </span>
                </div>
                <Link
                  to={slide.link}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors"
                >
                  {slide.cta}
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </motion.div>
            </div>
          </motion.div>
        ))}

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Slide Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                currentSlide === index ? 'bg-blue-600 w-8' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Featured Products</h2>
              <p className="text-gray-500 mt-2">Handpicked premium smartphones for you</p>
            </div>
            <Link
              to="/products"
              className="hidden sm:flex items-center gap-2 text-blue-600 font-medium hover:text-blue-700 transition-colors"
            >
              View All
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.map((product, index) => (
              <motion.div
                key={product._id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>

          <div className="mt-8 text-center sm:hidden">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 text-blue-600 font-medium"
            >
              View All Products
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Brands Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Shop by Brand</h2>
            <p className="text-gray-500 mt-2">Explore our collection of top smartphone brands</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {brands.map((brand, index) => (
              <motion.div
                key={brand.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={`/products?brand=${brand.name}`}
                  className="block group"
                >
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100">
                    <img
                      src={brand.image}
                      alt={brand.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-4 left-4 text-white">
                      <h3 className="font-bold text-lg">{brand.name}</h3>
                      <p className="text-sm text-gray-300">{brand.count} Products</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Ready to Upgrade Your Phone?
            </h2>
            <p className="text-blue-100 text-lg max-w-2xl mx-auto mb-8">
              Browse our collection of premium PTA-approved smartphones and find your perfect match today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/products"
                className="px-8 py-4 bg-white text-blue-600 rounded-full font-semibold hover:bg-gray-100 transition-colors"
              >
                Shop Now
              </Link>
              <Link
                to="/about"
                className="px-8 py-4 border-2 border-white text-white rounded-full font-semibold hover:bg-white/10 transition-colors"
              >
                Learn More
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

// Product Card Component
const ProductCard = ({ product }: { product: Product }) => {
  return (
    <Link to={`/products/${product._id}`} className="group">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
        {/* Image */}
        <div className="relative aspect-square bg-gray-100 overflow-hidden">
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {product.originalPrice && product.originalPrice > product.price && (
            <div className="absolute top-4 left-4 px-3 py-1 bg-red-500 text-white text-sm font-medium rounded-full">
              {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
            </div>
          )}
          {product.ptaApproved && (
            <div className="absolute top-4 right-4 px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
              PTA Approved
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
              {product.brand}
            </span>
            <span className="text-xs text-gray-500">{product.specifications.storage}</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{product.rating}</span>
            </div>
            <span className="text-sm text-gray-500">({product.numReviews} reviews)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-gray-900">{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <span className="text-sm text-gray-400 line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default Home;
