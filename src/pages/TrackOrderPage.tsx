import { useState } from 'react';
import { Search, Package, Truck, Check, Clock, AlertCircle, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '../lib/store';
import { t, formatPrice } from '../lib/i18n';
import { OrderStatus } from '../lib/types';
import { ApiError, ordersApi } from '../lib/api';
import { normalizePhone, validators } from '../lib/formValidation';

const statusSteps: OrderStatus[] = ['new', 'confirmed', 'preparing', 'shipped', 'in_transit', 'delivered'];
const statusIcons: Record<string, typeof Clock> = {
  new: Clock, confirmed: Check, preparing: Package, shipped: Truck, in_transit: Truck, delivered: Check, cancelled: AlertCircle, returned: AlertCircle
};

interface TrackingResult {
  id: string;
  invoiceNumber: string;
  status: OrderStatus;
  paymentStatus: string;
  productName: string;
  quantity: number;
  selectedSize: string;
  total: number;
  wilaya: string;
  commune: string;
  createdAt: string;
  updatedAt: string;
}

export default function TrackOrderPage() {
  const { lang } = useStore();
  const [invoice, setInvoice] = useState('');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<TrackingResult | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isRtl = lang === 'ar';

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(undefined);

    const cleanInvoice = invoice.trim().toUpperCase();
    if (!/^INV-\d{4}-\d{4,8}$/.test(cleanInvoice)) {
      setError(lang === 'ar' ? 'رقم الفاتورة غير صالح (مثال: INV-2026-1000)' : 'Invalid invoice number (e.g. INV-2026-1000)');
      return;
    }
    if (!validators.phone(phone)) {
      setError(lang === 'ar' ? 'أدخل رقم الهاتف المستخدم في الطلب' : 'Enter the phone number used for the order');
      return;
    }

    setLoading(true);
    try {
      const res = await ordersApi.track(cleanInvoice, normalizePhone(phone));
      setResult(res.order as unknown as TrackingResult);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'rate_limited') {
        setError(lang === 'ar' ? 'محاولات كثيرة. انتظر قليلاً.' : 'Too many attempts. Please wait.');
      } else if (err instanceof ApiError && err.code === 'order_not_found') {
        setResult(null);
      } else {
        setError(lang === 'ar' ? 'تعذّر البحث. حاول مرة أخرى.' : 'Search failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12" dir={isRtl ? 'rtl' : 'ltr'}>
      <h1 className="font-heading text-2xl md:text-3xl font-bold text-center mb-2">{t('order.track', lang)}</h1>
      <p className="text-text-muted text-center mb-8">
        {lang === 'ar'
          ? 'أدخل رقم الفاتورة ورقم الهاتف لتتبع طلبك'
          : lang === 'fr'
            ? 'Entrez le numéro de facture et votre téléphone pour suivre votre commande'
            : 'Enter your invoice number and phone number to track your order'}
      </p>

      <form onSubmit={handleSearch} className="space-y-3 mb-8">
        <input
          type="text"
          value={invoice}
          onChange={e => setInvoice(e.target.value)}
          placeholder="INV-2026-1000"
          dir="ltr"
          maxLength={32}
          className="w-full bg-card border border-border rounded-xl px-5 py-3 text-sm focus:outline-none focus:border-accent"
        />
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Phone size={16} className="absolute top-1/2 -translate-y-1/2 start-4 text-text-muted" />
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="0555 123 456"
              dir="ltr"
              maxLength={20}
              autoComplete="tel"
              className="w-full bg-card border border-border rounded-xl ps-10 pe-5 py-3 text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <button type="submit" disabled={loading} className="bg-accent hover:bg-accent-light text-primary px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-60">
            <Search size={18} />
            {loading ? (lang === 'ar' ? 'بحث...' : 'Searching...') : (lang === 'ar' ? 'بحث' : 'Search')}
          </button>
        </div>
      </form>

      {error && (
        <div className="flex items-start gap-2 text-sm text-danger bg-danger/5 border border-danger/20 rounded-xl p-3 mb-6">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result === null && (
        <div className="text-center py-10 bg-card rounded-2xl border border-border/50">
          <AlertCircle size={48} className="mx-auto text-text-muted mb-3" />
          <p className="text-text-muted">{lang === 'ar' ? 'لم يتم العثور على الطلب. تحقق من البيانات.' : 'Order not found. Check your details.'}</p>
        </div>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-text-muted">{t('order.number', lang)}</p>
              <p className="font-bold text-accent text-lg">{result.invoiceNumber}</p>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
              result.status === 'delivered' ? 'bg-success/10 text-success' :
              result.status === 'cancelled' ? 'bg-danger/10 text-danger' : 'bg-accent/10 text-accent'
            }`}>
              {t(`status.${result.status}`, lang)}
            </span>
          </div>

          {/* Progress steps */}
          <div className="flex items-center justify-between mb-8 relative">
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
            {statusSteps.map((step, i) => {
              const currentIdx = statusSteps.indexOf(result.status);
              const isActive = i <= currentIdx;
              const Icon = statusIcons[step];
              return (
                <div key={step} className="relative flex flex-col items-center z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-accent text-primary' : 'bg-surface-dark text-text-muted'}`}>
                    <Icon size={18} />
                  </div>
                  <span className={`text-[10px] mt-1 ${isActive ? 'text-accent font-semibold' : 'text-text-muted'}`}>
                    {t(`status.${step}`, lang)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Order details (tracking payload contains no address or email) */}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-text-muted">{lang === 'ar' ? 'المنتج' : 'Product'}</span><span>{result.productName}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">{t('order.quantity', lang)}</span><span>{result.quantity} — {result.selectedSize}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">{t('order.total', lang)}</span><span className="font-bold">{formatPrice(result.total, lang)}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">{t('order.wilaya', lang)}</span><span>{result.wilaya} — {result.commune}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">{lang === 'ar' ? 'آخر تحديث' : 'Last update'}</span><span dir="ltr">{new Date(result.updatedAt).toLocaleString(isRtl ? 'ar-DZ' : 'fr-DZ')}</span></div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
