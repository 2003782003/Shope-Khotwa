import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { buildConfig, type AppConfig } from '../config';
import { createApp } from '../app';
import { MemoryRepo } from '../db/memory';
import { hashPassword } from '../lib/passwords';

/**
 * End-to-end security tests.
 *
 * These run against the real Express app with the in-memory repository, so
 * middleware order (headers, CORS, CSRF, auth), validation, staff email login,
 * pricing, webhook signatures and upload sniffing are all exercised over HTTP.
 *
 * Start with: npm run test:security
 */

const ORIGIN = 'http://localhost:5173';

class Client {
  private readonly cookies = new Map<string, string>();
  private csrf = '';

  constructor(private readonly base: string) {}

  private cookieHeader(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  async request(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      origin?: string | null;
      includeCsrf?: boolean;
      form?: FormData;
    } = {},
  ): Promise<Response> {
    const headers = new Headers();
    const method = options.method ?? 'GET';
    let body: string | FormData | undefined;

    if (options.form) {
      body = options.form;
    } else if (options.body !== undefined) {
      headers.set('content-type', 'application/json');
      body = JSON.stringify(options.body);
    }

    if (options.includeCsrf !== false && this.csrf && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      headers.set('x-csrf-token', this.csrf);
    }
    if (this.cookies.size > 0) headers.set('cookie', this.cookieHeader());
    const origin = options.origin === undefined ? ORIGIN : options.origin;
    if (origin !== null) headers.set('origin', origin);

    const res = await fetch(`${this.base}${path}`, { method, headers, body, redirect: 'manual' });
    for (const raw of res.headers.getSetCookie()) {
      const pair = raw.split(';')[0] ?? '';
      const eq = pair.indexOf('=');
      if (eq > 0) {
        const name = pair.slice(0, eq);
        const value = pair.slice(eq + 1);
        this.cookies.set(name, value);
        if (name === 'khotwa_csrf') this.csrf = value;
      }
    }
    return res;
  }
}

let server: Server;
let base: string;
let config: AppConfig;
let repo: MemoryRepo;
let admin: Client;
let manager: Client;
let adminId: string;
let managerId: string;

const ADMIN_PASSWORD = 'Correct-Horse-Battery-Staple-9';
const MANAGER_PASSWORD = 'Another-Str0ng-Passphrase-7';
const ADMIN_EMAIL = 'admin@example.test';
const MANAGER_EMAIL = 'manager@example.test';
const MANAGER_EMAIL_CORRECTED = 'manager.sales@example.test';

