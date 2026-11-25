import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Repo } from '../db/types';
import { audit } from './audit';

export interface RateLimitOptions {
  bucket: string;
  limit: number;
  windowMs: number;
  /** Optional identifier (email/phone/invoice). Defaults to client IP. */
  key?: (req: Request) => string | undefined;
}

export function rateLimit(repo: Repo, opts: RateLimitOptions): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const suffix = (opts.key ? opts.key(req) : undefined) ?? req.ip ?? 'unknown';
    const key = `${opts.bucket}:${suffix}`.slice(0, 220);
    const result = await repo.hitRateLimit(key, opts.limit, opts.windowMs);

    res.setHeader('X-RateLimit-Limit', String(opts.limit));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));

    if (!result.allowed) {
      const seconds = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
      res.setHeader('Retry-After', String(seconds));
      await audit(repo, req, {
        action: 'rate_limited',
        entityType: 'http',
        entityId: opts.bucket,
        details: { path: req.path, method: req.method },
      });
      res.status(429).json({ error: 'rate_limited', retryAfterSeconds: seconds });
      return;
    }
    next();
  };
}
