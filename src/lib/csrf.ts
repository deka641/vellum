import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "@/lib/logger";

const TOKEN_MAX_AGE_SECONDS = 3600; // 1 hour

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    logger.error("csrf", "AUTH_SECRET environment variable is not set");
    throw new Error("AUTH_SECRET is required for CSRF token generation");
  }
  return secret;
}

function computeHmac(pageId: string, blockId: string, timestamp: number, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${pageId}:${blockId}:${timestamp}`)
    .digest("hex");
}

/**
 * Generates a time-limited HMAC-based CSRF token for a specific form.
 * Token format: `${timestamp}.${hmac}`
 */
export function generateFormToken(pageId: string, blockId: string): string {
  const secret = getSecret();
  const timestamp = Math.floor(Date.now() / 1000);
  const hmac = computeHmac(pageId, blockId, timestamp, secret);
  return `${timestamp}.${hmac}`;
}

/**
 * Validates a CSRF token against the expected pageId and blockId.
 * Rejects tokens older than 1 hour and uses timing-safe comparison.
 */
export function validateFormToken(token: string, pageId: string, blockId: string): boolean {
  if (!token || typeof token !== "string") return false;

  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return false;

  const timestampStr = token.substring(0, dotIndex);
  const providedHmac = token.substring(dotIndex + 1);

  if (!timestampStr || !providedHmac) return false;

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  // Reject tokens older than 1 hour
  const now = Math.floor(Date.now() / 1000);
  if (now - timestamp > TOKEN_MAX_AGE_SECONDS) return false;

  // Reject tokens with future timestamps (clock skew tolerance: 60 seconds)
  if (timestamp - now > 60) return false;

  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return false;
  }

  const expectedHmac = computeHmac(pageId, blockId, timestamp, secret);

  // Timing-safe comparison — both buffers must be the same length
  const providedBuf = Buffer.from(providedHmac);
  const expectedBuf = Buffer.from(expectedHmac);

  if (providedBuf.length !== expectedBuf.length) return false;

  return timingSafeEqual(providedBuf, expectedBuf);
}
