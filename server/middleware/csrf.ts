import type { RequestHandler } from 'express';
import type { AppConfig } from '../config';
import { AppError } from '../lib/errors';
import { createCsrfToken, isValidCsrfToken, safeEqual } from '../lib/tokens';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF protection: signed double-submit cookie + strict Origin/Referer check.
 * A cross-site attacker can neither read the cookie nor forge the signature.
 */
export function csrfProtection(config: AppConfig): RequestHandler {
  return (req, res, next) => {
    if (req.method === 'OPTIONS') return next();

    let token: string | undefined = req.cookies?.[config.cookie.csrfName];
    if (!token || !isValidCsrfToken(config.sessionSecret, token)) {
      token = createCsrfToken(config.sessionSecret);
      res.cookie(config.cookie.csrfName, token, {
        httpOnly: false, // must be readable by the SPA to echo it back
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite,
        path: '/',
        maxAge: 2 * 60 * 60 * 1000,
      });
    }

    if (SAFE_METHODS.has(req.method)) return next();
    if (!UNSAFE_METHODS.has(req.method)) return next();

    // Payment webhooks authenticate with an HMAC signature instead.
    if (req.originalUrl.startsWith('/api/payments/webhook')) return next();

    const header = req.get('x-csrf-token');
    if (!header || !safeEqual(header, token)) {
      throw new AppError(403, 'csrf_failed', 'Missing or invalid CSRF token');
    }

    const origin = req.get('origin');
    if (origin) {
      if (!config.origins.includes(origin)) {
        throw new AppError(403, 'origin_rejected', 'Request origin is not allowed');
      }
    } else {
      const referer = req.get('referer');
      if (!referer) {
        // Non-browser clients must still present the CSRF token (verified above).
        return next();
      }
      let refererOrigin = '';
      try {
        refererOrigin = new URL(referer).origin;
      } catch {
        throw new AppError(403, 'origin_rejected', 'Invalid referer');
      }
      if (!config.origins.includes(refererOrigin)) {
        throw new AppError(403, 'origin_rejected', 'Request referer is not allowed');
      }
    }
    next();
  };
}
