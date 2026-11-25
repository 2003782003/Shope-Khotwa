/**
 * API client. All authentication is cookie-based (HttpOnly session cookie) and
 * every state-changing request carries the signed CSRF token from the
 * `khotwa_csrf` cookie. No secrets ever live in the frontend bundle.
 */

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) return decodeURIComponent(trimmed.slice(prefix.length));
  }
  return null;
}

type Options = Omit<RequestInit, 'body'> & { body?: unknown; json?: boolean };

export async function apiFetch<T>(path: string, options: Options = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const method = (options.method ?? 'GET').toUpperCase();
  let body: BodyInit | undefined;

  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(options.body);
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = readCookie('khotwa_csrf');
    if (csrf) headers.set('x-csrf-token', csrf);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    method,
    headers,
    body,
    credentials: 'include',
    // Never follow a cross-origin redirect with credentials.
    redirect: 'error',
  });

  const isJson = (res.headers.get('content-type') ?? '').includes('application/json');
  const payload = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const code =
      (payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : 'request_failed') || 'request_failed';
    throw new ApiError(res.status, code, (payload as { details?: unknown } | null)?.details);
  }

  return payload as T;
}

/** Touch an endpoint so the server issues the CSRF cookie before the first POST. */
export async function bootstrapSession(): Promise<void> {
  await apiFetch('/api/health').catch(() => undefined);
}

// ── auth ──────────────────────────────────────────────────
export interface ApiUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: 'admin' | 'manager' | 'delivery';
  emailVerified?: boolean;
}

export type LoginResponse =
  | { user: ApiUser }
  | { status: 'email_setup_required'; setupToken: string; expiresInSeconds: number }
  | {
      status: 'email_code_required';
      challengeToken: string;
      expiresInSeconds: number;
      devCode?: string;
    };

export type EmailChallengeResponse = {
  status: 'email_code_required';
  challengeToken?: string;
  expiresInSeconds: number;
  devCode?: string;
};

export const authApi = {
  me: () => apiFetch<{ user: ApiUser | null }>('/api/auth/me'),
  login: (email: string, password: string) =>
    apiFetch<LoginResponse>('/api/auth/login', { method: 'POST', body: { email, password } }),
  setupStaffEmail: (setupToken: string, email: string) =>
    apiFetch<EmailChallengeResponse>('/api/auth/email/setup', {
      method: 'POST',
      body: { setupToken, email },
    }),
  resendEmailCode: (challengeToken: string) =>
    apiFetch<EmailChallengeResponse>('/api/auth/email/code/resend', {
      method: 'POST',
      body: { challengeToken },
    }),
  verifyEmailCode: (challengeToken: string, code: string) =>
    apiFetch<{ user: ApiUser }>('/api/auth/email/code/verify', {
      method: 'POST',
      body: { challengeToken, code },
    }),
  logout: () => apiFetch<void>('/api/auth/logout', { method: 'POST' }),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<{ user: ApiUser }>('/api/auth/password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    }),
  forgotPassword: (email: string) =>
    apiFetch<{ status: string }>('/api/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token: string, newPassword: string) =>
    apiFetch<{ status: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: { token, newPassword },
    }),
};

// ── orders ────────────────────────────────────────────────
export interface CreateOrderPayload {
  productId: string;
  size: string;
  colorHex: string;
  quantity: number;
  wilayaCode: string;
  deliveryCompanyId?: string;
  customer: {
    fullName: string;
    phone: string;
    email?: string;
    commune: string;
    address: string;
  };
}

export const ordersApi = {
  create: (payload: CreateOrderPayload) =>
    apiFetch<{ order: Record<string, unknown>; invoiceNumber: string }>('/api/orders', {
      method: 'POST',
      body: payload,
    }),
  track: (invoice: string, phone: string) =>
    apiFetch<{ order: Record<string, unknown> }>(
      `/api/orders/track?invoice=${encodeURIComponent(invoice)}&phone=${encodeURIComponent(phone)}`,
    ),
};

// ── admin ─────────────────────────────────────────────────
export const adminApi = {
  orders: (limit = 200) => apiFetch<{ orders: Record<string, unknown>[] }>(`/api/admin/orders?limit=${limit}`),
  order: (id: string) => apiFetch<{ order: Record<string, unknown> }>(`/api/admin/orders/${id}`),
  updateStatus: (id: string, status: string) =>
    apiFetch<{ order: Record<string, unknown> }>(`/api/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: { status },
    }),
  audit: (limit = 200) => apiFetch<{ entries: Record<string, unknown>[] }>(`/api/admin/audit?limit=${limit}`),
  users: () => apiFetch<{ users: Record<string, unknown>[] }>('/api/admin/users'),
  updateUserEmail: (id: string, email: string) =>
    apiFetch<{ user: ApiUser }>(`/api/admin/users/${id}/email`, {
      method: 'PATCH',
      body: { email },
    }),
  stats: () => apiFetch<{ orders: number; revenue: number; byStatus: Record<string, number>; averageOrderValue: number }>('/api/admin/stats'),
};
