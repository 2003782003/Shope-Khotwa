import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import type { AppConfig } from './config';
import type { Repo } from './db/types';
import { attachServices, authenticate } from './middleware/auth';
import { csrfProtection } from './middleware/csrf';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import {
  corsMiddleware,
  httpsRedirect,
  permissionsPolicy,
  securityHeaders,
} from './middleware/security';
import { adminRouter } from './routes/admin';
import { authRouter } from './routes/auth';
import { ordersRouter } from './routes/orders';
import { paymentWebhookHandler } from './routes/payments';
import { publicRouter } from './routes/public';
import { uploadsRouter } from './routes/uploads';

export interface AppDeps {
  repo: Repo;
  config: AppConfig;
}

export function createApp({ repo, config }: AppDeps): Express {
  const app = express();

  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');
  app.disable('etag');

  // ── transport & headers ──────────────────────────────────
  app.use(securityHeaders(config));
  app.use(permissionsPolicy());
  app.use(corsMiddleware(config));
  app.use(httpsRedirect(config));

  // ── payment webhook BEFORE JSON parsing (needs the raw body) ──
  app.post(
    '/api/payments/webhook',
    express.raw({ type: '*/*', limit: config.bodyLimit }),
    attachServices(repo, config),
    paymentWebhookHandler(repo, config),
  );

  // ── body parsing (bounded) ───────────────────────────────
  app.use(cookieParser());
  app.use(express.json({ limit: config.bodyLimit, strict: true }));
  app.use(express.urlencoded({ extended: false, limit: config.bodyLimit }));

  // ── CSRF on every state-changing request ─────────────────
  app.use(csrfProtection(config));

  // ── request context + session resolution ─────────────────
  app.use(attachServices(repo, config));
  app.use(authenticate(config));

  // ── API routes ───────────────────────────────────────────
  app.use('/api', publicRouter(repo));
  app.use('/api/auth', authRouter(repo, config));
  app.use('/api/orders', ordersRouter(repo, config));
  app.use('/api/admin', adminRouter(repo, config));
  app.use('/api/uploads', uploadsRouter(repo, config));

  // Unknown /api/* paths must 404 as JSON, never fall through to HTML.
  app.use('/api', notFoundHandler);

  app.use(errorHandler(config));

  return app;
}
