import type { Request, RequestHandler } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config';
import type { Repo } from '../db/types';
import { runAs } from '../db/context';
import { audit, clientIp } from '../lib/audit';
import { AppError } from '../lib/errors';
import { hmacHex, safeEqual } from '../lib/tokens';
import { parseBody } from '../lib/validation';

const webhookSchema = z.object({
  event: z.enum(['payment.succeeded', 'payment.failed', 'payment.refunded']),
  transactionId: z.string().min(1).max(255),
  orderId: z.string().uuid(),
  amount: z.number().int().min(0),
  method: z.enum(['cod', 'cib', 'edahabia', 'ccp', 'baridimob']),
});

/**
 * Verifies an HMAC signature of the form:
 *   X-Khotwa-Signature: t=<unix-seconds>,v1=<hex hmac of `${t}.${rawBody}`>
 * A valid signature proves the request came from the payment provider, and the
 * timestamp window blocks replay attacks. Invalid requests never reach the DB.
 */
function verifySignature(config: AppConfig, header: string, rawBody: Buffer): boolean {
  if (!config.paymentWebhookSecret) return false;
  const parts = Object.fromEntries(
    header
      .split(',')
      .map((p) => p.trim().split('='))
      .filter((p) => p.length === 2),
  );
  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp)) return false;
  const age = Math.abs(Date.now() / 1000 - timestamp);
  if (age > config.paymentWebhookToleranceSeconds) return false;
  const expected = hmacHex(config.paymentWebhookSecret, `${parts.t}.${rawBody.toString('utf8')}`);
  return safeEqual(expected, parts.v1 ?? '');
}

export function paymentWebhookHandler(repo: Repo, config: AppConfig): RequestHandler {
  return async (req: Request, res) => {
    if (!config.paymentWebhookSecret) {
      throw new AppError(503, 'webhook_not_configured', 'Payment webhooks are not configured');
    }
    const signature = req.get('x-khotwa-signature');
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
    if (!signature || !verifySignature(config, signature, rawBody)) {
      await audit(repo, req, {
        action: 'payment_webhook_rejected',
        entityType: 'payment',
        details: { reason: 'bad_signature', ip: clientIp(req) },
      });
      throw new AppError(401, 'invalid_signature', 'Invalid webhook signature');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new AppError(400, 'invalid_payload', 'Malformed webhook payload');
    }
    const payload = parseBody(webhookSchema, parsed);

    await runAs({ mode: 'system' }, async () => {
      const order = await repo.getOrderById(payload.orderId);
      if (!order) throw new AppError(404, 'order_not_found', 'Unknown order');

      // The provider must charge exactly the server-computed total.
      if (payload.amount !== order.total) {
        await audit(repo, req, {
          action: 'payment_amount_mismatch',
          entityType: 'order',
          entityId: order.id,
          details: { expected: order.total, received: payload.amount },
        });
        throw new AppError(400, 'amount_mismatch', 'Payment amount does not match the order');
      }

      const status =
        payload.event === 'payment.succeeded'
          ? 'paid'
          : payload.event === 'payment.refunded'
            ? 'refunded'
            : 'failed';

      const result = await repo.recordPayment({
        orderId: payload.orderId,
        amount: payload.amount,
        method: payload.method,
        status,
        transactionId: payload.transactionId,
        gatewayResponse: parsed,
      });

      if (status === 'paid') await repo.markOrderPaid(order.id);

      await audit(repo, req, {
        action: result === 'duplicate' ? 'payment_duplicate_ignored' : 'payment_recorded',
        entityType: 'order',
        entityId: order.id,
        details: { transactionId: payload.transactionId, status },
      });
    });

    res.json({ received: true });
  };
}
