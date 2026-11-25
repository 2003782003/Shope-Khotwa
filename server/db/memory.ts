import { randomUUID } from 'node:crypto';
import type {
  AuditEntry, AuditRow, CreateOrderInput, EmailChallengeRow, OrderRow, OrderStatus, PaymentInput,
  RateLimitResult, Repo, SafeUser, SessionWithUser, UserRole, UserRow,
} from './types';
import { catalogProducts } from '../catalog';

/**
 * In-memory repository. Used for automated security tests and local preview
 * only. It refuses to run in production.
 */
export class MemoryRepo implements Repo {
  readonly kind = 'memory' as const;

  private users = new Map<string, UserRow>();
  private sessions = new Map<string, {
    id: string; userId: string; tokenHash: string; ip: string; userAgent: string;
    expiresAt: Date; absoluteExpiresAt: Date;
  }>();
  private resets = new Map<string, { id: string; userId: string; tokenHash: string; expiresAt: Date }>();
  private rate = new Map<string, { count: number; resetAt: number }>();
  private emailChallenges: EmailChallengeRow[] = [];
  private orders = new Map<string, OrderRow>();
  private payments = new Map<string, PaymentInput>();
  private auditRows: AuditRow[] = [];
  private stock = new Map<string, number>();
  private invoiceSeq = 1000;

  constructor(opts: { isProd: boolean }) {
    if (opts.isProd) {
      throw new Error('MemoryRepo must never be used in production');
    }
    for (const p of catalogProducts) this.stock.set(p.id, p.stockQuantity);
  }

  async init(): Promise<void> {}
  async close(): Promise<void> {}

