import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';

/**
 * Applies database/schema.sql to DATABASE_URL.
 * Run with: npm run db:migrate
 */
async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run migrations');
  }
  const isProd = process.env.NODE_ENV === 'production';
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.DB_SSL === 'true' || isProd ? { rejectUnauthorized: true } : false,
    max: 1,
  });

  const schemaPath = path.resolve(process.cwd(), 'database', 'schema.sql');
  const sql = await readFile(schemaPath, 'utf8');
  if (!sql.trim()) throw new Error(`Schema file is empty: ${schemaPath}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
     
    console.log(`[db] schema applied from ${schemaPath}`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

void main().catch((err) => {
   
  console.error('[db] migration failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
