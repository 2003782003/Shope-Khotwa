import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { AppError } from '../lib/errors';
import type { AppConfig } from '../config';

/** 404 for unknown API paths — never falls through to the SPA. */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'not_found' });
}

/**
 * Single error boundary. Client responses never contain stack traces, SQL,
 * table names or file paths. Details are logged server-side only.
 */
export function errorHandler(config: AppConfig) {
   
  return (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    if (res.headersSent) return;

    if (err instanceof AppError) {
      if (err.status === 429 && err.details && typeof err.details === 'object') {
        const retry = (err.details as { retryAfterSeconds?: number }).retryAfterSeconds;
        if (retry) res.setHeader('Retry-After', String(retry));
      }
      res.status(err.status).json({
        error: err.code,
        ...(err.details !== undefined ? { details: err.details } : {}),
      });
      return;
    }

    if (err instanceof multer.MulterError) {
      const code = err.code === 'LIMIT_FILE_SIZE' ? 'file_too_large' : 'upload_failed';
      res.status(400).json({ error: code });
      return;
    }

    // Unexpected error: log the real reason, return a generic message.
     
    console.error('[server] unhandled error', {
      path: req.path,
      method: req.method,
      name: err instanceof Error ? err.name : typeof err,
      message: err instanceof Error ? err.message : String(err),
      ...(config.isProd ? {} : { stack: err instanceof Error ? err.stack : undefined }),
    });

    res.status(500).json({
      error: 'internal_error',
      ...(config.isProd ? {} : { message: err instanceof Error ? err.message : String(err) }),
    });
  };
}
