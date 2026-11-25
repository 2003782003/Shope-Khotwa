import type { AppConfig } from '../config';
import { AppError } from './errors';

/**
 * Outbound email hook.
 *
 * The project ships without an SMTP provider. Delivery is delegated to a
 * configurable HTTPS webhook (Mailgun/SES relay/your own worker). When it is
 * not configured, delivery fails honestly: reset tokens and staff login codes
 * are never returned to the client outside explicit local-development mode.
 */
async function postMail(
  config: AppConfig,
  to: string,
  subject: string,
  text: string,
): Promise<boolean> {
  if (!config.mail) {
    console.warn('[mail] MAIL_WEBHOOK_URL is not configured — email was NOT delivered.');
    return false;
  }
  const res = await fetch(config.mail.url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(config.mail.key ? { authorization: `Bearer ${config.mail.key}` } : {}),
    },
    body: JSON.stringify({ from: config.mail.from, to, subject, text }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!res || !res.ok) {
    console.error('[mail] delivery failed', { status: res?.status ?? 'network_error' });
    return false;
  }
  return true;
}

export async function sendPasswordResetEmail(
  config: AppConfig,
  to: string,
  resetUrl: string,
): Promise<boolean> {
  return postMail(
    config,
    to,
    'KHOTWA — reset your password',
    'We received a request to reset your KHOTWA password.\n\n' +
      `Open this link within ${Math.round(config.passwordResetTtlMs / 60000)} minutes:\n${resetUrl}\n\n` +
      'If you did not request this, ignore this email. The link expires automatically.',
  );
}

export interface EmailCodeResult {
  delivered: boolean;
  /** Only set when EXPOSE_DEV_EMAIL_CODE=true outside production. */
  devCode?: string;
}

/**
 * Sends the one-time staff login code. There is no SMS channel: the code is
 * always delivered to the staff member's email address.
 */
export async function sendEmailLoginCode(
  config: AppConfig,
  to: string,
  code: string,
): Promise<EmailCodeResult> {
  const validMinutes = Math.round(config.emailOtpTtlMs / 60_000);
  const delivered = await postMail(
    config,
    to,
    'KHOTWA — your sign-in code',
    `Your KHOTWA staff sign-in code is ${code}.\n\n` +
      `It expires in ${validMinutes} minutes. Never share this code with anyone.`,
  );
  if (!delivered) {
    if (config.exposeDevEmailCode) return { delivered: false, devCode: code };
    throw new AppError(503, 'email_delivery_failed', 'Email code delivery is temporarily unavailable');
  }
  return { delivered: true };
}
