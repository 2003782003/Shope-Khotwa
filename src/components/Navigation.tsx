import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../lib/store';
import { t } from '../lib/i18n';
import { categories } from '../lib/data';
import { X } from 'lucide-react';

const navItems = [
  { id: 'all', path: '/products' },
  { id: 'classic', path: '/products?cat=classic' },
  { id: 'sport', path: '/products?cat=sport' },
  { id: 'casual', path: '/products?cat=casual' },
  { id: 'boots', path: '/products?cat=boots' },
  { id: 'sandals', path: '/products?cat=sandals' },
  { id: 'brands', path: '/products?view=brands' },
  { id: 'sale', path: '/products?view=sale' },
  { id: 'new', path: '/products?view=new' },
];

const itemVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' as const },
  }),
};

export default function Navigation() {
  const { lang, filters, setFilter, isMobileMenuOpen, setMobileMenuOpen } = useStore();
  const isRtl = lang === 'ar';

  const handleNavClick = (catId: string) => {
    setFilter('category', catId);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden lg:block bg-primary-light border-t border-white/10 sticky top-[108px] z-40 overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="max-w-7xl mx-auto px-4">
          <motion.ul
            className="flex items-center justify-center gap-1"
            initial="hidden"
            animate="visible"
          >
            {navItems.map((item, i) => (
              <motion.li key={item.id} custom={i} variants={itemVariants}>
                <Link
                  to={item.path}
                  onClick={() => handleNavClick(item.id === 'brands' || item.id === 'sale' || item.id === 'new' ? 'all' : item.id)}
                  className="relative block group"
                >
                  <motion.span
                    className={`block px-4 py-3 text-sm font-medium transition-colors ${
                      filters.category === item.id ? 'text-accent' : 'text-white/80 hover:text-accent'
                    }`}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {t(`nav.${item.id}`, lang)}
                  </motion.span>
                  {/* Animated underline */}
                  {filters.category === item.id ? (
                    <motion.div
                      layoutId="nav-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  ) : (
                    <span className="absolute bottom-0 left-1/2 right-1/2 h-0.5 bg-accent/50 group-hover:left-0 group-hover:right-0 transition-all duration-300" />
                  )}
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </nav>

      {/* Mobile nav overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60" onClick={() => setMobileMenuOpen(false)}>
          <motion.div
            initial={{ x: isRtl ? 300 : -300 }}
            animate={{ x: 0 }}
            exit={{ x: isRtl ? 300 : -300 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`absolute top-0 ${isRtl ? 'right-0' : 'left-0'} w-72 h-full bg-primary overflow-y-auto`}
            onClick={e => e.stopPropagation()}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-accent font-heading text-lg font-bold">KHOTWA</h2>
              <button onClick={() => setMobileMenuOpen(false)} className="text-white/60 hover:text-white"><X size={20} /></button>
            </div>
            <ul className="py-2">
              {navItems.map((item, i) => (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, x: isRtl ? 30 : -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    to={item.path}
                    onClick={() => handleNavClick(item.id === 'brands' || item.id === 'sale' || item.id === 'new' ? 'all' : item.id)}
                    className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                      filters.category === item.id ? 'text-accent bg-white/5' : 'text-white/70 hover:text-accent hover:bg-white/5'
                    }`}
                  >
                    <span>{categories.find(c => c.id === item.id)?.icon || '⭐'}</span>
                    <span>{t(`nav.${item.id}`, lang)}</span>
                  </Link>
                </motion.li>
              ))}
            </ul>
            <div className="border-t border-white/10 p-4">
              <Link to="/track-order" onClick={() => setMobileMenuOpen(false)} className="block text-white/70 hover:text-accent py-2 text-sm">{t('order.track', lang)}</Link>
              <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="block text-white/70 hover:text-accent py-2 text-sm">{t('dashboard', lang)}</Link>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
