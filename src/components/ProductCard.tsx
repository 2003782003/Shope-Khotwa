import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Star, Heart, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { Product } from '../lib/types';
import { useStore } from '../lib/store';
import { t, formatPrice } from '../lib/i18n';

interface Props {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: Props) {
  const { lang } = useStore();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const isRtl = lang === 'ar';

  const handleQuickOrder = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/landing/${product.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-border/50"
    >
      <Link to={`/product/${product.id}`} className="block">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-surface-dark">
          {!imgLoaded && <div className="absolute inset-0 animate-pulse bg-surface-dark" />}
          <img
            src={product.images[0]}
            alt={product.name[lang]}
            className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
          />
          
          {/* Badges */}
          <div className={`absolute top-3 ${isRtl ? 'right-3' : 'left-3'} flex flex-col gap-1.5`}>
            {product.discount && (
              <span className="bg-danger text-white text-xs font-bold px-2.5 py-1 rounded-full">-{product.discount}%</span>
            )}
            {product.isNew && (
              <span className="bg-success text-white text-xs font-bold px-2.5 py-1 rounded-full">{t('nav.new', lang)}</span>
            )}
          </div>

          {/* Actions overlay */}
          <div className={`absolute top-3 ${isRtl ? 'left-3' : 'right-3'} flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity`}>
            <button onClick={(e) => { e.preventDefault(); setLiked(!liked); }} className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors ${liked ? 'bg-danger text-white' : 'bg-white text-text-light hover:text-danger'}`}>
              <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
            </button>
            <Link to={`/product/${product.id}`} className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md text-text-light hover:text-accent transition-colors" onClick={e => e.stopPropagation()}>
              <Eye size={14} />
            </Link>
          </div>

          {/* Quick order overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <button onClick={handleQuickOrder} className="w-full bg-accent hover:bg-accent-light text-primary py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors">
              <ShoppingBag size={16} />
              {t('product.order_now', lang)}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <p className="text-xs text-text-muted mb-1">{product.brand}</p>
          <h3 className="font-semibold text-sm text-text line-clamp-2 mb-2 min-h-[2.5rem]">{product.name[lang]}</h3>
          
          {/* Rating */}
          <div className="flex items-center gap-1 mb-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map(star => (
                <Star key={star} size={12} className={star <= Math.round(product.rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />
              ))}
            </div>
            <span className="text-xs text-text-muted">({product.reviewCount})</span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-accent">{formatPrice(product.price, lang)}</span>
            {product.originalPrice && (
              <span className="text-sm text-text-muted line-through">{formatPrice(product.originalPrice, lang)}</span>
            )}
          </div>

          {/* Sizes preview */}
          <div className="flex flex-wrap gap-1 mt-2">
            {product.sizes.slice(0, 5).map(size => (
              <span key={size} className="text-[10px] bg-surface px-1.5 py-0.5 rounded text-text-muted">{size}</span>
            ))}
            {product.sizes.length > 5 && <span className="text-[10px] text-text-muted">+{product.sizes.length - 5}</span>}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
