import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { useStore } from '../lib/store';
import { t } from '../lib/i18n';
import { products } from '../lib/data';
import ProductCard from '../components/ProductCard';
import FilterSidebar from '../components/FilterSidebar';

export default function ProductsPage() {
  const { lang, filters, searchQuery, setFilterOpen } = useStore();
  const [searchParams] = useSearchParams();
  const isRtl = lang === 'ar';

  // Sync URL params to filters on mount
  const catParam = searchParams.get('cat');
  const viewParam = searchParams.get('view');

  const filteredProducts = useMemo(() => {
    let result = [...products];
    
    // Category from URL or filter
    const activeCat = catParam || filters.category;
    if (activeCat && activeCat !== 'all') {
      result = result.filter(p => p.category === activeCat);
    }

    // View filters
    if (viewParam === 'sale') result = result.filter(p => p.discount);
    if (viewParam === 'new') result = result.filter(p => p.isNew);

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.ar.includes(q) || p.name.fr.toLowerCase().includes(q) || p.name.en.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) || p.category.includes(q)
      );
    }

    // Size filter
    if (filters.sizes.length > 0) {
      result = result.filter(p => filters.sizes.some(s => p.sizes.includes(s)));
    }

    // Color filter
    if (filters.colors.length > 0) {
      result = result.filter(p => filters.colors.some(c => p.colors.some(pc => pc.hex === c)));
    }

    // Price filter
    result = result.filter(p => p.price >= filters.priceMin && p.price <= filters.priceMax);

    // Brand filter
    if (filters.brand) {
      result = result.filter(p => p.brand === filters.brand);
    }

    return result;
  }, [filters, searchQuery, catParam, viewParam]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">{t('products', lang)}</h1>
          <p className="text-text-muted text-sm mt-1">
            {filteredProducts.length} {lang === 'ar' ? 'منتج' : lang === 'fr' ? 'produits' : 'products'}
          </p>
        </div>
        <button onClick={() => setFilterOpen(true)} className="lg:hidden flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-xl text-sm font-medium hover:bg-surface-dark transition-colors">
          <SlidersHorizontal size={16} />
          {t('filter.title', lang)}
        </button>
      </div>

      <div className="flex gap-6">
        <FilterSidebar />

        {/* Product grid */}
        <div className="flex-1">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {filteredProducts.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-6xl mb-4">👟</p>
              <p className="text-text-muted text-lg">{t('no_results', lang)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
