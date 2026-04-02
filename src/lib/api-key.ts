import crypto from "crypto";

const KEY_PREFIX = "vk_";
const KEY_LENGTH = 32;

/**
 * Generate a new API key with its SHA-256 hash and display prefix.
 * The full key is returned once and must never be stored in plaintext.
 */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const raw = crypto.randomBytes(KEY_LENGTH).toString("hex");
  const key = `${KEY_PREFIX}${raw}`;
  const hash = hashApiKey(key);
  const prefix = key.slice(0, KEY_PREFIX.length + 8);
  return { key, hash, prefix };
}

/**
 * Hash an API key using SHA-256 for storage and lookup.
 */
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}
