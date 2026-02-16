import { NextResponse } from "next/server";

// --- Sliding window rate limiter ---

interface SlidingWindow {
  current: number;
  previous: number;
  windowStart: number;
}

const store = new Map<string, SlidingWindow>();

const PRESETS = {
  auth: { limit: 10, windowMs: 15 * 60 * 1000 },      // 10 req / 15 min
  mutation: { limit: 30, windowMs: 60 * 1000 },         // 30 req / 1 min
  autosave: { limit: 60, windowMs: 60 * 1000 },         // 60 req / 1 min
  upload: { limit: 20, windowMs: 60 * 1000 },           // 20 req / 1 min
} as const;

export type RateLimitPreset = keyof typeof PRESETS;

interface RateLimitSuccess {
  success: true;
  limit: number;
  remaining: number;
  resetAt: number;
}

interface RateLimitFailure {
  success: false;
  limit: number;
  remaining: 0;
  resetAt: number;
}

export type RateLimitResult = RateLimitSuccess | RateLimitFailure;

export function rateLimit(key: string, preset: RateLimitPreset): RateLimitResult {
  const { limit, windowMs } = PRESETS[preset];
  const now = Date.now();

  let entry = store.get(key);
  if (!entry) {
    entry = { current: 0, previous: 0, windowStart: now };
    store.set(key, entry);
  }

  // Rotate windows if current window has elapsed
  if (now >= entry.windowStart + windowMs) {
    // If more than 2 windows have passed, both are empty
    if (now >= entry.windowStart + 2 * windowMs) {
      entry.previous = 0;
    } else {
      entry.previous = entry.current;
    }
    entry.current = 0;
    entry.windowStart = entry.windowStart + windowMs * Math.floor((now - entry.windowStart) / windowMs);
  }

  // Sliding window estimate
  const elapsed = now - entry.windowStart;
  const weight = 1 - elapsed / windowMs;
  const estimated = entry.previous * weight + entry.current;

  const resetAt = entry.windowStart + windowMs;

  if (estimated >= limit) {
    return { success: false, limit, remaining: 0, resetAt };
  }

  entry.current++;
  const remaining = Math.max(0, Math.floor(limit - (entry.previous * weight + entry.current)));

  return { success: true, limit, remaining, resetAt };
}

export function getClientIp(req: Request): string {
  const headers = req.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "unknown";
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, retryAfter)),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.resetAt),
      },
    }
  );
}

// Cleanup expired entries every 5 minutes
if (typeof globalThis !== "undefined") {
  const CLEANUP_INTERVAL = 5 * 60 * 1000;
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      // Both windows have fully expired
      const maxWindowMs = Math.max(...Object.values(PRESETS).map((p) => p.windowMs));
      if (now > entry.windowStart + 2 * maxWindowMs) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL).unref?.();
}
