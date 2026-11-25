import { Link } from 'react-router-dom';
import { Facebook, Instagram, Phone, Mail, MapPin, MessageCircle } from 'lucide-react';
import { useStore } from '../lib/store';
import { t } from '../lib/i18n';
import { storeSettings } from '../lib/data';

export default function Footer() {
  const { lang } = useStore();
  const isRtl = lang === 'ar';

  return (
    <footer className="bg-primary text-white" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Store info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center text-primary font-bold text-lg">خ</div>
              <div>
                <h3 className="font-heading text-xl font-bold text-accent">KHOTWA</h3>
                <p className="text-[10px] text-white/50">{storeSettings.name[lang]}</p>
              </div>
            </div>
            <p className="text-white/60 text-sm mb-4 leading-relaxed">
              {lang === 'ar' ? 'متجر متخصص في بيع أفخم الأحذية الرجالية في الجزائر. جودة عالية وأسعار مناسبة.' :
               lang === 'fr' ? 'Boutique spécialisée dans les chaussures pour hommes de luxe en Algérie.' :
               'Specialized store for premium men\'s shoes in Algeria.'}
            </p>
            <div className="space-y-2 text-sm text-white/60">
              <div className="flex items-center gap-2"><MapPin size={14} className="text-accent shrink-0" /><span>{storeSettings.address}</span></div>
              <div className="flex items-center gap-2"><Phone size={14} className="text-accent shrink-0" /><span dir="ltr">{storeSettings.phone}</span></div>
              <div className="flex items-center gap-2"><Mail size={14} className="text-accent shrink-0" /><span>{storeSettings.email}</span></div>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-accent font-semibold mb-4">{t('footer.quick_links', lang)}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="text-white/60 hover:text-accent transition-colors">{t('home', lang)}</Link></li>
              <li><Link to="/products" className="text-white/60 hover:text-accent transition-colors">{t('products', lang)}</Link></li>
              <li><Link to="/track-order" className="text-white/60 hover:text-accent transition-colors">{t('order.track', lang)}</Link></li>
              <li><Link to="/about" className="text-white/60 hover:text-accent transition-colors">{t('footer.about', lang)}</Link></li>
            </ul>
          </div>

          {/* Customer service */}
          <div>
            <h4 className="text-accent font-semibold mb-4">{t('footer.customer_service', lang)}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/privacy" className="text-white/60 hover:text-accent transition-colors">{t('footer.privacy', lang)}</Link></li>
              <li><Link to="/terms" className="text-white/60 hover:text-accent transition-colors">{t('footer.terms', lang)}</Link></li>
              <li><Link to="/data-protection" className="text-white/60 hover:text-accent transition-colors">{t('footer.data_protection', lang)}</Link></li>
              <li><Link to="/contact" className="text-white/60 hover:text-accent transition-colors">{t('footer.contact', lang)}</Link></li>
            </ul>
          </div>

          {/* Social only — payment methods and delivery companies are intentionally omitted. */}
          <div>
            <h4 className="text-accent font-semibold mb-4">{t('footer.follow_us', lang)}</h4>
            <div className="flex gap-3">
              <a href={`https://wa.me/${storeSettings.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener" className="w-9 h-9 bg-[#25D366] rounded-full flex items-center justify-center hover:bg-[#1fb855] text-white transition-all"><MessageCircle size={16} /></a>
              <a href={storeSettings.socialMedia.facebook} target="_blank" rel="noopener" className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-accent hover:text-primary transition-all"><Facebook size={16} /></a>
              <a href={storeSettings.socialMedia.instagram} target="_blank" rel="noopener" className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-accent hover:text-primary transition-all"><Instagram size={16} /></a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/40">
          <span>© {new Date().getFullYear()} KHOTWA. {t('footer.rights', lang)}</span>
          <span>{lang === 'ar' ? 'متوافق مع قانون حماية البيانات 18-07' : lang === 'fr' ? 'Conforme à la loi 18-07 sur la protection des données' : 'Compliant with Data Protection Law 18-07'}</span>
        </div>
      </div>
    </footer>
  );
}