  // ── users ──────────────────────────────────────────────
  async getUserByEmail(email: string): Promise<UserRow | null> {
    const found = [...this.users.values()].find((u) => u.email === email.toLowerCase());
    return found ? { ...found } : null;
  }
  async getUserById(id: string): Promise<UserRow | null> {
    const u = this.users.get(id);
    return u ? { ...u } : null;
  }
  async setUserPassword(userId: string, passwordHash: string): Promise<void> {
    const u = this.users.get(userId);
    if (u) u.passwordHash = passwordHash;
  }
  async setUserEmail(userId: string, email: string): Promise<void> {
    const u = this.users.get(userId);
    if (u) {
      u.email = email.toLowerCase();
      u.emailVerified = false;
    }
  }
  async markEmailVerified(userId: string): Promise<void> {
    const u = this.users.get(userId);
    if (u) u.emailVerified = true;
  }
  async markLogin(userId: string): Promise<void> {
    const u = this.users.get(userId);
    if (u) u.lastLoginAt = new Date();
  }
  async listUsers(): Promise<SafeUser[]> {
    return [...this.users.values()].map(({ passwordHash: _p, ...safe }) => ({ ...safe }));
  }
  async createUser(input: {
    email: string; passwordHash: string; fullName: string; phone?: string | null;
    role: UserRole; emailVerified?: boolean;
  }): Promise<SafeUser> {
    const id = randomUUID();
    const user: UserRow = {
      id,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      fullName: input.fullName,
      phone: input.phone ?? null,
      role: input.role,
      emailVerified: input.emailVerified ?? false,
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    const { passwordHash: _p, ...safe } = user;
    return safe;
  }

  // ── sessions ───────────────────────────────────────────
  async createSession(input: {
    userId: string; tokenHash: string; ip: string; userAgent: string; expiresAt: Date; absoluteExpiresAt: Date;
  }): Promise<void> {
    this.sessions.set(input.tokenHash, { id: randomUUID(), ...input });
  }
  async getSession(tokenHash: string): Promise<SessionWithUser | null> {
    const s = this.sessions.get(tokenHash);
    if (!s) return null;
    if (s.expiresAt.getTime() <= Date.now() || s.absoluteExpiresAt.getTime() <= Date.now()) {
      this.sessions.delete(tokenHash);
      return null;
    }
    const u = this.users.get(s.userId);
    if (!u || !u.isActive) return null;
    return {
      sessionId: s.id,
      userId: u.id,
      email: u.email,
      role: u.role,
      fullName: u.fullName,
      expiresAt: s.expiresAt,
      absoluteExpiresAt: s.absoluteExpiresAt,
    };
  }
  async touchSession(sessionId: string, expiresAt: Date): Promise<void> {
    for (const s of this.sessions.values()) {
      if (s.id === sessionId) s.expiresAt = expiresAt;
    }
  }
  async deleteSession(tokenHash: string): Promise<void> {
    this.sessions.delete(tokenHash);
  }
  async deleteUserSessions(userId: string): Promise<void> {
    for (const [k, s] of this.sessions) if (s.userId === userId) this.sessions.delete(k);
  }
  async purgeExpiredSessions(): Promise<void> {
    const now = Date.now();
    for (const [k, s] of this.sessions) {
      if (s.expiresAt.getTime() <= now || s.absoluteExpiresAt.getTime() <= now) this.sessions.delete(k);
    }
  }

  // ── password reset ─────────────────────────────────────
  async createPasswordReset(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    this.resets.set(input.tokenHash, { id: randomUUID(), ...input });
  }
  async consumePasswordReset(tokenHash: string): Promise<{ userId: string } | null> {
    const r = this.resets.get(tokenHash);
    if (!r) return null;
    this.resets.delete(tokenHash);
    if (r.expiresAt.getTime() <= Date.now()) return null;
    return { userId: r.userId };
  }
  async deletePasswordResets(userId: string): Promise<void> {
    for (const [k, r] of this.resets) if (r.userId === userId) this.resets.delete(k);
  }

  // ── rate limiting ──────────────────────────────────────
  async hitRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    let entry = this.rate.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      this.rate.set(key, entry);
    }
    entry.count += 1;
    const allowed = entry.count <= limit;
    return {
      allowed,
      count: entry.count,
      remaining: Math.max(0, limit - entry.count),
      retryAfterMs: allowed ? 0 : entry.resetAt - now,
    };
  }

  // ── staff email login codes ─────────────────────────────
  async createEmailChallenge(input: {
    userId: string; email: string; codeHash: string; challengeHash: string;
    purpose: 'login' | 'setup'; expiresAt: Date;
  }): Promise<void> {
    this.emailChallenges = this.emailChallenges.filter((c) => c.userId !== input.userId);
    this.emailChallenges.push({
      id: randomUUID(),
      userId: input.userId,
      email: input.email.toLowerCase(),
      codeHash: input.codeHash,
      challengeHash: input.challengeHash,
      purpose: input.purpose,
      attempts: 0,
      expiresAt: input.expiresAt,
    });
  }
  async getEmailChallenge(challengeHash: string): Promise<EmailChallengeRow | null> {
    const found = this.emailChallenges.find((c) => c.challengeHash === challengeHash);
    return found ? { ...found } : null;
  }
  async refreshEmailChallenge(id: string, codeHash: string, expiresAt: Date): Promise<void> {
    const c = this.emailChallenges.find((x) => x.id === id);
    if (!c) return;
    c.codeHash = codeHash;
    c.attempts = 0;
    c.expiresAt = expiresAt;
  }
  async bumpEmailChallengeAttempts(id: string): Promise<number> {
    const c = this.emailChallenges.find((x) => x.id === id);
    if (!c) return 0;
    c.attempts += 1;
    return c.attempts;
  }
  async deleteEmailChallenge(id: string): Promise<void> {
    this.emailChallenges = this.emailChallenges.filter((c) => c.id !== id);
  }
  async deleteUserEmailChallenges(userId: string): Promise<void> {
    this.emailChallenges = this.emailChallenges.filter((c) => c.userId !== userId);
  }

  // ── orders ─────────────────────────────────────────────
  async createOrder(input: CreateOrderInput): Promise<OrderRow> {
    const id = randomUUID();
    const now = new Date();
    const year = now.getFullYear();
    this.invoiceSeq += 1;
    const order: OrderRow = {
      id,
      invoiceNumber: `INV-${year}-${String(this.invoiceSeq).padStart(4, '0')}`,
      productId: input.productId,
      productName: input.productName,
      productPrice: input.productPrice,
      quantity: input.quantity,
      selectedSize: input.selectedSize,
      colorHex: input.colorHex,
      colorNameAr: input.colorNameAr,
      colorNameFr: input.colorNameFr,
      colorNameEn: input.colorNameEn,
      customer: {
        id: randomUUID(),
        fullName: input.customer.fullName,
        phone: input.customer.phone,
        email: input.customer.email,
        wilayaCode: input.customer.wilayaCode,
        wilayaName: input.customer.wilayaName,
        commune: input.customer.commune,
        address: input.customer.address,
      },
      deliveryCompanyId: input.deliveryCompanyId,
      deliveryCompanyName: input.deliveryCompanyName,
      deliveryPrice: input.deliveryPrice,
      subtotal: input.subtotal,
      total: input.total,
      status: 'new',
      paymentMethod: input.paymentMethod,
      paymentStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    this.orders.set(id, order);
    return { ...order };
  }

  async getOrderById(id: string): Promise<OrderRow | null> {
    const o = this.orders.get(id);
    return o ? { ...o } : null;
  }
  async getOrderByInvoice(invoice: string): Promise<OrderRow | null> {
    const o = [...this.orders.values()].find((x) => x.invoiceNumber === invoice);
    return o ? { ...o } : null;
  }
  async trackOrder(invoice: string, phone: string): Promise<OrderRow | null> {
    const digits = (s: string) => s.replace(/\D/g, '');
    const o = [...this.orders.values()].find(
      (x) => x.invoiceNumber === invoice && digits(x.customer.phone) === digits(phone),
    );
    return o ? { ...o } : null;
  }
  async listOrders(limit: number): Promise<OrderRow[]> {
    return [...this.orders.values()]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((o) => ({ ...o }));
  }
  async updateOrderStatus(id: string, status: OrderStatus, _userId: string): Promise<OrderRow | null> {
    const o = this.orders.get(id);
    if (!o) return null;
    o.status = status;
    o.updatedAt = new Date();
    return { ...o };
  }
  async decrementStock(productId: string, quantity: number): Promise<boolean> {
    const current = this.stock.get(productId) ?? 0;
    if (current < quantity) return false;
    this.stock.set(productId, current - quantity);
    return true;
  }

  // ── payments ───────────────────────────────────────────
  async recordPayment(input: PaymentInput): Promise<'created' | 'duplicate'> {
    if (this.payments.has(input.transactionId)) return 'duplicate';
    this.payments.set(input.transactionId, input);
    return 'created';
  }
  async markOrderPaid(orderId: string): Promise<void> {
    const o = this.orders.get(orderId);
    if (o) {
      o.paymentStatus = 'paid';
      o.updatedAt = new Date();
    }
  }

  // ── audit ──────────────────────────────────────────────
  async audit(entry: AuditEntry): Promise<void> {
    this.auditRows.push({ ...entry, id: randomUUID(), createdAt: new Date() });
    if (this.auditRows.length > 5000) this.auditRows.shift();
  }
  async listAudit(limit: number): Promise<AuditRow[]> {
    return [...this.auditRows].reverse().slice(0, limit);
  }
}
