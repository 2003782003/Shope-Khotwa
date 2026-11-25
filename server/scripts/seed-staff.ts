import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildConfig } from '../config';
import { runAs } from '../db/context';
import { PostgresRepo } from '../db/postgres';
import { hashPassword } from '../lib/passwords';

/**
 * Seeds the two KHOTWA staff accounts into PostgreSQL.
 *
 *   npm run seed:staff
 *
 * The script reads (or securely generates on first run) the credentials file
 * `secrets/staff-credentials.json`, which is git-ignored. Placeholder
 * @khotwa.internal mailboxes are intentional: the first login sets a real
 * mailbox and verifies it with an emailed code before any admin session exists.
 */

interface StaffCredential {
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'manager';
}

type CredentialsFile = Record<'admin' | 'manager', StaffCredential>;

const CREDENTIALS_PATH = path.resolve(process.cwd(), 'secrets', 'staff-credentials.json');

function generatePassword(): string {
  const raw = randomBytes(18).toString('base64url');
  return `${raw.slice(0, 12)}-${raw.slice(12, 24)}!Aa9`;
}

function defaultCredentials(): CredentialsFile {
  return {
    admin: {
      email: 'admin@khotwa.internal',
      password: generatePassword(),
      fullName: 'مدير النظام',
      role: 'admin',
    },
    manager: {
      email: 'manager@khotwa.internal',
      password: generatePassword(),
      fullName: 'مدير المبيعات',
      role: 'manager',
    },
  };
}

async function loadOrCreateCredentials(): Promise<CredentialsFile> {
  try {
    const parsed = JSON.parse(await readFile(CREDENTIALS_PATH, 'utf8')) as CredentialsFile;
    if (!parsed.admin?.email || !parsed.admin?.password) throw new Error('missing admin credentials');
    if (!parsed.manager?.email || !parsed.manager?.password) throw new Error('missing manager credentials');
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const created = defaultCredentials();
    await mkdir(path.dirname(CREDENTIALS_PATH), { recursive: true, mode: 0o700 });
    await writeFile(CREDENTIALS_PATH, `${JSON.stringify(created, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
      flag: 'wx',
    });
    console.log(`[seed:staff] Generated credentials at ${CREDENTIALS_PATH}`);
    return created;
  }
}

async function main(): Promise<void> {
  const config = buildConfig(process.env);
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required. Run `npm run db:migrate` first, then `npm run seed:staff`.');
  }

  const credentials = await loadOrCreateCredentials();
  const repo = new PostgresRepo({
    connectionString: config.databaseUrl,
    ssl: config.dbSsl,
    max: config.dbPoolMax,
  });

  try {
    await repo.init();
    for (const key of ['admin', 'manager'] as const) {
      const staff = credentials[key];
      const existing = await runAs({ mode: 'system' }, () => repo.getUserByEmail(staff.email));
      if (existing) {
        console.log(`[seed:staff] ${key} already exists (${staff.email}) — skipped.`);
        continue;
      }
      const passwordHash = await hashPassword(staff.password);
      await runAs({ mode: 'system' }, () =>
        repo.createUser({
          email: staff.email,
          passwordHash,
          fullName: staff.fullName,
          role: staff.role,
          emailVerified: false,
        }),
      );
      console.log(`[seed:staff] Created ${key} (${staff.email}).`);
    }
    console.log(`[seed:staff] Passwords are stored in ${CREDENTIALS_PATH}; never commit that file.`);
  } finally {
    await repo.close();
  }
}

main().catch((error: unknown) => {
  console.error('[seed:staff] Failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
