import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';

/**
 * Server configuration with fail-fast validation.
 * Secrets here are SERVER-ONLY. Nothing in this file is ever imported by the
 * Vite client build, so no secret can leak into the browser bundle.
 */

/** Strict boolean parsing: "false" must mean false, unlike z.coerce.boolean(). */
const boolEnv = (def: boolean) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === '') return def;
    if (typeof value === 'boolean') return value;
    return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
  }, z.boolean());

const optionalBoolEnv = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}, z.boolean().optional());

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  APP_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().optional(),
  DB_SSL: optionalBoolEnv,
  DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),

  SESSION_SECRET: z.string().min(32).optional(),
  SESSION_TTL_MINUTES: z.coerce.number().int().min(5).max(1440).default(30),
  SESSION_ABSOLUTE_HOURS: z.coerce.number().int().min(1).max(720).default(12),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_DOMAIN: z.string().optional(),

  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(60).default(20),
  // Staff login is protected by a 6-digit code delivered to the staff email.
  EMAIL_OTP_TTL_MINUTES: z.coerce.number().int().min(2).max(30).default(10),
  EMAIL_OTP_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(10).default(5),
  EXPOSE_DEV_EMAIL_CODE: boolEnv(false),

  UPLOAD_DIR: z.string().default('./var/uploads'),
  MAX_UPLOAD_BYTES: z.coerce.number().int().min(1024).max(10 * 1024 * 1024).default(2 * 1024 * 1024),

  PAYMENT_WEBHOOK_SECRET: z.string().min(16).optional(),
  PAYMENT_WEBHOOK_TOLERANCE_SECONDS: z.coerce.number().int().min(30).max(3600).default(300),

  ALERT_WEBHOOK_URL: z.string().url().optional(),
  LOGIN_ALERT_THRESHOLD: z.coerce.number().int().min(3).max(100).default(10),

  // Outbound email hook (password-reset links and staff login codes). When
  // unset, delivery fails honestly; tokens/codes are never returned to clients
  // except in explicit local-development mode.
  MAIL_WEBHOOK_URL: z.string().url().optional(),
  MAIL_WEBHOOK_KEY: z.string().optional(),
  MAIL_FROM: z.string().default('KHOTWA <no-reply@khotwa.dz>'),
  PUBLIC_APP_URL: z.string().url().optional(),

  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(1),
  ALLOW_MEMORY_DB: boolEnv(false),
  BODY_LIMIT: z.string().default('100kb'),
});

export type AppConfig = ReturnType<typeof buildConfig>;

/** Detect secrets accidentally exposed to the browser bundle. */
function assertNoBrowserSecrets(env: NodeJS.ProcessEnv, isProd: boolean): string[] {
  const secretPattern = /(SECRET|PRIVATE|PASSWORD|DATABASE|API_?KEY|TOKEN|CREDENTIAL|SALT)/i;
  const exposed = Object.keys(env).filter(
    (key) => /^(VITE_|NEXT_PUBLIC_|REACT_APP_|PUBLIC_)/.test(key) && secretPattern.test(key),
  );
  if (exposed.length > 0) {
    const msg = `Browser-exposed env var(s) contain secret-like names: ${exposed.join(', ')}. Rename without the public prefix.`;
    if (isProd) throw new Error(msg);
     
    console.warn(`[config] WARNING: ${msg}`);
  }
  return exposed;
}

export function buildConfig(raw: NodeJS.ProcessEnv = process.env) {
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  const env = parsed.data;
  const isProd = env.NODE_ENV === 'production';

  assertNoBrowserSecrets(raw, isProd);

  const origins = env.APP_ORIGIN.split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  if (isProd) {
    if (origins.length === 0) throw new Error('APP_ORIGIN must be set in production');
    if (origins.some((o) => !o.startsWith('https://'))) {
      throw new Error('APP_ORIGIN must use https:// in production');
    }
    if (!env.SESSION_SECRET) throw new Error('SESSION_SECRET (>=32 chars) is required in production');
    if (!env.DATABASE_URL && !env.ALLOW_MEMORY_DB) {
      throw new Error('DATABASE_URL is required in production (or explicitly set ALLOW_MEMORY_DB=true to run an unsafe demo)');
    }
    if (env.EXPOSE_DEV_EMAIL_CODE) throw new Error('EXPOSE_DEV_EMAIL_CODE must be false in production');
    if (env.ALLOW_MEMORY_DB) {
       
      console.warn('[config] WARNING: in-memory database enabled in production. Data is not persisted. UNSAFE.');
    }
  }

  const sessionSecret = env.SESSION_SECRET ?? randomBytes(48).toString('hex');
  if (!env.SESSION_SECRET && !isProd) {
     
    console.warn('[config] SESSION_SECRET not set — using an ephemeral development secret.');
  }

  const samesite = env.COOKIE_SAMESITE;
  if (samesite === 'none' && !isProd) {
    // Browsers reject SameSite=None without Secure outside localhost.
  }

  return {
    nodeEnv: env.NODE_ENV,
    isProd,
    isTest: env.NODE_ENV === 'test',
    port: env.PORT,
    origins,
    databaseUrl: env.DATABASE_URL,
    dbSsl: env.DB_SSL ?? isProd,
    dbPoolMax: env.DB_POOL_MAX,
    sessionSecret,
    sessionTtlMs: env.SESSION_TTL_MINUTES * 60_000,
    sessionAbsoluteMs: env.SESSION_ABSOLUTE_HOURS * 3_600_000,
    cookie: {
      // __Host- prefix is only valid with Secure + Path=/ and no Domain.
      sessionName: isProd && samesite !== 'none' ? '__Host-khotwa_sid' : 'khotwa_sid',
      csrfName: 'khotwa_csrf',
      sameSite: samesite,
      domain: env.COOKIE_DOMAIN,
      secure: isProd,
    },
    passwordResetTtlMs: env.PASSWORD_RESET_TTL_MINUTES * 60_000,
    emailOtpTtlMs: env.EMAIL_OTP_TTL_MINUTES * 60_000,
    emailOtpMaxAttempts: env.EMAIL_OTP_MAX_ATTEMPTS,
    exposeDevEmailCode: env.EXPOSE_DEV_EMAIL_CODE && !isProd,
    uploadDir: env.UPLOAD_DIR,
    maxUploadBytes: env.MAX_UPLOAD_BYTES,
    paymentWebhookSecret: env.PAYMENT_WEBHOOK_SECRET,
    paymentWebhookToleranceSeconds: env.PAYMENT_WEBHOOK_TOLERANCE_SECONDS,
    alertWebhookUrl: env.ALERT_WEBHOOK_URL,
    loginAlertThreshold: env.LOGIN_ALERT_THRESHOLD,
    mail: env.MAIL_WEBHOOK_URL
      ? { url: env.MAIL_WEBHOOK_URL, key: env.MAIL_WEBHOOK_KEY ?? '', from: env.MAIL_FROM }
      : null,
    publicAppUrl: (env.PUBLIC_APP_URL ?? origins[0] ?? 'http://localhost:5173').replace(/\/$/, ''),
    trustProxy: env.TRUST_PROXY,
    allowMemoryDb: env.ALLOW_MEMORY_DB,
    bodyLimit: env.BODY_LIMIT,
  };
}

let cached: AppConfig | null = null;
export function getConfig(): AppConfig {
  if (!cached) cached = buildConfig(process.env);
  return cached;
}
