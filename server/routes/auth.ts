import { Router, type Request, type Response } from 'express';
import type { AppConfig } from '../config';
import type { Repo, UserRole, UserRow } from '../db/types';
import {
  audit,
  alertOnBruteForce,
  clientIp,
  maskEmail,
  userAgentOf,
} from '../lib/audit';
import { AppError, badRequest, conflict, unauthorized } from '../lib/errors';
import { sendEmailLoginCode, sendPasswordResetEmail } from '../lib/notify';
import { burnPasswordTime, hashPassword, verifyPassword } from '../lib/passwords';
import { rateLimit } from '../lib/rateLimit';
import { serializeUser } from '../lib/serialize';
import { clearSessionCookie, setSessionCookie } from '../lib/session';
import {
  generateOtp,
  hashEmailOtp,
  hmacHex,
  randomToken,
  safeEqual,
  sha256,
} from '../lib/tokens';
import {
  emailCodeResendSchema,
  emailCodeVerifySchema,
  emailSetupSchema,
  loginSchema,
  parseBody,
  passwordChangeSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
} from '../lib/validation';

const MINUTE = 60_000;
const PLACEHOLDER_DOMAIN = '@khotwa.internal';
/** Only these roles get an email code before a session is issued. */
const EMAIL_OTP_ROLES = new Set<UserRole>(['admin', 'manager']);

type ChallengePurpose = 'login' | 'setup';

function tokenFromBody(body: unknown, field: string): string | undefined {
  const value = (body as Record<string, unknown> | undefined)?.[field];
  return typeof value === 'string' ? value : undefined;
}

