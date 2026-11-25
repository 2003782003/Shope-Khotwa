import type { AppConfig } from '../config';
import { MemoryRepo } from './memory';
import { PostgresRepo } from './postgres';
import type { Repo } from './types';

export async function createRepo(config: AppConfig): Promise<Repo> {
  if (config.databaseUrl) {
    const repo = new PostgresRepo({
      connectionString: config.databaseUrl,
      ssl: config.dbSsl,
      max: config.dbPoolMax,
    });
    await repo.init();
    return repo;
  }
  if (config.isProd && !config.allowMemoryDb) {
    throw new Error('No DATABASE_URL configured. Refusing to start without a database in production.');
  }
  return new MemoryRepo({ isProd: config.isProd });
}
