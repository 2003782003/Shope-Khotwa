import { X, SlidersHorizontal } from 'lucide-react';
import { useStore } from '../lib/store';
import { t } from '../lib/i18n';
import { categories, brands, sizes } from '../lib/data';

const colorOptions = [
  { hex: '#000000', name: { ar: 'أسود', fr: 'Noir', en: 'Black' } },
  { hex: '#8B4513', name: { ar: 'بني', fr: 'Marron', en: 'Brown' } },
  { hex: '#FFFFFF', name: { ar: 'أبيض', fr: 'Blanc', en: 'White' } },
  { hex: '#1B3A5C', name: { ar: 'كحلي', fr: 'Bleu marine', en: 'Navy' } },
  { hex: '#D2B48C', name: { ar: 'بيج', fr: 'Beige', en: 'Beige' } },
  { hex: '#DC2626', name: { ar: 'أحمر', fr: 'Rouge', en: 'Red' } },
  { hex: '#6B7280', name: { ar: 'رمادي', fr: 'Gris', en: 'Grey' } },
];

export default function FilterSidebar() {
  const { lang, filters, setFilter, resetFilters, isFilterOpen, setFilterOpen } = useStore();
  const isRtl = lang === 'ar';

  const content = (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-accent" />
          {t('filter.title', lang)}
        </h3>
        <button onClick={() => setFilterOpen(false)} className="lg:hidden text-text-light hover:text-text"><X size={20} /></button>
      </div>

      {/* Category */}
      <div>
        <h4 className="font-semibold text-sm mb-3 text-text">{t('filter.category', lang)}</h4>
        <div className="space-y-1">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilter('category', cat.id)}
              className={`flex items-center gap-2 w-full text-start px-3 py-2 rounded-lg text-sm transition-colors ${
                filters.category === cat.id ? 'bg-accent/10 text-accent font-semibold' : 'text-text-light hover:bg-surface-dark'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{t(`nav.${cat.id}`, lang)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Size */}
      <div>
        <h4 className="font-semibold text-sm mb-3 text-text">{t('filter.size', lang)}</h4>
        <div className="flex flex-wrap gap-2">
          {sizes.map(size => (
            <button
              key={size}
              onClick={() => {
                const newSizes = filters.sizes.includes(size)
                  ? filters.sizes.filter(s => s !== size)
                  : [...filters.sizes, size];
                setFilter('sizes', newSizes);
              }}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                filters.sizes.includes(size) ? 'bg-accent text-primary shadow-md' : 'bg-surface-dark text-text-light hover:bg-accent/20'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div>
        <h4 className="font-semibold text-sm mb-3 text-text">{t('filter.color', lang)}</h4>
        <div className="flex flex-wrap gap-2">
          {colorOptions.map(color => (
            <button
              key={color.hex}
              onClick={() => {
                const newColors = filters.colors.includes(color.hex)
                  ? filters.colors.filter(c => c !== color.hex)
                  : [...filters.colors, color.hex];
                setFilter('colors', newColors);
              }}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                filters.colors.includes(color.hex) ? 'border-accent scale-110 ring-2 ring-accent/30' : 'border-border hover:scale-105'
              }`}
              style={{ backgroundColor: color.hex }}
              title={color.name[lang]}
            />
          ))}
        </div>
      </div>

      {/* Price */}
      <div>
        <h4 className="font-semibold text-sm mb-3 text-text">{t('filter.price', lang)}</h4>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder={t('filter.min', lang)}
            value={filters.priceMin || ''}
            onChange={(e) => setFilter('priceMin', Number(e.target.value) || 0)}
            className="w-full bg-surface-dark border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
          />
          <input
            type="number"
            placeholder={t('filter.max', lang)}
            value={filters.priceMax === 50000 ? '' : filters.priceMax}
            onChange={(e) => setFilter('priceMax', Number(e.target.value) || 50000)}
            className="w-full bg-surface-dark border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Brand */}
      <div>
        <h4 className="font-semibold text-sm mb-3 text-text">{t('filter.brand', lang)}</h4>
        <div className="space-y-1">
          {brands.map(brand => (
            <button
              key={brand}
              onClick={() => setFilter('brand', filters.brand === brand ? '' : brand)}
              className={`block w-full text-start px-3 py-2 rounded-lg text-sm transition-colors ${
                filters.brand === brand ? 'bg-accent/10 text-accent font-semibold' : 'text-text-light hover:bg-surface-dark'
              }`}
            >
              {brand}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button onClick={resetFilters} className="flex-1 py-2.5 border border-border rounded-lg text-sm font-medium text-text-light hover:bg-surface-dark transition-colors">
          {t('filter.reset', lang)}
        </button>
        <button onClick={() => setFilterOpen(false)} className="flex-1 py-2.5 bg-accent text-primary rounded-lg text-sm font-bold hover:bg-accent-light transition-colors lg:hidden">
          {t('filter.apply', lang)}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-[160px] bg-card rounded-2xl p-5 border border-border/50 shadow-sm">
          {content}
        </div>
      </aside>

      {/* Mobile filter overlay */}
      {isFilterOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60" onClick={() => setFilterOpen(false)}>
          <div className={`absolute top-0 ${isRtl ? 'right-0' : 'left-0'} w-80 max-w-[90vw] h-full bg-card overflow-y-auto p-5`} onClick={e => e.stopPropagation()}>
            {content}
          </div>
        </div>
      )}
    </>
  );
}
