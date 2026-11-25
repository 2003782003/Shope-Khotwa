import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Truck, Shield, CreditCard, ArrowRight, ArrowLeft } from 'lucide-react';
import { useStore } from '../lib/store';
import { t } from '../lib/i18n';
import { products, categories } from '../lib/data';
import ProductCard from '../components/ProductCard';

export default function HomePage() {
  const { lang, setFilter } = useStore();
  const isRtl = lang === 'ar';
  const Arrow = isRtl ? ArrowLeft : ArrowRight;
  const featured = products.filter(p => p.featured);
  const newArrivals = products.filter(p => p.isNew);
  const onSale = products.filter(p => p.discount);

  const features = [
    { icon: Truck, title: { ar: 'توصيل سريع', fr: 'Livraison rapide', en: 'Fast Delivery' }, desc: { ar: 'لجميع الولايات 58', fr: 'Vers les 58 wilayas', en: 'To all 58 wilayas' } },
    { icon: Shield, title: { ar: 'ضمان الجودة', fr: 'Qualité garantie', en: 'Quality Guarantee' }, desc: { ar: 'منتجات أصلية 100%', fr: 'Produits 100% originaux', en: '100% Original Products' } },
    { icon: CreditCard, title: { ar: 'دفع آمن', fr: 'Paiement sécurisé', en: 'Secure Payment' }, desc: { ar: 'CIB, الذهبية, عند الاستلام', fr: 'CIB, Edahabia, COD', en: 'CIB, Edahabia, COD' } },
  ];

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Hero */}
      <section className="relative h-[60vh] min-h-[400px] max-h-[600px] overflow-hidden">
        <img src="/images/hero-banner.jpg" alt="Hero" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/60 to-transparent" />
        <div className="relative z-10 h-full flex items-end">
          <div className="max-w-7xl mx-auto px-4 pb-12 w-full">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                {t('hero.title', lang)}
              </h2>
              <p className="text-white/70 text-lg md:text-xl mb-6 max-w-lg">{t('hero.subtitle', lang)}</p>
              <Link to="/products" className="inline-flex items-center gap-2 bg-accent hover:bg-accent-light text-primary px-8 py-3 rounded-full font-bold text-lg transition-colors">
                {t('hero.cta', lang)}
                <Arrow size={20} />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features bar */}
      <section className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="flex items-center gap-3 justify-center md:justify-start">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                  <f.icon size={22} className="text-accent" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{f.title[lang]}</h4>
                  <p className="text-xs text-text-muted">{f.desc[lang]}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h3 className="font-heading text-2xl md:text-3xl font-bold text-center mb-8">{t('categories', lang)}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.filter(c => c.id !== 'all').map((cat, i) => (
            <motion.div key={cat.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
              <Link
                to={`/products?cat=${cat.id}`}
                onClick={() => setFilter('category', cat.id)}
                className="block bg-card rounded-2xl p-6 text-center hover:shadow-lg hover:-translate-y-1 transition-all border border-border/50 group"
              >
                <span className="text-4xl block mb-3 group-hover:scale-110 transition-transform">{cat.icon}</span>
                <span className="text-sm font-semibold text-text">{t(`nav.${cat.id}`, lang)}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-heading text-2xl md:text-3xl font-bold">{t('featured', lang)}</h3>
          <Link to="/products" className="text-accent hover:text-accent-dark text-sm font-semibold flex items-center gap-1">
            {t('nav.all', lang)} <Arrow size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      </section>

      {/* On Sale */}
      {onSale.length > 0 && (
        <section className="bg-gradient-to-r from-danger/5 to-accent/5 py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-heading text-2xl md:text-3xl font-bold">
                🔥 {t('nav.sale', lang)}
              </h3>
              <Link to="/products?view=sale" className="text-accent hover:text-accent-dark text-sm font-semibold flex items-center gap-1">
                {t('nav.all', lang)} <Arrow size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {onSale.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-heading text-2xl md:text-3xl font-bold">✨ {t('new_arrivals', lang)}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {newArrivals.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
