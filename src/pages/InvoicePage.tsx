import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Printer, ArrowRight, ArrowLeft, MapPin, RefreshCw } from 'lucide-react';
import { useStore } from '../lib/store';
import { t, formatPrice } from '../lib/i18n';
import { storeSettings } from '../lib/data';
import { Lang } from '../lib/types';
import { adminApi } from '../lib/api';

/**
 * Invoice data is NOT persisted in the browser. It arrives either from router
 * state right after checkout, or from the authenticated admin API when staff
 * open an order. A guest cannot fetch an arbitrary invoice by id.
 */
interface InvoiceOrder {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  product: {
    name: Record<Lang, string>;
    price: number;
    brand?: string;
    material?: Record<Lang, string>;
  };
  selectedSize: string;
  selectedColor: { name: Record<Lang, string>; hex: string };
  quantity: number;
  customer: { fullName: string; phone: string; address: string };
  wilaya: string;
  commune: string;
  subtotal: number;
  deliveryPrice: number;
  total: number;
  paymentMethod: string;
}

export default function InvoicePage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useStore();
  const isRtl = lang === 'ar';

  const locationOrder = (location.state as { order?: InvoiceOrder } | null)?.order;
  const initialOrder =
    locationOrder && locationOrder.id === orderId ? locationOrder : undefined;
  // undefined = still loading, null = not available.
  const [order, setOrder] = useState<InvoiceOrder | null | undefined>(initialOrder);
  const hasInitialOrder = Boolean(initialOrder);

  useEffect(() => {
    if (!orderId || hasInitialOrder) return;
    let cancelled = false;
    adminApi
      .order(orderId)
      .then((res) => {
        if (!cancelled) setOrder(res.order as unknown as InvoiceOrder);
      })
      .catch(() => {
        if (!cancelled) setOrder(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (order === undefined) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center" dir={isRtl ? 'rtl' : 'ltr'}>
        <RefreshCw size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  if (!order) return (
    <div className="text-center py-20" dir={isRtl ? 'rtl' : 'ltr'}>
      <p className="text-text-muted">{t('no_results', lang)}</p>
      <button onClick={() => navigate('/track-order')} className="mt-4 text-accent underline">
        {t('order.track', lang)}
      </button>
    </div>
  );

  const handlePrint = () => window.print();

  const date = new Date(order.createdAt);
  const formattedDate = date.toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-DZ', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString(lang === 'ar' ? 'ar-DZ' : 'fr-DZ', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="max-w-[210mm] mx-auto px-4 py-8" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Print button — hidden on print */}
      <div className="no-print flex gap-3 mb-6">
        <button onClick={handlePrint} className="flex items-center gap-2 bg-accent hover:bg-accent-light text-primary px-6 py-2.5 rounded-xl font-bold text-sm transition-colors">
          <Printer size={18} /> {t('order.print_invoice', lang)}
        </button>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 bg-surface-dark hover:bg-border text-text px-6 py-2.5 rounded-xl font-bold text-sm transition-colors">
          {isRtl ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
          {lang === 'ar' ? 'رجوع' : 'Back'}
        </button>
      </div>

      {/* ─── A4 Invoice ─────────────────────────────────────── */}
      <div className="bg-white border border-border shadow-lg print:shadow-none print:border-0 overflow-hidden"
        style={{ minHeight: '297mm', maxHeight: '297mm', width: '100%', padding: '12mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>

        {/* ── Header: Store name + Invoice number ── */}
        <div className="flex items-start justify-between pb-5 border-b-2 border-accent mb-5">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center text-primary font-bold text-2xl shadow-md">خ</div>
            <div>
              <h1 className="font-heading text-3xl font-bold text-accent tracking-wide">KHOTWA</h1>
              <p className="text-xs text-text-muted mt-0.5">{storeSettings.name[lang]}</p>
            </div>
          </div>
          <div className="text-end">
            <h2 className="font-heading text-2xl font-bold text-primary">{t('invoice.title', lang)}</h2>
            <p className="text-sm mt-1"><span className="text-text-muted">{t('invoice.number', lang)}:</span> <span className="font-bold text-accent">{order.invoiceNumber}</span></p>
            <p className="text-xs text-text-muted mt-0.5">{formattedDate} — {formattedTime}</p>
          </div>
        </div>

        {/* ── Customer Info ── */}
        <div className="bg-surface rounded-xl p-4 mb-5">
          <h3 className="font-bold text-sm text-accent mb-3 flex items-center gap-2">
            {t('invoice.client_info', lang)}
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div><span className="text-text-muted">{t('order.full_name', lang)}:</span> <span className="font-bold">{order.customer.fullName}</span></div>
            <div><span className="text-text-muted">{t('order.phone', lang)}:</span> <span className="font-bold" dir="ltr">{order.customer.phone}</span></div>
            <div><span className="text-text-muted">{t('order.wilaya', lang)}:</span> <span className="font-bold">{order.wilaya}</span></div>
            <div><span className="text-text-muted">{t('order.commune', lang)}:</span> <span className="font-bold">{order.commune}</span></div>
            <div className="col-span-2"><span className="text-text-muted">{t('order.address', lang)}:</span> <span className="font-bold">{order.customer.address}</span></div>
          </div>
        </div>

        {/* ── Product & Price ── */}
        <div className="flex-1">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-start font-semibold" style={{ borderRadius: isRtl ? '0 8px 0 0' : '8px 0 0 0' }}>{lang === 'ar' ? 'المنتج' : 'Product'}</th>
                <th className="px-3 py-3 text-center font-semibold">{t('product.size', lang)}</th>
                <th className="px-3 py-3 text-center font-semibold">{t('product.color', lang)}</th>
                <th className="px-3 py-3 text-center font-semibold">{t('order.quantity', lang)}</th>
                <th className="px-3 py-3 text-center font-semibold">{t('order.unit_price', lang)}</th>
                <th className="px-4 py-3 text-end font-semibold" style={{ borderRadius: isRtl ? '8px 0 0 0' : '0 8px 0 0' }}>{t('order.total', lang)}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b-2 border-border">
                <td className="px-4 py-4">
                  <p className="font-bold">{order.product.name[lang]}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {[order.product.brand, order.product.material?.[lang]].filter(Boolean).join(' • ')}
                  </p>
                </td>
                <td className="px-3 py-4 text-center font-semibold">{order.selectedSize}</td>
                <td className="px-3 py-4 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="w-4 h-4 rounded-full border border-border inline-block" style={{ backgroundColor: order.selectedColor.hex }} />
                    <span className="text-xs">{order.selectedColor.name[lang]}</span>
                  </div>
                </td>
                <td className="px-3 py-4 text-center font-semibold">{order.quantity}</td>
                <td className="px-3 py-4 text-center">{formatPrice(order.product.price, lang)}</td>
                <td className="px-4 py-4 text-end font-bold text-accent">{formatPrice(order.subtotal, lang)}</td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mt-4">
            <div className="w-72">
              <div className="flex justify-between text-sm py-1.5"><span className="text-text-muted">{t('order.subtotal', lang)}</span><span className="font-semibold">{formatPrice(order.subtotal, lang)}</span></div>
              <div className="flex justify-between text-sm py-1.5"><span className="text-text-muted">{t('order.delivery_price', lang)}</span><span className="font-semibold">{formatPrice(order.deliveryPrice, lang)}</span></div>
              <div className="border-t-2 border-accent mt-2 pt-2">
                <div className="flex justify-between text-lg"><span className="font-bold">{t('order.total', lang)}</span><span className="font-bold text-accent">{formatPrice(order.total, lang)}</span></div>
              </div>
              <div className="flex justify-between text-xs mt-2 text-text-muted">
                <span>{t('order.payment', lang)}</span>
                <span className="font-semibold">{t(`order.${order.paymentMethod}`, lang)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Thank you + Store location ── */}
        <div className="mt-auto pt-6 border-t-2 border-border">
          {/* Thank you message */}
          <div className="bg-accent/5 rounded-xl p-5 text-center mb-4">
            <p className="font-heading text-lg font-bold text-accent mb-1">
              {lang === 'ar' ? 'شكراً لثقتك بنا! 🙏' : lang === 'fr' ? 'Merci pour votre confiance ! 🙏' : 'Thank you for your trust! 🙏'}
            </p>
            <p className="text-sm text-text-light">
              {lang === 'ar'
                ? 'نتمنى أن تنال أحذيتنا إعجابك. نحن دائماً في خدمتك!'
                : lang === 'fr'
                ? 'Nous espérons que nos chaussures vous plairont. Nous sommes toujours à votre service !'
                : 'We hope you enjoy our shoes. We are always at your service!'}
            </p>
          </div>

          {/* Store location */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center">
                <MapPin size={18} className="text-accent" />
              </div>
              <div>
                <p className="text-xs font-bold text-text">{lang === 'ar' ? 'موقع المتجر' : 'Store Location'}</p>
                <p className="text-xs text-text-muted">{storeSettings.address}</p>
              </div>
            </div>
            <div className="text-end text-xs text-text-muted space-y-0.5">
              <p dir="ltr">{storeSettings.phone}</p>
              <p>{storeSettings.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
