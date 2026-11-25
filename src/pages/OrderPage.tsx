import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Minus, Plus, Check, Printer, ArrowRight, Shield, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { t, formatPrice } from '../lib/i18n';
import { products, wilayas } from '../lib/data';
import { Lang } from '../lib/types';
import { normalizePhone, sanitizeText, validators } from '../lib/formValidation';
import { ApiError, bootstrapSession, ordersApi } from '../lib/api';

type OrderStep = 'form' | 'success';

interface CustomerForm {
  fullName: string;
  phone: string;
  email: string;
  commune: string;
  address: string;
}

interface CreatedOrder {
  id: string;
  invoiceNumber: string;
  total: number;
  [key: string]: unknown;
}

function apiErrorText(err: unknown, lang: Lang): string {
  const isRtl = lang === 'ar';
  const code = err instanceof ApiError ? err.code : 'request_failed';
  switch (code) {
    case 'rate_limited':
      return isRtl ? 'محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.' : 'Too many attempts. Please wait and try again.';
    case 'out_of_stock':
      return isRtl ? 'هذا المقاس غير متوفر حالياً.' : 'This size is out of stock.';
    case 'invalid_input':
      return isRtl ? 'يرجى مراجعة البيانات المدخلة.' : 'Please review the information you entered.';
    default:
      return isRtl ? 'تعذّر إتمام الطلب. حاول مرة أخرى.' : 'Could not complete the order. Please try again.';
  }
}

