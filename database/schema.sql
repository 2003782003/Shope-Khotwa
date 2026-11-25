-- ============================================================================
-- KHOTWA (خُطوة) — Men's Shoe E-Commerce Database Schema
-- PostgreSQL 15+
-- Algerian market — prices in DZD, 58 wilayas, local delivery companies
-- Compliant with Algerian Data Protection Law 18-07
-- ============================================================================

-- ─── Extensions ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUM Types ─────────────────────────────────────────────────────────────

CREATE TYPE lang AS ENUM ('ar', 'fr', 'en');

CREATE TYPE order_status AS ENUM (
  'new',
  'confirmed',
  'preparing',
  'shipped',
  'in_transit',
  'delivered',
  'cancelled',
  'returned'
);

CREATE TYPE payment_method AS ENUM (
  'cod',         -- الدفع عند الاستلام
  'cib',         -- بطاقة CIB
  'edahabia',    -- بطاقة الذهبية
  'ccp',         -- حوالة بريدية CCP
  'baridimob'    -- بريدي موب
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'paid',
  'failed',
  'refunded'
);

CREATE TYPE user_role AS ENUM (
  'admin',       -- مسؤول — كامل الصلاحيات
  'manager',     -- مدير المتجر — إدارة المنتجات والطلبات
  'delivery'     -- مشرف توصيل — تحديث حالات الشحن فقط
);

CREATE TYPE product_category AS ENUM (
  'classic',
  'sport',
  'casual',
  'boots',
  'sandals'
);

-- ─── 1. STORE SETTINGS ─────────────────────────────────────────────────────
-- إعدادات المتجر العامة

CREATE TABLE store_settings (
  id              INTEGER PRIMARY KEY DEFAULT 1,
  name_ar         VARCHAR(255) NOT NULL DEFAULT 'خُطوة - أحذية رجالية',
  name_fr         VARCHAR(255) NOT NULL DEFAULT 'KHOTWA - Chaussures Homme',
  name_en         VARCHAR(255) NOT NULL DEFAULT 'KHOTWA - Men''s Shoes',
  address         TEXT NOT NULL DEFAULT 'باب الزوار، الجزائر العاصمة، الجزائر',
  phone           VARCHAR(20) NOT NULL DEFAULT '+213 555 123 456',
  whatsapp        VARCHAR(20) DEFAULT '+213555123456',
  email           VARCHAR(255) NOT NULL DEFAULT 'contact@khotwa-dz.com',
  rc              VARCHAR(50) DEFAULT '16/00-1234567B19',       -- Registre de Commerce
  nif             VARCHAR(50) DEFAULT '001916123456789',        -- Numéro d'Identification Fiscale
  nis             VARCHAR(50) DEFAULT '19160012345678',         -- Numéro d'Identification Statistique
  ccp_account     VARCHAR(50) DEFAULT '00799999 clé 42',       -- Compte CCP pour virements
  ccp_holder      VARCHAR(255) DEFAULT 'KHOTWA SARL',
  facebook_url    VARCHAR(500),
  instagram_url   VARCHAR(500),
  tiktok_url      VARCHAR(500),
  logo_url        VARCHAR(500),
  favicon_url     VARCHAR(500),
  meta_description_ar TEXT,
  meta_description_fr TEXT,
  meta_description_en TEXT,
  free_delivery_threshold INTEGER DEFAULT 10000,                -- حد التوصيل المجاني بالدينار
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT single_row CHECK (id = 1)
);

-- ─── 2. USERS / ADMIN ACCOUNTS ─────────────────────────────────────────────
-- حسابات المستخدمين (مسؤولين، مديرين، مشرفي توصيل)

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,                                -- Argon2id (server-side only)
  full_name       VARCHAR(255) NOT NULL,
  phone           VARCHAR(20),
  role            user_role NOT NULL DEFAULT 'manager',
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role);

-- ─── 3. CATEGORIES ─────────────────────────────────────────────────────────
-- الفئات (رئيسية وفرعية)

