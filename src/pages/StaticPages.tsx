import { useStore } from '../lib/store';
import { t } from '../lib/i18n';
import { storeSettings } from '../lib/data';

export function AboutPage() {
  const { lang } = useStore();
  const isRtl = lang === 'ar';
  return (
    <div className="max-w-3xl mx-auto px-4 py-12" dir={isRtl ? 'rtl' : 'ltr'}>
      <h1 className="font-heading text-3xl font-bold mb-6">{t('footer.about', lang)}</h1>
      <div className="bg-card rounded-2xl p-8 border border-border/50 prose prose-sm max-w-none">
        {lang === 'ar' ? (
          <>
            <p>مرحباً بك في <strong>خُطوة</strong>، متجرك المتخصص في بيع أفخم الأحذية الرجالية في الجزائر.</p>
            <p>نحن نؤمن بأن الأناقة تبدأ من خطوتك، لذلك نحرص على توفير تشكيلة متنوعة من الأحذية الكلاسيكية، الرياضية، الكاجوال، والبوت بأعلى جودة وبأسعار مناسبة.</p>
            <p>نوصل لجميع ولايات الجزائر الـ 58 عبر شركات توصيل موثوقة.</p>
            <h3>معلومات التواصل</h3>
            <p>العنوان: {storeSettings.address}</p>
            <p>الهاتف: {storeSettings.phone}</p>
            <p>البريد: {storeSettings.email}</p>
          </>
        ) : (
          <>
            <p>Welcome to <strong>KHOTWA</strong>, your specialized store for premium men's shoes in Algeria.</p>
            <p>We believe elegance starts with your step, that's why we offer a diverse collection of classic, sport, casual, and boot shoes at the highest quality and competitive prices.</p>
            <p>We deliver to all 58 wilayas in Algeria through trusted delivery partners.</p>
            <h3>Contact Information</h3>
            <p>Address: {storeSettings.address}</p>
            <p>Phone: {storeSettings.phone}</p>
            <p>Email: {storeSettings.email}</p>
          </>
        )}
      </div>
    </div>
  );
}

export function PrivacyPage() {
  const { lang } = useStore();
  const isRtl = lang === 'ar';
  return (
    <div className="max-w-3xl mx-auto px-4 py-12" dir={isRtl ? 'rtl' : 'ltr'}>
      <h1 className="font-heading text-3xl font-bold mb-6">{t('footer.privacy', lang)}</h1>
      <div className="bg-card rounded-2xl p-8 border border-border/50 prose prose-sm max-w-none">
        {lang === 'ar' ? (
          <>
            <h3>سياسة الخصوصية وحماية البيانات (وفق قانون 18-07)</h3>
            <p>نحن في خُطوة نلتزم بحماية بياناتك الشخصية وفقاً للقانون الجزائري رقم 18-07 المتعلق بحماية الأشخاص الطبيعيين في مجال معالجة البيانات ذات الطابع الشخصي.</p>
            <h4>البيانات التي نجمعها</h4>
            <ul>
              <li>الاسم الكامل</li>
              <li>رقم الهاتف</li>
              <li>العنوان (الولاية، البلدية، العنوان التفصيلي)</li>
              <li>البريد الإلكتروني (اختياري)</li>
            </ul>
            <h4>كيف نستخدم بياناتك</h4>
            <ul>
              <li>معالجة وتوصيل طلباتك</li>
              <li>التواصل معك بشأن طلباتك</li>
              <li>تحسين خدماتنا</li>
            </ul>
            <h4>حقوقك</h4>
            <ul>
              <li>حق الوصول إلى بياناتك</li>
              <li>حق تعديل بياناتك</li>
              <li>حق حذف حسابك وبياناتك</li>
            </ul>
            <p>لأي طلب يتعلق ببياناتك الشخصية، يرجى التواصل معنا عبر: {storeSettings.email}</p>
          </>
        ) : (
          <>
            <h3>Privacy Policy & Data Protection (Law 18-07)</h3>
            <p>At KHOTWA, we are committed to protecting your personal data in accordance with Algerian Law 18-07 on the protection of individuals in the processing of personal data.</p>
            <h4>Data We Collect</h4>
            <ul><li>Full name</li><li>Phone number</li><li>Address (Wilaya, Commune, detailed address)</li><li>Email (optional)</li></ul>
            <h4>How We Use Your Data</h4>
            <ul><li>Processing and delivering your orders</li><li>Communicating with you about your orders</li><li>Improving our services</li></ul>
            <h4>Your Rights</h4>
            <ul><li>Right to access your data</li><li>Right to modify your data</li><li>Right to delete your account and data</li></ul>
            <p>For any request regarding your personal data, please contact us at: {storeSettings.email}</p>
          </>
        )}
      </div>
    </div>
  );
}