export default function OrderPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lang, getActiveDeliveryCompanies } = useStore();
  const isRtl = lang === 'ar';
  const product = products.find(p => p.id === id);
  const deliveryCompanies = getActiveDeliveryCompanies();

  const [quantity, setQuantity] = useState(Number(searchParams.get('qty')) || 1);
  const [selectedSize, setSelectedSize] = useState(searchParams.get('size') || '');
  const [selectedColorIdx, setSelectedColorIdx] = useState(Number(searchParams.get('color')) || 0);
  const [selectedWilaya, setSelectedWilaya] = useState('');
  const [customer, setCustomer] = useState<CustomerForm>({ fullName: '', phone: '', email: '', commune: '', address: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<OrderStep>('form');
  const [orderError, setOrderError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);

  useEffect(() => {
    // The first state-changing request needs the signed CSRF cookie.
    void bootstrapSession();
  }, []);

  if (!product) return <div className="text-center py-20">{t('no_results', lang)}</div>;

  const wilaya = wilayas.find(w => w.code === selectedWilaya);
  // Display estimate only — the API recomputes the authoritative total.
  const deliveryPrice = wilaya?.deliveryPrice || 0;
  const subtotal = product.price * quantity;
  const total = subtotal + deliveryPrice;
  const defaultCompany = deliveryCompanies.length > 0 ? deliveryCompanies[0] : null;
  const selectedColor = product.colors[selectedColorIdx] ?? product.colors[0];

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!validators.fullName(customer.fullName)) errs.fullName = lang === 'ar' ? 'الاسم مطلوب (2-100 حرف)' : 'Name required (2-100 chars)';
    if (!validators.phone(customer.phone)) errs.phone = lang === 'ar' ? 'رقم هاتف غير صالح' : 'Invalid phone';
    if (!selectedWilaya || !validators.wilayaCode(selectedWilaya)) errs.wilaya = lang === 'ar' ? 'اختر الولاية' : 'Select wilaya';
    if (!validators.commune(customer.commune)) errs.commune = lang === 'ar' ? 'البلدية مطلوبة' : 'Commune required';
    if (!validators.address(customer.address)) errs.address = lang === 'ar' ? 'العنوان مطلوب (5+ حروف)' : 'Address required (5+ chars)';
    if (!selectedSize || !validators.size(selectedSize)) errs.size = lang === 'ar' ? 'اختر المقاس' : 'Select size';
    if (!validators.quantity(quantity)) errs.quantity = lang === 'ar' ? 'كمية غير صالحة' : 'Invalid quantity';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const phone = normalizePhone(customer.phone);
    const fullName = sanitizeText(customer.fullName);
    const commune = sanitizeText(customer.commune);
    const address = sanitizeText(customer.address);
    setCustomer(prev => ({ ...prev, fullName, commune, address, phone }));
    setOrderError('');
    setIsSubmitting(true);
    try {
      await bootstrapSession();
      // The server recomputes price, delivery and stock; the client sends no money values.
      // There is no SMS/phone verification step for customer orders.
      const res = await ordersApi.create({
        productId: product.id,
        size: selectedSize,
        colorHex: selectedColor.hex,
        quantity,
        wilayaCode: selectedWilaya,
        deliveryCompanyId: defaultCompany?.id,
        customer: {
          fullName,
          phone,
          email: customer.email.trim() || undefined,
          commune,
          address,
        },
      });

      const order = res.order as unknown as CreatedOrder;
      setCreatedOrder({ ...order, invoiceNumber: res.invoiceNumber });
      setStep('success');
    } catch (err) {
      setOrderError(apiErrorText(err, lang));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── SUCCESS ──────────────────────────────────────────────
  if (step === 'success' && createdOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12" dir={isRtl ? 'rtl' : 'ltr'}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-3xl p-8 border border-border/50 shadow-lg">
          <div className="text-center mb-6">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={40} className="text-success" />
            </motion.div>
            <h2 className="font-heading text-2xl font-bold mb-2">{t('order.success', lang)}</h2>
            <p className="text-text-muted">{t('order.number', lang)}: <span className="font-bold text-accent">{createdOrder.invoiceNumber}</span></p>
          </div>
          <div className="bg-surface rounded-xl p-4 mb-6 text-start space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-text-muted">{t('order.total', lang)}</span><span className="font-bold">{formatPrice(createdOrder.total, lang)}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">{t('order.payment', lang)}</span><span>{t('order.cod', lang)}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">{t('order.estimated_delivery', lang)}</span><span>2-5 {lang === 'ar' ? 'أيام' : 'days'}</span></div>
          </div>
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 mb-6 text-center">
            <p className="text-sm font-semibold text-text mb-1">{lang === 'ar' ? 'سيتواصل معك فريقنا قريباً لتأكيد الطلب' : 'Our team will contact you soon to confirm your order'}</p>
            <p className="text-xs text-text-muted">{lang === 'ar' ? 'عبر الهاتف أو واتساب' : 'Via phone or WhatsApp'}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/invoice/${createdOrder.id}`, { state: { order: createdOrder } })}
              className="flex-1 bg-accent hover:bg-accent-light text-primary py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Printer size={18} /> {t('order.print_invoice', lang)}
            </button>
            <button onClick={() => navigate('/')} className="flex-1 bg-surface-dark hover:bg-border text-text py-3 rounded-xl font-bold text-sm transition-colors">
              {t('home', lang)}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── ORDER FORM ───────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 py-8" dir={isRtl ? 'rtl' : 'ltr'}>
      <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2">{t('order.title', lang)}</h1>
      {/* Steps: details → invoice (no phone verification step) */}
      <div className="flex items-center gap-2 mb-8">
        <div className="flex items-center gap-2"><div className="w-8 h-8 bg-accent text-primary rounded-full flex items-center justify-center text-sm font-bold">1</div><span className="text-sm font-semibold text-accent">{lang === 'ar' ? 'بيانات الطلب' : 'Details'}</span></div>
        <div className="flex-1 h-0.5 bg-border mx-2" />
        <div className="flex items-center gap-2"><div className="w-8 h-8 bg-surface-dark text-text-muted rounded-full flex items-center justify-center text-sm font-bold">2</div><span className="text-sm text-text-muted">{lang === 'ar' ? 'الفاتورة' : 'Invoice'}</span></div>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Product */}
            <div className="bg-card rounded-2xl p-5 border border-border/50">
              <div className="flex gap-4">
                <img src={product.images[0]} alt={product.name[lang]} className="w-24 h-24 rounded-xl object-cover" />
                <div className="flex-1">
                  <h3 className="font-semibold">{product.name[lang]}</h3>
                  <p className="text-sm text-text-muted">{product.brand}</p>
                  <p className="text-accent font-bold mt-1">{formatPrice(product.price, lang)}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block">{t('product.size', lang)}</label>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map(size => (
                      <button type="button" key={size} onClick={() => setSelectedSize(size)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${selectedSize === size ? 'bg-accent text-primary' : 'bg-surface-dark text-text-light hover:bg-accent/20'}`}>{size}</button>
                    ))}
                  </div>
                  {errors.size && <p className="text-danger text-xs mt-1">{errors.size}</p>}
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block">{t('product.color', lang)}</label>
                  <div className="flex gap-2">
                    {product.colors.map((c, i) => (
                      <button type="button" key={i} onClick={() => setSelectedColorIdx(i)} aria-label={c.name[lang]}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColorIdx === i ? 'border-accent ring-2 ring-accent/30' : 'border-border'}`}
                        style={{ backgroundColor: c.hex }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <label className="text-sm font-semibold mb-2 block">{t('order.quantity', lang)}</label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-9 h-9 bg-surface-dark rounded-lg flex items-center justify-center"><Minus size={14} /></button>
                  <span className="font-bold">{quantity}</span>
                  <button type="button" onClick={() => setQuantity(Math.min(99, quantity + 1))} className="w-9 h-9 bg-surface-dark rounded-lg flex items-center justify-center"><Plus size={14} /></button>
                </div>
              </div>
            </div>
            {/* Customer */}
            <div className="bg-card rounded-2xl p-5 border border-border/50">
              <h3 className="font-semibold text-lg mb-4">{t('order.customer_info', lang)}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-text-muted mb-1 block">{t('order.full_name', lang)} *</label>
                  <input type="text" value={customer.fullName} onChange={e => setCustomer({...customer, fullName: e.target.value})}
                    maxLength={100} autoComplete="name"
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
                  {errors.fullName && <p className="text-danger text-xs mt-1">{errors.fullName}</p>}
                </div>
                <div>
                  <label className="text-sm text-text-muted mb-1 block">{t('order.phone', lang)} *</label>
                  <div className="relative">
                    <input type="tel" dir="ltr" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})}
                      maxLength={20} autoComplete="tel" placeholder="0555 123 456" className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
                    <div className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'left-3' : 'right-3'} flex items-center gap-1`}>
                      <Shield size={12} className="text-accent" />
                      <span className="text-[9px] text-accent font-semibold">{lang === 'ar' ? 'للتواصل فقط' : 'Contact only'}</span>
                    </div>
                  </div>
                  {errors.phone && <p className="text-danger text-xs mt-1">{errors.phone}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm text-text-muted mb-1 block">{t('order.email', lang)}</label>
                  <input type="email" dir="ltr" value={customer.email} onChange={e => setCustomer({...customer, email: e.target.value})}
                    maxLength={254} autoComplete="email" placeholder="you@example.com"
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="text-sm text-text-muted mb-1 block">{t('order.wilaya', lang)} *</label>
                  <select value={selectedWilaya} onChange={e => setSelectedWilaya(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent">
                    <option value="">{t('select_wilaya', lang)}</option>
                    {wilayas.map(w => <option key={w.code} value={w.code}>{w.code} - {w.name[lang]}</option>)}
                  </select>
                  {errors.wilaya && <p className="text-danger text-xs mt-1">{errors.wilaya}</p>}
                </div>
                <div>
                  <label className="text-sm text-text-muted mb-1 block">{t('order.commune', lang)} *</label>
                  <input type="text" value={customer.commune} onChange={e => setCustomer({...customer, commune: e.target.value})}
                    maxLength={100} className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
                  {errors.commune && <p className="text-danger text-xs mt-1">{errors.commune}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm text-text-muted mb-1 block">{t('order.address', lang)} *</label>
                  <textarea value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} rows={2}
                    maxLength={300} className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent resize-none" />
                  {errors.address && <p className="text-danger text-xs mt-1">{errors.address}</p>}
                </div>
              </div>
            </div>
            {/* Payment — COD only */}
            <div className="bg-card rounded-2xl p-5 border border-border/50">
              <h3 className="font-semibold text-lg mb-3">{t('order.payment', lang)}</h3>
              <div className="bg-accent/5 border-2 border-accent rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center"><span className="text-xl">💵</span></div>
                <div>
                  <p className="font-semibold text-sm">{t('order.cod', lang)}</p>
                  <p className="text-xs text-text-muted">{lang === 'ar' ? 'ادفع عند استلام طلبك' : 'Pay when you receive your order'}</p>
                </div>
                <Check size={20} className="text-accent mr-auto" />
              </div>
            </div>
          </div>
          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-[160px] bg-card rounded-2xl p-5 border border-border/50 shadow-sm">
              <h3 className="font-semibold text-lg mb-4">{t('order.summary', lang)}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-text-muted">{product.name[lang]}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">{t('order.unit_price', lang)}</span><span>{formatPrice(product.price, lang)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">{t('order.quantity', lang)}</span><span>{quantity}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">{t('product.size', lang)}</span><span>{selectedSize || '-'}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">{t('product.color', lang)}</span><span>{selectedColor?.name[lang]}</span></div>
                <hr className="border-border" />
                <div className="flex justify-between"><span className="text-text-muted">{t('order.subtotal', lang)}</span><span className="font-semibold">{formatPrice(subtotal, lang)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">{t('order.delivery_price', lang)}</span><span className="font-semibold">{selectedWilaya ? formatPrice(deliveryPrice, lang) : '-'}</span></div>
                <hr className="border-border" />
                <div className="flex justify-between text-lg"><span className="font-bold">{t('order.total', lang)}</span><span className="font-bold text-accent">{formatPrice(total, lang)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">{t('order.payment', lang)}</span><span className="text-xs font-semibold">{t('order.cod', lang)}</span></div>
              </div>
              <div className="mt-4 bg-accent/5 border border-accent/20 rounded-xl p-3 flex items-start gap-2">
                <Shield size={16} className="text-accent shrink-0 mt-0.5" />
                <p className="text-[11px] text-text-light leading-relaxed">
                  {t('landing.server_note', lang)}
                </p>
              </div>
              {orderError && <p className="mt-3 text-danger text-sm text-center">{orderError}</p>}
              <button type="submit" disabled={isSubmitting} className="w-full mt-4 bg-accent hover:bg-accent-light text-primary py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-accent/20 disabled:opacity-60 disabled:cursor-not-allowed">
                {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : <Shield size={18} />}
                {isSubmitting ? t('landing.creating', lang) : t('order.submit', lang)}
                {!isSubmitting ? <ArrowRight size={18} /> : null}
              </button>
              <p className="text-[10px] text-text-muted text-center mt-2">
                {lang === 'ar' ? 'لا يوجد تحقق برقم الهاتف للطلبات.' : 'No phone verification is required for orders.'}
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
