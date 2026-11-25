import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Star, Minus, Plus, ArrowRight, ArrowLeft, Check, Truck } from 'lucide-react';
import { useStore } from '../lib/store';
import { t, formatPrice } from '../lib/i18n';
import { products } from '../lib/data';
import ProductCard from '../components/ProductCard';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang, addToCart } = useStore();
  const isRtl = lang === 'ar';
  const product = products.find(p => p.id === id);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  if (!product) return <div className="text-center py-20 text-text-muted">{t('no_results', lang)}</div>;

  const related = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);

  const handleAddToCart = () => {
    if (!selectedSize) return;
    addToCart(product, selectedSize, product.colors[selectedColor]);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleOrderNow = () => {
    navigate(`/landing/${product.id}?size=${selectedSize}&color=${selectedColor}&qty=${quantity}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link to="/" className="hover:text-accent">{t('home', lang)}</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-accent">{t('products', lang)}</Link>
        <span>/</span>
        <span className="text-text">{product.name[lang]}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Image */}
        <motion.div initial={{ opacity: 0, x: isRtl ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} className="bg-card rounded-3xl overflow-hidden border border-border/50">
          <img src={product.images[0]} alt={product.name[lang]} className="w-full aspect-square object-cover" />
        </motion.div>

        {/* Details */}
        <motion.div initial={{ opacity: 0, x: isRtl ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <div>
            <p className="text-accent text-sm font-medium mb-1">{product.brand}</p>
            <h1 className="font-heading text-2xl md:text-3xl font-bold mb-3">{product.name[lang]}</h1>
            <div className="flex items-center gap-3">
              <div className="flex">
                {[1,2,3,4,5].map(s => <Star key={s} size={16} className={s <= Math.round(product.rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />)}
              </div>
              <span className="text-sm text-text-muted">({product.reviewCount} {t('product.reviews', lang)})</span>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-accent">{formatPrice(product.price, lang)}</span>
            {product.originalPrice && (
              <span className="text-lg text-text-muted line-through">{formatPrice(product.originalPrice, lang)}</span>
            )}
            {product.discount && (
              <span className="bg-danger/10 text-danger text-sm font-bold px-3 py-1 rounded-full">-{product.discount}%</span>
            )}
          </div>

          <p className="text-text-light leading-relaxed">{product.description[lang]}</p>

          {/* Material */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">{t('product.material', lang)}:</span>
            <span className="text-text-light">{product.material[lang]}</span>
          </div>

          {/* Color */}
          <div>
            <h4 className="font-semibold text-sm mb-3">{t('product.color', lang)}: <span className="text-accent">{product.colors[selectedColor].name[lang]}</span></h4>
            <div className="flex gap-3">
              {product.colors.map((color, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedColor(i)}
                  className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${
                    selectedColor === i ? 'border-accent scale-110 ring-2 ring-accent/30' : 'border-border hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.hex }}
                >
                  {selectedColor === i && <Check size={16} className={color.hex === '#FFFFFF' || color.hex === '#E8F0FE' ? 'text-text' : 'text-white'} />}
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div>
            <h4 className="font-semibold text-sm mb-3">{t('product.size', lang)}</h4>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map(size => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`w-12 h-12 rounded-xl text-sm font-semibold transition-all ${
                    selectedSize === size ? 'bg-accent text-primary shadow-lg' : 'bg-surface-dark text-text-light hover:bg-accent/20 border border-border'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
            {!selectedSize && <p className="text-danger text-xs mt-2">{t('order.select_size', lang)}</p>}
          </div>

          {/* Quantity */}
          <div>
            <h4 className="font-semibold text-sm mb-3">{t('order.quantity', lang)}</h4>
            <div className="flex items-center gap-3">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 bg-surface-dark rounded-xl flex items-center justify-center hover:bg-accent/20 transition-colors">
                <Minus size={16} />
              </button>
              <span className="text-lg font-bold w-8 text-center">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 bg-surface-dark rounded-xl flex items-center justify-center hover:bg-accent/20 transition-colors">
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleAddToCart}
              disabled={!selectedSize}
              className={`flex-1 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                addedToCart ? 'bg-success text-white' : 'bg-surface-dark text-text hover:bg-accent/20 border border-border'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {addedToCart ? <><Check size={18} /> {lang === 'ar' ? 'تمت الإضافة' : 'Added!'}</> : <><ShoppingBag size={18} /> {t('product.add_to_cart', lang)}</>}
            </button>
            <button
              onClick={handleOrderNow}
              disabled={!selectedSize}
              className="flex-1 py-3.5 bg-accent hover:bg-accent-light text-primary rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('product.order_now', lang)}
              {isRtl ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
            </button>
          </div>

          {/* Delivery info */}
          <div className="bg-surface rounded-xl p-4 flex items-center gap-3">
            <Truck size={20} className="text-accent shrink-0" />
            <p className="text-sm text-text-light">{t('free_delivery', lang)}</p>
          </div>
        </motion.div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-16">
          <h3 className="font-heading text-2xl font-bold mb-6">{t('product.related', lang)}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      )}
    </div>
  );
}
