import { Lang } from './types';

export const translations: Record<string, Record<Lang, string>> = {
  // Header
  'search.placeholder': {
    ar: 'ابحث عن حذائك المفضل...',
    fr: 'Rechercher vos chaussures...',
    en: 'Search for your shoes...'
  },
  'cart': { ar: 'السلة', fr: 'Panier', en: 'Cart' },
  'login': { ar: 'تسجيل الدخول', fr: 'Connexion', en: 'Login' },
  'register': { ar: 'التسجيل', fr: "S'inscrire", en: 'Register' },
  'my_account': { ar: 'حسابي', fr: 'Mon compte', en: 'My Account' },
  'logout': { ar: 'تسجيل الخروج', fr: 'Déconnexion', en: 'Logout' },

  // Navigation
  'nav.all': { ar: 'الكل', fr: 'Tout', en: 'All' },
  'nav.classic': { ar: 'كلاسيك', fr: 'Classique', en: 'Classic' },
  'nav.sport': { ar: 'رياضية', fr: 'Sport', en: 'Sport' },
  'nav.casual': { ar: 'كاجوال', fr: 'Casual', en: 'Casual' },
  'nav.boots': { ar: 'بوت', fr: 'Bottes', en: 'Boots' },
  'nav.sandals': { ar: 'صنادل', fr: 'Sandales', en: 'Sandals' },
  'nav.brands': { ar: 'ماركات', fr: 'Marques', en: 'Brands' },
  'nav.sale': { ar: 'تخفيضات', fr: 'Soldes', en: 'Sale' },
  'nav.new': { ar: 'جديد', fr: 'Nouveau', en: 'New' },
  'nav.formal': { ar: 'رسمية', fr: 'Formelles', en: 'Formal' },
  'nav.loafers': { ar: 'لوفر', fr: 'Mocassins', en: 'Loafers' },
  'nav.sneakers': { ar: 'سنيكرز', fr: 'Sneakers', en: 'Sneakers' },
  'nav.moccasins': { ar: 'موكاسان', fr: 'Mocassins', en: 'Moccasins' },

  // Filters
  'filter.title': { ar: 'تصفية المنتجات', fr: 'Filtrer', en: 'Filter Products' },
  'filter.category': { ar: 'الفئة', fr: 'Catégorie', en: 'Category' },
  'filter.size': { ar: 'المقاس', fr: 'Taille', en: 'Size' },
  'filter.color': { ar: 'اللون', fr: 'Couleur', en: 'Color' },
  'filter.price': { ar: 'السعر', fr: 'Prix', en: 'Price' },
  'filter.brand': { ar: 'الماركة', fr: 'Marque', en: 'Brand' },
  'filter.apply': { ar: 'تطبيق', fr: 'Appliquer', en: 'Apply' },
  'filter.reset': { ar: 'إعادة تعيين', fr: 'Réinitialiser', en: 'Reset' },
  'filter.min': { ar: 'الحد الأدنى', fr: 'Min', en: 'Min' },
  'filter.max': { ar: 'الحد الأقصى', fr: 'Max', en: 'Max' },

  // Product
  'product.add_to_cart': { ar: 'أضف إلى السلة', fr: 'Ajouter au panier', en: 'Add to Cart' },
  'product.order_now': { ar: 'اطلب الآن', fr: 'Commander', en: 'Order Now' },
  'product.out_of_stock': { ar: 'نفد المخزون', fr: 'Rupture de stock', en: 'Out of Stock' },
  'product.reviews': { ar: 'تقييم', fr: 'avis', en: 'reviews' },
  'product.size': { ar: 'المقاس', fr: 'Taille', en: 'Size' },
  'product.color': { ar: 'اللون', fr: 'Couleur', en: 'Color' },
  'product.material': { ar: 'الخامة', fr: 'Matière', en: 'Material' },
  'product.description': { ar: 'الوصف', fr: 'Description', en: 'Description' },
  'product.details': { ar: 'التفاصيل', fr: 'Détails', en: 'Details' },
  'product.related': { ar: 'منتجات مشابهة', fr: 'Produits similaires', en: 'Related Products' },

  // Landing page
  'landing.offer': { ar: 'عرض خاص', fr: 'Offre spéciale', en: 'Special offer' },
  'landing.hero_note': { ar: 'اطلب في أقل من دقيقة — الدفع عند الاستلام', fr: 'Commandez en moins d\'une minute — paiement à la livraison', en: 'Order in under a minute — cash on delivery' },
  'landing.full_details': { ar: 'التفاصيل الكاملة', fr: 'Voir les détails', en: 'Full details' },
  'landing.available_sizes': { ar: 'المقاسات المتوفرة', fr: 'Tailles disponibles', en: 'Available sizes' },
  'landing.available_colors': { ar: 'الألوان المتوفرة', fr: 'Couleurs disponibles', en: 'Available colors' },
  'landing.in_stock': { ar: 'متوفر في المخزون', fr: 'En stock', en: 'In stock' },
  'landing.out_of_stock': { ar: 'غير متوفر حالياً', fr: 'Rupture de stock', en: 'Out of stock' },
  'landing.low_stock': { ar: 'كمية محدودة', fr: 'Quantité limitée', en: 'Limited quantity' },
  'landing.why_title': { ar: 'لماذا تطلب من خطوة؟', fr: 'Pourquoi commander chez KHOTWA ?', en: 'Why order from KHOTWA?' },
  'landing.trust_cod_title': { ar: 'الدفع عند الاستلام', fr: 'Paiement à la livraison', en: 'Cash on delivery' },
  'landing.trust_cod_desc': { ar: 'لا تدفع أي شيء قبل أن تستلم طلبك وتجربه', fr: 'Vous ne payez qu\'à la réception de votre commande', en: 'Pay nothing until you receive and try your order' },
  'landing.trust_delivery_title': { ar: 'توصيل لكل الولايات', fr: 'Livraison dans les 58 wilayas', en: 'Delivery to all 58 wilayas' },
  'landing.trust_delivery_desc': { ar: 'من 2 إلى 5 أيام عمل إلى باب منزلك', fr: '2 à 5 jours ouvrables jusqu\'à votre porte', en: '2 to 5 working days to your door' },
  'landing.trust_quality_title': { ar: 'جودة مضمونة', fr: 'Qualité garantie', en: 'Quality guaranteed' },
  'landing.trust_quality_desc': { ar: 'منتجات أصلية 100% مع إمكانية الاستبدال', fr: 'Produits 100% originaux avec échange possible', en: '100% original products with exchange available' },
  'landing.order_title': { ar: 'اطلب منتجك الآن', fr: 'Commandez maintenant', en: 'Order your product now' },
  'landing.order_subtitle': { ar: 'اختر المقاس واللون، املأ بياناتك، وسنتصل بك لتأكيد الطلب.', fr: 'Choisissez la taille et la couleur, remplissez vos informations et nous vous appellerons pour confirmer.', en: 'Pick your size and color, fill in your details, and we will call you to confirm.' },
  'landing.step_details': { ar: 'بياناتك', fr: 'Vos informations', en: 'Your details' },
  'landing.step_invoice': { ar: 'الفاتورة', fr: 'Facture', en: 'Invoice' },
  'landing.creating': { ar: 'جاري إنشاء الطلب...', fr: 'Création de la commande...', en: 'Creating your order...' },
  'landing.secure_note': { ar: 'بياناتك محمية ولن تُستخدم إلا لتأكيد هذا الطلب.', fr: 'Vos données sont protégées et servent uniquement à confirmer cette commande.', en: 'Your data is protected and used only to confirm this order.' },
  'landing.server_note': { ar: 'السعر النهائي يُحسب على السيرفر عند تأكيد الطلب.', fr: 'Le prix final est calculé sur le serveur lors de la confirmation.', en: 'The final price is calculated on the server when you confirm.' },

  // Order
  'order.title': { ar: 'إتمام الطلب', fr: 'Finaliser la commande', en: 'Complete Order' },
  'order.customer_info': { ar: 'معلومات العميل', fr: 'Informations client', en: 'Customer Info' },
  'order.full_name': { ar: 'الاسم الكامل', fr: 'Nom complet', en: 'Full Name' },
  'order.phone': { ar: 'رقم الهاتف', fr: 'Téléphone', en: 'Phone' },
  'order.email': { ar: 'البريد الإلكتروني', fr: 'Email', en: 'Email' },
  'order.wilaya': { ar: 'الولاية', fr: 'Wilaya', en: 'Wilaya' },
  'order.commune': { ar: 'البلدية', fr: 'Commune', en: 'Commune' },
  'order.address': { ar: 'العنوان التفصيلي', fr: 'Adresse détaillée', en: 'Detailed Address' },
  'order.delivery': { ar: 'التوصيل', fr: 'Livraison', en: 'Delivery' },
  'order.delivery_company': { ar: 'شركة التوصيل', fr: 'Société de livraison', en: 'Delivery Company' },
  'order.delivery_price': { ar: 'سعر التوصيل', fr: 'Frais de livraison', en: 'Delivery Price' },
  'order.payment': { ar: 'طريقة الدفع', fr: 'Mode de paiement', en: 'Payment Method' },
  'order.cod': { ar: 'الدفع عند الاستلام', fr: 'Paiement à la livraison', en: 'Cash on Delivery' },
  'order.cib': { ar: 'بطاقة CIB', fr: 'Carte CIB', en: 'CIB Card' },
  'order.edahabia': { ar: 'بطاقة الذهبية', fr: 'Carte Edahabia', en: 'Edahabia Card' },
  'order.ccp': { ar: 'حوالة بريدية CCP', fr: 'Mandat postal CCP', en: 'CCP Transfer' },
  'order.baridimob': { ar: 'بريدي موب', fr: 'BaridiMob', en: 'BaridiMob' },
  'order.summary': { ar: 'ملخص الطلب', fr: 'Résumé de la commande', en: 'Order Summary' },
  'order.subtotal': { ar: 'المجموع الفرعي', fr: 'Sous-total', en: 'Subtotal' },
  'order.total': { ar: 'المجموع الكلي', fr: 'Total', en: 'Total' },
  'order.submit': { ar: 'إرسال الطلب', fr: 'Envoyer la commande', en: 'Submit Order' },
  'order.success': { ar: 'تم إرسال طلبك بنجاح!', fr: 'Votre commande a été envoyée!', en: 'Your order has been submitted!' },
  'order.quantity': { ar: 'الكمية', fr: 'Quantité', en: 'Quantity' },
  'order.unit_price': { ar: 'سعر الوحدة', fr: 'Prix unitaire', en: 'Unit Price' },
  'order.print_invoice': { ar: 'طباعة الفاتورة', fr: "Imprimer la facture", en: 'Print Invoice' },
  'order.track': { ar: 'تتبع الطلب', fr: 'Suivre la commande', en: 'Track Order' },
  'order.number': { ar: 'رقم الطلب', fr: 'Numéro de commande', en: 'Order Number' },
  'order.estimated_delivery': { ar: 'التسليم المتوقع', fr: 'Livraison estimée', en: 'Estimated Delivery' },
  'order.select_size': { ar: 'اختر المقاس', fr: 'Choisir la taille', en: 'Select Size' },
  'order.select_color': { ar: 'اختر اللون', fr: 'Choisir la couleur', en: 'Select Color' },

  // Invoice
  'invoice.title': { ar: 'فاتورة', fr: 'Facture', en: 'Invoice' },
  'invoice.number': { ar: 'رقم الفاتورة', fr: 'N° Facture', en: 'Invoice Number' },
  'invoice.date': { ar: 'تاريخ الإصدار', fr: "Date d'émission", en: 'Issue Date' },
  'invoice.store_info': { ar: 'معلومات المتجر', fr: 'Informations du magasin', en: 'Store Info' },
  'invoice.client_info': { ar: 'معلومات العميل', fr: 'Informations du client', en: 'Client Info' },

  // Footer
  'footer.about': { ar: 'من نحن', fr: 'À propos', en: 'About Us' },
  'footer.privacy': { ar: 'سياسة الخصوصية', fr: 'Politique de confidentialité', en: 'Privacy Policy' },
  'footer.terms': { ar: 'الشروط والأحكام', fr: 'Conditions générales', en: 'Terms & Conditions' },
  'footer.contact': { ar: 'تواصل معنا', fr: 'Contactez-nous', en: 'Contact Us' },
  'footer.follow_us': { ar: 'تابعنا', fr: 'Suivez-nous', en: 'Follow Us' },
  'footer.rights': { ar: 'جميع الحقوق محفوظة', fr: 'Tous droits réservés', en: 'All Rights Reserved' },
  'footer.quick_links': { ar: 'روابط سريعة', fr: 'Liens rapides', en: 'Quick Links' },
  'footer.customer_service': { ar: 'خدمة العملاء', fr: 'Service client', en: 'Customer Service' },
  'footer.data_protection': { ar: 'حماية البيانات', fr: 'Protection des données', en: 'Data Protection' },
  'footer.delete_account': { ar: 'حذف الحساب', fr: 'Supprimer le compte', en: 'Delete Account' },

  // General
  'currency': { ar: 'د.ج', fr: 'DA', en: 'DZD' },
  'loading': { ar: 'جاري التحميل...', fr: 'Chargement...', en: 'Loading...' },
  'no_results': { ar: 'لا توجد نتائج', fr: 'Aucun résultat', en: 'No results' },
  'home': { ar: 'الرئيسية', fr: 'Accueil', en: 'Home' },
  'products': { ar: 'المنتجات', fr: 'Produits', en: 'Products' },
  'hero.title': { ar: 'أناقة تبدأ من خطوتك', fr: "L'élégance commence par vos pas", en: 'Elegance Starts With Your Step' },
  'hero.subtitle': { ar: 'اكتشف أفضل تشكيلة أحذية رجالية في الجزائر', fr: 'Découvrez la meilleure collection de chaussures pour hommes en Algérie', en: 'Discover the best men\'s shoe collection in Algeria' },
  'hero.cta': { ar: 'تسوق الآن', fr: 'Acheter maintenant', en: 'Shop Now' },
  'featured': { ar: 'منتجات مميزة', fr: 'Produits vedettes', en: 'Featured Products' },
  'new_arrivals': { ar: 'وصل حديثاً', fr: 'Nouveautés', en: 'New Arrivals' },
  'categories': { ar: 'تسوق حسب الفئة', fr: 'Acheter par catégorie', en: 'Shop by Category' },
  'free_delivery': { ar: 'توصيل مجاني للطلبات فوق 10,000 د.ج', fr: 'Livraison gratuite pour les commandes de plus de 10 000 DA', en: 'Free delivery for orders over 10,000 DZD' },
  'select_wilaya': { ar: 'اختر الولاية', fr: 'Choisir la wilaya', en: 'Select Wilaya' },
  'select_commune': { ar: 'اختر البلدية', fr: 'Choisir la commune', en: 'Select Commune' },
  'dashboard': { ar: 'لوحة التحكم', fr: 'Tableau de bord', en: 'Dashboard' },
  'admin.products': { ar: 'إدارة المنتجات', fr: 'Gestion des produits', en: 'Product Management' },
  'admin.orders': { ar: 'إدارة الطلبات', fr: 'Gestion des commandes', en: 'Order Management' },
  'admin.delivery': { ar: 'إدارة التوصيل', fr: 'Gestion de la livraison', en: 'Delivery Management' },
  'admin.customers': { ar: 'إدارة العملاء', fr: 'Gestion des clients', en: 'Customer Management' },
  'admin.reports': { ar: 'التقارير', fr: 'Rapports', en: 'Reports' },
  'admin.settings': { ar: 'الإعدادات', fr: 'Paramètres', en: 'Settings' },
  'status.new': { ar: 'جديد', fr: 'Nouveau', en: 'New' },
  'status.confirmed': { ar: 'مؤكد', fr: 'Confirmé', en: 'Confirmed' },
  'status.preparing': { ar: 'جاري التحضير', fr: 'En préparation', en: 'Preparing' },
  'status.shipped': { ar: 'تم التسليم لشركة التوصيل', fr: 'Expédié', en: 'Shipped' },
  'status.in_transit': { ar: 'في الطريق', fr: 'En transit', en: 'In Transit' },
  'status.delivered': { ar: 'تم التسليم', fr: 'Livré', en: 'Delivered' },
  'status.cancelled': { ar: 'ملغي', fr: 'Annulé', en: 'Cancelled' },
  'status.returned': { ar: 'مرتجع', fr: 'Retourné', en: 'Returned' },
};

export function t(key: string, lang: Lang): string {
  return translations[key]?.[lang] || key;
}

export function formatPrice(price: number, lang: Lang): string {
  const formatted = price.toLocaleString('fr-DZ');
  const currency = t('currency', lang);
  if (lang === 'ar') return `${formatted} ${currency}`;
  return `${formatted} ${currency}`;
}
