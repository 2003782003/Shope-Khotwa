import type { AppConfig } from '../config';
import type { Repo, SessionWithUser } from '../db/types';

declare global {
  namespace Express {
    interface Request {
      /** Populated by attachServices (always) and authenticate (when logged in). */
      repo: Repo;
      config: AppConfig;
      auth?: {
        session: SessionWithUser;
        tokenHash: string;
      };
    }
  }
}

export {};
