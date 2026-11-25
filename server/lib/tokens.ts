import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function hmacHex(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/** Keyed hash of a staff-login code; the plain code is never stored. */
export function hashEmailOtp(secret: string, email: string, code: string): string {
  return hmacHex(secret, `email-otp:${email.toLowerCase()}:${code}`);
}

/** Signed CSRF token: `<nonce>.<hmac>` (double-submit + tamper detection). */
export function createCsrfToken(secret: string): string {
  const nonce = randomToken(24);
  return `${nonce}.${hmacHex(secret, `csrf:${nonce}`)}`;
}

export function isValidCsrfToken(secret: string, token: string | undefined): boolean {
  if (!token) return false;
  const idx = token.lastIndexOf('.');
  if (idx <= 0) return false;
  const nonce = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = hmacHex(secret, `csrf:${nonce}`);
  return safeEqual(expected, sig);
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s.-]/g, '');
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}
