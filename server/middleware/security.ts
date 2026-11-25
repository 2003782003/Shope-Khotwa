import type { RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { AppConfig } from '../config';

export function securityHeaders(config: AppConfig): RequestHandler {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:', 'blob:'],
        'connect-src': ["'self'", ...config.origins],
        'frame-ancestors': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'object-src': ["'none'"],
        ...(config.isProd ? { 'upgrade-insecure-requests': [] } : {}),
      },
    },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: { action: 'deny' },
    noSniff: true,
    hidePoweredBy: true,
    hsts: config.isProd
      ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
      : false,
  });
}

/** Permissions-Policy is not part of Helmet 8; set it explicitly. */
export function permissionsPolicy(): RequestHandler {
  return (_req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(self), payment=(), usb=(), interest-cohort=()',
    );
    next();
  };
}

/** Strict CORS: only configured origins, credentials allowed, never '*'. */
export function corsMiddleware(config: AppConfig): RequestHandler {
  return cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // same-origin / server-to-server
      if (config.origins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    exposedHeaders: ['Retry-After', 'X-RateLimit-Remaining'],
    maxAge: 600,
  });
}

/** Force HTTPS behind a trusted proxy (Vercel/Render/Fly set X-Forwarded-Proto). */
export function httpsRedirect(config: AppConfig): RequestHandler {
  return (req, res, next) => {
    if (!config.isProd) return next();
    if (req.secure) return next();
    const host = req.get('host');
    if (!host) return next();
    return res.redirect(308, `https://${host}${req.originalUrl}`);
  };
}
