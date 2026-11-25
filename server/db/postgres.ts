import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import type {
  AuditEntry, AuditRow, CreateOrderInput, EmailChallengeRow, OrderRow, OrderStatus, PaymentInput,
  RateLimitResult, Repo, SafeUser, SessionWithUser, UserRole, UserRow,
} from './types';
import { currentDbContext, type DbContext } from './context';

const ORDER_COLUMNS = `
  o.id, o.invoice_number, o.product_id, o.product_name, o.product_price, o.quantity,
  o.selected_size, o.selected_color_hex, o.selected_color_name_ar, o.selected_color_name_fr,
  o.selected_color_name_en, o.delivery_company_id, o.delivery_company_name, o.delivery_price,
  o.subtotal, o.total, o.status, o.payment_method, o.payment_status, o.created_at, o.updated_at,
  o.wilaya_code, o.wilaya_name,
  c.id AS customer_id, c.full_name AS customer_full_name, c.phone AS customer_phone,
  c.email AS customer_email, c.wilaya_code AS customer_wilaya_code, c.commune AS customer_commune,
  c.address AS customer_address
`;

const ORDER_FROM = `
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
`;

interface OrderJoinRow extends QueryResultRow {
  id: string;
  invoice_number: string;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  selected_size: string;
  selected_color_hex: string;
  selected_color_name_ar: string;
  selected_color_name_fr: string;
  selected_color_name_en: string;
  delivery_company_id: string | null;
  delivery_company_name: string | null;
  delivery_price: number;
  subtotal: number;
  total: number;
  status: OrderStatus;
  payment_method: CreateOrderInput['paymentMethod'];
  payment_status: OrderRow['paymentStatus'];
  created_at: Date;
  updated_at: Date;
  wilaya_code: string;
  wilaya_name: string;
  customer_id: string;
  customer_full_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_wilaya_code: string | null;
  customer_commune: string | null;
  customer_address: string | null;
}

