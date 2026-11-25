import type { Response } from 'express';
import type { AppConfig } from '../config';

/**
 * Session cookies:
 *  - HttpOnly  -> JavaScript can never read the session token (XSS containment)
 *  - Secure    -> only sent over HTTPS in production
 *  - SameSite  -> Lax by default, Strict supported through env
 *  - short expiry, hard absolute cap enforced in the database as well
 */
export function setSessionCookie(
  res: Response,
  config: AppConfig,
  token: string,
  absoluteExpiresAt: Date,
): void {
  const expires = new Date(
    Math.min(Date.now() + config.sessionTtlMs, absoluteExpiresAt.getTime()),
  );
  res.cookie(config.cookie.sessionName, token, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: '/',
    expires,
    ...(config.cookie.domain ? { domain: config.cookie.domain } : {}),
  });
}

export function clearSessionCookie(res: Response, config: AppConfig): void {
  res.clearCookie(config.cookie.sessionName, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: '/',
    ...(config.cookie.domain ? { domain: config.cookie.domain } : {}),
  });
}