CREATE TABLE categories (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            VARCHAR(100) NOT NULL UNIQUE,
  name_ar         VARCHAR(255) NOT NULL,
  name_fr         VARCHAR(255) NOT NULL,
  name_en         VARCHAR(255) NOT NULL,
  parent_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
  icon            VARCHAR(10),                                  -- emoji icon
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON categories (parent_id);
CREATE INDEX idx_categories_slug ON categories (slug);

-- ─── 4. BRANDS ──────────────────────────────────────────────────────────────
-- الماركات

CREATE TABLE brands (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255) NOT NULL UNIQUE,
  slug            VARCHAR(255) NOT NULL UNIQUE,
  logo_url        VARCHAR(500),
  description_ar  TEXT,
  description_fr  TEXT,
  description_en  TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_brands_slug ON brands (slug);

-- ─── 5. PRODUCTS ────────────────────────────────────────────────────────────
-- المنتجات

CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku             VARCHAR(50) UNIQUE,                           -- رمز المنتج
  name_ar         VARCHAR(500) NOT NULL,
  name_fr         VARCHAR(500) NOT NULL,
  name_en         VARCHAR(500) NOT NULL,
  description_ar  TEXT,
  description_fr  TEXT,
  description_en  TEXT,
  price           INTEGER NOT NULL CHECK (price >= 0),          -- السعر بالدينار الجزائري
  original_price  INTEGER CHECK (original_price >= 0),          -- السعر قبل التخفيض
  discount        INTEGER CHECK (discount >= 0 AND discount <= 100),  -- نسبة التخفيض %
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  brand_id        UUID REFERENCES brands(id) ON DELETE SET NULL,
  material_ar     VARCHAR(255),
  material_fr     VARCHAR(255),
  material_en     VARCHAR(255),
  rating          DECIMAL(2,1) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count    INTEGER NOT NULL DEFAULT 0,
  stock_quantity  INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  in_stock        BOOLEAN GENERATED ALWAYS AS (stock_quantity > 0) STORED,
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  is_new          BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  meta_title      VARCHAR(255),
  meta_description TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_brand ON products (brand_id);
CREATE INDEX idx_products_price ON products (price);
CREATE INDEX idx_products_active ON products (is_active);
CREATE INDEX idx_products_featured ON products (is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_products_new ON products (is_new) WHERE is_new = TRUE;
CREATE INDEX idx_products_discount ON products (discount) WHERE discount IS NOT NULL AND discount > 0;
CREATE INDEX idx_products_stock ON products (stock_quantity);

-- ─── 6. PRODUCT IMAGES ─────────────────────────────────────────────────────
-- صور المنتجات (رفع متعدد)

CREATE TABLE product_images (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url       VARCHAR(500) NOT NULL,
  alt_text        VARCHAR(255),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_images_product ON product_images (product_id);

-- ─── 7. PRODUCT SIZES ──────────────────────────────────────────────────────
-- مقاسات المنتجات المتوفرة

CREATE TABLE product_sizes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size            VARCHAR(10) NOT NULL,                         -- '39', '40', '41', ...
  stock_quantity  INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_available    BOOLEAN NOT NULL DEFAULT TRUE,

  UNIQUE (product_id, size)
);

CREATE INDEX idx_product_sizes_product ON product_sizes (product_id);

-- ─── 8. PRODUCT COLORS ─────────────────────────────────────────────────────
-- ألوان المنتجات المتوفرة

CREATE TABLE product_colors (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name_ar         VARCHAR(100) NOT NULL,
  name_fr         VARCHAR(100) NOT NULL,
  name_en         VARCHAR(100) NOT NULL,
  hex_code        VARCHAR(7) NOT NULL,                          -- '#8B4513'
  is_available    BOOLEAN NOT NULL DEFAULT TRUE,

  UNIQUE (product_id, hex_code)
);

CREATE INDEX idx_product_colors_product ON product_colors (product_id);

-- ─── 9. WILAYAS ─────────────────────────────────────────────────────────────
-- الولايات الجزائرية (58 ولاية)

CREATE TABLE wilayas (
  code            VARCHAR(2) PRIMARY KEY,                       -- '01' → '58'
  name_ar         VARCHAR(100) NOT NULL,
  name_fr         VARCHAR(100) NOT NULL,
  name_en         VARCHAR(100) NOT NULL,
  default_delivery_price INTEGER NOT NULL DEFAULT 400            -- سعر التوصيل الافتراضي
);

CREATE INDEX idx_wilayas_name_ar ON wilayas (name_ar);

-- ─── 10. COMMUNES ───────────────────────────────────────────────────────────
-- البلديات

CREATE TABLE communes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wilaya_code     VARCHAR(2) NOT NULL REFERENCES wilayas(code) ON DELETE CASCADE,
  name_ar         VARCHAR(255) NOT NULL,
  name_fr         VARCHAR(255) NOT NULL,
  name_en         VARCHAR(255),
  postal_code     VARCHAR(10),

  UNIQUE (wilaya_code, name_ar)
);

CREATE INDEX idx_communes_wilaya ON communes (wilaya_code);

-- ─── 11. DELIVERY COMPANIES ────────────────────────────────────────────────
-- شركات التوصيل المحلية

CREATE TABLE delivery_companies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(255) NOT NULL UNIQUE,
  logo_url        VARCHAR(500),
  phone           VARCHAR(20),
  contact_email   VARCHAR(255),
  tracking_url    VARCHAR(500),                                 -- رابط تتبع الشحنات
  api_key         TEXT,                                         -- مفتاح API (مشفر)
  api_endpoint    VARCHAR(500),                                 -- نقطة API
  estimated_days  VARCHAR(20) NOT NULL DEFAULT '2-4',           -- مدة التوصيل المتوقعة
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_delivery_companies_active ON delivery_companies (is_active);

-- ─── 12. DELIVERY PRICING ──────────────────────────────────────────────────
-- أسعار التوصيل حسب الولاية وشركة التوصيل

CREATE TABLE delivery_pricing (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_company_id UUID NOT NULL REFERENCES delivery_companies(id) ON DELETE CASCADE,
  wilaya_code     VARCHAR(2) NOT NULL REFERENCES wilayas(code) ON DELETE CASCADE,
  price_desk      INTEGER NOT NULL CHECK (price_desk >= 0),     -- سعر التوصيل للمكتب
  price_home      INTEGER CHECK (price_home >= 0),              -- سعر التوصيل للمنزل
  estimated_days  VARCHAR(20),                                  -- مدة خاصة بهذه الولاية
  is_available    BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (delivery_company_id, wilaya_code)
);

CREATE INDEX idx_delivery_pricing_company ON delivery_pricing (delivery_company_id);
CREATE INDEX idx_delivery_pricing_wilaya ON delivery_pricing (wilaya_code);

-- ─── 13. CUSTOMERS ──────────────────────────────────────────────────────────
-- العملاء

CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name       VARCHAR(255) NOT NULL,
  phone           VARCHAR(20) NOT NULL,             -- contact for delivery only; never used for OTP
  email           VARCHAR(255),
  wilaya_code     VARCHAR(2) REFERENCES wilayas(code),
  commune         VARCHAR(255),
  address         TEXT,
  notes           TEXT,
  total_orders    INTEGER NOT NULL DEFAULT 0,
  total_spent     INTEGER NOT NULL DEFAULT 0,                   -- إجمالي الإنفاق بالدينار
  consent_data    BOOLEAN NOT NULL DEFAULT FALSE,               -- موافقة تخزين البيانات (قانون 18-07)
  consent_date    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_customers_phone ON customers (phone);
CREATE INDEX idx_customers_wilaya ON customers (wilaya_code);
CREATE INDEX idx_customers_name ON customers (full_name);

-- ─── 14. ORDERS ─────────────────────────────────────────────────────────────
-- الطلبات (كل منتج بطلب مستقل بفاتورة مستقلة)

CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number  VARCHAR(20) NOT NULL UNIQUE,                  -- INV-2026-0001
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  product_id      VARCHAR(64) NOT NULL,                        -- catalog SKU (no FK: products.id is UUID)
  product_name    VARCHAR(500) NOT NULL,                        -- نسخة من اسم المنتج وقت الطلب
  product_price   INTEGER NOT NULL,                             -- سعر الوحدة وقت الطلب
  selected_size   VARCHAR(10) NOT NULL,
  selected_color_name_ar VARCHAR(100) NOT NULL,
  selected_color_name_fr VARCHAR(100) NOT NULL,
  selected_color_name_en VARCHAR(100) NOT NULL,
  selected_color_hex VARCHAR(7) NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  subtotal        INTEGER NOT NULL CHECK (subtotal >= 0),       -- سعر الوحدة × الكمية
  delivery_company_id UUID REFERENCES delivery_companies(id) ON DELETE SET NULL,
  delivery_company_name VARCHAR(255),                           -- نسخة من اسم الشركة
  wilaya_code     VARCHAR(2) REFERENCES wilayas(code),
  wilaya_name     VARCHAR(100) NOT NULL,
  commune         VARCHAR(255) NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_price  INTEGER NOT NULL DEFAULT 0 CHECK (delivery_price >= 0),
  total           INTEGER NOT NULL CHECK (total >= 0),          -- subtotal + delivery_price
  status          order_status NOT NULL DEFAULT 'new',
  payment_method  payment_method NOT NULL DEFAULT 'cod',
  payment_status  payment_status NOT NULL DEFAULT 'pending',
  tracking_number VARCHAR(100),                                 -- رقم التتبع من شركة التوصيل
  admin_notes     TEXT,                                         -- ملاحظات داخلية
  customer_notes  TEXT,                                         -- ملاحظات العميل
  confirmed_at    TIMESTAMPTZ,
  shipped_at      TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_invoice ON orders (invoice_number);
CREATE INDEX idx_orders_customer ON orders (customer_id);
CREATE INDEX idx_orders_product ON orders (product_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_payment_status ON orders (payment_status);
CREATE INDEX idx_orders_wilaya ON orders (wilaya_code);
CREATE INDEX idx_orders_delivery_company ON orders (delivery_company_id);
CREATE INDEX idx_orders_created ON orders (created_at DESC);
CREATE INDEX idx_orders_date_status ON orders (created_at DESC, status);

-- ─── 15. ORDER STATUS HISTORY ───────────────────────────────────────────────
-- سجل تغييرات حالة الطلب

CREATE TABLE order_status_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  old_status      order_status,
  new_status      order_status NOT NULL,
  changed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_history_order ON order_status_history (order_id);
CREATE INDEX idx_order_history_date ON order_status_history (created_at DESC);

-- ─── 16. PAYMENTS ───────────────────────────────────────────────────────────
-- سجل المعاملات المالية

CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount          INTEGER NOT NULL CHECK (amount > 0),
  payment_method  payment_method NOT NULL,
  status          payment_status NOT NULL DEFAULT 'pending',
  transaction_id  VARCHAR(255),                                 -- معرف المعاملة من بوابة الدفع
  gateway_response JSONB,                                       -- استجابة بوابة الدفع
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_order ON payments (order_id);
CREATE INDEX idx_payments_status ON payments (status);

-- ─── 17. STAFF EMAIL LOGIN CHALLENGES ───────────────────────────────────────
-- رموز تحقق الدخول للموظفين (مدير النظام / مدير المبيعات فقط).
-- لا توجد قنوات SMS أو تحقق برقم الهاتف. تُخزَّن رموز مجزّأة فقط.

DROP TABLE IF EXISTS otp_verifications;

CREATE TABLE email_login_challenges (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email           VARCHAR(255) NOT NULL,
  code_hash       TEXT NOT NULL,                                -- HMAC, never the plain code
  challenge_hash  TEXT NOT NULL UNIQUE,                         -- HMAC of the opaque token
  purpose         VARCHAR(10) NOT NULL DEFAULT 'login'
                    CHECK (purpose IN ('login', 'setup')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_challenges_user ON email_login_challenges (user_id);
CREATE INDEX idx_email_challenges_expires ON email_login_challenges (expires_at);

-- ─── 18. PRODUCT REVIEWS ────────────────────────────────────────────────────
-- تقييمات المنتجات

CREATE TABLE product_reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating          INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment         TEXT,
  is_approved     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_product ON product_reviews (product_id);
CREATE INDEX idx_reviews_customer ON product_reviews (customer_id);

-- ─── 19. EMAIL NOTIFICATION LOG ─────────────────────────────────────────────
-- سجل الإشعارات المرسلة بالبريد فقط (لا SMS ولا واتساب آلي)

CREATE TABLE notification_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_email VARCHAR(255),
  channel         VARCHAR(20) NOT NULL DEFAULT 'email',          -- email only
  message_type    VARCHAR(50) NOT NULL,                          -- 'order_confirmation', 'status_update', 'login_code'
  order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
  content         TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'sent',           -- 'sent', 'delivered', 'failed'
  provider        VARCHAR(50),
  provider_response JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_order ON notification_log (order_id);
CREATE INDEX idx_notifications_email ON notification_log (recipient_email);
CREATE INDEX idx_notifications_date ON notification_log (created_at DESC);

-- ─── 20. AUDIT LOG ──────────────────────────────────────────────────────────
-- سجل التدقيق (للأمان والامتثال لقانون 18-07)

CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  action          VARCHAR(100) NOT NULL,                        -- 'create', 'update', 'delete', 'login', 'export'
  entity_type     VARCHAR(50) NOT NULL,                         -- 'product', 'order', 'customer', 'user'
  entity_id       VARCHAR(100),
  old_values      JSONB,
  new_values      JSONB,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log (user_id);
CREATE INDEX idx_audit_entity ON audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_date ON audit_log (created_at DESC);

-- ─── 21. DATA DELETION REQUESTS ─────────────────────────────────────────────
-- طلبات حذف البيانات (قانون 18-07)

CREATE TABLE data_deletion_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  reason          TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',       -- 'pending', 'processing', 'completed', 'rejected'
  processed_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deletion_requests_status ON data_deletion_requests (status);

-- ─── 22. SESSIONS ───────────────────────────────────────────────────────────
-- جلسات المستخدمين

CREATE TABLE sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash      TEXT NOT NULL UNIQUE,
  ip_address      INET,
  user_agent      TEXT,
  expires_at      TIMESTAMPTZ NOT NULL,
  absolute_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '12 hours'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions (user_id);
CREATE INDEX idx_sessions_token ON sessions (token_hash);
CREATE INDEX idx_sessions_expires ON sessions (expires_at);


-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated      BEFORE UPDATE ON products          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated        BEFORE UPDATE ON orders            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_customers_updated     BEFORE UPDATE ON customers         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated         BEFORE UPDATE ON users             FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_delivery_co_updated   BEFORE UPDATE ON delivery_companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payments_updated      BEFORE UPDATE ON payments          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_store_settings_updated BEFORE UPDATE ON store_settings   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_delivery_pricing_updated BEFORE UPDATE ON delivery_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(invoice_number FROM 'INV-\d{4}-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO next_num
    FROM orders
    WHERE invoice_number LIKE 'INV-' || EXTRACT(YEAR FROM NOW())::TEXT || '-%';

    NEW.invoice_number = 'INV-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(next_num::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_invoice BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- Track order status changes
CREATE OR REPLACE FUNCTION track_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, old_status, new_status)
    VALUES (NEW.id, OLD.status, NEW.status);

    -- Update timestamp fields
    CASE NEW.status
      WHEN 'confirmed' THEN NEW.confirmed_at = NOW();
      WHEN 'shipped'   THEN NEW.shipped_at = NOW();
      WHEN 'delivered'  THEN NEW.delivered_at = NOW();
      WHEN 'cancelled'  THEN NEW.cancelled_at = NOW();
      ELSE NULL;
    END CASE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_status_change BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION track_order_status_change();

-- Update customer stats after order
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers SET
    total_orders = (SELECT COUNT(*) FROM orders WHERE customer_id = NEW.customer_id),
    total_spent  = (SELECT COALESCE(SUM(total), 0) FROM orders WHERE customer_id = NEW.customer_id AND status != 'cancelled')
  WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_customer_stats AFTER INSERT OR UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_customer_stats();

-- Update product rating after review
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products SET
    rating = (SELECT COALESCE(AVG(rating), 0) FROM product_reviews WHERE product_id = NEW.product_id AND is_approved = TRUE),
    review_count = (SELECT COUNT(*) FROM product_reviews WHERE product_id = NEW.product_id AND is_approved = TRUE)
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reviews_rating AFTER INSERT OR UPDATE OR DELETE ON product_reviews FOR EACH ROW EXECUTE FUNCTION update_product_rating();

-- Stock is decremented atomically by the API before the order is inserted
-- (UPDATE products ... WHERE stock_quantity >= n). The old trigger-based
-- decrement was removed: it double-counted stock and typed product_id as UUID
-- while orders now reference catalog SKUs.

-- Clean expired staff email login challenges
CREATE OR REPLACE FUNCTION clean_expired_email_challenges()
RETURNS void AS $$
BEGIN
  DELETE FROM email_login_challenges WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Clean expired sessions
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- VIEWS — Reporting
-- ============================================================================

-- ─── Daily sales summary
CREATE OR REPLACE VIEW v_daily_sales AS
SELECT
  DATE(created_at) AS sale_date,
  COUNT(*) AS total_orders,
  COUNT(*) FILTER (WHERE status = 'delivered') AS delivered_orders,
  COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_orders,
  SUM(total) AS total_revenue,
  SUM(total) FILTER (WHERE status = 'delivered') AS delivered_revenue,
  AVG(total)::INTEGER AS avg_order_value
FROM orders
GROUP BY DATE(created_at)
ORDER BY sale_date DESC;

-- ─── Orders by wilaya
CREATE OR REPLACE VIEW v_orders_by_wilaya AS
SELECT
  w.code,
  w.name_ar,
  w.name_fr,
  COUNT(o.id) AS total_orders,
  SUM(o.total) AS total_revenue,
  COUNT(o.id) FILTER (WHERE o.status = 'delivered') AS delivered,
  COUNT(o.id) FILTER (WHERE o.status = 'cancelled') AS cancelled
FROM wilayas w
LEFT JOIN orders o ON o.wilaya_code = w.code
GROUP BY w.code, w.name_ar, w.name_fr
ORDER BY total_orders DESC;

-- ─── Delivery company performance
CREATE OR REPLACE VIEW v_delivery_performance AS
SELECT
  dc.id,
  dc.name,
  dc.is_active,
  COUNT(o.id) AS total_orders,
  COUNT(o.id) FILTER (WHERE o.status = 'delivered') AS delivered,
  COUNT(o.id) FILTER (WHERE o.status = 'returned') AS returned,
  AVG(EXTRACT(EPOCH FROM (o.delivered_at - o.shipped_at)) / 86400)::DECIMAL(4,1) AS avg_delivery_days
FROM delivery_companies dc
LEFT JOIN orders o ON o.delivery_company_id = dc.id
GROUP BY dc.id, dc.name, dc.is_active
ORDER BY total_orders DESC;

-- ─── Top products
CREATE OR REPLACE VIEW v_top_products AS
SELECT
  p.id,
  p.name_ar,
  p.name_fr,
  p.price,
  p.stock_quantity,
  COUNT(o.id) AS total_orders,
  SUM(o.quantity) AS total_quantity_sold,
  SUM(o.subtotal) AS total_revenue
FROM products p
LEFT JOIN orders o ON o.product_id = p.id AND o.status != 'cancelled'
GROUP BY p.id, p.name_ar, p.name_fr, p.price, p.stock_quantity
ORDER BY total_quantity_sold DESC NULLS LAST;

-- ─── Customer overview
CREATE OR REPLACE VIEW v_customer_overview AS
SELECT
  c.id,
  c.full_name,
  c.phone,
  c.wilaya_code,
  w.name_ar AS wilaya_name,
  c.total_orders,
  c.total_spent,
  c.created_at,
  MAX(o.created_at) AS last_order_date
FROM customers c
LEFT JOIN wilayas w ON w.code = c.wilaya_code
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.full_name, c.phone, c.wilaya_code, w.name_ar, c.total_orders, c.total_spent, c.created_at
ORDER BY c.total_spent DESC;


-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Store settings
INSERT INTO store_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Two staff accounts are provisioned by `npm run seed:staff` (not by raw SQL):
--   admin   (مدير النظام)  — admin@khotwa.internal
--   manager (مدير المبيعات) — manager@khotwa.internal
-- Both use placeholder @khotwa.internal mailboxes and are NOT usable for admin
-- access until first login sets a real email and the code is verified, or the
-- admin corrects the email via PATCH /api/admin/users/:id/email.
-- Credentials live in secrets/staff-credentials.json (git-ignored).
-- Generic accounts can still be created with `npm run admin:create`.

-- Categories
INSERT INTO categories (slug, name_ar, name_fr, name_en, icon, sort_order) VALUES
  ('classic',  'كلاسيك',  'Classique', 'Classic',  '👞', 1),
  ('sport',    'رياضية',  'Sport',     'Sport',    '🏃', 2),
  ('casual',   'كاجوال',  'Casual',    'Casual',   '🥿', 3),
  ('boots',    'بوت',     'Bottes',    'Boots',    '🥾', 4),
  ('sandals',  'صنادل',   'Sandales',  'Sandals',  '🩴', 5)
ON CONFLICT (slug) DO NOTHING;

-- Brands
INSERT INTO brands (name, slug) VALUES
  ('Khotwa Original', 'khotwa-original'),
  ('Urban Step',      'urban-step'),
  ('Eleganza',        'eleganza'),
  ('SpeedMax',        'speedmax'),
  ('Milano DZ',       'milano-dz'),
  ('ComfortPlus',     'comfortplus')
ON CONFLICT (slug) DO NOTHING;

-- Delivery companies
INSERT INTO delivery_companies (name, slug, estimated_days, phone, tracking_url, contact_email, is_active) VALUES
  ('EMS Algeria', 'ems',      '2-4', '023 71 71 71',  'https://www.ems.dz/suivi',       'contact@ems.dz',       TRUE),
  ('DHD Algeria', 'dhd',      '1-3', '0560 00 00 00', 'https://dhd.dz/tracking',         NULL,                   TRUE),
  ('K-M Express', 'km',       '2-5', '0550 00 00 00', NULL,                               NULL,                   TRUE),
  ('ZR Express',  'zr',       '1-3', '0770 00 00 00', 'https://zrexpress.com/tracking',  NULL,                   TRUE),
  ('Yalidine',    'yalidine', '2-4', '0560 00 00 00', 'https://yalidine.com/suivi',      'support@yalidine.com', TRUE)
ON CONFLICT (slug) DO NOTHING;

-- 58 Wilayas
INSERT INTO wilayas (code, name_ar, name_fr, name_en, default_delivery_price) VALUES
  ('01', 'أدرار',           'Adrar',              'Adrar',              600),
  ('02', 'الشلف',           'Chlef',              'Chlef',              400),
  ('03', 'الأغواط',         'Laghouat',           'Laghouat',           500),
  ('04', 'أم البواقي',      'Oum El Bouaghi',     'Oum El Bouaghi',     400),
  ('05', 'باتنة',           'Batna',              'Batna',              400),
  ('06', 'بجاية',           'Béjaïa',             'Béjaïa',             350),
  ('07', 'بسكرة',           'Biskra',             'Biskra',             450),
  ('08', 'بشار',            'Béchar',             'Béchar',             600),
  ('09', 'البليدة',         'Blida',              'Blida',              250),
  ('10', 'البويرة',         'Bouira',             'Bouira',             350),
  ('11', 'تمنراست',         'Tamanrasset',        'Tamanrasset',        700),
  ('12', 'تبسة',            'Tébessa',            'Tébessa',            450),
  ('13', 'تلمسان',          'Tlemcen',            'Tlemcen',            400),
  ('14', 'تيارت',           'Tiaret',             'Tiaret',             400),
  ('15', 'تيزي وزو',       'Tizi Ouzou',         'Tizi Ouzou',         350),
  ('16', 'الجزائر',         'Alger',              'Algiers',            200),
  ('17', 'الجلفة',          'Djelfa',             'Djelfa',             450),
  ('18', 'جيجل',            'Jijel',              'Jijel',              400),
  ('19', 'سطيف',            'Sétif',              'Sétif',              350),
  ('20', 'سعيدة',           'Saïda',              'Saïda',              450),
  ('21', 'سكيكدة',          'Skikda',             'Skikda',             400),
  ('22', 'سيدي بلعباس',     'Sidi Bel Abbès',     'Sidi Bel Abbès',     400),
  ('23', 'عنابة',           'Annaba',             'Annaba',             350),
  ('24', 'قالمة',           'Guelma',             'Guelma',             400),
  ('25', 'قسنطينة',         'Constantine',        'Constantine',        350),
  ('26', 'المدية',          'Médéa',              'Médéa',              350),
  ('27', 'مستغانم',         'Mostaganem',         'Mostaganem',         400),
  ('28', 'المسيلة',         'M''Sila',            'M''Sila',            400),
  ('29', 'معسكر',           'Mascara',            'Mascara',            400),
  ('30', 'ورقلة',           'Ouargla',            'Ouargla',            550),
  ('31', 'وهران',           'Oran',               'Oran',               350),
  ('32', 'البيض',           'El Bayadh',          'El Bayadh',          550),
  ('33', 'إليزي',           'Illizi',             'Illizi',             700),
  ('34', 'برج بوعريريج',    'Bordj Bou Arréridj', 'Bordj Bou Arréridj', 400),
  ('35', 'بومرداس',         'Boumerdès',          'Boumerdès',          250),
  ('36', 'الطارف',          'El Tarf',            'El Tarf',            400),
  ('37', 'تندوف',           'Tindouf',            'Tindouf',            700),
  ('38', 'تيسمسيلت',        'Tissemsilt',         'Tissemsilt',         450),
  ('39', 'الوادي',          'El Oued',            'El Oued',            500),
  ('40', 'خنشلة',           'Khenchela',          'Khenchela',          450),
  ('41', 'سوق أهراس',       'Souk Ahras',         'Souk Ahras',         400),
  ('42', 'تيبازة',          'Tipaza',             'Tipaza',             250),
  ('43', 'ميلة',            'Mila',               'Mila',               400),
  ('44', 'عين الدفلى',      'Aïn Defla',          'Aïn Defla',          350),
  ('45', 'النعامة',         'Naâma',              'Naâma',              550),
  ('46', 'عين تموشنت',      'Aïn Témouchent',     'Aïn Témouchent',     400),
  ('47', 'غرداية',          'Ghardaïa',           'Ghardaïa',           500),
  ('48', 'غليزان',          'Relizane',           'Relizane',           400),
  ('49', 'تيميمون',         'Timimoun',           'Timimoun',           700),
  ('50', 'برج باجي مختار',  'Bordj Badji Mokhtar','Bordj Badji Mokhtar',800),
  ('51', 'أولاد جلال',      'Ouled Djellal',      'Ouled Djellal',      500),
  ('52', 'بني عباس',        'Béni Abbès',         'Béni Abbès',         650),
  ('53', 'عين صالح',        'In Salah',           'In Salah',           700),
  ('54', 'عين قزام',        'In Guezzam',         'In Guezzam',         800),
  ('55', 'تقرت',            'Touggourt',          'Touggourt',          500),
  ('56', 'جانت',            'Djanet',             'Djanet',             750),
  ('57', 'المغير',          'El M''Ghair',        'El M''Ghair',        500),
  ('58', 'المنيعة',         'El Meniaa',          'El Meniaa',          550)
ON CONFLICT (code) DO NOTHING;


-- ============================================================================
-- SECURITY — Row Level Security (RLS)
-- ============================================================================

-- ── Least-privilege application role ────────────────────────────────────────
-- The API connects as khotwa_app (NOT the schema owner). The owner role is used
-- only for migrations. Set a password separately:
--   ALTER ROLE khotwa_app LOGIN PASSWORD '<strong-random-password>';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'khotwa_app') THEN
    CREATE ROLE khotwa_app NOLOGIN;
  END IF;
END $$;

-- ── Additional security tables (used by the API) ────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash      TEXT NOT NULL UNIQUE,          -- SHA-256 of the emailed token
  expires_at      TIMESTAMPTZ NOT NULL,
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires ON password_reset_tokens (expires_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  key             VARCHAR(220) PRIMARY KEY,
  count           INTEGER NOT NULL DEFAULT 0,
  reset_at        TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits (reset_at);

CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1000;

-- Backward-compatible hardening for databases created by the previous schema.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE customers DROP COLUMN IF EXISTS phone_verified;
ALTER TABLE orders DROP COLUMN IF EXISTS phone_verified;

-- Webhook idempotency: one payment row per provider transaction id.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments (transaction_id);

-- ── Server-authoritative product prices (ids match the storefront catalog) ──
INSERT INTO products (sku, name_ar, name_fr, name_en, price, stock_quantity) VALUES
  ('1', 'حذاء كلاسيكي جلد طبيعي', 'Chaussure classique en cuir', 'Classic Leather Shoe', 8500, 45),
  ('2', 'سنيكرز أبيض عصري', 'Sneakers blanc moderne', 'Modern White Sneakers', 6500, 60),
  ('3', 'حذاء أكسفورد أسود رسمي', 'Oxford noir formel', 'Black Formal Oxford', 9800, 30),
  ('4', 'حذاء رياضي للجري', 'Chaussure de course', 'Running Sport Shoe', 5200, 80),
  ('5', 'بوت جلد طبيعي', 'Bottine en cuir', 'Leather Boot', 12500, 25),
  ('6', 'لوفر شمواه أنيق', 'Mocassin en daim élégant', 'Elegant Suede Loafer', 7200, 35),
  ('7', 'صندل جلد صيفي', 'Sandale en cuir été', 'Summer Leather Sandal', 3800, 50),
  ('8', 'موكاسان كلاسيكي', 'Mocassin classique', 'Classic Moccasin', 6800, 40)
ON CONFLICT (sku) DO NOTHING;

-- ── Row Level Security ──────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_login_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Context helpers: the API sets these per transaction (see server/db/postgres.ts).
CREATE OR REPLACE FUNCTION app_is_system() RETURNS boolean
  LANGUAGE sql STABLE AS $$ SELECT current_setting('app.system', true) = 'on' $$;

CREATE OR REPLACE FUNCTION app_role() RETURNS text
  LANGUAGE sql STABLE AS $$ SELECT COALESCE(current_setting('app.user_role', true), '') $$;

CREATE OR REPLACE FUNCTION app_phone() RETURNS text
  LANGUAGE sql STABLE AS $$ SELECT COALESCE(current_setting('app.phone', true), '') $$;

CREATE OR REPLACE FUNCTION app_invoice() RETURNS text
  LANGUAGE sql STABLE AS $$ SELECT COALESCE(current_setting('app.invoice', true), '') $$;

-- SECURITY DEFINER lets the guest insert path resolve its own customer row
-- without granting broad SELECT on customers.
CREATE OR REPLACE FUNCTION app_customer_id_for_phone() RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT id FROM customers WHERE phone = app_phone() LIMIT 1
  $$;

-- users / sessions / email challenges / reset tokens / rate limits: server-internal only.
CREATE POLICY sys_users ON users FOR ALL USING (app_is_system()) WITH CHECK (app_is_system());
CREATE POLICY sys_sessions ON sessions FOR ALL USING (app_is_system()) WITH CHECK (app_is_system());
CREATE POLICY sys_email_challenges ON email_login_challenges FOR ALL
  USING (app_is_system()) WITH CHECK (app_is_system());
CREATE POLICY sys_resets ON password_reset_tokens FOR ALL USING (app_is_system()) WITH CHECK (app_is_system());
CREATE POLICY sys_rate_limits ON rate_limits FOR ALL USING (app_is_system()) WITH CHECK (app_is_system());

-- Server-internal (webhooks, migrations, cleanup) has full access.
CREATE POLICY sys_customers ON customers FOR ALL USING (app_is_system()) WITH CHECK (app_is_system());
CREATE POLICY sys_orders ON orders FOR ALL USING (app_is_system()) WITH CHECK (app_is_system());
CREATE POLICY sys_payments ON payments FOR ALL USING (app_is_system()) WITH CHECK (app_is_system());
CREATE POLICY sys_history ON order_status_history FOR ALL USING (app_is_system()) WITH CHECK (app_is_system());

-- Staff can manage customers/orders. Delivery users are read-only.
CREATE POLICY staff_customers ON customers FOR ALL
  USING (app_role() IN ('admin', 'manager'))
  WITH CHECK (app_role() IN ('admin', 'manager'));
CREATE POLICY staff_orders ON orders FOR ALL
  USING (app_role() IN ('admin', 'manager', 'delivery'))
  WITH CHECK (app_role() IN ('admin', 'manager'));
CREATE POLICY staff_payments ON payments FOR ALL
  USING (app_role() IN ('admin', 'manager', 'delivery'))
  WITH CHECK (app_role() IN ('admin', 'manager'));
CREATE POLICY staff_history ON order_status_history FOR ALL
  USING (app_role() IN ('admin', 'manager', 'delivery'))
  WITH CHECK (app_role() IN ('admin', 'manager'));

-- Guests may only touch their own customer row / their own invoice.
CREATE POLICY guest_customers_select ON customers FOR SELECT USING (phone = app_phone());
CREATE POLICY guest_customers_insert ON customers FOR INSERT WITH CHECK (phone = app_phone());
CREATE POLICY guest_customers_update ON customers FOR UPDATE
  USING (phone = app_phone()) WITH CHECK (phone = app_phone());
CREATE POLICY guest_orders_select ON orders FOR SELECT USING (
  invoice_number = app_invoice() AND customer_id = app_customer_id_for_phone()
);
CREATE POLICY guest_orders_insert ON orders FOR INSERT WITH CHECK (
  customer_id = app_customer_id_for_phone()
);

-- Audit trail: append-only for the app; readable by admins only.
CREATE POLICY audit_insert ON audit_log FOR INSERT WITH CHECK (TRUE);
CREATE POLICY audit_select ON audit_log FOR SELECT
  USING (app_is_system() OR app_role() = 'admin');

-- ── Privileges for the application role ─────────────────────────────────────
GRANT USAGE ON SCHEMA public TO khotwa_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO khotwa_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO khotwa_app;
GRANT EXECUTE ON FUNCTION app_is_system() TO khotwa_app;
GRANT EXECUTE ON FUNCTION app_role() TO khotwa_app;
GRANT EXECUTE ON FUNCTION app_phone() TO khotwa_app;
GRANT EXECUTE ON FUNCTION app_invoice() TO khotwa_app;
GRANT EXECUTE ON FUNCTION app_customer_id_for_phone() TO khotwa_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO khotwa_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO khotwa_app;


-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- Deployment checklist:
--   1. Set strong passwords for all user accounts (replace placeholder hashes)
--   2. Configure SSL/HTTPS on the database connection
--   3. Set up automated backups (daily)
--   4. Configure pg_cron for: clean_expired_email_challenges(), clean_expired_sessions()
--   5. Set up connection pooling (PgBouncer recommended)
--   6. Create read-only replica for reporting queries
--   7. Configure WAL archiving for point-in-time recovery
--
-- Algerian Law 18-07 compliance:
--   - Customer consent tracked in customers.consent_data / consent_date
--   - Data deletion requests via data_deletion_requests table
--   - Full audit trail in audit_log
--   - Payment card data is NEVER stored — handled by external gateways (Satim/CIB)
--   - All personal data can be exported/deleted per customer request
--
-- Performance:
--   - All foreign keys indexed
--   - Composite indexes on frequently filtered columns
--   - Materialized views recommended for heavy reporting (v_daily_sales, etc.)
--   - Consider partitioning orders table by created_at after 1M+ rows
-- ============================================================================
