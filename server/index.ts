import { getConfig } from './config';
import { createApp } from './app';
import { createRepo } from './db';
import { runAs } from './db/context';

async function main(): Promise<void> {
  const config = getConfig();
  const repo = await createRepo(config);
  const app = createApp({ repo, config });

  const server = app.listen(config.port, () => {
     
    console.log(
      `[server] KHOTWA API listening on port ${config.port} (${config.nodeEnv}, db=${repo.kind})`,
    );
  });

  // Periodic cleanup: expired sessions and (in Postgres) OTP rows.
  const timer = setInterval(() => {
    runAs({ mode: 'system' }, () => repo.purgeExpiredSessions()).catch(() => undefined);
  }, 15 * 60_000);
  timer.unref();

  const shutdown = async (signal: string): Promise<void> => {
     
    console.log(`[server] ${signal} received, shutting down`);
    clearInterval(timer);
    server.close(async () => {
      await repo.close().catch(() => undefined);
      process.exit(0);
    });
    // Hard stop if connections do not drain.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
     
    console.error('[server] unhandled rejection', reason);
  });
}

void main().catch((err) => {
   
  console.error('[server] failed to start:', err instanceof Error ? err.message : err);
  process.exit(1);
});
