export type UserRole = 'admin' | 'manager' | 'delivery';
export type OrderStatus =
  | 'new' | 'confirmed' | 'preparing' | 'shipped'
  | 'in_transit' | 'delivered' | 'cancelled' | 'returned';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'cod' | 'cib' | 'edahabia' | 'ccp' | 'baridimob';

export interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  /** Staff must control this mailbox before the account can be used normally. */
  emailVerified: boolean;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export type SafeUser = Omit<UserRow, 'passwordHash'>;

export interface SessionWithUser {
  sessionId: string;
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
  expiresAt: Date;
  absoluteExpiresAt: Date;
}

/** Short-lived, hashed challenge for a staff email login code. */
export interface EmailChallengeRow {
  id: string;
  userId: string;
  email: string;
  codeHash: string;
  challengeHash: string;
  purpose: 'login' | 'setup';
  attempts: number;
  expiresAt: Date;
}

export interface CreateOrderInput {
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  selectedSize: string;
  colorHex: string;
  colorNameAr: string;
  colorNameFr: string;
  colorNameEn: string;
  customer: {
    fullName: string;
    phone: string;
    email: string | null;
    wilayaCode: string;
    wilayaName: string;
    commune: string;
    address: string;
  };
  deliveryCompanyId: string | null;
  deliveryCompanyName: string;
  deliveryPrice: number;
  subtotal: number;
  total: number;
  paymentMethod: PaymentMethod;
  ip: string;
}

export interface OrderRow {
  id: string;
  invoiceNumber: string;
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  selectedSize: string;
  colorHex: string;
  colorNameAr: string;
  colorNameFr: string;
  colorNameEn: string;
  customer: {
    id: string;
    fullName: string;
    phone: string;
    email: string | null;
    wilayaCode: string;
    wilayaName: string;
    commune: string;
    address: string;
  };
  deliveryCompanyId: string | null;
  deliveryCompanyName: string;
  deliveryPrice: number;
  subtotal: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentInput {
  orderId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId: string;
  gatewayResponse: unknown;
}

export interface AuditEntry {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown> | null;
}

export interface AuditRow extends AuditEntry {
  id: string;
  createdAt: Date;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
  count: number;
}

export interface CatalogProduct {
  id: string;
  name: Record<'ar' | 'fr' | 'en', string>;
  price: number;
  stockQuantity: number;
  sizes: string[];
  colors: Array<{ hex: string; name: Record<'ar' | 'fr' | 'en', string> }>;
  images: string[];
  brand: string;
  material: Record<'ar' | 'fr' | 'en', string>;
}

export interface CatalogWilaya {
  code: string;
  name: Record<'ar' | 'fr' | 'en', string>;
  deliveryPrice: number;
}

export interface Repo {
  readonly kind: 'postgres' | 'memory';
  init(): Promise<void>;
  close(): Promise<void>;

  // ── users ──────────────────────────────────────────────
  getUserByEmail(email: string): Promise<UserRow | null>;
  getUserById(id: string): Promise<UserRow | null>;
  setUserPassword(userId: string, passwordHash: string): Promise<void>;
  setUserEmail(userId: string, email: string): Promise<void>;
  markEmailVerified(userId: string): Promise<void>;
  markLogin(userId: string): Promise<void>;
  listUsers(): Promise<SafeUser[]>;
  createUser(input: {
    email: string;
    passwordHash: string;
    fullName: string;
    phone?: string | null;
    role: UserRole;
    emailVerified?: boolean;
  }): Promise<SafeUser>;

  // ── sessions ───────────────────────────────────────────
  createSession(input: {
    userId: string;
    tokenHash: string;
    ip: string;
    userAgent: string;
    expiresAt: Date;
    absoluteExpiresAt: Date;
  }): Promise<void>;
  getSession(tokenHash: string): Promise<SessionWithUser | null>;
  touchSession(sessionId: string, expiresAt: Date): Promise<void>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteUserSessions(userId: string): Promise<void>;
  purgeExpiredSessions(): Promise<void>;

  // ── password reset ─────────────────────────────────────
  createPasswordReset(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  consumePasswordReset(tokenHash: string): Promise<{ userId: string } | null>;
  deletePasswordResets(userId: string): Promise<void>;

  // ── rate limiting / brute force ────────────────────────
  hitRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;

  // ── staff email login codes ───────────────────────────
  createEmailChallenge(input: {
    userId: string;
    email: string;
    codeHash: string;
    challengeHash: string;
    purpose: 'login' | 'setup';
    expiresAt: Date;
  }): Promise<void>;
  getEmailChallenge(challengeHash: string): Promise<EmailChallengeRow | null>;
  refreshEmailChallenge(id: string, codeHash: string, expiresAt: Date): Promise<void>;
  bumpEmailChallengeAttempts(id: string): Promise<number>;
  deleteEmailChallenge(id: string): Promise<void>;
  deleteUserEmailChallenges(userId: string): Promise<void>;

  // ── orders ─────────────────────────────────────────────
  createOrder(input: CreateOrderInput): Promise<OrderRow>;
  getOrderById(id: string): Promise<OrderRow | null>;
  getOrderByInvoice(invoice: string): Promise<OrderRow | null>;
  trackOrder(invoice: string, phone: string): Promise<OrderRow | null>;
  listOrders(limit: number): Promise<OrderRow[]>;
  updateOrderStatus(id: string, status: OrderStatus, userId: string): Promise<OrderRow | null>;
  decrementStock(productId: string, quantity: number): Promise<boolean>;

  // ── payments ───────────────────────────────────────────
  recordPayment(input: PaymentInput): Promise<'created' | 'duplicate'>;
  markOrderPaid(orderId: string): Promise<void>;

  // ── audit ──────────────────────────────────────────────
  audit(entry: AuditEntry): Promise<void>;
  listAudit(limit: number): Promise<AuditRow[]>;
}
