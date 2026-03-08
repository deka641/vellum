import { describe, it, expect, vi } from "vitest";

// Mock logger to avoid side effects
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { apiError } from "@/lib/api-helpers";
import { parseBody } from "@/lib/validations";
import * as z from "zod";

describe("apiError", () => {
  it("returns a 500 response with errorId", async () => {
    const response = apiError("POST /api/test", new Error("something failed"));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Internal server error");
    expect(body.errorId).toBeDefined();
    expect(typeof body.errorId).toBe("string");
    expect(body.errorId.length).toBe(8); // 4 bytes = 8 hex chars
  });

  it("generates unique errorIds per call", async () => {
    const r1 = apiError("POST /api/test", new Error("err1"));
    const r2 = apiError("POST /api/test", new Error("err2"));
    const b1 = await r1.json();
    const b2 = await r2.json();
    expect(b1.errorId).not.toBe(b2.errorId);
  });

  it("handles non-Error objects", async () => {
    const response = apiError("POST /api/test", "string error");
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Internal server error");
    expect(body.errorId).toBeDefined();
  });

  it("handles null/undefined errors", async () => {
    const response = apiError("POST /api/test", null);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Internal server error");
  });
});

describe("parseBody", () => {
  const testSchema = z.object({
    name: z.string().min(1).max(100),
    age: z.number().int().positive().optional(),
  });

  it("parses valid data", () => {
    const result = parseBody(testSchema, { name: "Alice", age: 30 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Alice");
      expect(result.data.age).toBe(30);
    }
  });

  it("rejects empty name", () => {
    const result = parseBody(testSchema, { name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("name");
    }
  });

  it("rejects missing required fields", () => {
    const result = parseBody(testSchema, {});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it("rejects wrong types", () => {
    const result = parseBody(testSchema, { name: 123 });
    expect(result.success).toBe(false);
  });

  it("allows optional fields to be omitted", () => {
    const result = parseBody(testSchema, { name: "Bob" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.age).toBeUndefined();
    }
  });

  it("rejects negative age", () => {
    const result = parseBody(testSchema, { name: "Alice", age: -5 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer age", () => {
    const result = parseBody(testSchema, { name: "Alice", age: 3.5 });
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding max length", () => {
    const result = parseBody(testSchema, { name: "a".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("provides path info in error messages", () => {
    const nestedSchema = z.object({
      user: z.object({ email: z.string().email() }),
    });
    const result = parseBody(nestedSchema, { user: { email: "not-email" } });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("user.email");
    }
  });

  it("handles null input", () => {
    const result = parseBody(testSchema, null);
    expect(result.success).toBe(false);
  });

  it("handles undefined input", () => {
    const result = parseBody(testSchema, undefined);
    expect(result.success).toBe(false);
  });

  it("handles array input when object expected", () => {
    const result = parseBody(testSchema, [{ name: "test" }]);
    expect(result.success).toBe(false);
  });
});