export function authRouter(repo: Repo, config: AppConfig): Router {
  const router = Router();
  const codeTtlSeconds = Math.round(config.emailOtpTtlMs / 1000);

  const challengeHashOf = (token: string) => hmacHex(config.sessionSecret, token);

  async function createChallenge(input: {
    userId: string;
    email: string;
    purpose: ChallengePurpose;
    /** Reuse an already-sent code; otherwise a fresh one is generated. */
    code?: string;
  }): Promise<{ token: string; code?: string }> {
    const token = randomToken(32);
    let codeHash = '';
    let code = input.code;
    if (input.purpose === 'login') {
      code = code ?? generateOtp();
      codeHash = hashEmailOtp(config.sessionSecret, input.email, code);
    }
    await repo.createEmailChallenge({
      userId: input.userId,
      email: input.email.toLowerCase(),
      codeHash,
      challengeHash: challengeHashOf(token),
      purpose: input.purpose,
      expiresAt: new Date(Date.now() + config.emailOtpTtlMs),
    });
    return { token, code };
  }

  /** Issues the real session only after the email code (or password for delivery) succeeded. */
  async function completeLogin(
    req: Request,
    res: Response,
    user: UserRow,
    action: string,
  ): Promise<void> {
    const token = randomToken(32);
    const tokenHash = sha256(token);
    const absoluteExpiresAt = new Date(Date.now() + config.sessionAbsoluteMs);
    await repo.createSession({
      userId: user.id,
      tokenHash,
      ip: clientIp(req),
      userAgent: userAgentOf(req),
      expiresAt: new Date(Date.now() + config.sessionTtlMs),
      absoluteExpiresAt,
    });
    await repo.markLogin(user.id);
    await audit(repo, req, {
      userId: user.id,
      action,
      entityType: 'auth',
      entityId: user.id,
      details: { role: user.role },
    });
    setSessionCookie(res, config, token, absoluteExpiresAt);
    res.json({ user: serializeUser({ ...user, lastLoginAt: new Date() }) });
  }

  // ── login ────────────────────────────────────────────────
  router.post(
    '/login',
    rateLimit(repo, { bucket: 'login-ip', limit: 30, windowMs: 15 * MINUTE }),
    rateLimit(repo, {
      bucket: 'login-account',
      limit: 10,
      windowMs: 15 * MINUTE,
      key: (req) => {
        const email = (req.body as { email?: unknown } | undefined)?.email;
        return typeof email === 'string' ? email.toLowerCase().slice(0, 254) : undefined;
      },
    }),
    async (req, res) => {
      const { email, password } = parseBody(loginSchema, req.body);
      const ip = clientIp(req);
      const user = await repo.getUserByEmail(email);

      if (!user || !user.isActive) {
        await burnPasswordTime(password);
        const failures = await repo.hitRateLimit(
          `login-fail:${email}`,
          1_000_000,
          15 * MINUTE,
        );
        await audit(repo, req, {
          action: 'login_failed',
          entityType: 'auth',
          details: { email: `${email.slice(0, 1)}***`, reason: 'unknown_or_inactive' },
        });
        await alertOnBruteForce(repo, config, { email, ip, failures: failures.count });
        throw unauthorized('invalid_credentials');
      }

      const ok = await verifyPassword(user.passwordHash, password);
      if (!ok) {
        const failures = await repo.hitRateLimit(
          `login-fail:${email}`,
          1_000_000,
          15 * MINUTE,
        );
        await audit(repo, req, {
          action: 'login_failed',
          entityType: 'auth',
          entityId: user.id,
          details: { email: `${email.slice(0, 1)}***`, reason: 'bad_password' },
        });
        await alertOnBruteForce(repo, config, { email, ip, failures: failures.count });
        throw unauthorized('invalid_credentials');
      }

      // Email code is a staff-only second step. No session cookie is set here.
      if (EMAIL_OTP_ROLES.has(user.role)) {
        await repo.deleteUserEmailChallenges(user.id);

        if (user.email.toLowerCase().endsWith(PLACEHOLDER_DOMAIN)) {
          const { token } = await createChallenge({
            userId: user.id,
            email: user.email,
            purpose: 'setup',
          });
          await audit(repo, req, {
            userId: user.id,
            action: 'email_setup_required',
            entityType: 'auth',
            entityId: user.id,
          });
          res.json({
            status: 'email_setup_required',
            setupToken: token,
            expiresInSeconds: codeTtlSeconds,
          });
          return;
        }

        const code = generateOtp();
        // Send first: if delivery is impossible, never leave a usable challenge.
        const delivery = await sendEmailLoginCode(config, user.email, code);
        const { token: challengeToken } = await createChallenge({
          userId: user.id,
          email: user.email,
          purpose: 'login',
          code,
        });
        await audit(repo, req, {
          userId: user.id,
          action: 'email_code_sent',
          entityType: 'auth',
          entityId: user.id,
          details: { email: maskEmail(user.email) },
        });
        res.json({
          status: 'email_code_required',
          challengeToken,
          ...(delivery.devCode ? { devCode: delivery.devCode } : {}),
          expiresInSeconds: codeTtlSeconds,
        });
        return;
      }

      await completeLogin(req, res, user, 'login_success');
    },
  );

  // ── one-time email setup for placeholder accounts ────────
  router.post(
    '/email/setup',
    rateLimit(repo, { bucket: 'email-setup-ip', limit: 5, windowMs: 15 * MINUTE }),
    async (req, res) => {
      const { setupToken, email } = parseBody(emailSetupSchema, req.body);
      if (email.toLowerCase().endsWith(PLACEHOLDER_DOMAIN)) {
        throw badRequest('placeholder_email_not_allowed');
      }
      const challenge = await repo.getEmailChallenge(challengeHashOf(setupToken));
      if (!challenge || challenge.purpose !== 'setup') {
        throw new AppError(400, 'invalid_setup_token', 'This setup link is invalid or expired');
      }
      if (challenge.expiresAt.getTime() <= Date.now()) {
        await repo.deleteEmailChallenge(challenge.id);
        throw new AppError(400, 'invalid_setup_token', 'This setup link is invalid or expired');
      }
      const user = await repo.getUserById(challenge.userId);
      if (!user || !user.isActive || user.email.toLowerCase() !== challenge.email.toLowerCase()) {
        throw new AppError(400, 'invalid_setup_token', 'This setup link is invalid or expired');
      }
      const existing = await repo.getUserByEmail(email);
      if (existing && existing.id !== user.id) throw conflict('email_in_use');

      const code = generateOtp();
      const delivery = await sendEmailLoginCode(config, email, code);
      await repo.deleteUserEmailChallenges(user.id);
      const { token: challengeToken } = await createChallenge({
        userId: user.id,
        email,
        purpose: 'login',
        code,
      });
      await repo.setUserEmail(user.id, email);
      await deleteUserSessionsAfterEmailChange(user.id);
      await audit(repo, req, {
        userId: user.id,
        action: 'staff_email_updated',
        entityType: 'user',
        entityId: user.id,
        details: { email: maskEmail(email) },
      });
      res.json({
        status: 'email_code_required',
        challengeToken,
        ...(delivery.devCode ? { devCode: delivery.devCode } : {}),
        expiresInSeconds: codeTtlSeconds,
      });
    },
  );

  async function deleteUserSessionsAfterEmailChange(userId: string): Promise<void> {
    await repo.deleteUserSessions(userId);
    await repo.deletePasswordResets(userId);
  }

  // ── resend a staff login code ────────────────────────────
  router.post(
    '/email/code/resend',
    rateLimit(repo, { bucket: 'email-code-ip', limit: 10, windowMs: 15 * MINUTE }),
    rateLimit(repo, {
      bucket: 'email-code-challenge',
      limit: 5,
      windowMs: 15 * MINUTE,
      key: (req) => {
        const token = tokenFromBody(req.body, 'challengeToken');
        return token ? challengeHashOf(token).slice(0, 64) : undefined;
      },
    }),
    async (req, res) => {
      const { challengeToken } = parseBody(emailCodeResendSchema, req.body);
      const challenge = await repo.getEmailChallenge(challengeHashOf(challengeToken));
      if (!challenge || challenge.purpose !== 'login') {
        throw new AppError(400, 'invalid_challenge', 'This sign-in attempt has expired');
      }
      if (challenge.expiresAt.getTime() <= Date.now()) {
        await repo.deleteEmailChallenge(challenge.id);
        throw new AppError(400, 'invalid_challenge', 'This sign-in attempt has expired');
      }
      const user = await repo.getUserById(challenge.userId);
      if (!user || !user.isActive) {
        throw new AppError(400, 'invalid_challenge', 'This sign-in attempt has expired');
      }
      const code = generateOtp();
      const delivery = await sendEmailLoginCode(config, user.email, code);
      await repo.refreshEmailChallenge(
        challenge.id,
        hashEmailOtp(config.sessionSecret, user.email, code),
        new Date(Date.now() + config.emailOtpTtlMs),
      );
      await audit(repo, req, {
        userId: user.id,
        action: 'email_code_resent',
        entityType: 'auth',
        entityId: user.id,
        details: { email: maskEmail(user.email) },
      });
      res.json({
        status: 'email_code_required',
        ...(delivery.devCode ? { devCode: delivery.devCode } : {}),
        expiresInSeconds: codeTtlSeconds,
      });
    },
  );

  // ── verify a staff login code and create the session ─────
  router.post(
    '/email/code/verify',
    rateLimit(repo, { bucket: 'email-verify-ip', limit: 15, windowMs: 10 * MINUTE }),
    rateLimit(repo, {
      bucket: 'email-verify-challenge',
      limit: 10,
      windowMs: 10 * MINUTE,
      key: (req) => {
        const token = tokenFromBody(req.body, 'challengeToken');
        return token ? challengeHashOf(token).slice(0, 64) : undefined;
      },
    }),
    async (req, res) => {
      const { challengeToken, code } = parseBody(emailCodeVerifySchema, req.body);
      const challenge = await repo.getEmailChallenge(challengeHashOf(challengeToken));
      if (!challenge || challenge.purpose !== 'login') {
        throw new AppError(400, 'invalid_challenge', 'This sign-in attempt has expired');
      }
      if (challenge.expiresAt.getTime() <= Date.now()) {
        await repo.deleteEmailChallenge(challenge.id);
        throw new AppError(400, 'invalid_challenge', 'This sign-in attempt has expired');
      }
      const user = await repo.getUserById(challenge.userId);
      if (!user || !user.isActive || user.email.toLowerCase() !== challenge.email.toLowerCase()) {
        throw new AppError(400, 'invalid_challenge', 'This sign-in attempt has expired');
      }
      if (challenge.attempts >= config.emailOtpMaxAttempts) {
        await repo.deleteEmailChallenge(challenge.id);
        throw new AppError(429, 'too_many_attempts', 'Too many incorrect codes');
      }
      const expected = hashEmailOtp(config.sessionSecret, challenge.email, code);
      if (!safeEqual(challenge.codeHash, expected)) {
        const attempts = await repo.bumpEmailChallengeAttempts(challenge.id);
        if (attempts >= config.emailOtpMaxAttempts) await repo.deleteEmailChallenge(challenge.id);
        throw unauthorized('invalid_code');
      }

      await repo.deleteEmailChallenge(challenge.id);
      await repo.markEmailVerified(user.id);
      await completeLogin(req, res, { ...user, emailVerified: true }, 'login_success');
    },
  );

  // ── logout ───────────────────────────────────────────────
  router.post('/logout', async (req, res) => {
    if (req.auth) {
      await repo.deleteSession(req.auth.tokenHash);
      await audit(repo, req, {
        userId: req.auth.session.userId,
        action: 'logout',
        entityType: 'auth',
        entityId: req.auth.session.userId,
      });
    }
    clearSessionCookie(res, config);
    res.status(204).end();
  });

  // ── current session ──────────────────────────────────────
  router.get('/me', (req, res) => {
    if (!req.auth) {
      res.json({ user: null });
      return;
    }
    const s = req.auth.session;
    res.json({
      user: {
        id: s.userId,
        email: s.email,
        fullName: s.fullName,
        role: s.role,
      },
    });
  });

  // ── change password (authenticated) ──────────────────────
  router.post(
    '/password',
    rateLimit(repo, { bucket: 'password-change', limit: 5, windowMs: 15 * MINUTE }),
    async (req, res) => {
      if (!req.auth) throw unauthorized();
      const { currentPassword, newPassword } = parseBody(passwordChangeSchema, req.body);
      const user = await repo.getUserById(req.auth.session.userId);
      if (!user || !user.isActive) throw unauthorized();
      if (!(await verifyPassword(user.passwordHash, currentPassword))) {
        throw unauthorized('invalid_credentials');
      }
      const newHash = await hashPassword(newPassword);
      await repo.setUserPassword(user.id, newHash);
      await repo.deletePasswordResets(user.id);
      await repo.deleteUserEmailChallenges(user.id);
      // Invalidate every existing session, then issue a fresh one.
      await repo.deleteUserSessions(user.id);

      const token = randomToken(32);
      const tokenHash = sha256(token);
      const absoluteExpiresAt = new Date(Date.now() + config.sessionAbsoluteMs);
      await repo.createSession({
        userId: user.id,
        tokenHash,
        ip: clientIp(req),
        userAgent: userAgentOf(req),
        expiresAt: new Date(Date.now() + config.sessionTtlMs),
        absoluteExpiresAt,
      });
      setSessionCookie(res, config, token, absoluteExpiresAt);
      await audit(repo, req, {
        userId: user.id,
        action: 'password_changed',
        entityType: 'user',
        entityId: user.id,
      });
      res.json({ user: serializeUser({ ...user }) });
    },
  );

  // ── request password reset ───────────────────────────────
  router.post(
    '/forgot-password',
    rateLimit(repo, { bucket: 'forgot-ip', limit: 10, windowMs: 60 * MINUTE }),
    rateLimit(repo, {
      bucket: 'forgot-account',
      limit: 3,
      windowMs: 60 * MINUTE,
      key: (req) => {
        const email = (req.body as { email?: unknown } | undefined)?.email;
        return typeof email === 'string' ? email.toLowerCase().slice(0, 254) : undefined;
      },
    }),
    async (req, res) => {
      const { email } = parseBody(passwordResetRequestSchema, req.body);
      const user = await repo.getUserByEmail(email);
      if (user && user.isActive) {
        await repo.deletePasswordResets(user.id);
        const token = randomToken(32);
        await repo.createPasswordReset({
          userId: user.id,
          tokenHash: sha256(token),
          expiresAt: new Date(Date.now() + config.passwordResetTtlMs),
        });
        const resetUrl = `${config.publicAppUrl}/admin?reset=${encodeURIComponent(token)}`;
        await sendPasswordResetEmail(config, user.email, resetUrl);
        await audit(repo, req, {
          userId: user.id,
          action: 'password_reset_requested',
          entityType: 'auth',
          entityId: user.id,
        });
      }
      // Always identical response: no account enumeration.
      res.status(202).json({ status: 'accepted' });
    },
  );

  // ── consume password reset ───────────────────────────────
  router.post(
    '/reset-password',
    rateLimit(repo, { bucket: 'reset-ip', limit: 10, windowMs: 30 * MINUTE }),
    async (req, res) => {
      const { token, newPassword } = parseBody(passwordResetConfirmSchema, req.body);
      const consumed = await repo.consumePasswordReset(sha256(token));
      if (!consumed) throw new AppError(400, 'invalid_token', 'This reset link is invalid or expired');
      const newHash = await hashPassword(newPassword);
      await repo.setUserPassword(consumed.userId, newHash);
      await repo.deletePasswordResets(consumed.userId);
      await repo.deleteUserEmailChallenges(consumed.userId);
      await repo.deleteUserSessions(consumed.userId);
      await audit(repo, req, {
        userId: consumed.userId,
        action: 'password_reset_completed',
        entityType: 'user',
        entityId: consumed.userId,
      });
      res.json({ status: 'password_updated' });
    },
  );

  return router;
}
