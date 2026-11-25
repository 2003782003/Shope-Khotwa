import { Router } from 'express';
import type { AppConfig } from '../config';
import type { CreateOrderInput, Repo } from '../db/types';
import { findWilaya, priceOrder } from '../catalog';
import { audit } from '../lib/audit';
import { runAs } from '../db/context';
import { AppError, notFound } from '../lib/errors';
import { rateLimit } from '../lib/rateLimit';
import { serializeOrder, serializeTracking } from '../lib/serialize';
import { assertStaff } from '../middleware/auth';
import { createOrderSchema, parseBody, trackOrderSchema } from '../lib/validation';

const MINUTE = 60_000;

export function ordersRouter(repo: Repo, _config: AppConfig): Router {
  const router = Router();

  // ── create order (public, server-priced) ─────────────────
  router.post(
    '/',
    rateLimit(repo, { bucket: 'order-ip', limit: 10, windowMs: 10 * MINUTE }),
    rateLimit(repo, {
      bucket: 'order-phone',
      limit: 5,
      windowMs: 10 * MINUTE,
      key: (req) => {
        const phone = (req.body as { customer?: { phone?: unknown } } | undefined)?.customer?.phone;
        return typeof phone === 'string' ? phone : undefined;
      },
    }),
    async (req, res) => {
      const input = parseBody(createOrderSchema, req.body);

      // Customer orders never require phone or SMS verification. The phone is
      // only a delivery contact (and one half of the invoice tracking lookup).
      // Prices, totals and delivery fees are recomputed from the catalog.
      const priced = priceOrder({
        productId: input.productId,
        quantity: input.quantity,
        size: input.size,
        colorHex: input.colorHex,
        wilayaCode: input.wilayaCode,
        deliveryCompanyId: input.deliveryCompanyId,
      });
      if (!priced.ok) throw new AppError(400, priced.error, 'Invalid order details');

      const wilaya = findWilaya(input.wilayaCode);
      if (!wilaya) throw new AppError(400, 'unknown_wilaya', 'Invalid wilaya');

      const inStock = await repo.decrementStock(priced.priced.productId, input.quantity);
      if (!inStock) throw new AppError(409, 'out_of_stock', 'This size is out of stock');

      const orderInput: CreateOrderInput = {
        ...priced.priced,
        customer: {
          fullName: input.customer.fullName,
          phone: input.customer.phone,
          email: input.customer.email ? input.customer.email : null,
          wilayaCode: wilaya.code,
          wilayaName: wilaya.name.en,
          commune: input.customer.commune,
          address: input.customer.address,
        },
        paymentMethod: 'cod',
        ip: req.ip ?? '',
      };

      const order = await runAs({ mode: 'guest', phone: input.customer.phone }, () =>
        repo.createOrder(orderInput),
      );

      await audit(repo, req, {
        action: 'order_created',
        entityType: 'order',
        entityId: order.id,
        details: { invoice: order.invoiceNumber, total: order.total, items: order.quantity },
      });

      res.status(201).json({
        order: serializeOrder(order),
        invoiceNumber: order.invoiceNumber,
      });
    },
  );

  // ── track by invoice + phone (public, no IDOR: both required) ──
  router.get(
    '/track',
    rateLimit(repo, { bucket: 'track-ip', limit: 30, windowMs: 10 * MINUTE }),
    async (req, res) => {
      const query = parseBody(trackOrderSchema, {
        invoice: req.query.invoice,
        phone: req.query.phone,
      });
      const order = await runAs(
        { mode: 'guest', phone: query.phone, invoice: query.invoice },
        () => repo.trackOrder(query.invoice, query.phone),
      );
      if (!order) throw notFound('order_not_found');
      res.json({ order: serializeTracking(order) });
    },
  );

  // ── staff: full order by id ──────────────────────────────
  router.get('/:id', async (req, res) => {
    assertStaff(req);
    const order = await runAs(
      {
        mode: 'user',
        userId: req.auth!.session.userId,
        role: req.auth!.session.role,
      },
      () => repo.getOrderById(req.params.id),
    );
    if (!order) throw notFound('order_not_found');
    res.json({ order: serializeOrder(order) });
  });

  return router;
}
