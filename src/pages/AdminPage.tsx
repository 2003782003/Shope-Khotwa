import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, ShoppingCart, Truck, Users, BarChart3, Settings, Eye,
  LogOut, Lock, User, Mail, Shield, Bell, Search,
  TrendingUp, TrendingDown, Clock, CheckCircle2,
  AlertTriangle, ChevronRight, ChevronLeft, Plus,
  Edit3, Trash2, Download, RefreshCw, Activity, MapPin, Calendar,
  Phone, Star, Layers, PieChart,
  ToggleLeft, ToggleRight, Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { t, formatPrice } from '../lib/i18n';
import { products, wilayas, storeSettings } from '../lib/data';
import { OrderStatus, Order, Lang } from '../lib/types';
import { useNavigate } from 'react-router-dom';
import { authApi, adminApi, ApiError, type ApiUser } from '../lib/api';


type AdminRole = 'admin' | 'manager' | 'delivery';
type Tab = 'overview' | 'products' | 'orders' | 'delivery' | 'customers' | 'reports' | 'settings';

// ─── Staff authentication screens ───────────────────────────────────────────
// Password → (first-time) real email setup → emailed 6-digit code → session.
// All checks happen on the API; nothing about staff credentials is in this bundle.
type StaffLang = 'ar' | 'fr' | 'en';

function authErrorText(code: string, lang: StaffLang): string {
  const isRtl = lang === 'ar';
  switch (code) {
    case 'invalid_credentials':
      return isRtl ? 'البريد أو كلمة المرور غير صحيحة.' : 'Invalid email or password.';
    case 'rate_limited':
    case 'too_many_attempts':
      return isRtl ? 'محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.' : 'Too many attempts. Please wait and try again.';
    case 'email_delivery_failed':
      return isRtl
        ? 'تعذّر إرسال رمز التحقق. تأكد من إعداد خدمة البريد وحاول مرة أخرى.'
        : 'Could not send the verification code. Check the mail setup and try again.';
    case 'email_in_use':
      return isRtl ? 'هذا البريد مستخدم لحساب آخر.' : 'This email is already used by another account.';
    case 'placeholder_email_not_allowed':
      return isRtl ? 'يجب إدخال بريد حقيقي وليس بريداً داخلياً.' : 'A real mailbox is required, not an internal placeholder.';
    case 'invalid_setup_token':
    case 'invalid_challenge':
      return isRtl ? 'انتهت صلاحية محاولة الدخول. سجّل الدخول من جديد.' : 'This sign-in attempt expired. Please sign in again.';
    case 'invalid_code':
      return isRtl ? 'الرمز غير صحيح أو منتهي الصلاحية.' : 'The code is invalid or has expired.';
    default:
      return isRtl ? 'تعذّر تسجيل الدخول. حاول مرة أخرى.' : 'Could not sign in. Please try again.';
  }
}

function AuthShell({ children, lang }: { children: React.ReactNode; lang: StaffLang }) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card rounded-3xl border border-border/60 shadow-xl p-8"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-4">
            <Shield size={26} />
          </div>
          <h1 className="font-heading text-2xl font-bold">
            {lang === 'ar' ? 'لوحة الإدارة' : 'Admin panel'}
          </h1>
          <p className="text-sm text-text-muted mt-2">
            {lang === 'ar' ? 'دخول محمي بجلسة على السيرفر' : 'Protected by a server-verified session'}
          </p>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function AuthError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function LoginScreen({
  onLogin,
  lang,
  error,
  isLoading,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
  lang: StaffLang;
  error: string;
  isLoading: boolean;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const isRtl = lang === 'ar';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onLogin(email.trim().toLowerCase(), password);
  };

  return (
    <AuthShell lang={lang}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-xs font-semibold text-text-light mb-1.5 block">
            {isRtl ? 'البريد الإلكتروني' : 'Email'}
          </span>
          <div className="relative">
            <Mail size={16} className="absolute top-1/2 -translate-y-1/2 start-3 text-text-muted" />
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl ps-10 pe-3 py-2.5 text-sm outline-none focus:border-accent"
              dir="ltr"
            />
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-text-light mb-1.5 block">
            {isRtl ? 'كلمة المرور' : 'Password'}
          </span>
          <div className="relative">
            <Lock size={16} className="absolute top-1/2 -translate-y-1/2 start-3 text-text-muted" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl ps-10 pe-10 py-2.5 text-sm outline-none focus:border-accent"
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 -translate-y-1/2 end-3 text-text-muted"
              aria-label="toggle password visibility"
            >
              <Eye size={16} />
            </button>
          </div>
        </label>

        {error && <AuthError message={error} />}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-accent hover:bg-accent-light disabled:opacity-60 text-white font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 transition-colors"
        >
          {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <Lock size={16} />}
          {isRtl ? 'تسجيل الدخول' : 'Sign in'}
        </button>
      </form>

      <p className="text-[11px] text-text-muted text-center mt-6 leading-relaxed">
        {isRtl
          ? 'حسابات الموظفين (مدير النظام / مدير المبيعات) فقط. التحقق بالبريد الإلكتروني إلزامي.'
          : 'Staff accounts only (admin / sales manager). Email verification is required.'}
      </p>
    </AuthShell>
  );
}

function EmailSetupScreen({
  onSubmit,
  lang,
  error,
  isLoading,
}: {
  onSubmit: (email: string) => Promise<void>;
  lang: StaffLang;
  error: string;
  isLoading: boolean;
}) {
  const [email, setEmail] = useState('');
  const isRtl = lang === 'ar';

  return (
    <AuthShell lang={lang}>
      <div className="mb-5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl p-3 leading-relaxed">
        {isRtl
          ? 'أول دخول لهذا الحساب. أدخل بريدك الحقيقي لإرسال رمز التحقق؛ لا يمكن الوصول للوحة الإدارة قبل تأكيده.'
          : 'First sign-in for this account. Enter your real mailbox to receive a verification code; admin access is not granted until it is confirmed.'}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit(email.trim().toLowerCase());
        }}
        className="space-y-4"
      >
        <label className="block">
          <span className="text-xs font-semibold text-text-light mb-1.5 block">
            {isRtl ? 'البريد الإلكتروني للموظف' : 'Staff email address'}
          </span>
          <div className="relative">
            <Mail size={16} className="absolute top-1/2 -translate-y-1/2 start-3 text-text-muted" />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full bg-surface border border-border rounded-xl ps-10 pe-3 py-2.5 text-sm outline-none focus:border-accent"
              dir="ltr"
            />
          </div>
        </label>
        {error && <AuthError message={error} />}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-accent hover:bg-accent-light disabled:opacity-60 text-primary font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 transition-colors"
        >
          {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <Mail size={16} />}
          {isRtl ? 'إرسال رمز التحقق' : 'Send verification code'}
        </button>
      </form>
    </AuthShell>
  );
}

function EmailCodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '');
  return (
    <div className="flex gap-2 justify-center" dir="ltr">
      {digits.map((digit, i) => (
        <input
          key={i}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => {
            const char = e.target.value.replace(/\D/g, '').slice(-1);
            const next = digits.slice();
            next[i] = char;
            onChange(next.join('').slice(0, 6));
          }}
          onPaste={(e) => {
            e.preventDefault();
            onChange(e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6));
          }}
          aria-label={`digit ${i + 1}`}
          className="w-11 h-13 text-center text-xl font-bold bg-surface border-2 border-border rounded-xl focus:outline-none focus:border-accent"
        />
      ))}
    </div>
  );
}

function EmailCodeScreen({
  onSubmit,
  onResend,
  lang,
  error,
  notice,
  isLoading,
  isResending,
  devCode,
}: {
  onSubmit: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  lang: StaffLang;
  error: string;
  notice: string;
  isLoading: boolean;
  isResending: boolean;
  devCode: string;
}) {
  const [code, setCode] = useState('');
  const isRtl = lang === 'ar';

  return (
    <AuthShell lang={lang}>
      <div className="text-center mb-6">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-3">
          <Mail size={22} />
        </div>
        <h2 className="font-heading text-lg font-bold">
          {isRtl ? 'تحقق من بريدك الإلكتروني' : 'Check your email'}
        </h2>
        <p className="text-xs text-text-muted mt-1">
          {isRtl ? 'أدخل رمز التحقق المكوّن من 6 أرقام' : 'Enter the 6-digit code we sent you'}
        </p>
      </div>

      {devCode && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-center">
          <p className="text-amber-700 text-xs font-semibold">
            {isRtl ? 'وضع التطوير — الرمز:' : 'Development mode — code:'}{' '}
            <span className="bg-amber-200 px-2 py-0.5 rounded font-mono tracking-widest">{devCode}</span>
          </p>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit(code);
        }}
        className="space-y-4"
      >
        <EmailCodeInput value={code} onChange={setCode} />
        {notice && <p className="text-xs text-success text-center">{notice}</p>}
        {error && <AuthError message={error} />}
        <button
          type="submit"
          disabled={code.length < 6 || isLoading}
          className="w-full bg-accent hover:bg-accent-light disabled:opacity-50 text-primary font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 transition-colors"
        >
          {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          {isRtl ? 'تأكيد الدخول' : 'Verify & sign in'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => void onResend()}
        disabled={isResending}
        className="mt-4 w-full text-accent hover:text-accent-dark text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
      >
        <RefreshCw size={14} className={isResending ? 'animate-spin' : ''} />
        {isRtl ? 'إعادة إرسال الرمز' : 'Resend code'}
      </button>
    </AuthShell>
  );
}