function mapOrder(r: OrderJoinRow): OrderRow {
  return {
    id: r.id,
    invoiceNumber: r.invoice_number,
    productId: r.product_id,
    productName: r.product_name,
    productPrice: Number(r.product_price),
    quantity: r.quantity,
    selectedSize: r.selected_size,
    colorHex: r.selected_color_hex,
    colorNameAr: r.selected_color_name_ar,
    colorNameFr: r.selected_color_name_fr,
    colorNameEn: r.selected_color_name_en,
    customer: {
      id: r.customer_id,
      fullName: r.customer_full_name,
      phone: r.customer_phone,
      email: r.customer_email,
      wilayaCode: r.customer_wilaya_code ?? r.wilaya_code,
      wilayaName: r.wilaya_name,
      commune: r.customer_commune ?? '',
      address: r.customer_address ?? '',
    },
    deliveryCompanyId: r.delivery_company_id,
    deliveryCompanyName: r.delivery_company_name ?? '',
    deliveryPrice: Number(r.delivery_price),
    subtotal: Number(r.subtotal),
    total: Number(r.total),
    status: r.status,
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export class PostgresRepo implements Repo {
  readonly kind = 'postgres' as const;
  private pool: Pool;

  constructor(opts: { connectionString: string; ssl: boolean; max: number }) {
    this.pool = new Pool({
      connectionString: opts.connectionString,
      ssl: opts.ssl ? { rejectUnauthorized: true } : false,
      max: opts.max,
      statement_timeout: 15_000,
      idle_in_transaction_session_timeout: 15_000,
    });
  }

  async init(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Every statement runs inside a transaction with RLS context variables set.
   * All values are bound parameters — never string interpolation.
   */
  private async tx<T>(fn: (c: PoolClient) => Promise<T>, override?: DbContext): Promise<T> {
    const client = await this.pool.connect();
    const ctx = override ?? currentDbContext();
    try {
      await client.query('BEGIN');
      await client.query(
        `SELECT set_config('app.system', $1, true),
                set_config('app.user_id', $2, true),
                set_config('app.user_role', $3, true),
                set_config('app.phone', $4, true),
                set_config('app.invoice', $5, true)`,
        [
          ctx.mode === 'system' ? 'on' : 'off',
          ctx.mode === 'user' ? ctx.userId : '',
          ctx.mode === 'user' ? ctx.role : ctx.mode === 'guest' ? 'guest' : 'system',
          ctx.mode === 'guest' ? ctx.phone : '',
          ctx.mode === 'guest' ? ctx.invoice ?? '' : '',
        ],
      );
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  // ── users ──────────────────────────────────────────────
  async getUserByEmail(email: string): Promise<UserRow | null> {
    return this.tx(async (c) => {
      const { rows } = await c.query<UserRow>(
        `SELECT id, email, password_hash AS "passwordHash", full_name AS "fullName", phone, role,
                email_verified AS "emailVerified", is_active AS "isActive",
                last_login_at AS "lastLoginAt", created_at AS "createdAt"
           FROM users WHERE email = $1 LIMIT 1`,
        [email.toLowerCase()],
      );
      return rows[0] ?? null;
    });
  }

  async getUserById(id: string): Promise<UserRow | null> {
    return this.tx(async (c) => {
      const { rows } = await c.query<UserRow>(
        `SELECT id, email, password_hash AS "passwordHash", full_name AS "fullName", phone, role,
                email_verified AS "emailVerified", is_active AS "isActive",
                last_login_at AS "lastLoginAt", created_at AS "createdAt"
           FROM users WHERE id = $1 LIMIT 1`,
        [id],
      );
      return rows[0] ?? null;
    });
  }

  async setUserPassword(userId: string, passwordHash: string): Promise<void> {
    await this.tx((c) => c.query(
      `UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`,
      [userId, passwordHash],
    ));
  }

  async markLogin(userId: string): Promise<void> {
    await this.tx((c) => c.query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [userId]));
  }

  async listUsers(): Promise<SafeUser[]> {
    return this.tx(async (c) => {
      const { rows } = await c.query<SafeUser>(
        `SELECT id, email, full_name AS "fullName", phone, role,
                email_verified AS "emailVerified", is_active AS "isActive",
                last_login_at AS "lastLoginAt", created_at AS "createdAt"
           FROM users ORDER BY created_at ASC`,
      );
      return rows;
    });
  }

  async createUser(input: {
    email: string; passwordHash: string; fullName: string; phone?: string | null;
    role: UserRole; emailVerified?: boolean;
  }): Promise<SafeUser> {
    return this.tx(async (c) => {
      const { rows } = await c.query<SafeUser>(
        `INSERT INTO users (email, password_hash, full_name, phone, role, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, full_name AS "fullName", phone, role,
                   email_verified AS "emailVerified", is_active AS "isActive",
                   last_login_at AS "lastLoginAt", created_at AS "createdAt"`,
        [input.email.toLowerCase(), input.passwordHash, input.fullName, input.phone ?? null,
         input.role, input.emailVerified ?? false],
      );
      return rows[0];
    });
  }

  async setUserEmail(userId: string, email: string): Promise<void> {
    await this.tx((c) => c.query(
      `UPDATE users SET email = $2, email_verified = FALSE, updated_at = now() WHERE id = $1`,
      [userId, email.toLowerCase()],
    ));
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.tx((c) => c.query(
      `UPDATE users SET email_verified = TRUE, updated_at = now() WHERE id = $1`,
      [userId],
    ));
  }

  // ── sessions ───────────────────────────────────────────
  async createSession(input: {
    userId: string; tokenHash: string; ip: string; userAgent: string; expiresAt: Date; absoluteExpiresAt: Date;
  }): Promise<void> {
    await this.tx((c) => c.query(
      `INSERT INTO sessions (user_id, token_hash, ip_address, user_agent, expires_at, absolute_expires_at)
       VALUES ($1, $2, NULLIF($3, '')::inet, $4, $5, $6)`,
      [input.userId, input.tokenHash, input.ip, input.userAgent.slice(0, 400), input.expiresAt, input.absoluteExpiresAt],
    ));
  }

  async getSession(tokenHash: string): Promise<SessionWithUser | null> {
    return this.tx(async (c) => {
      const { rows } = await c.query<SessionWithUser & { isActive: boolean }>(
        `SELECT s.id AS "sessionId", u.id AS "userId", u.email, u.role, u.full_name AS "fullName",
                s.expires_at AS "expiresAt", s.absolute_expires_at AS "absoluteExpiresAt",
                u.is_active AS "isActive"
           FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = $1 AND s.expires_at > now() AND s.absolute_expires_at > now()
          LIMIT 1`,
        [tokenHash],
      );
      const row = rows[0];
      if (!row || !row.isActive) return null;
      return row;
    });
  }

  async touchSession(sessionId: string, expiresAt: Date): Promise<void> {
    await this.tx((c) => c.query(`UPDATE sessions SET expires_at = $2 WHERE id = $1`, [sessionId, expiresAt]));
  }

  async deleteSession(tokenHash: string): Promise<void> {
    await this.tx((c) => c.query(`DELETE FROM sessions WHERE token_hash = $1`, [tokenHash]));
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await this.tx((c) => c.query(`DELETE FROM sessions WHERE user_id = $1`, [userId]));
  }

  async purgeExpiredSessions(): Promise<void> {
    await this.tx((c) => c.query(
      `DELETE FROM sessions WHERE expires_at <= now() OR absolute_expires_at <= now()`,
    ));
  }

  // ── password reset ─────────────────────────────────────
  async createPasswordReset(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    await this.tx((c) => c.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [input.userId, input.tokenHash, input.expiresAt],
    ));
  }

  async consumePasswordReset(tokenHash: string): Promise<{ userId: string } | null> {
    return this.tx(async (c) => {
      const { rows } = await c.query<{ userId: string }>(
        `DELETE FROM password_reset_tokens
          WHERE token_hash = $1 AND expires_at > now()
          RETURNING user_id AS "userId"`,
        [tokenHash],
      );
      return rows[0] ?? null;
    });
  }

  async deletePasswordResets(userId: string): Promise<void> {
    await this.tx((c) => c.query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [userId]));
  }

  // ── rate limiting ──────────────────────────────────────
  async hitRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    return this.tx(async (c) => {
      const resetAt = new Date(Date.now() + windowMs);
      const { rows } = await c.query<{ count: string; reset_at: Date }>(
        `INSERT INTO rate_limits (key, count, reset_at)
         VALUES ($1, 1, $2)
         ON CONFLICT (key) DO UPDATE SET
           count = CASE WHEN rate_limits.reset_at <= now() THEN 1 ELSE rate_limits.count + 1 END,
           reset_at = CASE WHEN rate_limits.reset_at <= now() THEN EXCLUDED.reset_at ELSE rate_limits.reset_at END
         RETURNING count, reset_at`,
        [key, resetAt],
      );
      const count = Number(rows[0].count);
      const allowed = count <= limit;
      return {
        allowed,
        count,
        remaining: Math.max(0, limit - count),
        retryAfterMs: allowed ? 0 : Math.max(0, rows[0].reset_at.getTime() - Date.now()),
      };
    });
  }

  // ── staff email login challenges ────────────────────────
  async createEmailChallenge(input: {
    userId: string; email: string; codeHash: string; challengeHash: string;
    purpose: 'login' | 'setup'; expiresAt: Date;
  }): Promise<void> {
    await this.tx(async (c) => {
      await c.query(`DELETE FROM email_login_challenges WHERE user_id = $1`, [input.userId]);
      await c.query(
        `INSERT INTO email_login_challenges
           (user_id, email, code_hash, challenge_hash, purpose, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [input.userId, input.email.toLowerCase(), input.codeHash, input.challengeHash,
         input.purpose, input.expiresAt],
      );
    });
  }

  async getEmailChallenge(challengeHash: string): Promise<EmailChallengeRow | null> {
    return this.tx(async (c) => {
      const { rows } = await c.query<EmailChallengeRow>(
        `SELECT id, user_id AS "userId", email, code_hash AS "codeHash",
                challenge_hash AS "challengeHash", purpose, attempts,
                expires_at AS "expiresAt"
           FROM email_login_challenges WHERE challenge_hash = $1 LIMIT 1`,
        [challengeHash],
      );
      return rows[0] ?? null;
    });
  }

  async refreshEmailChallenge(id: string, codeHash: string, expiresAt: Date): Promise<void> {
    await this.tx((c) => c.query(
      `UPDATE email_login_challenges
          SET code_hash = $2, attempts = 0, expires_at = $3
        WHERE id = $1`,
      [id, codeHash, expiresAt],
    ));
  }

  async bumpEmailChallengeAttempts(id: string): Promise<number> {
    return this.tx(async (c) => {
      const { rows } = await c.query<{ attempts: number }>(
        `UPDATE email_login_challenges SET attempts = attempts + 1
          WHERE id = $1 RETURNING attempts`,
        [id],
      );
      return rows[0]?.attempts ?? 0;
    });
  }

  async deleteEmailChallenge(id: string): Promise<void> {
    await this.tx((c) => c.query(`DELETE FROM email_login_challenges WHERE id = $1`, [id]));
  }

  async deleteUserEmailChallenges(userId: string): Promise<void> {
    await this.tx((c) => c.query(`DELETE FROM email_login_challenges WHERE user_id = $1`, [userId]));
  }

  // ── orders ─────────────────────────────────────────────
  async createOrder(input: CreateOrderInput): Promise<OrderRow> {
    return this.tx(async (c) => {
      const year = new Date().getFullYear();
      const seq = await c.query<{ n: string }>(`SELECT nextval('invoice_seq') AS n`);
      const invoice = `INV-${year}-${String(Number(seq.rows[0].n)).padStart(4, '0')}`;
      // Guest RLS context: this order's invoice + its phone.
      await c.query(`SELECT set_config('app.invoice', $1, true), set_config('app.phone', $2, true)`, [
        invoice,
        input.customer.phone,
      ]);

      const customer = await c.query<{ id: string }>(
        `INSERT INTO customers (full_name, phone, email, wilaya_code, commune, address, consent_data, consent_date)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, now())
         ON CONFLICT (phone) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           email = COALESCE(EXCLUDED.email, customers.email),
           wilaya_code = EXCLUDED.wilaya_code,
           commune = EXCLUDED.commune,
           address = EXCLUDED.address,
           updated_at = now()
         RETURNING id`,
        [
          input.customer.fullName, input.customer.phone, input.customer.email,
          input.customer.wilayaCode, input.customer.commune, input.customer.address,
        ],
      );

      const inserted = await c.query<{ id: string }>(
        `INSERT INTO orders (
           invoice_number, customer_id, product_id, product_name, product_price, selected_size,
           selected_color_hex, selected_color_name_ar, selected_color_name_fr, selected_color_name_en,
           delivery_company_id, delivery_company_name, wilaya_code, wilaya_name, commune,
           delivery_address, delivery_price, subtotal, total, status, payment_method, payment_status
         ) VALUES (
           $1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10,
           $11, $12, $13, $14, $15,
           $16, $17, $18, $19, 'new', $20, 'pending'
         ) RETURNING id`,
        [
          invoice, customer.rows[0].id, input.productId, input.productName, input.productPrice, input.selectedSize,
          input.colorHex, input.colorNameAr, input.colorNameFr, input.colorNameEn,
          input.deliveryCompanyId, input.deliveryCompanyName, input.customer.wilayaCode,
          input.customer.wilayaName, input.customer.commune,
          input.customer.address, input.deliveryPrice, input.subtotal, input.total, input.paymentMethod,
        ],
      );

      const { rows } = await c.query<OrderJoinRow>(
        `SELECT ${ORDER_COLUMNS} ${ORDER_FROM} WHERE o.id = $1`,
        [inserted.rows[0].id],
      );
      return mapOrder(rows[0]);
    });
  }

  async getOrderById(id: string): Promise<OrderRow | null> {
    return this.tx(async (c) => {
      const { rows } = await c.query<OrderJoinRow>(
        `SELECT ${ORDER_COLUMNS} ${ORDER_FROM} WHERE o.id = $1`,
        [id],
      );
      return rows[0] ? mapOrder(rows[0]) : null;
    });
  }

  async getOrderByInvoice(invoice: string): Promise<OrderRow | null> {
    return this.tx(async (c) => {
      const { rows } = await c.query<OrderJoinRow>(
        `SELECT ${ORDER_COLUMNS} ${ORDER_FROM} WHERE o.invoice_number = $1`,
        [invoice],
      );
      return rows[0] ? mapOrder(rows[0]) : null;
    });
  }

  async trackOrder(invoice: string, phone: string): Promise<OrderRow | null> {
    return this.tx(async (c) => {
      await c.query(`SELECT set_config('app.invoice', $1, true), set_config('app.phone', $2, true)`, [
        invoice,
        phone,
      ]);
      const { rows } = await c.query<OrderJoinRow>(
        `SELECT ${ORDER_COLUMNS} ${ORDER_FROM}
          WHERE o.invoice_number = $1
            AND regexp_replace(c.phone, '\\D', '', 'g') = regexp_replace($2, '\\D', '', 'g')
          LIMIT 1`,
        [invoice, phone],
      );
      return rows[0] ? mapOrder(rows[0]) : null;
    });
  }

  async listOrders(limit: number): Promise<OrderRow[]> {
    return this.tx(async (c) => {
      const { rows } = await c.query<OrderJoinRow>(
        `SELECT ${ORDER_COLUMNS} ${ORDER_FROM} ORDER BY o.created_at DESC LIMIT $1`,
        [Math.min(Math.max(limit, 1), 500)],
      );
      return rows.map(mapOrder);
    });
  }

  async updateOrderStatus(id: string, status: OrderStatus, _userId: string): Promise<OrderRow | null> {
    return this.tx(async (c) => {
      const { rows } = await c.query<{ id: string }>(
        `UPDATE orders SET status = $2, updated_at = now() WHERE id = $1 RETURNING id`,
        [id, status],
      );
      if (!rows[0]) return null;
      // order_status_history is written by trg_orders_status_change; writing it
      // here as well would create duplicate history rows.
      const full = await c.query<OrderJoinRow>(
        `SELECT ${ORDER_COLUMNS} ${ORDER_FROM} WHERE o.id = $1`,
        [id],
      );
      return full.rows[0] ? mapOrder(full.rows[0]) : null;
    });
  }

  async decrementStock(productId: string, quantity: number): Promise<boolean> {
    return this.tx(async (c) => {
      const { rowCount } = await c.query(
        `UPDATE products SET stock_quantity = stock_quantity - $2
          WHERE sku = $1 AND stock_quantity >= $2`,
        [productId, quantity],
      );
      if ((rowCount ?? 0) > 0) return true;
      // No product row for this SKU: catalog-only product, stock tracked in app.
      const exists = await c.query(`SELECT 1 FROM products WHERE sku = $1 LIMIT 1`, [productId]);
      return exists.rowCount === 0;
    });
  }

  // ── payments ───────────────────────────────────────────
  async recordPayment(input: PaymentInput): Promise<'created' | 'duplicate'> {
    return this.tx(async (c) => {
      const { rowCount } = await c.query(
        `INSERT INTO payments (order_id, amount, payment_method, status, transaction_id, gateway_response, paid_at)
         VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $4 = 'paid' THEN now() ELSE NULL END)
         ON CONFLICT (transaction_id) DO NOTHING`,
        [input.orderId, input.amount, input.method, input.status, input.transactionId, JSON.stringify(input.gatewayResponse)],
      );
      return (rowCount ?? 0) > 0 ? 'created' : 'duplicate';
    });
  }

  async markOrderPaid(orderId: string): Promise<void> {
    await this.tx((c) => c.query(
      `UPDATE orders SET payment_status = 'paid', updated_at = now() WHERE id = $1`,
      [orderId],
    ));
  }

  // ── audit ──────────────────────────────────────────────
  async audit(entry: AuditEntry): Promise<void> {
    try {
      await this.tx((c) => c.query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, ip_address, user_agent, new_values)
         VALUES ($1, $2, $3, $4, CASE WHEN $5 = '' THEN NULL ELSE $5::inet END, $6, $7)`,
        [
          entry.userId ?? null, entry.action, entry.entityType, entry.entityId ?? null,
          entry.ip ?? '', entry.userAgent?.slice(0, 400) ?? null,
          entry.details ? JSON.stringify(entry.details) : null,
        ],
      ));
    } catch {
      // Audit must never break a user request.
    }
  }

  async listAudit(limit: number): Promise<AuditRow[]> {
    return this.tx(async (c) => {
      const { rows } = await c.query<AuditRow>(
        `SELECT id, user_id AS "userId", action, entity_type AS "entityType", entity_id AS "entityId",
                host(ip_address) AS ip, user_agent AS "userAgent", new_values AS details,
                created_at AS "createdAt"
           FROM audit_log ORDER BY created_at DESC LIMIT $1`,
        [Math.min(Math.max(limit, 1), 500)],
      );
      return rows;
    });
  }
}
