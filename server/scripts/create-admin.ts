import 'dotenv/config';
import { buildConfig } from '../config';
import { runAs } from '../db/context';
import { PostgresRepo } from '../db/postgres';
import { hashPassword } from '../lib/passwords';
import { emailSchema, fullNameSchema, passwordSchema } from '../lib/validation';

/**
 * Creates an administrator without ever shipping a default password.
 *
 *   npm run admin:create -- --email you@example.com --password "long passphrase" --name "Your Name"
 *
 * The password may also be supplied via ADMIN_PASSWORD to keep it out of shell
 * history. The password is hashed with Argon2id before it reaches the database.
 */
function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  const inline = process.argv.find((a) => a.startsWith(`--${name}=`));
  return inline ? inline.slice(name.length + 3) : undefined;
}

async function main(): Promise<void> {
  const config = buildConfig(process.env);
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required (no in-memory admin accounts in production)');
  }

  const email = emailSchema.parse(arg('email') ?? '');
  const password = passwordSchema.parse(arg('password') ?? process.env.ADMIN_PASSWORD ?? '');
  const fullName = fullNameSchema.parse(arg('name') ?? 'Administrator');
  const phone = arg('phone') ?? null;

  const repo = new PostgresRepo({
    connectionString: config.databaseUrl,
    ssl: config.dbSsl,
    max: 1,
  });

  try {
    await repo.init();
    const existing = await runAs({ mode: 'system' }, () => repo.getUserByEmail(email));
    if (existing) {
      throw new Error(`A user with ${email} already exists — refusing to overwrite`);
    }
    const passwordHash = await hashPassword(password);
    const user = await runAs({ mode: 'system' }, () =>
      repo.createUser({ email, passwordHash, fullName, phone, role: 'admin' }),
    );
     
    console.log(`[admin] created ${user.email} (${user.id}) with role ${user.role}`);
  } finally {
    await repo.close().catch(() => undefined);
  }
}

void main().catch((err) => {
   
  console.error('[admin] failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