// ─── Small presentational helpers ───────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendValue,
  color,
  bg,
  delay,
}: {
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  label: string;
  value: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  color: string;
  bg: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay ?? 0 }}
      className={`rounded-2xl p-5 ${bg}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-text-muted font-medium truncate">{label}</p>
          <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
          {trend && trendValue && (
            <p className={`text-[10px] mt-1 flex items-center gap-1 ${trend === 'up' ? 'text-success' : 'text-danger'}`}>
              {trend === 'up' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {trendValue}
            </p>
          )}
        </div>
        <div className={`w-10 h-10 shrink-0 rounded-xl bg-surface flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
      </div>
    </motion.div>
  );
}

function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(1, ...data);
  return (
    <div className="flex items-end gap-1.5 h-32">
      {data.map((value, i) => (
        <div key={i} className="flex-1 h-full bg-surface rounded-t-md relative">
          <div
            className={`${color} rounded-t-md absolute bottom-0 w-full`}
            style={{ height: `${Math.max(4, (value / max) * 100)}%` }}
            title={String(value)}
          />
        </div>
      ))}
    </div>
  );
}

function NotificationBell({ count, lang }: { count: number; lang: 'ar' | 'fr' | 'en' }) {
  return (
    <div
      className="relative p-2 rounded-xl bg-white/10 text-white/80"
      title={lang === 'ar' ? 'إشعارات' : 'Notifications'}
      aria-label={lang === 'ar' ? 'إشعارات' : 'Notifications'}
    >
      <Bell size={18} />
      {count > 0 && (
        <span className="absolute -top-1 -end-1 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </div>
  );
}

// Real staff accounts loaded from the API. Only an admin may correct a mailbox.
function UserRolesCard({ lang, canEditEmail }: { lang: Lang; canEditEmail: boolean }) {
  interface StaffUser {
    id: string;
    email: string;
    fullName: string;
    role: string;
    emailVerified?: boolean;
  }
  const [users, setUsers] = useState<StaffUser[] | null>(null);
  const [error, setError] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    adminApi
      .users()
      .then((res) => setUsers(res.users as unknown as StaffUser[]))
      .catch(() => setError(true));
  }, []);

  const saveEmail = async (id: string) => {
    setEmailSaving(true);
    setEmailError('');
    try {
      const res = await adminApi.updateUserEmail(id, emailDraft.trim().toLowerCase());
      setUsers((current) =>
        current?.map((u) =>
          u.id === id
            ? { ...u, email: res.user.email, emailVerified: false }
            : u,
        ) ?? null,
      );
      setEditingId(null);
      setEmailDraft('');
    } catch (err) {
      setEmailError(
        authErrorText(err instanceof ApiError ? err.code : 'email_update_failed', lang),
      );
    } finally {
      setEmailSaving(false);
    }
  };

  const roleStyle = (role: string) =>
    role === 'admin'
      ? { dot: 'bg-red-500', pill: 'bg-red-50 text-red-600' }
      : role === 'manager'
        ? { dot: 'bg-blue-500', pill: 'bg-blue-50 text-blue-600' }
        : { dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-600' };

  const roleLabel = (role: string) =>
    role === 'admin'
      ? lang === 'ar' ? 'مدير النظام' : 'System admin'
      : role === 'manager'
        ? lang === 'ar' ? 'مدير المبيعات' : 'Sales manager'
        : lang === 'ar' ? 'مشرف توصيل' : 'Delivery';

  if (error) {
    return (
      <p className="text-xs text-text-muted">
        {lang === 'ar' ? 'تعذّر تحميل المستخدمين.' : 'Could not load users.'}
      </p>
    );
  }

  if (!users) {
    return (
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <RefreshCw size={14} className="animate-spin" />
        {lang === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <p className="text-xs text-text-muted">
        {lang === 'ar' ? 'لا يوجد مستخدمون بعد.' : 'No staff users yet.'}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((acc) => {
        const style = roleStyle(acc.role);
        const needsSetup = !acc.emailVerified || acc.email.endsWith('@khotwa.internal');
        return (
          <div key={acc.id} className="bg-surface rounded-xl p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-white text-xs font-bold ${style.dot}`}>
                  {acc.fullName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{acc.fullName}</p>
                  <p className="text-[10px] text-text-muted truncate" dir="ltr">{acc.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {needsSetup && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
                    {lang === 'ar' ? 'يحتاج إعداد بريد' : 'Email setup needed'}
                  </span>
                )}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.pill}`}>
                  {roleLabel(acc.role)}
                </span>
                {canEditEmail && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(acc.id);
                      setEmailDraft(acc.email.endsWith('@khotwa.internal') ? '' : acc.email);
                      setEmailError('');
                    }}
                    className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent/10"
                    title={lang === 'ar' ? 'تعديل الإيميل' : 'Correct email'}
                    aria-label={lang === 'ar' ? 'تعديل الإيميل' : 'Correct email'}
                  >
                    <Edit3 size={14} />
                  </button>
                )}
              </div>
            </div>
            {editingId === acc.id && (
              <div className="mt-3 border-t border-border pt-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    dir="ltr"
                    value={emailDraft}
                    onChange={(e) => setEmailDraft(e.target.value)}
                    placeholder="name@company.com"
                    className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-accent"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void saveEmail(acc.id)}
                      disabled={emailSaving || !emailDraft.trim()}
                      className="px-3 py-2 rounded-lg bg-accent text-primary text-xs font-bold disabled:opacity-60"
                    >
                      {emailSaving ? <RefreshCw size={13} className="animate-spin" /> : lang === 'ar' ? 'حفظ' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingId(null); setEmailDraft(''); setEmailError(''); }}
                      className="px-3 py-2 rounded-lg bg-surface-dark text-text text-xs"
                    >
                      {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-text-muted mt-2">
                  {lang === 'ar'
                    ? 'سيُبطل هذا التعديل الجلسات ويرسل الرمز التالي للبريد الجديد.'
                    : 'This invalidates sessions and delivers the next code to the new mailbox.'}
                </p>
                {emailError && <p className="text-danger text-[11px] mt-1">{emailError}</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Admin Component ───────────────────────────────────
export default function AdminPage() {
  const {
    lang,
    deliveryCompanies: storeDeliveryCompanies,
    addDeliveryCompany,
    updateDeliveryCompany,
    removeDeliveryCompany,
    toggleDeliveryCompany,
  } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [user, setUser] = useState<ApiUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authStage, setAuthStage] = useState<'credentials' | 'setup' | 'code'>('credentials');
  const [setupToken, setSetupToken] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [devEmailCode, setDevEmailCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersError, setOrdersError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [deliverySearch, setDeliverySearch] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [editingCompany, setEditingCompany] = useState<string | null>(null);
  const [companyForm, setCompanyForm] = useState({
    name: '', estimatedDays: '', phone: '', trackingUrl: '', contactEmail: '', notes: '',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const isRtl = lang === 'ar';
  const navigate = useNavigate();

  // Session is resolved by the server from the HttpOnly cookie.
  const loadOrders = useCallback(async () => {
    try {
      setOrdersError('');
      const res = await adminApi.orders();
      setOrders(res.orders as unknown as Order[]);
    } catch (err) {
      setOrdersError(err instanceof ApiError ? err.code : 'load_failed');
    }
  }, []);

  useEffect(() => {
    authApi.me()
      .then((res) => {
        setUser(res.user);
        return loadOrders();
      })
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true));
  }, [loadOrders]);

  const errorOf = (err: unknown) =>
    authErrorText(err instanceof ApiError ? err.code : err instanceof Error ? err.message : 'login_failed', lang);

  const finishLogin = (authenticated: { user: ApiUser }) => {
    setUser(authenticated.user);
    setAuthStage('credentials');
    setAuthError('');
    setAuthNotice('');
    setSetupToken('');
    setChallengeToken('');
    setDevEmailCode('');
    void loadOrders();
  };

  const handleLogin = async (email: string, password: string) => {
    setAuthError('');
    setAuthNotice('');
    setAuthLoading(true);
    try {
      const res = await authApi.login(email, password);
      if ('user' in res) {
        finishLogin(res);
      } else if (res.status === 'email_setup_required') {
        setSetupToken(res.setupToken);
        setAuthStage('setup');
      } else if (res.status === 'email_code_required') {
        setChallengeToken(res.challengeToken);
        setDevEmailCode(res.devCode ?? '');
        setAuthStage('code');
      }
    } catch (err) {
      setAuthError(errorOf(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSetupEmail = async (email: string) => {
    setAuthError('');
    setAuthNotice('');
    setAuthLoading(true);
    try {
      const res = await authApi.setupStaffEmail(setupToken, email);
      if (!res.challengeToken) throw new ApiError(400, 'invalid_challenge');
      setChallengeToken(res.challengeToken);
      setDevEmailCode(res.devCode ?? '');
      setAuthStage('code');
    } catch (err) {
      setAuthError(errorOf(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyCode = async (code: string) => {
    setAuthError('');
    setAuthNotice('');
    setAuthLoading(true);
    try {
      const res = await authApi.verifyEmailCode(challengeToken, code);
      finishLogin(res);
    } catch (err) {
      setAuthError(errorOf(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    setAuthError('');
    try {
      const res = await authApi.resendEmailCode(challengeToken);
      setDevEmailCode(res.devCode ?? '');
      setAuthNotice(lang === 'ar' ? 'تم إعادة إرسال الرمز.' : 'A new code has been sent.');
    } catch (err) {
      setAuthError(errorOf(err));
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    await authApi.logout().catch(() => undefined);
    setUser(null);
    setOrders([]);
    setAuthStage('credentials');
  };

  const changeStatus = async (orderId: string, status: OrderStatus) => {
    const previous = orders;
    setOrders((current) => current.map((o) => (o.id === orderId ? { ...o, status } : o)));
    try {
      await adminApi.updateStatus(orderId, status);
    } catch {
      setOrders(previous);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <RefreshCw size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  if (!user) {
    if (authStage === 'setup') {
      return (
        <EmailSetupScreen
          onSubmit={(email) => handleSetupEmail(email)}
          lang={lang}
          error={authError}
          isLoading={authLoading}
        />
      );
    }
    if (authStage === 'code') {
      return (
        <EmailCodeScreen
          onSubmit={(code) => handleVerifyCode(code)}
          onResend={() => handleResendCode()}
          lang={lang}
          error={authError}
          notice={authNotice}
          isLoading={authLoading}
          isResending={resending}
          devCode={devEmailCode}
        />
      );
    }
    return (
      <LoginScreen
        onLogin={(email, password) => handleLogin(email, password)}
        lang={lang}
        error={authError}
        isLoading={authLoading}
      />
    );
  }

  const role: AdminRole = user.role;
  const userName = user.fullName;


  const statusOptions: OrderStatus[] = ['new', 'confirmed', 'preparing', 'shipped', 'in_transit', 'delivered', 'cancelled', 'returned'];

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = orders.length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
  const newOrders = orders.filter(o => o.status === 'new').length;
  const pendingOrders = orders.filter(o => ['confirmed', 'preparing', 'shipped', 'in_transit'].includes(o.status)).length;
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  // Filtered orders
  const filteredOrders = orders.filter(o => {
    if (orderFilter !== 'all' && o.status !== orderFilter) return false;
    if (orderSearch) {
      const q = orderSearch.toLowerCase();
      return o.invoiceNumber.toLowerCase().includes(q) || o.customer.fullName.toLowerCase().includes(q) || o.customer.phone.includes(q);
    }
    return true;
  });

  // Filtered products
  const filteredProducts = products.filter(p => {
    if (!productSearch) return true;
    const q = productSearch.toLowerCase();
    return p.name.ar.includes(q) || p.name.fr.toLowerCase().includes(q) || p.name.en.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
  });

  // Filtered wilayas
  const filteredWilayas = wilayas.filter(w => {
    if (!deliverySearch) return true;
    const q = deliverySearch.toLowerCase();
    return w.name.ar.includes(q) || w.name.fr.toLowerCase().includes(q) || w.code.includes(q);
  });

  // Chart data (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return orders.filter(o => {
      const od = new Date(o.createdAt);
      return od.toDateString() === d.toDateString();
    }).length;
  });

  const revenueByDay = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return orders.filter(o => {
      const od = new Date(o.createdAt);
      return od.toDateString() === d.toDateString();
    }).reduce((s, o) => s + o.total, 0);
  });

  // Role-based tabs
  const allTabs: { id: Tab; icon: LucideIcon; roles: AdminRole[] }[] = [
    { id: 'overview', icon: BarChart3, roles: ['admin', 'manager', 'delivery'] },
    { id: 'products', icon: Package, roles: ['admin', 'manager'] },
    { id: 'orders', icon: ShoppingCart, roles: ['admin', 'manager', 'delivery'] },
    { id: 'delivery', icon: Truck, roles: ['admin', 'manager', 'delivery'] },
    { id: 'customers', icon: Users, roles: ['admin', 'manager'] },
    { id: 'reports', icon: PieChart, roles: ['admin'] },
    { id: 'settings', icon: Settings, roles: ['admin'] },
  ];
  const tabs = allTabs.filter(tab => tab.roles.includes(role));

  const tabLabels: Record<Tab, Record<'ar' | 'fr' | 'en', string>> = {
    overview: { ar: 'نظرة عامة', fr: 'Aperçu', en: 'Overview' },
    products: { ar: 'المنتجات', fr: 'Produits', en: 'Products' },
    orders: { ar: 'الطلبات', fr: 'Commandes', en: 'Orders' },
    delivery: { ar: 'التوصيل', fr: 'Livraison', en: 'Delivery' },
    customers: { ar: 'العملاء', fr: 'Clients', en: 'Customers' },
    reports: { ar: 'التقارير', fr: 'Rapports', en: 'Reports' },
    settings: { ar: 'الإعدادات', fr: 'Paramètres', en: 'Settings' },
  };

  const statusColors: Record<OrderStatus, string> = {
    new: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-indigo-100 text-indigo-700',
    preparing: 'bg-amber-100 text-amber-700',
    shipped: 'bg-purple-100 text-purple-700',
    in_transit: 'bg-orange-100 text-orange-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
    returned: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="min-h-screen bg-surface" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Bar */}
      <div className="bg-primary text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden lg:block p-2 hover:bg-white/10 rounded-xl transition-colors">
              {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-primary font-bold text-sm">خ</div>
              <div>
                <h1 className="font-heading text-sm font-bold text-accent">KHOTWA</h1>
                <p className="text-[9px] text-white/50">{lang === 'ar' ? 'لوحة الإدارة' : 'Admin Panel'}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell count={newOrders} lang={lang} />

            <div className="flex items-center gap-3 bg-white/10 rounded-xl px-3 py-1.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                role === 'admin' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                role === 'manager' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                'bg-gradient-to-br from-emerald-500 to-emerald-600'
              }`}>
                {userName.charAt(0)}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold">{userName}</p>
                <p className="text-[10px] text-white/60">
                  {role === 'admin' ? (lang === 'ar' ? 'مسؤول' : 'Admin') :
                   role === 'manager' ? (lang === 'ar' ? 'مدير' : 'Manager') :
                   (lang === 'ar' ? 'مشرف توصيل' : 'Delivery')}
                </p>
              </div>
            </div>

            <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/70 hover:text-white" title={lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto flex">
        {/* Sidebar */}
        <aside className={`hidden lg:block shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-60'}`}>
          <nav className="sticky top-[60px] p-3 h-[calc(100vh-60px)] overflow-y-auto">
            <div className="space-y-1">
              {tabs.map(tab => (
                <motion.button
                  key={tab.id}
                  whileHover={{ x: isRtl ? -4 : 4 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 w-full rounded-xl text-sm transition-all ${
                    sidebarCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3'
                  } ${
                    activeTab === tab.id
                      ? 'bg-accent/10 text-accent font-semibold shadow-sm border border-accent/20'
                      : 'text-text-light hover:bg-card hover:shadow-sm'
                  }`}
                  title={sidebarCollapsed ? tabLabels[tab.id][lang] : undefined}
                >
                  <tab.icon size={18} />
                  {!sidebarCollapsed && <span>{tabLabels[tab.id][lang]}</span>}
                  {!sidebarCollapsed && tab.id === 'orders' && newOrders > 0 && (
                    <span className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full mr-auto">{newOrders}</span>
                  )}
                </motion.button>
              ))}
            </div>
          </nav>
        </aside>

        {/* Mobile tabs */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 px-2 py-2">
          <div className="flex justify-around">
            {tabs.slice(0, 5).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] transition-colors ${
                  activeTab === tab.id ? 'text-accent' : 'text-text-muted'
                }`}>
                <tab.icon size={18} />
                <span>{tabLabels[tab.id][lang]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* ═══════════ OVERVIEW ═══════════ */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold">{lang === 'ar' ? `مرحباً، ${userName}` : `Welcome, ${userName}`}</h2>
                      <p className="text-sm text-text-muted">{lang === 'ar' ? 'إليك ملخص أداء متجرك اليوم' : "Here's your store performance summary"}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-xs text-text-muted bg-card px-3 py-2 rounded-xl border border-border/50">
                      <Calendar size={14} />
                      {new Date().toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-DZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={Wallet} label={lang === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'} value={formatPrice(totalRevenue, lang)} trend="up" trendValue="+12.5%" color="text-accent" bg="bg-card border border-border/50" delay={0} />
                    <StatCard icon={ShoppingCart} label={lang === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'} value={String(totalOrders)} trend="up" trendValue="+8" color="text-blue-600" bg="bg-card border border-border/50" delay={0.05} />
                    <StatCard icon={Clock} label={lang === 'ar' ? 'طلبات جديدة' : 'New Orders'} value={String(newOrders)} color="text-warning" bg="bg-card border border-border/50" delay={0.1} />
                    <StatCard icon={CheckCircle2} label={lang === 'ar' ? 'تم التسليم' : 'Delivered'} value={String(deliveredOrders)} trend="up" trendValue="85%" color="text-success" bg="bg-card border border-border/50" delay={0.15} />
                  </div>

                  {/* Charts Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl border border-border/50 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-sm">{lang === 'ar' ? 'الطلبات - آخر 7 أيام' : 'Orders - Last 7 Days'}</h3>
                        <Activity size={16} className="text-accent" />
                      </div>
                      <MiniBarChart data={last7Days} color="bg-accent" />
                      <div className="flex justify-between mt-2 text-[10px] text-text-muted">
                        {Array.from({ length: 7 }, (_, i) => {
                          const d = new Date(); d.setDate(d.getDate() - (6 - i));
                          return <span key={i}>{d.toLocaleDateString(lang === 'ar' ? 'ar' : 'fr', { weekday: 'short' })}</span>;
                        })}
                      </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-card rounded-2xl border border-border/50 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-sm">{lang === 'ar' ? 'الإيرادات - آخر 7 أيام' : 'Revenue - Last 7 Days'}</h3>
                        <TrendingUp size={16} className="text-success" />
                      </div>
                      <MiniBarChart data={revenueByDay} color="bg-success" />
                      <div className="flex justify-between mt-2 text-[10px] text-text-muted">
                        {Array.from({ length: 7 }, (_, i) => {
                          const d = new Date(); d.setDate(d.getDate() - (6 - i));
                          return <span key={i}>{d.toLocaleDateString(lang === 'ar' ? 'ar' : 'fr', { weekday: 'short' })}</span>;
                        })}
                      </div>
                    </motion.div>
                  </div>

                  {/* Quick Stats Row */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-card rounded-2xl border border-border/50 p-4 text-center">
                      <p className="text-2xl font-bold text-accent">{formatPrice(avgOrderValue, lang)}</p>
                      <p className="text-xs text-text-muted mt-1">{lang === 'ar' ? 'متوسط قيمة الطلب' : 'Avg. Order Value'}</p>
                    </div>
                    <div className="bg-card rounded-2xl border border-border/50 p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">{pendingOrders}</p>
                      <p className="text-xs text-text-muted mt-1">{lang === 'ar' ? 'قيد المعالجة' : 'Processing'}</p>
                    </div>
                    <div className="bg-card rounded-2xl border border-border/50 p-4 text-center">
                      <p className="text-2xl font-bold text-success">{totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0}%</p>
                      <p className="text-xs text-text-muted mt-1">{lang === 'ar' ? 'نسبة التسليم' : 'Delivery Rate'}</p>
                    </div>
                    <div className="bg-card rounded-2xl border border-border/50 p-4 text-center">
                      <p className="text-2xl font-bold text-danger">{cancelledOrders}</p>
                      <p className="text-xs text-text-muted mt-1">{lang === 'ar' ? 'ملغية' : 'Cancelled'}</p>
                    </div>
                  </div>

                  {/* Recent Orders */}
                  <div className="bg-card rounded-2xl border border-border/50 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">{lang === 'ar' ? 'آخر الطلبات' : 'Recent Orders'}</h3>
                      <button onClick={() => setActiveTab('orders')} className="text-xs text-accent hover:underline">
                        {lang === 'ar' ? 'عرض الكل' : 'View All'}
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-start py-2 px-3 text-text-muted font-medium text-xs">#</th>
                            <th className="text-start py-2 px-3 text-text-muted font-medium text-xs">{lang === 'ar' ? 'العميل' : 'Client'}</th>
                            <th className="text-start py-2 px-3 text-text-muted font-medium text-xs hidden md:table-cell">{lang === 'ar' ? 'المنتج' : 'Product'}</th>
                            <th className="text-start py-2 px-3 text-text-muted font-medium text-xs">{lang === 'ar' ? 'المبلغ' : 'Amount'}</th>
                            <th className="text-start py-2 px-3 text-text-muted font-medium text-xs">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.slice(0, 5).map((order, i) => (
                            <motion.tr key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                              className="border-b border-border/30 hover:bg-surface/50 cursor-pointer" onClick={() => { setActiveTab('orders'); setSelectedOrderId(order.id); }}>
                              <td className="py-3 px-3 text-accent font-mono text-xs">{order.invoiceNumber}</td>
                              <td className="py-3 px-3">
                                <p className="font-medium text-xs">{order.customer.fullName}</p>
                                <p className="text-[10px] text-text-muted">{order.wilaya}</p>
                              </td>
                              <td className="py-3 px-3 hidden md:table-cell text-xs text-text-light truncate max-w-[150px]">{order.product.name[lang]}</td>
                              <td className="py-3 px-3 font-semibold text-xs">{formatPrice(order.total, lang)}</td>
                              <td className="py-3 px-3">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${statusColors[order.status]}`}>
                                  {t(`status.${order.status}`, lang)}
                                </span>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Top Products */}
                  <div className="bg-card rounded-2xl border border-border/50 p-5">
                    <h3 className="font-semibold mb-4">{lang === 'ar' ? 'أكثر المنتجات مبيعاً' : 'Top Products'}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {products.slice(0, 4).map((p, i) => {
                        const orderCount = orders.filter(o => o.product.id === p.id).length;
                        return (
                          <motion.div key={p.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                            className="flex items-center gap-3 bg-surface rounded-xl p-3 hover:shadow-md transition-shadow">
                            <img src={p.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{p.name[lang]}</p>
                              <p className="text-accent text-xs font-bold">{formatPrice(p.price, lang)}</p>
                              <p className="text-[10px] text-text-muted">{orderCount} {lang === 'ar' ? 'طلب' : 'orders'}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════ PRODUCTS ═══════════ */}
              {activeTab === 'products' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <h2 className="text-xl font-bold">{lang === 'ar' ? 'إدارة المنتجات' : 'Product Management'}</h2>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:flex-initial">
                        <Search size={16} className={`absolute top-1/2 -translate-y-1/2 text-text-muted ${isRtl ? 'right-3' : 'left-3'}`} />
                        <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                          placeholder={lang === 'ar' ? 'بحث...' : 'Search...'}
                          className={`bg-card border border-border rounded-xl py-2 text-sm w-full sm:w-48 focus:outline-none focus:border-accent ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'}`} />
                      </div>
                      {role === 'admin' && (
                        <button onClick={() => setShowAddProduct(true)} className="bg-accent hover:bg-accent-light text-primary px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors shrink-0">
                          <Plus size={16} /> {lang === 'ar' ? 'إضافة' : 'Add'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-surface/50 border-b border-border">
                            <th className="text-start py-3 px-4 text-text-muted font-medium text-xs">{lang === 'ar' ? 'المنتج' : 'Product'}</th>
                            <th className="text-start py-3 px-4 text-text-muted font-medium text-xs hidden md:table-cell">{lang === 'ar' ? 'الفئة' : 'Category'}</th>
                            <th className="text-start py-3 px-4 text-text-muted font-medium text-xs">{lang === 'ar' ? 'السعر' : 'Price'}</th>
                            <th className="text-start py-3 px-4 text-text-muted font-medium text-xs hidden sm:table-cell">{lang === 'ar' ? 'المخزون' : 'Stock'}</th>
                            <th className="text-start py-3 px-4 text-text-muted font-medium text-xs hidden lg:table-cell">{lang === 'ar' ? 'التقييم' : 'Rating'}</th>
                            <th className="text-start py-3 px-4 text-text-muted font-medium text-xs">{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProducts.map((p, i) => (
                            <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                              className="border-b border-border/30 hover:bg-surface/30">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <img src={p.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                  <div>
                                    <p className="font-medium text-xs">{p.name[lang]}</p>
                                    <p className="text-[10px] text-text-muted">{p.brand}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 hidden md:table-cell text-xs">{t(`nav.${p.category}`, lang)}</td>
                              <td className="py-3 px-4">
                                <span className="text-accent font-bold text-xs">{formatPrice(p.price, lang)}</span>
                                {p.originalPrice && <span className="text-[10px] text-text-muted line-through block">{formatPrice(p.originalPrice, lang)}</span>}
                              </td>
                              <td className="py-3 px-4 hidden sm:table-cell">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${p.stockQuantity > 20 ? 'bg-success' : p.stockQuantity > 5 ? 'bg-warning' : 'bg-danger'}`} />
                                  <span className="text-xs">{p.stockQuantity}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 hidden lg:table-cell">
                                <div className="flex items-center gap-1">
                                  <Star size={12} className="text-amber-400 fill-amber-400" />
                                  <span className="text-xs">{p.rating}</span>
                                  <span className="text-[10px] text-text-muted">({p.reviewCount})</span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1">
                                  <button className="p-1.5 hover:bg-accent/10 rounded-lg text-accent transition-colors"><Edit3 size={14} /></button>
                                  <button className="p-1.5 hover:bg-danger/10 rounded-lg text-danger transition-colors"><Trash2 size={14} /></button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════ ORDERS ═══════════ */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <h2 className="text-xl font-bold">{lang === 'ar' ? 'إدارة الطلبات' : 'Order Management'}</h2>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:flex-initial">
                        <Search size={16} className={`absolute top-1/2 -translate-y-1/2 text-text-muted ${isRtl ? 'right-3' : 'left-3'}`} />
                        <input type="text" value={orderSearch} onChange={e => setOrderSearch(e.target.value)}
                          placeholder={lang === 'ar' ? 'بحث بالرقم أو الاسم...' : 'Search by # or name...'}
                          className={`bg-card border border-border rounded-xl py-2 text-sm w-full sm:w-56 focus:outline-none focus:border-accent ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'}`} />
                      </div>
                    </div>
                  </div>

                  {/* Status filters */}
                  <div className="flex overflow-x-auto gap-2 pb-2">
                    <button onClick={() => setOrderFilter('all')}
                      className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${orderFilter === 'all' ? 'bg-primary text-white shadow-md' : 'bg-card text-text-light border border-border hover:border-accent/50'}`}>
                      {lang === 'ar' ? 'الكل' : 'All'} ({orders.length})
                    </button>
                    {statusOptions.map(s => {
                      const count = orders.filter(o => o.status === s).length;
                      if (count === 0) return null;
                      return (
                        <button key={s} onClick={() => setOrderFilter(s)}
                          className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${orderFilter === s ? 'bg-primary text-white shadow-md' : 'bg-card text-text-light border border-border hover:border-accent/50'}`}>
                          {t(`status.${s}`, lang)} ({count})
                        </button>
                      );
                    })}
                  </div>

                  {ordersError && (
                    <div className="flex items-center gap-2 bg-danger/5 border border-danger/20 text-danger rounded-xl p-3 text-sm">
                      <AlertTriangle size={16} />
                      {lang === 'ar' ? 'تعذّر تحميل الطلبات.' : 'Could not load orders.'}
                    </div>
                  )}

                  {/* Orders list */}
                  <div className="space-y-3">
                    {filteredOrders.length === 0 ? (
                      <div className="bg-card rounded-2xl border border-border/50 p-12 text-center">
                        <ShoppingCart size={48} className="mx-auto text-text-muted mb-3" />
                        <p className="text-text-muted">{lang === 'ar' ? 'لا توجد طلبات' : 'No orders found'}</p>
                      </div>
                    ) : (
                      filteredOrders.map((order, i) => (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className={`bg-card rounded-2xl border transition-all overflow-hidden ${selectedOrderId === order.id ? 'border-accent shadow-lg' : 'border-border/50 hover:border-accent/30'}`}
                        >
                          <div className="p-4 cursor-pointer" onClick={() => setSelectedOrderId(selectedOrderId === order.id ? null : order.id)}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-accent font-bold text-sm">{order.invoiceNumber}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[order.status]}`}>
                                  {t(`status.${order.status}`, lang)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">{formatPrice(order.total, lang)}</span>
                                <ChevronRight size={16} className={`text-text-muted transition-transform ${selectedOrderId === order.id ? 'rotate-90' : ''}`} />
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                              <span className="flex items-center gap-1"><User size={12} /> {order.customer.fullName}</span>
                              <span className="flex items-center gap-1"><MapPin size={12} /> {order.wilaya}</span>
                              <span className="flex items-center gap-1"><Truck size={12} /> {order.deliveryCompany.name}</span>
                              <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(order.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-DZ')}</span>
                            </div>
                          </div>

                          {/* Expanded details */}
                          <AnimatePresence>
                            {selectedOrderId === order.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-border/50 p-4 bg-surface/30 space-y-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {/* Product */}
                                    <div className="flex items-center gap-3 bg-card rounded-xl p-3">
                                      <img src={order.product.images[0]} alt="" className="w-14 h-14 rounded-lg object-cover" />
                                      <div>
                                        <p className="text-xs font-semibold">{order.product.name[lang]}</p>
                                        <p className="text-[10px] text-text-muted">{lang === 'ar' ? 'مقاس' : 'Size'}: {order.selectedSize} • {order.selectedColor.name[lang]}</p>
                                        <p className="text-[10px] text-text-muted">{lang === 'ar' ? 'كمية' : 'Qty'}: {order.quantity} × {formatPrice(order.product.price, lang)}</p>
                                      </div>
                                    </div>

                                    {/* Customer */}
                                    <div className="bg-card rounded-xl p-3 space-y-1">
                                      <p className="text-[10px] text-text-muted font-semibold uppercase">{lang === 'ar' ? 'العميل' : 'Customer'}</p>
                                      <p className="text-xs font-semibold">{order.customer.fullName}</p>
                                      <p className="text-[10px] text-text-muted flex items-center gap-1"><Phone size={10} /> <span dir="ltr">{order.customer.phone}</span></p>
                                      <p className="text-[10px] text-text-muted flex items-center gap-1"><MapPin size={10} /> {order.customer.address}</p>
                                    </div>

                                    {/* Payment & Delivery */}
                                    <div className="bg-card rounded-xl p-3 space-y-1">
                                      <p className="text-[10px] text-text-muted font-semibold uppercase">{lang === 'ar' ? 'الدفع والتوصيل' : 'Payment & Delivery'}</p>
                                      <p className="text-xs">{t(`order.${order.paymentMethod}`, lang)}</p>
                                      <p className="text-xs">{order.deliveryCompany.name} ({order.deliveryCompany.estimatedDays} {lang === 'ar' ? 'أيام' : 'days'})</p>
                                      <p className="text-xs text-text-muted">{lang === 'ar' ? 'توصيل' : 'Delivery'}: {formatPrice(order.deliveryPrice, lang)}</p>
                                    </div>
                                  </div>

                                  {/* Actions */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <select value={order.status} onChange={e => changeStatus(order.id, e.target.value as OrderStatus)}
                                      className="bg-card border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent">
                                      {statusOptions.map(s => <option key={s} value={s}>{t(`status.${s}`, lang)}</option>)}
                                    </select>
                                    <button onClick={() => navigate(`/invoice/${order.id}`)} className="bg-accent/10 hover:bg-accent/20 text-accent px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors">
                                      <Eye size={14} /> {lang === 'ar' ? 'الفاتورة' : 'Invoice'}
                                    </button>
                                    <button className="bg-surface hover:bg-surface-dark text-text-light px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors">
                                      <Download size={14} /> PDF
                                    </button>
                                    {(role === 'admin' || role === 'manager') && (
                                      <>
                                        <a
                                          href={`https://wa.me/${storeSettings.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`✅ تأكيد الطلب ${order.invoiceNumber}\n👤 ${order.customer.fullName}\n📱 ${order.customer.phone}\n📍 ${order.wilaya} - ${order.commune}\n👟 ${order.product.name[lang]} (${order.selectedSize})\n💰 ${formatPrice(order.total, lang)}`)}`}
                                          target="_blank" rel="noopener noreferrer"
                                          className="bg-[#25D366] hover:bg-[#1fb855] text-white px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                                        >
                                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                          WhatsApp
                                        </a>
                                        <a
                                          href={`sms:${order.customer.phone}?body=${encodeURIComponent(`مرحباً ${order.customer.fullName}، طلبك رقم ${order.invoiceNumber} بمبلغ ${formatPrice(order.total, lang)} قيد المعالجة. شكراً لثقتك - KHOTWA`)}`}
                                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                                        >
                                          <Phone size={14} /> SMS
                                        </a>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ═══════════ DELIVERY ═══════════ */}
              {activeTab === 'delivery' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold">{lang === 'ar' ? 'إدارة التوصيل' : 'Delivery Management'}</h2>
                      <p className="text-xs text-text-muted mt-0.5">
                        {storeDeliveryCompanies.length} {lang === 'ar' ? 'شركة' : 'companies'} • {storeDeliveryCompanies.filter(c => c.active).length} {lang === 'ar' ? 'نشطة' : 'active'}
                      </p>
                    </div>
                    {(role === 'admin' || role === 'manager') && (
                      <button onClick={() => { setCompanyForm({ name: '', estimatedDays: '', phone: '', trackingUrl: '', contactEmail: '', notes: '' }); setShowAddCompany(true); setEditingCompany(null); }}
                        className="bg-accent hover:bg-accent-light text-primary px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-lg shadow-accent/20">
                        <Plus size={16} /> {lang === 'ar' ? 'إضافة شركة' : 'Add Company'}
                      </button>
                    )}
                  </div>

                  {/* Companies Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {storeDeliveryCompanies.map((dc, i) => {
                      const orderCount = orders.filter(o => o.deliveryCompany.id === dc.id).length;
                      return (
                        <motion.div key={dc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                          className={`bg-card rounded-2xl border-2 p-5 hover:shadow-lg transition-all relative overflow-hidden ${dc.active ? 'border-border/50' : 'border-danger/30 opacity-75'}`}>
                          {/* Active/Inactive ribbon */}
                          {!dc.active && (
                            <div className="absolute top-0 left-0 right-0 bg-danger/10 text-danger text-[10px] font-bold text-center py-1">
                              {lang === 'ar' ? 'غير مفعّلة' : 'Inactive'}
                            </div>
                          )}

                          <div className={`${!dc.active ? 'mt-4' : ''}`}>
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${dc.active ? 'bg-accent/10' : 'bg-gray-100'}`}>
                                  <Truck size={22} className={dc.active ? 'text-accent' : 'text-gray-400'} />
                                </div>
                                <div>
                                  <p className="font-bold text-sm">{dc.name}</p>
                                  <p className="text-xs text-text-muted">{dc.estimatedDays} {lang === 'ar' ? 'أيام' : 'days'}</p>
                                </div>
                              </div>
                              {/* Toggle */}
                              {(role === 'admin' || role === 'manager') && (
                                <button onClick={() => toggleDeliveryCompany(dc.id)} className="shrink-0" title={dc.active ? (lang === 'ar' ? 'تعطيل' : 'Deactivate') : (lang === 'ar' ? 'تفعيل' : 'Activate')}>
                                  {dc.active ? <ToggleRight size={28} className="text-success" /> : <ToggleLeft size={28} className="text-gray-400" />}
                                </button>
                              )}
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-2 mb-4">
                              <div className="bg-surface rounded-lg p-2 text-center">
                                <p className="text-lg font-bold text-accent">{orderCount}</p>
                                <p className="text-[10px] text-text-muted">{lang === 'ar' ? 'طلب' : 'Orders'}</p>
                              </div>
                              <div className="bg-surface rounded-lg p-2 text-center">
                                <p className="text-lg font-bold text-text">{dc.estimatedDays}</p>
                                <p className="text-[10px] text-text-muted">{lang === 'ar' ? 'أيام التوصيل' : 'Days'}</p>
                              </div>
                            </div>

                            {/* Details */}
                            <div className="space-y-1.5 text-xs mb-4">
                              {dc.phone && (
                                <div className="flex items-center gap-2 text-text-muted">
                                  <Phone size={12} className="shrink-0" /> <span dir="ltr">{dc.phone}</span>
                                </div>
                              )}
                              {dc.contactEmail && (
                                <div className="flex items-center gap-2 text-text-muted">
                                  <Mail size={12} className="shrink-0" /> <span>{dc.contactEmail}</span>
                                </div>
                              )}
                              {dc.trackingUrl && (
                                <div className="flex items-center gap-2 text-text-muted">
                                  <Activity size={12} className="shrink-0" />
                                  <a href={dc.trackingUrl} target="_blank" rel="noopener" className="text-accent hover:underline truncate">{lang === 'ar' ? 'رابط التتبع' : 'Tracking URL'}</a>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            {(role === 'admin' || role === 'manager') && (
                              <div className="flex gap-2 pt-3 border-t border-border/50">
                                <button
                                  onClick={() => {
                                    setEditingCompany(dc.id);
                                    setCompanyForm({ name: dc.name, estimatedDays: dc.estimatedDays, phone: dc.phone || '', trackingUrl: dc.trackingUrl || '', contactEmail: dc.contactEmail || '', notes: dc.notes || '' });
                                    setShowAddCompany(true);
                                  }}
                                  className="flex-1 bg-accent/10 hover:bg-accent/20 text-accent py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                                >
                                  <Edit3 size={13} /> {lang === 'ar' ? 'تعديل' : 'Edit'}
                                </button>
                                {role === 'admin' && (
                                  deleteConfirm === dc.id ? (
                                    <div className="flex-1 flex gap-1">
                                      <button onClick={() => { removeDeliveryCompany(dc.id); setDeleteConfirm(null); }}
                                        className="flex-1 bg-danger text-white py-2 rounded-lg text-xs font-bold transition-colors">
                                        {lang === 'ar' ? 'تأكيد' : 'Yes'}
                                      </button>
                                      <button onClick={() => setDeleteConfirm(null)}
                                        className="flex-1 bg-surface-dark text-text py-2 rounded-lg text-xs font-medium transition-colors">
                                        {lang === 'ar' ? 'إلغاء' : 'No'}
                                      </button>
                                    </div>
                                  ) : (
                                    <button onClick={() => setDeleteConfirm(dc.id)}
                                      className="bg-danger/10 hover:bg-danger/20 text-danger p-2 rounded-lg transition-colors" title={lang === 'ar' ? 'حذف' : 'Delete'}>
                                      <Trash2 size={14} />
                                    </button>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}

                    {/* Empty state */}
                    {storeDeliveryCompanies.length === 0 && (
                      <div className="col-span-full bg-card rounded-2xl border border-dashed border-border p-12 text-center">
                        <Truck size={48} className="mx-auto text-text-muted mb-3" />
                        <p className="text-text-muted font-medium">{lang === 'ar' ? 'لا توجد شركات توصيل' : 'No delivery companies'}</p>
                        <p className="text-xs text-text-muted mt-1">{lang === 'ar' ? 'أضف شركة توصيل للبدء' : 'Add a delivery company to get started'}</p>
                      </div>
                    )}
                  </div>

                  {/* Wilaya prices */}
                  <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <h3 className="font-semibold">{lang === 'ar' ? 'أسعار التوصيل حسب الولاية' : 'Delivery Prices by Wilaya'}</h3>
                      <div className="relative">
                        <Search size={14} className={`absolute top-1/2 -translate-y-1/2 text-text-muted ${isRtl ? 'right-3' : 'left-3'}`} />
                        <input type="text" value={deliverySearch} onChange={e => setDeliverySearch(e.target.value)}
                          placeholder={lang === 'ar' ? 'بحث...' : 'Search...'}
                          className={`bg-surface border border-border rounded-lg py-1.5 text-xs w-40 focus:outline-none focus:border-accent ${isRtl ? 'pr-8 pl-3' : 'pl-8 pr-3'}`} />
                      </div>
                    </div>
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-surface/80 backdrop-blur-sm">
                          <tr className="border-b border-border">
                            <th className="text-start py-2 px-4 text-text-muted font-medium text-xs w-16">{lang === 'ar' ? 'الرمز' : 'Code'}</th>
                            <th className="text-start py-2 px-4 text-text-muted font-medium text-xs">{t('order.wilaya', lang)}</th>
                            <th className="text-start py-2 px-4 text-text-muted font-medium text-xs">{t('order.delivery_price', lang)}</th>
                            <th className="text-start py-2 px-4 text-text-muted font-medium text-xs hidden sm:table-cell">{lang === 'ar' ? 'الطلبات' : 'Orders'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredWilayas.map(w => (
                            <tr key={w.code} className="border-b border-border/30 hover:bg-surface/30">
                              <td className="py-2 px-4 font-mono text-xs text-text-muted">{w.code}</td>
                              <td className="py-2 px-4 text-xs">{w.name[lang]}</td>
                              <td className="py-2 px-4 text-accent font-bold text-xs">{formatPrice(w.deliveryPrice, lang)}</td>
                              <td className="py-2 px-4 text-xs text-text-muted hidden sm:table-cell">
                                {orders.filter(o => o.wilaya === w.name.ar || o.wilaya === w.name.fr).length}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════ CUSTOMERS ═══════════ */}
              {activeTab === 'customers' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold">{lang === 'ar' ? 'إدارة العملاء' : 'Customer Management'}</h2>
                  <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                    {orders.length === 0 ? (
                      <div className="p-12 text-center"><Users size={48} className="mx-auto text-text-muted mb-3" /><p className="text-text-muted">{lang === 'ar' ? 'لا توجد بيانات' : 'No data'}</p></div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-surface/50 border-b border-border">
                              <th className="text-start py-3 px-4 text-text-muted font-medium text-xs">{t('order.full_name', lang)}</th>
                              <th className="text-start py-3 px-4 text-text-muted font-medium text-xs">{t('order.phone', lang)}</th>
                              <th className="text-start py-3 px-4 text-text-muted font-medium text-xs hidden sm:table-cell">{t('order.wilaya', lang)}</th>
                              <th className="text-start py-3 px-4 text-text-muted font-medium text-xs">{lang === 'ar' ? 'الطلبات' : 'Orders'}</th>
                              <th className="text-start py-3 px-4 text-text-muted font-medium text-xs hidden md:table-cell">{lang === 'ar' ? 'إجمالي الإنفاق' : 'Total Spent'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from(new Set(orders.map(o => o.customer.phone))).map((phone, i) => {
                              const co = orders.filter(o => o.customer.phone === phone);
                              const c = co[0].customer;
                              const totalSpent = co.reduce((s, o) => s + o.total, 0);
                              return (
                                <motion.tr key={phone} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                  className="border-b border-border/30 hover:bg-surface/30">
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center text-accent text-xs font-bold">{c.fullName.charAt(0)}</div>
                                      <span className="text-xs font-medium">{c.fullName}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-xs font-mono" dir="ltr">{c.phone}</td>
                                  <td className="py-3 px-4 text-xs hidden sm:table-cell">{co[0].wilaya}</td>
                                  <td className="py-3 px-4 text-xs font-semibold">{co.length}</td>
                                  <td className="py-3 px-4 text-xs font-bold text-accent hidden md:table-cell">{formatPrice(totalSpent, lang)}</td>
                                </motion.tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ═══════════ REPORTS ═══════════ */}
              {activeTab === 'reports' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold">{lang === 'ar' ? 'التقارير والإحصائيات' : 'Reports & Analytics'}</h2>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Orders by status */}
                    <div className="bg-card rounded-2xl border border-border/50 p-5">
                      <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Layers size={16} className="text-accent" /> {lang === 'ar' ? 'الطلبات حسب الحالة' : 'Orders by Status'}</h3>
                      <div className="space-y-3">
                        {statusOptions.map(s => {
                          const count = orders.filter(o => o.status === s).length;
                          const pct = totalOrders > 0 ? (count / totalOrders) * 100 : 0;
                          return (
                            <div key={s}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${statusColors[s].split(' ')[0].replace('100', '500')}`} />
                                  {t(`status.${s}`, lang)}
                                </span>
                                <span className="font-semibold">{count} ({pct.toFixed(0)}%)</span>
                              </div>
                              <div className="h-2 bg-surface-dark rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }}
                                  className={`h-full rounded-full ${statusColors[s].split(' ')[0].replace('100', '400')}`} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Top wilayas */}
                    <div className="bg-card rounded-2xl border border-border/50 p-5">
                      <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><MapPin size={16} className="text-accent" /> {lang === 'ar' ? 'أكثر الولايات طلباً' : 'Top Wilayas'}</h3>
                      <div className="space-y-3">
                        {Object.entries(
                          orders.reduce((acc, o) => { acc[o.wilaya] = (acc[o.wilaya] || 0) + 1; return acc; }, {} as Record<string, number>)
                        ).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([wilaya, count], i) => {
                          const pct = (count / totalOrders) * 100;
                          return (
                            <div key={wilaya}>
                              <div className="flex justify-between text-xs mb-1">
                                <span>{wilaya}</span>
                                <span className="font-semibold">{count}</span>
                              </div>
                              <div className="h-2 bg-surface-dark rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, delay: i * 0.05 }}
                                  className="h-full rounded-full bg-accent" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Payment methods */}
                    <div className="bg-card rounded-2xl border border-border/50 p-5">
                      <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Wallet size={16} className="text-accent" /> {lang === 'ar' ? 'طرق الدفع' : 'Payment Methods'}</h3>
                      <div className="space-y-3">
                        {['cod', 'edahabia', 'cib', 'ccp', 'baridimob'].map(pm => {
                          const count = orders.filter(o => o.paymentMethod === pm).length;
                          if (count === 0) return null;
                          const pct = (count / totalOrders) * 100;
                          return (
                            <div key={pm}>
                              <div className="flex justify-between text-xs mb-1">
                                <span>{t(`order.${pm}`, lang)}</span>
                                <span className="font-semibold">{count} ({pct.toFixed(0)}%)</span>
                              </div>
                              <div className="h-2 bg-surface-dark rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }}
                                  className="h-full rounded-full bg-blue-400" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Delivery companies */}
                    <div className="bg-card rounded-2xl border border-border/50 p-5">
                      <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Truck size={16} className="text-accent" /> {lang === 'ar' ? 'شركات التوصيل الأكثر استخداماً' : 'Most Used Delivery Companies'}</h3>
                      <div className="space-y-3">
                        {storeDeliveryCompanies.map(dc => {
                          const count = orders.filter(o => o.deliveryCompany.id === dc.id).length;
                          const pct = totalOrders > 0 ? (count / totalOrders) * 100 : 0;
                          return (
                            <div key={dc.id}>
                              <div className="flex justify-between text-xs mb-1">
                                <span>{dc.name} {!dc.active && <span className="text-danger">⊘</span>}</span>
                                <span className="font-semibold">{count} ({pct.toFixed(0)}%)</span>
                              </div>
                              <div className="h-2 bg-surface-dark rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }}
                                  className="h-full rounded-full bg-emerald-400" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════ SETTINGS ═══════════ */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold">{lang === 'ar' ? 'إعدادات المتجر' : 'Store Settings'}</h2>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
                      <h3 className="font-semibold flex items-center gap-2"><Settings size={18} className="text-accent" /> {lang === 'ar' ? 'معلومات المتجر' : 'Store Info'}</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-text-muted mb-1 block">{lang === 'ar' ? 'اسم المتجر' : 'Store Name'}</label>
                          <input type="text" defaultValue={storeSettings.name[lang]} className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
                        </div>
                        <div>
                          <label className="text-xs text-text-muted mb-1 block">{lang === 'ar' ? 'العنوان' : 'Address'}</label>
                          <input type="text" defaultValue={storeSettings.address} className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-text-muted mb-1 block">{lang === 'ar' ? 'الهاتف' : 'Phone'}</label>
                            <input type="text" defaultValue={storeSettings.phone} dir="ltr" className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
                          </div>
                          <div>
                            <label className="text-xs text-text-muted mb-1 block">{lang === 'ar' ? 'البريد' : 'Email'}</label>
                            <input type="email" defaultValue={storeSettings.email} dir="ltr" className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-text-muted mb-1 block">RC</label>
                            <input type="text" defaultValue={storeSettings.rc} dir="ltr" className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
                          </div>
                          <div>
                            <label className="text-xs text-text-muted mb-1 block">NIF</label>
                            <input type="text" defaultValue={storeSettings.nif} dir="ltr" className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
                          </div>
                        </div>
                        <button className="w-full bg-accent hover:bg-accent-light text-primary py-2.5 rounded-xl font-bold text-sm transition-colors mt-2">
                          {lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-card rounded-2xl border border-border/50 p-6">
                        <h3 className="font-semibold flex items-center gap-2 mb-4"><Shield size={18} className="text-accent" /> {lang === 'ar' ? 'الأمان' : 'Security'}</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between bg-surface rounded-xl p-3">
                            <div>
                              <p className="text-sm font-medium">{lang === 'ar' ? 'تشفير SSL' : 'SSL Encryption'}</p>
                              <p className="text-[10px] text-text-muted">HTTPS</p>
                            </div>
                            <span className="text-success text-xs font-bold bg-success/10 px-2 py-1 rounded-full">{lang === 'ar' ? 'مفعّل' : 'Active'}</span>
                          </div>
                          <div className="flex items-center justify-between bg-surface rounded-xl p-3">
                            <div>
                              <p className="text-sm font-medium">{lang === 'ar' ? 'حماية CSRF' : 'CSRF Protection'}</p>
                              <p className="text-[10px] text-text-muted">{lang === 'ar' ? 'رموز حماية' : 'Token-based'}</p>
                            </div>
                            <span className="text-success text-xs font-bold bg-success/10 px-2 py-1 rounded-full">{lang === 'ar' ? 'مفعّل' : 'Active'}</span>
                          </div>
                          <div className="flex items-center justify-between bg-surface rounded-xl p-3">
                            <div>
                              <p className="text-sm font-medium">{lang === 'ar' ? 'قانون 18-07' : 'Law 18-07'}</p>
                              <p className="text-[10px] text-text-muted">{lang === 'ar' ? 'حماية البيانات الشخصية' : 'Data Protection'}</p>
                            </div>
                            <span className="text-success text-xs font-bold bg-success/10 px-2 py-1 rounded-full">{lang === 'ar' ? 'متوافق' : 'Compliant'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-card rounded-2xl border border-border/50 p-6">
                        <h3 className="font-semibold flex items-center gap-2 mb-4"><Users size={18} className="text-accent" /> {lang === 'ar' ? 'صلاحيات المستخدمين' : 'User Roles'}</h3>
                        <UserRolesCard lang={lang} canEditEmail={role === 'admin'} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setShowAddProduct(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-card rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-semibold text-lg mb-4">{lang === 'ar' ? 'إضافة منتج جديد' : 'Add New Product'}</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">{lang === 'ar' ? 'اسم المنتج' : 'Product Name'}</label>
                  <input type="text" className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">{lang === 'ar' ? 'السعر' : 'Price'}</label>
                    <input type="number" className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">{lang === 'ar' ? 'الفئة' : 'Category'}</label>
                    <select className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent">
                      <option>Classic</option><option>Sport</option><option>Casual</option><option>Boots</option><option>Sandals</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">{lang === 'ar' ? 'الوصف' : 'Description'}</label>
                  <textarea rows={3} className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">{lang === 'ar' ? 'الماركة' : 'Brand'}</label>
                    <input type="text" className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">{lang === 'ar' ? 'المخزون' : 'Stock'}</label>
                    <input type="number" className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowAddProduct(false)} className="flex-1 bg-surface-dark hover:bg-border text-text py-2.5 rounded-xl text-sm font-medium transition-colors">
                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button onClick={() => setShowAddProduct(false)} className="flex-1 bg-accent hover:bg-accent-light text-primary py-2.5 rounded-xl text-sm font-bold transition-colors">
                    {lang === 'ar' ? 'إضافة المنتج' : 'Add Product'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Delivery Company Modal */}
      <AnimatePresence>
        {showAddCompany && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => { setShowAddCompany(false); setEditingCompany(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-card rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6"
              onClick={e => e.stopPropagation()}
              dir={isRtl ? 'rtl' : 'ltr'}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                  <Truck size={20} className="text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {editingCompany
                      ? (lang === 'ar' ? 'تعديل شركة التوصيل' : 'Edit Delivery Company')
                      : (lang === 'ar' ? 'إضافة شركة توصيل جديدة' : 'Add New Delivery Company')}
                  </h3>
                  <p className="text-xs text-text-muted">
                    {lang === 'ar' ? 'أدخل بيانات شركة التوصيل' : 'Enter delivery company details'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text mb-1.5 block">
                      {lang === 'ar' ? 'اسم الشركة' : 'Company Name'} <span className="text-danger">*</span>
                    </label>
                    <input type="text" value={companyForm.name} onChange={e => setCompanyForm({...companyForm, name: e.target.value})}
                      placeholder={lang === 'ar' ? 'مثال: Yalidine' : 'e.g. Yalidine'}
                      className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text mb-1.5 block">
                      {lang === 'ar' ? 'مدة التوصيل' : 'Delivery Time'} <span className="text-danger">*</span>
                    </label>
                    <input type="text" value={companyForm.estimatedDays} onChange={e => setCompanyForm({...companyForm, estimatedDays: e.target.value})}
                      placeholder={lang === 'ar' ? 'مثال: 2-4' : 'e.g. 2-4'}
                      className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text mb-1.5 block">{lang === 'ar' ? 'رقم الهاتف' : 'Phone'}</label>
                    <input type="tel" dir="ltr" value={companyForm.phone} onChange={e => setCompanyForm({...companyForm, phone: e.target.value})}
                      placeholder="023 XX XX XX"
                      className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text mb-1.5 block">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
                    <input type="email" dir="ltr" value={companyForm.contactEmail} onChange={e => setCompanyForm({...companyForm, contactEmail: e.target.value})}
                      placeholder="contact@company.dz"
                      className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text mb-1.5 block">{lang === 'ar' ? 'رابط تتبع الشحنات' : 'Tracking URL'}</label>
                  <input type="url" dir="ltr" value={companyForm.trackingUrl} onChange={e => setCompanyForm({...companyForm, trackingUrl: e.target.value})}
                    placeholder="https://company.dz/tracking"
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text mb-1.5 block">{lang === 'ar' ? 'ملاحظات' : 'Notes'}</label>
                  <textarea value={companyForm.notes} onChange={e => setCompanyForm({...companyForm, notes: e.target.value})} rows={2}
                    placeholder={lang === 'ar' ? 'ملاحظات داخلية حول هذه الشركة...' : 'Internal notes about this company...'}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 resize-none" />
                </div>

                <div className="flex gap-3 pt-3 border-t border-border/50">
                  <button onClick={() => { setShowAddCompany(false); setEditingCompany(null); }}
                    className="flex-1 bg-surface-dark hover:bg-border text-text py-3 rounded-xl text-sm font-medium transition-colors">
                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={() => {
                      if (!companyForm.name.trim() || !companyForm.estimatedDays.trim()) return;
                      if (editingCompany) {
                        updateDeliveryCompany(editingCompany, {
                          name: companyForm.name,
                          estimatedDays: companyForm.estimatedDays,
                          phone: companyForm.phone || undefined,
                          trackingUrl: companyForm.trackingUrl || undefined,
                          contactEmail: companyForm.contactEmail || undefined,
                          notes: companyForm.notes || undefined,
                        });
                      } else {
                        addDeliveryCompany({
                          id: `dc-${Date.now()}`,
                          name: companyForm.name,
                          estimatedDays: companyForm.estimatedDays,
                          active: true,
                          phone: companyForm.phone || undefined,
                          trackingUrl: companyForm.trackingUrl || undefined,
                          contactEmail: companyForm.contactEmail || undefined,
                          notes: companyForm.notes || undefined,
                          createdAt: new Date().toISOString(),
                        });
                      }
                      setShowAddCompany(false);
                      setEditingCompany(null);
                    }}
                    disabled={!companyForm.name.trim() || !companyForm.estimatedDays.trim()}
                    className="flex-1 bg-accent hover:bg-accent-light text-primary py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
                  >
                    {editingCompany ? (
                      <><Edit3 size={16} /> {lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</>
                    ) : (
                      <><Plus size={16} /> {lang === 'ar' ? 'إضافة الشركة' : 'Add Company'}</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
