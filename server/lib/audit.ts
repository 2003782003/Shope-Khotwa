import type { Request } from 'express';
import type { AppConfig } from '../config';
import type { AuditEntry, Repo } from '../db/types';

export function clientIp(req: Request): string {
  const raw = req.ip ?? req.socket?.remoteAddress ?? '';
  return raw.replace(/^::ffff:/, '').slice(0, 45);
}

export function userAgentOf(req: Request): string {
  return (req.get('user-agent') ?? '').slice(0, 400);
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 1)}***@${domain}`;
}

/** Audit without ever storing passwords, tokens or OTP codes. */
export async function audit(
  repo: Repo,
  req: Request | null,
  entry: Omit<AuditEntry, 'ip' | 'userAgent'>,
): Promise<void> {
  try {
    await repo.audit({
      ...entry,
      ip: req ? clientIp(req) : null,
      userAgent: req ? userAgentOf(req) : null,
    });
  } catch {
    // Auditing must not break the request path.
  }
}

/**
 * Repeated failed logins trigger an alert: an audit row plus an optional
 * outgoing webhook. No credentials or full emails are included.
 */
export async function alertOnBruteForce(
  repo: Repo,
  config: AppConfig,
  info: { email: string; ip: string; failures: number },
): Promise<void> {
  if (info.failures < config.loginAlertThreshold) return;
  await repo.audit({
    action: 'security_alert',
    entityType: 'auth',
    ip: info.ip,
    details: {
      reason: 'repeated_failed_logins',
      email: maskEmail(info.email),
      failures: info.failures,
    },
  });
  if (config.alertWebhookUrl) {
    const body = JSON.stringify({
      text: `⚠️ KHOTWA security alert: ${info.failures} failed logins for ${maskEmail(info.email)} from ${info.ip}`,
    });
    void fetch(config.alertWebhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      signal: AbortSignal.timeout(5000),
    }).catch(() => undefined);
  }
}