async function json(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

async function requestLogin(
  client: Client,
  email: string,
  password: string,
): Promise<{ res: Response; body: Record<string, unknown> }> {
  const res = await client.request('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  return { res, body: await json(res) };
}

/** Completes the password → emailed code → session flow for an established staff email. */
async function loginWithEmailCode(
  client: Client,
  email: string,
  password: string,
): Promise<Response> {
  const { res: loginRes, body: loginBody } = await requestLogin(client, email, password);
  assert.equal(loginRes.status, 200);
  assert.equal(loginBody.status, 'email_code_required');
  const challengeToken = loginBody.challengeToken as string;
  const devCode = loginBody.devCode as string;
  assert.ok(challengeToken);
  assert.match(devCode, /^\d{6}$/);

  const verify = await client.request('/api/auth/email/code/verify', {
    method: 'POST',
    body: { challengeToken, code: devCode },
  });
  assert.equal(verify.status, 200);
  return verify;
}

/** First-time flow: placeholder mailbox → real mailbox → emailed code → session. */
async function setupAndLoginAdmin(client: Client): Promise<void> {
  const { res: loginRes, body: loginBody } = await requestLogin(
    client,
    'admin@khotwa.internal',
    ADMIN_PASSWORD,
  );
  assert.equal(loginRes.status, 200);
  assert.equal(loginBody.status, 'email_setup_required');
  // Password alone never creates a session.
  assert.equal(
    loginRes.headers.getSetCookie().some((c) => c.startsWith('khotwa_sid=')),
    false,
  );
  const setupToken = loginBody.setupToken as string;
  assert.ok(setupToken);

  const setup = await client.request('/api/auth/email/setup', {
    method: 'POST',
    body: { setupToken, email: ADMIN_EMAIL },
  });
  assert.equal(setup.status, 200);
  const setupBody = await json(setup);
  assert.equal(setupBody.status, 'email_code_required');
  const devCode = setupBody.devCode as string;
  assert.match(devCode, /^\d{6}$/);

  const verify = await client.request('/api/auth/email/code/verify', {
    method: 'POST',
    body: { challengeToken: setupBody.challengeToken as string, code: devCode },
  });
  assert.equal(verify.status, 200);
}

before(async () => {
  config = buildConfig({
    NODE_ENV: 'test',
    APP_ORIGIN: ORIGIN,
    SESSION_SECRET: 'test-session-secret-'.padEnd(48, 'x'),
    EXPOSE_DEV_EMAIL_CODE: 'true',
    PAYMENT_WEBHOOK_SECRET: 'test-payment-webhook-secret-123456',
    ALLOW_MEMORY_DB: 'true',
  } as NodeJS.ProcessEnv);

  repo = new MemoryRepo({ isProd: false });
  // Admin starts on a placeholder mailbox to exercise first-login email setup.
  adminId = (
    await repo.createUser({
      email: 'admin@khotwa.internal',
      passwordHash: await hashPassword(ADMIN_PASSWORD),
      fullName: 'Test Admin',
      role: 'admin',
      emailVerified: false,
    })
  ).id;
  managerId = (
    await repo.createUser({
      email: MANAGER_EMAIL,
      passwordHash: await hashPassword(MANAGER_PASSWORD),
      fullName: 'Test Manager',
      role: 'manager',
      emailVerified: true,
    })
  ).id;

  const app = createApp({ repo, config });
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;

  admin = new Client(base);
  await admin.request('/api/health'); // primes the CSRF cookie
  await setupAndLoginAdmin(admin);

  manager = new Client(base);
  await manager.request('/api/health');
  await loginWithEmailCode(manager, MANAGER_EMAIL, MANAGER_PASSWORD);
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('security headers & error shape', () => {
  test('sets CSP, frame, sniffing and permissions headers', async () => {
    const res = await fetch(`${base}/api/health`);
    assert.equal(res.status, 200);
    const csp = res.headers.get('content-security-policy') ?? '';
    assert.match(csp, /default-src 'self'/);
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.match(res.headers.get('permissions-policy') ?? '', /camera=\(\)/);
    assert.equal(res.headers.get('x-powered-by'), null);
  });

  test('unknown API routes return JSON 404, never HTML', async () => {
    const res = await fetch(`${base}/api/does-not-exist`);
    assert.equal(res.status, 404);
    assert.match(res.headers.get('content-type') ?? '', /application\/json/);
  });

  test('SMS/phone verification routes no longer exist', async () => {
    const client = new Client(base);
    await client.request('/api/health');
    const res = await client.request('/api/otp/request', {
      method: 'POST',
      body: { phone: '0555123456' },
    });
    assert.equal(res.status, 404);
  });
});

describe('CSRF & origin enforcement', () => {
  test('rejects a state-changing request without the CSRF header', async () => {
    const res = await admin.request('/api/auth/login', {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      includeCsrf: false,
    });
    assert.equal(res.status, 403);
    assert.equal((await json(res)).error, 'csrf_failed');
  });

  test('rejects a valid CSRF token from a foreign origin', async () => {
    const res = await admin.request('/api/auth/login', {
      method: 'POST',
      origin: 'https://evil.example',
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    assert.equal(res.status, 403);
    assert.equal((await json(res)).error, 'origin_rejected');
  });
});

describe('staff email authentication', () => {
  test('rejects wrong credentials without issuing a session', async () => {
    const client = new Client(base);
    await client.request('/api/health');
    const res = await client.request('/api/auth/login', {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: 'definitely-wrong-password' },
    });
    assert.equal(res.status, 401);
    const body = await json(res);
    assert.equal(body.error, 'invalid_credentials');
    assert.equal(
      res.headers.getSetCookie().some((c) => c.startsWith('khotwa_sid=')),
      false,
    );
  });

  test('password alone never grants admin access', async () => {
    const client = new Client(base);
    await client.request('/api/health');
    const { res, body } = await requestLogin(client, MANAGER_EMAIL, MANAGER_PASSWORD);
    assert.equal(res.status, 200);
    assert.equal(body.status, 'email_code_required');
    assert.equal(body.user, undefined);
    assert.equal(
      res.headers.getSetCookie().some((c) => c.startsWith('khotwa_sid=')),
      false,
    );
    const denied = await client.request('/api/admin/orders');
    assert.equal(denied.status, 401);
  });

  test('rejects a wrong code, then resends and accepts the fresh code', async () => {
    const client = new Client(base);
    await client.request('/api/health');
    const { body } = await requestLogin(client, MANAGER_EMAIL, MANAGER_PASSWORD);
    const challengeToken = body.challengeToken as string;
    const devCode = body.devCode as string;
    const wrongCode = devCode === '000000' ? '111111' : '000000';

    const bad = await client.request('/api/auth/email/code/verify', {
      method: 'POST',
      body: { challengeToken, code: wrongCode },
    });
    assert.equal(bad.status, 401);
    assert.equal((await json(bad)).error, 'invalid_code');
    const stillDenied = await client.request('/api/admin/orders');
    assert.equal(stillDenied.status, 401);

    const resent = await client.request('/api/auth/email/code/resend', {
      method: 'POST',
      body: { challengeToken },
    });
    assert.equal(resent.status, 200);
    const newCode = (await json(resent)).devCode as string;
    assert.match(newCode, /^\d{6}$/);

    const verified = await client.request('/api/auth/email/code/verify', {
      method: 'POST',
      body: { challengeToken, code: newCode },
    });
    assert.equal(verified.status, 200);
    const session = verified.headers.getSetCookie().find((c) => c.startsWith('khotwa_sid='));
    assert.ok(session, 'session cookie must be set only after code verification');
    assert.match(session, /HttpOnly/i);
    assert.match(session, /SameSite=Lax/i);
    assert.ok(!JSON.stringify(await json(verified)).includes('passwordHash'));
  });

  test('resolves the session server-side', async () => {
    const res = await admin.request('/api/auth/me');
    assert.equal(res.status, 200);
    const user = (await json(res)).user as { email: string; role: string };
    assert.equal(user.email, ADMIN_EMAIL);
    assert.equal(user.role, 'admin');
  });

  test('admin routes reject anonymous callers', async () => {
    const anon = new Client(base);
    await anon.request('/api/health');
    const res = await anon.request('/api/admin/orders');
    assert.equal(res.status, 401);
  });

  test('non-admin staff cannot read the audit log', async () => {
    const forbidden = await manager.request('/api/admin/audit');
    assert.equal(forbidden.status, 403);
    const allowed = await manager.request('/api/admin/orders');
    assert.equal(allowed.status, 200);
  });

  test('rate-limits repeated failed logins for the same account', async () => {
    const client = new Client(base);
    await client.request('/api/health');
    let sawRateLimit = false;
    for (let i = 0; i < 12; i += 1) {
      const res = await client.request('/api/auth/login', {
        method: 'POST',
        body: { email: 'nobody@example.test', password: 'wrong-password' },
      });
      if (res.status === 429) {
        sawRateLimit = true;
        break;
      }
    }
    assert.equal(sawRateLimit, true, 'expected HTTP 429 after repeated failures');
  });
});

describe('staff email correction (admin only)', () => {
  test('admin corrects a staff mailbox and invalidates that staff session', async () => {
    const res = await admin.request(`/api/admin/users/${managerId}/email`, {
      method: 'PATCH',
      body: { email: MANAGER_EMAIL_CORRECTED },
    });
    assert.equal(res.status, 200);
    const user = (await json(res)).user as { email: string; emailVerified: boolean };
    assert.equal(user.email, MANAGER_EMAIL_CORRECTED);
    assert.equal(user.emailVerified, false);

    const stale = await manager.request('/api/auth/me');
    assert.equal((await json(stale)).user, null, 'old manager session must be invalidated');
  });

  test('placeholder mailboxes are rejected', async () => {
    const res = await admin.request(`/api/admin/users/${managerId}/email`, {
      method: 'PATCH',
      body: { email: 'someone@khotwa.internal' },
    });
    assert.equal(res.status, 400);
    assert.equal((await json(res)).error, 'placeholder_email_not_allowed');
  });

  test('manager cannot correct staff emails', async () => {
    await loginWithEmailCode(manager, MANAGER_EMAIL_CORRECTED, MANAGER_PASSWORD);
    const res = await manager.request(`/api/admin/users/${adminId}/email`, {
      method: 'PATCH',
      body: { email: 'attacker@example.test' },
    });
    assert.equal(res.status, 403);
  });

  test('the corrected mailbox receives the next login code', async () => {
    const client = new Client(base);
    await client.request('/api/health');
    const { res, body } = await requestLogin(client, MANAGER_EMAIL_CORRECTED, MANAGER_PASSWORD);
    assert.equal(res.status, 200);
    assert.equal(body.status, 'email_code_required');
    assert.equal(body.setupToken, undefined);
    assert.match(body.devCode as string, /^\d{6}$/);
  });
});

describe('password reset', () => {
  test('does not reveal whether an account exists', async () => {
    const res = await admin.request('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: 'ghost@example.test' },
    });
    assert.equal(res.status, 202);
    assert.equal((await json(res)).status, 'accepted');
  });

  test('rejects an invalid or expired reset token', async () => {
    const res = await admin.request('/api/auth/reset-password', {
      method: 'POST',
      body: { token: 'z'.repeat(43), newPassword: 'A-brand-new-Passphrase-42' },
    });
    assert.equal(res.status, 400);
    assert.equal((await json(res)).error, 'invalid_token');
  });
});

describe('order integrity', () => {
  const phone = '0555123456';
  const invoice: { value: string; orderId: string; total: number } = {
    value: '',
    orderId: '',
    total: 0,
  };

  test('creates a server-priced order with no phone or SMS verification', async () => {
    const guest = new Client(base);
    await guest.request('/api/health');
    const res = await guest.request('/api/orders', {
      method: 'POST',
      body: {
        productId: '1',
        size: '40',
        colorHex: '#8B4513',
        quantity: 1,
        wilayaCode: '16',
        // Attacker-supplied money fields must be ignored by the server.
        total: 1,
        subtotal: 1,
        price: 1,
        customer: {
          fullName: 'Test Buyer',
          phone,
          commune: 'Alger Centre',
          address: '1 Rue de Test',
        },
      },
    });
    assert.equal(res.status, 201);
    const body = await json(res);
    const order = body.order as { id: string; total: number; subtotal: number };
    // Product 1 = 8500 DA, wilaya 16 delivery = 200 DA.
    assert.equal(order.subtotal, 8500);
    assert.equal(order.total, 8700);
    invoice.value = body.invoiceNumber as string;
    invoice.orderId = order.id;
    invoice.total = order.total;
  });

  test('tracks only with both invoice and matching phone', async () => {
    const guest = new Client(base);
    await guest.request('/api/health');
    const ok = await guest.request(
      `/api/orders/track?invoice=${encodeURIComponent(invoice.value)}&phone=${phone}`,
    );
    assert.equal(ok.status, 200);
    const wrong = await guest.request(
      `/api/orders/track?invoice=${encodeURIComponent(invoice.value)}&phone=0666999999`,
    );
    assert.equal(wrong.status, 404);
  });

  test('rejects script markup in customer fields', async () => {
    const guest = new Client(base);
    await guest.request('/api/health');
    const res = await guest.request('/api/orders', {
      method: 'POST',
      body: {
        productId: '1',
        size: '40',
        colorHex: '#8B4513',
        quantity: 1,
        wilayaCode: '16',
        customer: {
          fullName: '<script>alert(1)</script>',
          phone,
          commune: 'Alger',
          address: '1 Rue de Test',
        },
      },
    });
    assert.equal(res.status, 400);
    assert.equal((await json(res)).error, 'invalid_input');
  });
});

describe('payment webhook', () => {
  test('rejects a forged signature', async () => {
    const res = await fetch(`${base}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-khotwa-signature': `t=${Math.floor(Date.now() / 1000)},v1=deadbeef`,
      },
      body: JSON.stringify({
        event: 'payment.succeeded',
        transactionId: 'tx-forged',
        orderId: '00000000-0000-4000-8000-000000000000',
        amount: 1,
        method: 'cib',
      }),
    });
    assert.equal(res.status, 401);
  });

  test('accepts a signed webhook only when the amount matches', async () => {
    const orderRes = await admin.request('/api/admin/orders');
    const orders = (await json(orderRes)).orders as Array<{ id: string; total: number }>;
    const order = orders[0];
    assert.ok(order, 'expected an order created by the previous suite');

    const send = async (amount: number, transactionId: string): Promise<Response> => {
      const body = JSON.stringify({
        event: 'payment.succeeded',
        transactionId,
        orderId: order.id,
        amount,
        method: 'cib',
      });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createHmac('sha256', config.paymentWebhookSecret ?? '')
        .update(`${timestamp}.${body}`)
        .digest('hex');
      return fetch(`${base}/api/payments/webhook`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-khotwa-signature': `t=${timestamp},v1=${signature}`,
        },
        body,
      });
    };

    const mismatch = await send(order.total + 1, 'tx-mismatch');
    assert.equal(mismatch.status, 400);
    assert.equal((await json(mismatch)).error, 'amount_mismatch');

    const ok = await send(order.total, 'tx-ok-1');
    assert.equal(ok.status, 200);

    // Idempotent replay of the same transaction id.
    const replay = await send(order.total, 'tx-ok-1');
    assert.equal(replay.status, 200);

    const refresh = await admin.request(`/api/admin/orders/${order.id}`);
    const updated = (await json(refresh)).order as { paymentStatus: string };
    assert.equal(updated.paymentStatus, 'paid');
  });
});

describe('uploads', () => {
  const onePixelPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );

  test('rejects files whose real content is not an allowed image', async () => {
    const form = new FormData();
    form.append('file', new Blob(['#!/bin/sh\necho pwned'], { type: 'image/png' }), 'evil.png');
    const res = await admin.request('/api/uploads', { method: 'POST', form });
    assert.equal(res.status, 415);
    assert.equal((await json(res)).error, 'unsupported_file_type');
  });

  test('accepts a real PNG and serves it only to staff', async () => {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(onePixelPng)], { type: 'image/png' }), 'pixel.png');
    const res = await admin.request('/api/uploads', { method: 'POST', form });
    assert.equal(res.status, 201);
    const body = await json(res);
    assert.equal(body.mime, 'image/png');
    const url = body.url as string;

    const staff = await admin.request(url);
    assert.equal(staff.status, 200);
    assert.equal(staff.headers.get('content-type'), 'image/png');

    const anon = new Client(base);
    await anon.request('/api/health');
    const denied = await anon.request(url);
    assert.equal(denied.status, 401);
  });
});
