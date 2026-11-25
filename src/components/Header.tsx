import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, User, Menu, X, Globe, ChevronDown } from 'lucide-react';
import { useStore } from '../lib/store';
import { t, formatPrice } from '../lib/i18n';
import { Lang } from '../lib/types';

const langLabels: Record<Lang, string> = { ar: 'عربي', fr: 'Français', en: 'English' };

export default function Header() {
  const { lang, setLang, getCartTotal, getCartCount, searchQuery, setSearchQuery, isMobileMenuOpen, setMobileMenuOpen } = useStore();
  const [langDropdown, setLangDropdown] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const navigate = useNavigate();
  const langRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const isRtl = lang === 'ar';

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangDropdown(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserDropdown(false);
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate('/products');
  };

  return (
    <header className="sticky top-0 z-50 bg-primary text-white shadow-lg">
      {/* Top bar */}
      <div className="bg-accent/10 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between text-xs">
          <span className="text-accent-light">{t('free_delivery', lang)}</span>
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <div ref={langRef} className="relative">
              <button onClick={() => setLangDropdown(!langDropdown)} className="flex items-center gap-1 hover:text-accent transition-colors">
                <Globe size={14} />
                <span>{langLabels[lang]}</span>
                <ChevronDown size={12} />
              </button>
              {langDropdown && (
                <div className="absolute top-full mt-1 bg-white text-text rounded-lg shadow-xl py-1 min-w-[120px] z-50" style={{ [isRtl ? 'right' : 'left']: 0 }}>
                  {(Object.keys(langLabels) as Lang[]).map(l => (
                    <button key={l} onClick={() => { setLang(l); setLangDropdown(false); }} className={`block w-full text-start px-4 py-2 hover:bg-surface text-sm ${lang === l ? 'text-accent font-bold' : ''}`}>
                      {langLabels[l]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Mobile menu */}
          <button className="lg:hidden text-white" onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center text-primary font-bold text-lg">خ</div>
            <div className="hidden sm:block">
              <h1 className="font-heading text-xl font-bold text-accent tracking-wide">KHOTWA</h1>
              <p className="text-[10px] text-white/60 -mt-1">{lang === 'ar' ? 'أحذية رجالية فاخرة' : lang === 'fr' ? 'Chaussures Homme de Luxe' : 'Premium Men\'s Shoes'}</p>
            </div>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search.placeholder', lang)}
                className="w-full bg-white/10 border border-white/20 rounded-full px-5 py-2.5 text-sm placeholder:text-white/40 focus:outline-none focus:border-accent focus:bg-white/15 transition-all"
                dir={isRtl ? 'rtl' : 'ltr'}
              />
              <button type="submit" className="absolute top-1/2 -translate-y-1/2 text-white/60 hover:text-accent transition-colors" style={{ [isRtl ? 'left' : 'right']: '16px' }}>
                <Search size={18} />
              </button>
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* User */}
            <div ref={userRef} className="relative">
              <button onClick={() => setUserDropdown(!userDropdown)} className="flex items-center gap-1 hover:text-accent transition-colors p-2">
                <User size={20} />
                <span className="hidden lg:inline text-sm">{t('my_account', lang)}</span>
              </button>
              {userDropdown && (
                <div className="absolute top-full mt-1 bg-white text-text rounded-lg shadow-xl py-1 min-w-[160px] z-50" style={{ [isRtl ? 'left' : 'right']: 0 }}>
                  <Link to="/track-order" className="block px-4 py-2 hover:bg-surface text-sm" onClick={() => setUserDropdown(false)}>{t('order.track', lang)}</Link>
                  <Link to="/admin" className="block px-4 py-2 hover:bg-surface text-sm" onClick={() => setUserDropdown(false)}>{t('dashboard', lang)}</Link>
                </div>
              )}
            </div>

            {/* Cart */}
            <Link to="/cart" className="relative flex items-center gap-2 bg-accent hover:bg-accent-light text-primary px-4 py-2 rounded-full transition-colors font-semibold text-sm">
              <ShoppingBag size={18} />
              <span className="hidden sm:inline">{formatPrice(getCartTotal(), lang)}</span>
              {getCartCount() > 0 && (
                <span className="absolute -top-2 -right-2 bg-danger text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {getCartCount()}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile search */}
        <form onSubmit={handleSearch} className="md:hidden mt-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search.placeholder', lang)}
              className="w-full bg-white/10 border border-white/20 rounded-full px-5 py-2.5 text-sm placeholder:text-white/40 focus:outline-none focus:border-accent transition-all"
              dir={isRtl ? 'rtl' : 'ltr'}
            />
            <button type="submit" className="absolute top-1/2 -translate-y-1/2 text-white/60" style={{ [isRtl ? 'left' : 'right']: '16px' }}>
              <Search size={18} />
            </button>
          </div>
        </form>
      </div>
    </header>
  );
}
