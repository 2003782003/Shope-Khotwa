import argon2 from 'argon2';

/**
 * Argon2id password hashing (OWASP baseline parameters).
 * Hashing happens on the server only. The client never sees or computes hashes.
 */
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

let dummyHashPromise: Promise<string> | null = null;

/**
 * Constant-ish time login: when the account does not exist we still perform an
 * Argon2 verification so response time does not reveal valid emails.
 */
export async function burnPasswordTime(password: string): Promise<void> {
  if (!dummyHashPromise) dummyHashPromise = hashPassword('invalid-password-placeholder');
  const hash = await dummyHashPromise;
  await verifyPassword(hash, password);
}