export function TermsPage() {
  const { lang } = useStore();
  const isRtl = lang === 'ar';
  return (
    <div className="max-w-3xl mx-auto px-4 py-12" dir={isRtl ? 'rtl' : 'ltr'}>
      <h1 className="font-heading text-3xl font-bold mb-6">{t('footer.terms', lang)}</h1>
      <div className="bg-card rounded-2xl p-8 border border-border/50 prose prose-sm max-w-none">
        {lang === 'ar' ? (
          <>
            <h3>الشروط والأحكام العامة</h3>
            <h4>الطلب والشراء</h4>
            <ul>
              <li>كل منتج يتم طلبه بشكل منفصل بفاتورة مستقلة</li>
              <li>الأسعار بالدينار الجزائري وتشمل جميع الضرائب</li>
              <li>سعر التوصيل يحسب حسب الولاية وشركة التوصيل</li>
            </ul>
            <h4>الدفع</h4>
            <ul>
              <li>الدفع عند الاستلام</li>
              <li>بطاقة CIB / الذهبية</li>
              <li>حوالة بريدية / بريدي موب</li>
            </ul>
            <h4>الإرجاع والاستبدال</h4>
            <p>يمكن إرجاع أو استبدال المنتج خلال 7 أيام من تاريخ الاستلام بشرط أن يكون المنتج في حالته الأصلية.</p>
          </>
        ) : (
          <>
            <h3>General Terms & Conditions</h3>
            <h4>Orders & Purchases</h4>
            <ul><li>Each product is ordered separately with an independent invoice</li><li>Prices are in Algerian Dinar and include all taxes</li><li>Delivery price is calculated based on the wilaya and delivery company</li></ul>
            <h4>Payment</h4>
            <ul><li>Cash on Delivery</li><li>CIB / Edahabia Card</li><li>Postal transfer / BaridiMob</li></ul>
            <h4>Returns & Exchanges</h4>
            <p>Products can be returned or exchanged within 7 days of delivery, provided the product is in its original condition.</p>
          </>
        )}
      </div>
    </div>
  );
}

export function ContactPage() {
  const { lang } = useStore();
  const isRtl = lang === 'ar';
  return (
    <div className="max-w-3xl mx-auto px-4 py-12" dir={isRtl ? 'rtl' : 'ltr'}>
      <h1 className="font-heading text-3xl font-bold mb-6">{t('footer.contact', lang)}</h1>
      <div className="bg-card rounded-2xl p-8 border border-border/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-4">{lang === 'ar' ? 'معلومات التواصل' : 'Contact Information'}</h3>
            <div className="space-y-3 text-sm">
              <p><strong>{lang === 'ar' ? 'العنوان' : 'Address'}:</strong> {storeSettings.address}</p>
              <p><strong>{lang === 'ar' ? 'الهاتف' : 'Phone'}:</strong> <span dir="ltr">{storeSettings.phone}</span></p>
              <p><strong>{lang === 'ar' ? 'البريد' : 'Email'}:</strong> {storeSettings.email}</p>
              <p><strong>RC:</strong> {storeSettings.rc}</p>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-4">{lang === 'ar' ? 'أرسل رسالة' : 'Send a Message'}</h3>
            <form className="space-y-3">
              <input type="text" placeholder={lang === 'ar' ? 'الاسم' : 'Name'} className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
              <input type="email" placeholder={lang === 'ar' ? 'البريد الإلكتروني' : 'Email'} className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
              <textarea placeholder={lang === 'ar' ? 'رسالتك' : 'Your message'} rows={4} className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent resize-none" />
              <button type="button" className="bg-accent hover:bg-accent-light text-primary px-6 py-2.5 rounded-xl font-bold text-sm transition-colors">
                {lang === 'ar' ? 'إرسال' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DataProtectionPage() {
  const { lang } = useStore();
  const isRtl = lang === 'ar';
  return (
    <div className="max-w-3xl mx-auto px-4 py-12" dir={isRtl ? 'rtl' : 'ltr'}>
      <h1 className="font-heading text-3xl font-bold mb-6">{t('footer.data_protection', lang)}</h1>
      <div className="bg-card rounded-2xl p-8 border border-border/50 prose prose-sm max-w-none">
        {lang === 'ar' ? (
          <>
            <h3>حماية البيانات الشخصية - قانون 18-07</h3>
            <p>وفقاً للقانون الجزائري رقم 18-07 المتعلق بحماية الأشخاص الطبيعيين في مجال معالجة البيانات ذات الطابع الشخصي، نلتزم بما يلي:</p>
            <ul>
              <li>عدم تخزين معلومات بطاقات الدفع على خوادمنا</li>
              <li>تشفير جميع البيانات الشخصية</li>
              <li>حق العميل في طلب حذف بياناته في أي وقت</li>
              <li>عدم مشاركة البيانات مع أطراف ثالثة دون موافقة</li>
            </ul>
            <p>لطلب حذف حسابك وبياناتك، أرسل طلبك إلى: {storeSettings.email}</p>
          </>
        ) : (
          <>
            <h3>Personal Data Protection - Law 18-07</h3>
            <p>In accordance with Algerian Law 18-07 on the protection of individuals in the processing of personal data, we commit to:</p>
            <ul>
              <li>Not storing payment card information on our servers</li>
              <li>Encrypting all personal data</li>
              <li>Customer's right to request deletion of their data at any time</li>
              <li>Not sharing data with third parties without consent</li>
            </ul>
            <p>To request deletion of your account and data, send your request to: {storeSettings.email}</p>
          </>
        )}
      </div>
    </div>
  );
}
