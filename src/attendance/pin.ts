import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/** An Employee's PIN is exactly 4 digits. */
export function isValidPin(pin: string): boolean {
  return /^[0-9]{4}$/.test(pin);
}

// scrypt: a slow, memory-hard password hash built into Node. These costs
// (32 MiB, a few tens of milliseconds) keep a Kiosk tap on the Pi quick.
const N = 2 ** 15;
const r = 8;
const p = 1;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
// scrypt needs 128 * N * r bytes; Node's default limit (32 MiB) is just too small.
const MAX_MEMORY = 64 * 1024 * 1024;

/** Hashes a PIN for storage, as `scrypt$N$r$p$salt$key` (salt and key in base64). */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(pin, salt, KEY_LENGTH, { N, r, p, maxmem: MAX_MEMORY });
  return ["scrypt", N, r, p, salt.toString("base64"), key.toString("base64")].join("$");
}

/** Whether `pin` matches a hash made by `hashPin`, in constant time. */
export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [algorithm, n, rr, pp, salt, key] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !key) {
    return false;
  }
  const expected = Buffer.from(key, "base64");
  const actual = await derive(pin, Buffer.from(salt, "base64"), expected.length, {
    N: Number(n),
    r: Number(rr),
    p: Number(pp),
    maxmem: MAX_MEMORY,
  });
  return timingSafeEqual(actual, expected);
}

function derive(
  pin: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(pin, salt, keyLength, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}
