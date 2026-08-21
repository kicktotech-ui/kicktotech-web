import {
  pbkdf2Sync, randomBytes, createHmac, timingSafeEqual, randomUUID,
} from "node:crypto";
import { config, getSessionSecret } from "./config";

/* Cryptographic primitives for auth. Node.js runtime only. */

const KEYLEN = 32;
const DIGEST = "sha512";

/** Hash a password with a fresh random salt (PBKDF2-SHA512). */
export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, config.password.pbkdf2Iterations, KEYLEN, DIGEST).toString("hex");
  return { salt, hash };
}

/** Constant-time verify. */
export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const hash = pbkdf2Sync(password, salt, config.password.pbkdf2Iterations, KEYLEN, DIGEST);
  const expected = Buffer.from(expectedHash, "hex");
  if (hash.length !== expected.length) return false;
  return timingSafeEqual(hash, expected);
}

/** URL-safe random token. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function uuid(): string {
  return randomUUID();
}

/** Sign a value with the session secret → `${value}.${hmac}`. */
export function sign(value: string): string {
  const mac = createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
  return `${value}.${mac}`;
}

/** Verify a signed value; returns the value or null if tampered. */
export function unsign(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  const mac = signed.slice(idx + 1);
  const expected = createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? value : null;
}

/**
 * Generate a secure, non-sequential, human-readable certificate ID:
 * `KTT-<YEAR>-<8 base32 chars>`. ~40 bits of entropy — not guessable/enumerable.
 */
const B32 = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous chars
export function certificateId(year = new Date().getFullYear()): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += B32[bytes[i] % B32.length];
  return `KTT-${year}-${out}`;
}

/** Human-readable, non-sequential application id: `APP-<YEAR>-<6 base32>`. */
export function applicationId(year = new Date().getFullYear()): string {
  const bytes = randomBytes(6);
  let out = "";
  for (let i = 0; i < 6; i++) out += B32[bytes[i] % B32.length];
  return `APP-${year}-${out}`;
}
