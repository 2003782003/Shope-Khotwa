import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AppConfig } from '../config';
import type { Repo, UserRole } from '../db/types';
import { AppError, forbidden, unauthorized } from '../lib/errors';
import { sha256 } from '../lib/tokens';
import { clearSessionCookie } from '../lib/session';

/** Makes repo/config available on every request without leaking them in imports. */
export function attachServices(repo: Repo, config: AppConfig): RequestHandler {
  return (req, _res, next) => {
    req.repo = repo;
    req.config = config;
    next();
  };
}

/**
 * Resolves the opaque session cookie to a server-side session row.
 * The token is hashed before it touches the database, so a database leak does
 * not hand over usable session cookies.
 */
export function authenticate(config: AppConfig): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const raw = req.cookies?.[config.cookie.sessionName];
      if (!raw || typeof raw !== 'string') return next();

      const tokenHash = sha256(raw);
      const session = await req.repo.getSession(tokenHash);
      if (!session) {
        clearSessionCookie(res, config);
        return next();
      }

      // Sliding expiry, capped by the absolute expiry created at login.
      if (session.expiresAt.getTime() - Date.now() < config.sessionTtlMs / 2) {
        const nextExpiry = new Date(
          Math.min(Date.now() + config.sessionTtlMs, session.absoluteExpiresAt.getTime()),
        );
        await req.repo.touchSession(session.sessionId, nextExpiry);
        session.expiresAt = nextExpiry;
      }

      req.auth = { session, tokenHash };
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireAuth(req: Request): asserts req is Request & {
  auth: { session: NonNullable<Request['auth']>['session']; tokenHash: string };
} {
  if (!req.auth) throw unauthorized();
}

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) return next(unauthorized());
    if (!roles.includes(req.auth.session.role)) return next(forbidden());
    return next();
  };
}

/** Staff = admin or manager. Delivery users get read-only access to assigned orders. */
export const STAFF_ROLES: UserRole[] = ['admin', 'manager'];

export function assertStaff(req: Request): void {
  if (!req.auth) throw unauthorized();
  if (!STAFF_ROLES.includes(req.auth.session.role)) throw forbidden();
}

export function assertAdmin(req: Request): void {
  if (!req.auth) throw unauthorized();
  if (req.auth.session.role !== 'admin') throw forbidden();
}

export { AppError };
