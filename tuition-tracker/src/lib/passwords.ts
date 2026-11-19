import crypto from 'crypto';

const N = 16384;
const KEYLEN = 64;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

function scrypt(password: string, salt: Buffer, keylen: number, options: crypto.ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, { N, r: 8, p: 1 });
  return `scrypt$${N}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: unknown): Promise<boolean> {
  try {
    const [scheme, n, saltB64, keyB64] = String(stored || '').split('$');
    if (scheme !== 'scrypt') return false;
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(keyB64, 'base64');
    const actual = await scrypt(password, salt, expected.length, { N: Number(n), r: 8, p: 1 });
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function checkPasswordRules(password: unknown, nic?: unknown): string | null {
  if (typeof password !== 'string') return 'Enter a password.';
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return 'That password is too long.';
  if (nic && password.trim().toUpperCase() === String(nic).trim().toUpperCase()) {
    return "Your password can't be the same as your NIC.";
  }
  return null;
}
