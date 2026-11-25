import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  Minus,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { t, formatPrice } from '../lib/i18n';
import { products, wilayas } from '../lib/data';
import { Lang } from '../lib/types';
import { normalizePhone, sanitizeText, validators } from '../lib/formValidation';
import { ApiError, bootstrapSession, ordersApi } from '../lib/api';

interface CustomerForm {
  fullName: string;
  phone: string;
  commune: string;
  address: string;
}

function apiErrorText(err: unknown, lang: Lang): string {
  const isRtl = lang === 'ar';
  const code = err instanceof ApiError ? err.code : 'request_failed';
  switch (code) {
    case 'rate_limited':
      return isRtl
        ? 'محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.'
        : 'Too many attempts. Please wait a moment and try again.';
    case 'out_of_stock':
      return isRtl
        ? 'هذا المقاس غير متوفر حالياً. جرّب مقاساً آخر.'
        : 'This size is out of stock. Please pick another size.';
    case 'invalid_input':
      return isRtl
        ? 'يرجى مراجعة البيانات المدخلة.'
        : 'Please review the information you entered.';
    default:
      return isRtl
        ? 'تعذّر إتمام الطلب. حاول مرة أخرى.'
        : 'Could not complete the order. Please try again.';
  }
}

export default function ProductLandingPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lang, getActiveDeliveryCompanies } = useStore();
  const isRtl = lang === 'ar';
  const Arrow = isRtl ? ArrowLeft : ArrowRight;
  const product = products.find((p) => p.id === id);

  const initialColor = Number(searchParams.get('color'));
  const initialQuantity = Number(searchParams.get('qty'));

  const [selectedSize, setSelectedSize] = useState(searchParams.get('size') ?? '');
  const [selectedColorIdx, setSelectedColorIdx] = useState(
    Number.isInteger(initialColor) && initialColor >= 0 && initialColor < (product?.colors.length ?? 0)
      ? initialColor
      : 0,
  );
  const [quantity, setQuantity] = useState(
    Number.isInteger(initialQuantity) && initialQuantity >= 1 && initialQuantity <= 99
      ? initialQuantity
      : 1,
  );
  const [selectedWilaya, setSelectedWilaya] = useState('');
  const [customer, setCustomer] = useState<CustomerForm>({
    fullName: '',
    phone: '',
    commune: '',
    address: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [orderError, setOrderError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const orderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // The first state-changing request needs the signed CSRF cookie.
    void bootstrapSession();
  }, []);

  if (!product) {
    return (
      <div className="text-center py-20" dir={isRtl ? 'rtl' : 'ltr'}>
        <p className="text-text-muted">{t('no_results', lang)}</p>
        <Link to="/products" className="inline-block mt-4 text-accent font-semibold hover:underline">
          {t('products', lang)}
        </Link>
      </div>
    );
  }

  const selectedColor = product.colors[selectedColorIdx] ?? product.colors[0];
  const wilaya = wilayas.find((w) => w.code === selectedWilaya);
  const deliveryPrice = wilaya?.deliveryPrice ?? 0;
  const subtotal = product.price * quantity;
  const total = subtotal + deliveryPrice;
  const deliveryCompanies = getActiveDeliveryCompanies();
  const defaultCompany = deliveryCompanies[0];
  const maxQuantity = Math.max(1, Math.min(99, product.stockQuantity || 99));
  const isLocked = isSubmitting;

  const fieldError = (key: string) =>
    errors[key] ? <p className="text-danger text-xs mt-1">{errors[key]}</p> : null;

  const scrollToOrder = () => {
    orderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!validators.fullName(customer.fullName)) {
      next.fullName = isRtl
        ? 'الاسم الكامل مطلوب (حرفان على الأقل)'
        : 'Full name is required (at least 2 characters)';
    }
    if (!validators.phone(customer.phone)) {
      next.phone = isRtl ? 'رقم هاتف جزائري غير صالح' : 'Invalid Algerian phone number';
    }
    if (!selectedWilaya || !validators.wilayaCode(selectedWilaya)) {
      next.wilaya = isRtl ? 'اختر الولاية' : 'Select a wilaya';
    }
    if (!validators.commune(customer.commune)) {
      next.commune = isRtl ? 'البلدية مطلوبة' : 'Commune is required';
    }
    if (!validators.address(customer.address)) {
      next.address = isRtl ? 'العنوان مطلوب (5 أحرف على الأقل)' : 'Address is required (at least 5 characters)';
    }
    if (!selectedSize || !validators.size(selectedSize)) {
      next.size = isRtl ? 'اختر المقاس أولاً' : 'Select a size first';
    }
    if (!validators.quantity(quantity)) {
      next.quantity = isRtl ? 'كمية غير صالحة' : 'Invalid quantity';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    const phone = normalizePhone(customer.phone);
    const fullName = sanitizeText(customer.fullName);
    const commune = sanitizeText(customer.commune);
    const address = sanitizeText(customer.address);
    setCustomer((prev) => ({ ...prev, fullName, commune, address, phone }));
    setOrderError('');
    setIsSubmitting(true);
    try {
      // Guarantee the CSRF cookie exists even on a cold page load.
      await bootstrapSession();
      const response = await ordersApi.create({
        productId: product.id,
        size: selectedSize,
        colorHex: selectedColor.hex,
        quantity,
        wilayaCode: selectedWilaya,
        deliveryCompanyId: defaultCompany?.id,
        customer: { fullName, phone, commune, address },
      });
      const order = response.order as { id?: unknown };
      if (typeof order.id !== 'string') throw new Error('missing_order_id');
      // The invoice receives the order through router state only — nothing is persisted in the browser.
      navigate(`/invoice/${order.id}`, {
        state: { order: { ...response.order, invoiceNumber: response.invoiceNumber } },
        replace: true,
      });
    } catch (err) {
      setOrderError(apiErrorText(err, lang));
      setIsSubmitting(false);
    }
  };

  const stockLabel = !product.inStock
    ? t('landing.out_of_stock', lang)
    : product.stockQuantity <= 10
      ? `${t('landing.low_stock', lang)} — ${product.stockQuantity}`
      : t('landing.in_stock', lang);

  const benefits = [
    {
      icon: Truck,
      title: t('landing.trust_delivery_title', lang),
      description: t('landing.trust_delivery_desc', lang),
    },
    {
      icon: ShieldCheck,
      title: t('landing.trust_cod_title', lang),
      description: t('landing.trust_cod_desc', lang),
    },
    {
      icon: BadgeCheck,
      title: t('landing.trust_quality_title', lang),
      description: t('landing.trust_quality_desc', lang),
    },
  ];

  const related = products
    .filter((item) => item.category === product.category && item.id !== product.id)
    .slice(0, 4);

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'}>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-surface-dark/60 via-surface to-surface">
        <div className="max-w-7xl mx-auto px-4 pt-6 pb-12 md:py-10">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-text-muted mb-6">
            <Link to="/" className="hover:text-accent transition-colors">
              {t('home', lang)}
            </Link>
            <span>/</span>
            <Link to="/products" className="hover:text-accent transition-colors">
              {t('products', lang)}
            </Link>
            <span>/</span>
            <span className="text-text">{product.name[lang]}</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-start">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative rounded-[2rem] overflow-hidden bg-card border border-border/60 shadow-xl">
                <img
                  src={product.images[0]}
                  alt={product.name[lang]}
                  className="w-full aspect-square object-cover"
                />
                <div className={`absolute top-4 ${isRtl ? 'right-4' : 'left-4'} flex flex-col gap-2`}>
                  {product.discount ? (
                    <span className="bg-danger text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-lg">
                      -{product.discount}%
                    </span>
                  ) : null}
                  <span className="bg-primary/90 text-accent text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur">
                    {t('landing.offer', lang)}
                  </span>
                </div>
                <div className="absolute inset-x-4 bottom-4 bg-white/90 backdrop-blur rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={15}
                        className={
                          star <= Math.round(product.rating)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-gray-300'
                        }
                      />
                    ))}
                  </div>
                  <div className="text-xs font-semibold text-text">
                    {product.rating} / 5
                    <span className="text-text-muted font-normal"> ({product.reviewCount})</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="flex items-center gap-2 bg-card border border-border/60 rounded-xl px-3 py-2.5">
                  <Truck size={16} className="text-accent shrink-0" />
                  <span className="text-[11px] font-semibold text-text-light leading-tight">
                    {t('landing.trust_delivery_title', lang)}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-card border border-border/60 rounded-xl px-3 py-2.5">
                  <ShieldCheck size={16} className="text-accent shrink-0" />
                  <span className="text-[11px] font-semibold text-text-light leading-tight">
                    {t('landing.trust_cod_title', lang)}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-card border border-border/60 rounded-xl px-3 py-2.5">
                  <BadgeCheck size={16} className="text-accent shrink-0" />
                  <span className="text-[11px] font-semibold text-text-light leading-tight">
                    {t('landing.trust_quality_title', lang)}
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-5"
            >
              <div>
                <p className="text-accent text-xs font-bold tracking-[0.22em] uppercase mb-2">
                  {product.brand}
                </p>
                <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-3">
                  {product.name[lang]}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={16}
                        className={
                          star <= Math.round(product.rating)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-gray-300'
                        }
                      />
                    ))}
                  </div>
                  <span className="text-text-muted">
                    ({product.reviewCount} {t('product.reviews', lang)})
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                      product.inStock ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        product.inStock ? 'bg-success' : 'bg-danger'
                      }`}
                    />
                    {stockLabel}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-4xl font-bold text-accent">
                  {formatPrice(product.price, lang)}
                </span>
                {product.originalPrice ? (
                  <span className="text-lg text-text-muted line-through">
                    {formatPrice(product.originalPrice, lang)}
                  </span>
                ) : null}
                {product.discount ? (
                  <span className="bg-danger/10 text-danger text-sm font-bold px-3 py-1 rounded-full">
                    -{product.discount}%
                  </span>
                ) : null}
              </div>

              <p className="text-text-light leading-relaxed">{product.description[lang]}</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-card border border-border/60 rounded-2xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                    {t('product.material', lang)}
                  </p>
                  <p className="text-sm font-semibold text-text">{product.material[lang]}</p>
                </div>
                <div className="bg-card border border-border/60 rounded-2xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                    {t('landing.available_sizes', lang)}
                  </p>
                  <p className="text-sm font-semibold text-text">
                    {product.sizes[0]} – {product.sizes[product.sizes.length - 1]}
                  </p>
                </div>
                <div className="bg-card border border-border/60 rounded-2xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                    {t('landing.available_colors', lang)}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {product.colors.map((color, index) => (
                      <span
                        key={index}
                        className="w-4 h-4 rounded-full border border-border inline-block"
                        style={{ backgroundColor: color.hex }}
                        title={color.name[lang]}
                      />
                    ))}
                    <span className="text-xs font-semibold text-text">
                      {product.colors.length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={scrollToOrder}
                  disabled={!product.inStock}
                  className="flex-1 bg-accent hover:bg-accent-light text-primary px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingBag size={18} />
                  {t('landing.order_title', lang)}
                  <Arrow size={18} />
                </button>
                <Link
                  to={`/product/${product.id}`}
                  className="flex-1 bg-card hover:bg-surface-dark text-text border border-border px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  {t('landing.full_details', lang)}
                </Link>
              </div>

              <p className="flex items-center gap-2 text-xs text-text-muted">
                <ShieldCheck size={14} className="text-accent shrink-0" />
                {t('landing.hero_note', lang)}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────────── */}
      <section className="bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-4 py-10 md:py-12">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-center mb-7">
            {t('landing.why_title', lang)}
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.08 }}
                className="flex items-start gap-4 bg-surface border border-border/50 rounded-2xl p-5"
              >
                <div className="w-11 h-11 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
                  <benefit.icon size={22} className="text-accent" />
                </div>
                <div>
                  <h3 className="font-bold text-sm mb-1">{benefit.title}</h3>
                  <p className="text-xs text-text-muted leading-relaxed">{benefit.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Order ────────────────────────────────────────────── */}
      <section ref={orderRef} id="order" className="scroll-mt-40 max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="inline-flex items-center gap-1.5 bg-accent/10 text-accent-dark text-xs font-bold px-3 py-1.5 rounded-full mb-3">
            <ShoppingBag size={14} />
            {t('landing.offer', lang)}
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-2">
            {t('landing.order_title', lang)}
          </h2>
          <p className="text-text-muted text-sm md:text-base">{t('landing.order_subtitle', lang)}</p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6 items-start">
          {/* Summary + selection */}
          <div className="lg:col-span-2 bg-card rounded-3xl border border-border/60 shadow-sm p-5 lg:sticky lg:top-40">
            <div className="flex items-center gap-4">
              <img
                src={product.images[0]}
                alt={product.name[lang]}
                className="w-20 h-20 rounded-2xl object-cover border border-border/50 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-[11px] text-accent font-semibold uppercase tracking-wider">
                  {product.brand}
                </p>
                <h3 className="font-heading text-lg font-bold leading-tight">
                  {product.name[lang]}
                </h3>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={11}
                      className={
                        star <= Math.round(product.rating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-300'
                      }
                    />
                  ))}
                  <span className="text-[11px] text-text-muted ms-1">({product.reviewCount})</span>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">
                  {t('product.color', lang)}:{' '}
                  <span className="text-accent">{selectedColor.name[lang]}</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedColorIdx(index)}
                      disabled={isLocked}
                      aria-label={color.name[lang]}
                      className={`w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center disabled:opacity-60 ${
                        selectedColorIdx === index
                          ? 'border-accent scale-105 ring-2 ring-accent/30'
                          : 'border-border hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.hex }}
                    >
                      {selectedColorIdx === index ? (
                        <Check
                          size={15}
                          className={
                            color.hex.toUpperCase() === '#FFFFFF' || color.hex === '#E8F0FE'
                              ? 'text-text'
                              : 'text-white'
                          }
                        />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">{t('product.size', lang)}</h4>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setSelectedSize(size);
                        setErrors((prev) => ({ ...prev, size: '' }));
                      }}
                      disabled={isLocked}
                      className={`w-11 h-11 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 ${
                        selectedSize === size
                          ? 'bg-accent text-primary shadow-lg'
                          : 'bg-surface-dark text-text-light hover:bg-accent/20 border border-border'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                {fieldError('size')}
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">{t('order.quantity', lang)}</h4>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                    disabled={isLocked}
                    className="w-9 h-9 bg-surface-dark rounded-lg flex items-center justify-center hover:bg-accent/20 transition-colors disabled:opacity-60"
                    aria-label="-"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-lg font-bold w-7 text-center">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
                    disabled={isLocked}
                    className="w-9 h-9 bg-surface-dark rounded-lg flex items-center justify-center hover:bg-accent/20 transition-colors disabled:opacity-60"
                    aria-label="+"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                {fieldError('quantity')}
              </div>
            </div>

            <hr className="my-5 border-border" />

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">{t('order.unit_price', lang)}</span>
                <span className="font-semibold">{formatPrice(product.price, lang)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">{t('order.quantity', lang)}</span>
                <span className="font-semibold">{quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">{t('order.subtotal', lang)}</span>
                <span className="font-semibold">{formatPrice(subtotal, lang)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">{t('order.delivery_price', lang)}</span>
                <span className="font-semibold">
                  {selectedWilaya ? formatPrice(deliveryPrice, lang) : '—'}
                </span>
              </div>
              <hr className="border-border" />
              <div className="flex justify-between text-lg">
                <span className="font-bold">{t('order.total', lang)}</span>
                <span className="font-bold text-accent">{formatPrice(total, lang)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">{t('order.payment', lang)}</span>
                <span className="font-semibold">{t('order.cod', lang)}</span>
              </div>
            </div>

            <div className="mt-4 bg-accent/5 border border-accent/20 rounded-xl p-3 flex items-start gap-2">
              <ShieldCheck size={16} className="text-accent shrink-0 mt-0.5" />
              <p className="text-[11px] text-text-light leading-relaxed">
                {t('landing.server_note', lang)}
              </p>
            </div>
          </div>

          {/* Order form */}
          <div className="lg:col-span-3 bg-card rounded-3xl border border-border/60 shadow-sm p-5 md:p-7">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-accent text-primary">
                  1
                </div>
                <span className="text-sm font-semibold text-accent">
                  {t('landing.step_details', lang)}
                </span>
              </div>
              <div className="flex-1 h-0.5 bg-border mx-1" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-surface-dark text-text-muted">
                  2
                </div>
                <span className="text-sm text-text-muted hidden sm:inline">
                  {t('landing.step_invoice', lang)}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label htmlFor="landing-name" className="text-sm text-text-muted mb-1 block">
                      {t('order.full_name', lang)} *
                    </label>
                    <input
                      id="landing-name"
                      type="text"
                      value={customer.fullName}
                      onChange={(e) => setCustomer({ ...customer, fullName: e.target.value })}
                      maxLength={100}
                      autoComplete="name"
                      placeholder={isRtl ? 'مثال: محمد أمين' : 'e.g. Mohamed Amine'}
                      className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                    />
                    {fieldError('fullName')}
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="landing-phone" className="text-sm text-text-muted mb-1 block">
                      {t('order.phone', lang)} *
                    </label>
                    <div className="relative">
                      <input
                        id="landing-phone"
                        type="tel"
                        dir="ltr"
                        value={customer.phone}
                        onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                        maxLength={20}
                        autoComplete="tel"
                        placeholder="0555 123 456"
                        className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                      />
                    </div>
                    {fieldError('phone')}
                  </div>

                  <div>
                    <label htmlFor="landing-wilaya" className="text-sm text-text-muted mb-1 block">
                      {t('order.wilaya', lang)} *
                    </label>
                    <select
                      id="landing-wilaya"
                      value={selectedWilaya}
                      onChange={(e) => {
                        setSelectedWilaya(e.target.value);
                        setErrors((prev) => ({ ...prev, wilaya: '' }));
                      }}
                      className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                    >
                      <option value="">{t('select_wilaya', lang)}</option>
                      {wilayas.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.code} - {item.name[lang]}
                        </option>
                      ))}
                    </select>
                    {fieldError('wilaya')}
                  </div>

                  <div>
                    <label htmlFor="landing-commune" className="text-sm text-text-muted mb-1 block">
                      {t('order.commune', lang)} *
                    </label>
                    <input
                      id="landing-commune"
                      type="text"
                      value={customer.commune}
                      onChange={(e) => setCustomer({ ...customer, commune: e.target.value })}
                      maxLength={100}
                      autoComplete="address-level2"
                      className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                    />
                    {fieldError('commune')}
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="landing-address" className="text-sm text-text-muted mb-1 block">
                      {t('order.address', lang)} *
                    </label>
                    <textarea
                      id="landing-address"
                      value={customer.address}
                      onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                      rows={2}
                      maxLength={300}
                      autoComplete="street-address"
                      className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent resize-none"
                    />
                    {fieldError('address')}
                  </div>
                </div>

                {orderError ? (
                  <p className="mt-4 text-danger text-sm text-center">{orderError}</p>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting || !product.inStock}
                  className="w-full mt-4 bg-accent hover:bg-accent-light text-primary py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-accent/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={18} />
                  )}
                  {isSubmitting ? t('landing.creating', lang) : t('order.submit', lang)}
                  {!isSubmitting ? <Arrow size={18} /> : null}
                </button>
                <p className="text-[11px] text-text-muted text-center mt-3">
                  {t('landing.secure_note', lang)}
                </p>
            </form>
          </div>
        </div>
      </section>

      {/* ── Related ──────────────────────────────────────────── */}
      {related.length > 0 ? (
        <section className="max-w-7xl mx-auto px-4 pb-16">
          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-6">
            {t('product.related', lang)}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((item) => (
              <div key={item.id}>
                <Link
                  to={`/product/${item.id}`}
                  className="group block bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-border/50"
                >
                  <div className="relative aspect-square overflow-hidden bg-surface-dark">
                    <img
                      src={item.images[0]}
                      alt={item.name[lang]}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                    {item.discount ? (
                      <span className="absolute top-3 start-3 bg-danger text-white text-xs font-bold px-2.5 py-1 rounded-full">
                        -{item.discount}%
                      </span>
                    ) : null}
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-text-muted mb-1">{item.brand}</p>
                    <h3 className="font-semibold text-sm line-clamp-2 mb-2 min-h-[2.5rem]">
                      {item.name[lang]}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-accent">
                        {formatPrice(item.price, lang)}
                      </span>
                      {item.originalPrice ? (
                        <span className="text-sm text-text-muted line-through">
                          {formatPrice(item.originalPrice, lang)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => navigate(`/landing/${item.id}`)}
                  className="w-full mt-2 bg-surface-dark hover:bg-accent/20 text-text py-2.5 rounded-xl text-sm font-bold transition-colors"
                >
                  {t('landing.order_title', lang)}
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
