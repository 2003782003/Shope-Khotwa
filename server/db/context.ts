import { AsyncLocalStorage } from 'node:async_hooks';
import type { UserRole } from './types';

/**
 * Database access context. PostgreSQL row-level-security policies read these
 * values with current_setting(). The app sets them per transaction so a query
 * can only ever see rows the current actor is allowed to see.
 *
 * - system: server-internal work (auth, sessions, rate limits, webhooks, audit)
 * - user:   an authenticated staff session (self + role-scoped rows)
 * - guest:  a customer creating or tracking an order (phone + invoice scoped)
 *
 * There is no implicit "public" context: request handlers that read customer or
 * order data MUST wrap the repository call in runAs() with a user or guest
 * context. Anything that reaches the database without a context is a
 * deliberate server-internal operation.
 */
export type DbContext =
  | { mode: 'system' }
  | { mode: 'user'; userId: string; role: UserRole }
  | { mode: 'guest'; phone: string; invoice?: string };

const storage = new AsyncLocalStorage<DbContext>();

export function runAs<T>(ctx: DbContext, fn: () => Promise<T> | T): Promise<T> {
  return storage.run(ctx, async () => fn());
}

export function currentDbContext(): DbContext {
  return storage.getStore() ?? { mode: 'system' };
}
