import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '../lib/store';
import { t, formatPrice } from '../lib/i18n';

export default function CartPage() {
  const { lang, cart, removeFromCart, updateCartQuantity, getCartTotal } = useStore();
  const navigate = useNavigate();
  const isRtl = lang === 'ar';
  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center" dir={isRtl ? 'rtl' : 'ltr'}>
        <ShoppingBag size={64} className="mx-auto text-text-muted mb-4" />
        <h2 className="font-heading text-2xl font-bold mb-2">{lang === 'ar' ? 'السلة فارغة' : lang === 'fr' ? 'Panier vide' : 'Cart is empty'}</h2>
        <p className="text-text-muted mb-6">{lang === 'ar' ? 'لم تضف أي منتجات بعد' : 'No products added yet'}</p>
        <Link to="/products" className="inline-flex items-center gap-2 bg-accent hover:bg-accent-light text-primary px-6 py-3 rounded-full font-bold transition-colors">
          {t('hero.cta', lang)} <Arrow size={18} />
        </Link>
      </div>
    );
  }

  // Each cart item becomes a separate order
  const handleOrderItem = (productId: string) => {
    const item = cart.find(i => i.product.id === productId);
    if (item) {
      const colorIdx = item.product.colors.findIndex(c => c.hex === item.selectedColor.hex);
      navigate(`/order/${productId}?size=${item.selectedSize}&color=${colorIdx}&qty=${item.quantity}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" dir={isRtl ? 'rtl' : 'ltr'}>
      <h1 className="font-heading text-2xl md:text-3xl font-bold mb-6">{t('cart', lang)}</h1>

      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        <div className="p-4 bg-surface-dark border-b border-border text-sm font-semibold text-text-muted">
          {lang === 'ar' ? `ملاحظة: كل منتج يتم طلبه بشكل منفصل بفاتورة مستقلة` :
           lang === 'fr' ? 'Note: Chaque produit est command\u00e9 s\u00e9par\u00e9ment avec une facture ind\u00e9pendante' :
           'Note: Each product is ordered separately with an independent invoice'}
        </div>
        {cart.map((item, i) => (
          <motion.div key={item.product.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
            className="flex items-center gap-4 p-4 border-b border-border last:border-0">
            <img src={item.product.images[0]} alt={item.product.name[lang]} className="w-20 h-20 rounded-xl object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{item.product.name[lang]}</h3>
              <p className="text-xs text-text-muted">{item.product.brand} • {t('product.size', lang)}: {item.selectedSize} • {item.selectedColor.name[lang]}</p>
              <p className="text-accent font-bold mt-1">{formatPrice(item.product.price, lang)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)} className="w-8 h-8 bg-surface-dark rounded-lg flex items-center justify-center"><Minus size={12} /></button>
              <span className="font-bold text-sm w-6 text-center">{item.quantity}</span>
              <button onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)} className="w-8 h-8 bg-surface-dark rounded-lg flex items-center justify-center"><Plus size={12} /></button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleOrderItem(item.product.id)} className="bg-accent hover:bg-accent-light text-primary px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                {t('product.order_now', lang)}
              </button>
              <button onClick={() => removeFromCart(item.product.id)} className="text-danger hover:bg-danger/10 p-2 rounded-lg transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 bg-card rounded-2xl p-5 border border-border/50">
        <div className="flex justify-between items-center">
          <span className="font-semibold">{t('order.total', lang)}</span>
          <span className="text-2xl font-bold text-accent">{formatPrice(getCartTotal(), lang)}</span>
        </div>
        <p className="text-xs text-text-muted mt-2">
          {lang === 'ar' ? 'سعر التوصيل يُحسب عند إتمام كل طلب' :
           lang === 'fr' ? 'Les frais de livraison sont calcul\u00e9s lors de chaque commande' :
           'Delivery fees are calculated for each order'}
        </p>
      </div>
    </div>
  );
}
