import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config';
import type { Repo } from '../db/types';
import { runAs } from '../db/context';
import { audit } from '../lib/audit';
import { AppError, badRequest, conflict, notFound } from '../lib/errors';
import { serializeOrder, serializeUser } from '../lib/serialize';
import {
  paginationSchema,
  parseBody,
  staffEmailUpdateSchema,
  updateStatusSchema,
  uuidSchema,
} from '../lib/validation';
import { assertAdmin, assertStaff, requireRole } from '../middleware/auth';

const bulkQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export function adminRouter(repo: Repo, _config: AppConfig): Router {
  const router = Router();

  // Every route below requires a real server-verified staff session.
  router.use(requireRole('admin', 'manager'));

  const asUser = <T>(req: Express.Request, fn: () => Promise<T>) =>
    runAs(
      {
        mode: 'user',
        userId: req.auth!.session.userId,
        role: req.auth!.session.role,
      },
      fn,
    );

  // ── orders ───────────────────────────────────────────────
  router.get('/orders', async (req, res) => {
    assertStaff(req);
    const { limit } = parseBody(bulkQuerySchema, req.query);
    const orders = await asUser(req, () => repo.listOrders(limit));
    res.json({ orders: orders.map(serializeOrder) });
  });

  router.get('/orders/:id', async (req, res) => {
    assertStaff(req);
    const id = parseBody(uuidSchema, req.params.id);
    const order = await asUser(req, () => repo.getOrderById(id));
    if (!order) throw notFound('order_not_found');
    res.json({ order: serializeOrder(order) });
  });

  router.patch('/orders/:id/status', async (req, res) => {
    assertStaff(req);
    const id = parseBody(uuidSchema, req.params.id);
    const { status } = parseBody(updateStatusSchema, req.body);
    const order = await asUser(req, () =>
      repo.updateOrderStatus(id, status, req.auth!.session.userId),
    );
    if (!order) throw notFound('order_not_found');
    await audit(repo, req, {
      userId: req.auth!.session.userId,
      action: 'order_status_changed',
      entityType: 'order',
      entityId: id,
      details: { status },
    });
    res.json({ order: serializeOrder(order) });
  });

  // ── audit log (admin only) ───────────────────────────────
  router.get('/audit', async (req, res) => {
    assertAdmin(req);
    const { limit } = parseBody(paginationSchema, req.query);
    const rows = await asUser(req, () => repo.listAudit(limit));
    res.json({
      entries: rows.map((row) => ({
        id: row.id,
        userId: row.userId ?? null,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId ?? null,
        ip: row.ip ?? null,
        userAgent: row.userAgent ?? null,
        details: row.details ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  });

  // ── users (admin only) ───────────────────────────────────
  router.get('/users', async (req, res) => {
    assertAdmin(req);
    const users = await runAs({ mode: 'system' }, () => repo.listUsers());
    res.json({ users: users.map(serializeUser) });
  });

  /**
   * Admin-corrected staff email. Changing the mailbox invalidates all sessions
   * and pending challenges so the next login must deliver a code to the new
   * address. Placeholder @khotwa.internal addresses are never accepted here.
   */
  router.patch('/users/:id/email', async (req, res) => {
    assertAdmin(req);
    const id = parseBody(uuidSchema, req.params.id);
    const { email } = parseBody(staffEmailUpdateSchema, req.body);
    if (email.endsWith('@khotwa.internal')) {
      throw badRequest('placeholder_email_not_allowed');
    }
    const user = await runAs({ mode: 'system' }, () => repo.getUserById(id));
    if (!user) throw notFound('user_not_found');
    const existing = await runAs({ mode: 'system' }, () => repo.getUserByEmail(email));
    if (existing && existing.id !== id) throw conflict('email_in_use');

    await runAs({ mode: 'system' }, () => repo.setUserEmail(id, email));
    await runAs({ mode: 'system' }, () => repo.deleteUserSessions(id));
    await runAs({ mode: 'system' }, () => repo.deleteUserEmailChallenges(id));
    await runAs({ mode: 'system' }, () => repo.deletePasswordResets(id));
    await audit(repo, req, {
      userId: req.auth!.session.userId,
      action: 'staff_email_corrected',
      entityType: 'user',
      entityId: id,
      details: { targetRole: user.role },
    });
    res.json({
      user: serializeUser({ ...user, email, emailVerified: false }),
    });
  });

  // ── dashboard stats ──────────────────────────────────────
  router.get('/stats', async (req, res) => {
    assertStaff(req);
    const orders = await asUser(req, () => repo.listOrders(500));
    const revenue = orders
      .filter((o) => o.status !== 'cancelled' && o.status !== 'returned')
      .reduce((sum, o) => sum + o.total, 0);
    const byStatus = orders.reduce<Record<string, number>>((acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1;
      return acc;
    }, {});
    res.json({
      orders: orders.length,
      revenue,
      byStatus,
      averageOrderValue: orders.length ? Math.round(revenue / orders.length) : 0,
    });
  });

  // Explicit 404 for anything else under /api/admin
  router.use((_req, _res, next) => next(new AppError(404, 'not_found')));

  return router;
}
