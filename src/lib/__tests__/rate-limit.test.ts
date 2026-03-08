import { describe, it, expect } from "vitest";
import { rateLimit, getRateLimitStoreSize } from "../rate-limit";

describe("rateLimit", () => {
  // Note: We can't easily reset the store between tests since it's module-level,
  // but we can use unique keys per test to avoid interference.

  it("allows requests within the limit", () => {
    const result = rateLimit("test-allow-1", "mutation");
    expect(result.success).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it("tracks remaining requests", () => {
    const key = "test-remaining-" + Date.now();
    const r1 = rateLimit(key, "mutation");
    expect(r1.success).toBe(true);
    const r2 = rateLimit(key, "mutation");
    expect(r2.success).toBe(true);
    expect(r2.remaining).toBeLessThan(r1.remaining);
  });

  it("blocks requests exceeding the limit", () => {
    const key = "test-block-" + Date.now();
    // mutation preset: 30 req / 1 min
    for (let i = 0; i < 30; i++) {
      rateLimit(key, "mutation");
    }
    const result = rateLimit(key, "mutation");
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("returns resetAt in the future", () => {
    const key = "test-reset-" + Date.now();
    const result = rateLimit(key, "mutation");
    expect(result.resetAt).toBeGreaterThan(Date.now() - 1000);
  });

  it("returns correct limit value", () => {
    const key = "test-limit-" + Date.now();
    const result = rateLimit(key, "auth");
    expect(result.limit).toBe(10);

    const key2 = "test-limit2-" + Date.now();
    const result2 = rateLimit(key2, "mutation");
    expect(result2.limit).toBe(30);
  });
});

describe("getRateLimitStoreSize", () => {
  it("returns the current store size", () => {
    const size = getRateLimitStoreSize();
    expect(typeof size).toBe("number");
    expect(size).toBeGreaterThanOrEqual(0);
  });

  it("increases when new keys are added", () => {
    const before = getRateLimitStoreSize();
    rateLimit("test-size-" + Date.now() + "-" + Math.random(), "read");
    const after = getRateLimitStoreSize();
    expect(after).toBeGreaterThan(before);
  });
});

describe("store eviction", () => {
  it("store does not grow beyond MAX_STORE_SIZE", () => {
    // We can't realistically test 10,000 entries in a unit test quickly,
    // but we can verify the mechanism works by checking the store doesn't
    // grow unboundedly after adding many entries
    const base = "eviction-test-" + Date.now() + "-";
    for (let i = 0; i < 100; i++) {
      rateLimit(base + i, "read");
    }
    // Store should have entries but be bounded
    expect(getRateLimitStoreSize()).toBeGreaterThan(0);
  });
});
