export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message?: string,
    public readonly details?: unknown,
  ) {
    super(message ?? code);
    this.name = 'AppError';
  }
}

export const badRequest = (code = 'invalid_input', details?: unknown) =>
  new AppError(400, code, 'The request could not be processed', details);
export const unauthorized = (code = 'unauthorized') =>
  new AppError(401, code, 'Authentication required');
export const forbidden = (code = 'forbidden') =>
  new AppError(403, code, 'You do not have permission to do that');
export const notFound = (code = 'not_found') =>
  new AppError(404, code, 'Not found');
export const conflict = (code = 'conflict') =>
  new AppError(409, code, 'Request conflicts with the current state');
export const tooMany = (retryAfterSeconds: number) =>
  new AppError(429, 'rate_limited', `Too many requests. Retry in ${retryAfterSeconds}s`, { retryAfterSeconds });
