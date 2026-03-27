import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseBody, webhookCreateSchema, webhookUpdateSchema } from "@/lib/validations";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
describe("webhookCreateSchema", () => {
  it("accepts valid input with HTTPS URL and events", () => {
    const result = parseBody(webhookCreateSchema, {
      url: "https://example.com/webhook",
      events: ["page.published", "form.submitted"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.url).toBe("https://example.com/webhook");
      expect(result.data.events).toEqual(["page.published", "form.submitted"]);
    }
  });

  it("rejects HTTP URLs (requires HTTPS)", () => {
    const result = parseBody(webhookCreateSchema, {
      url: "http://example.com/webhook",
      events: ["page.published"],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("HTTPS");
    }
  });

  it("rejects empty events array", () => {
    const result = parseBody(webhookCreateSchema, {
      url: "https://example.com/webhook",
      events: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid event names", () => {
    const result = parseBody(webhookCreateSchema, {
      url: "https://example.com/webhook",
      events: ["invalid.event"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid URLs", () => {
    const result = parseBody(webhookCreateSchema, {
      url: "not-a-url",
      events: ["page.published"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing URL", () => {
    const result = parseBody(webhookCreateSchema, {
      events: ["page.published"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts all four valid event types", () => {
    const result = parseBody(webhookCreateSchema, {
      url: "https://example.com/webhook",
      events: [
        "page.published",
        "page.unpublished",
        "form.submitted",
        "site.updated",
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.events).toHaveLength(4);
    }
  });

  it("rejects URLs exceeding max length", () => {
    const longUrl = "https://example.com/" + "a".repeat(2000);
    const result = parseBody(webhookCreateSchema, {
      url: longUrl,
      events: ["page.published"],
    });
    expect(result.success).toBe(false);
  });
});

describe("webhookUpdateSchema", () => {
  it("accepts partial update with only active", () => {
    const result = parseBody(webhookUpdateSchema, {
      active: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.active).toBe(false);
    }
  });

  it("accepts partial update with only URL", () => {
    const result = parseBody(webhookUpdateSchema, {
      url: "https://new-endpoint.com/hook",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.url).toBe("https://new-endpoint.com/hook");
    }
  });

  it("accepts partial update with only events", () => {
    const result = parseBody(webhookUpdateSchema, {
      events: ["site.updated"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.events).toEqual(["site.updated"]);
    }
  });

  it("accepts empty object (all fields optional)", () => {
    const result = parseBody(webhookUpdateSchema, {});
    expect(result.success).toBe(true);
  });

  it("rejects HTTP URL in update", () => {
    const result = parseBody(webhookUpdateSchema, {
      url: "http://insecure.com/hook",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("HTTPS");
    }
  });

  it("rejects invalid event in update", () => {
    const result = parseBody(webhookUpdateSchema, {
      events: ["page.published", "bogus"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean active value", () => {
    const result = parseBody(webhookUpdateSchema, {
      active: "yes",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// fireWebhooks — unit tests with mocked db and fetch
// ---------------------------------------------------------------------------
describe("fireWebhooks", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("does nothing when no active webhooks exist", async () => {
    vi.mock("@/lib/db", () => ({
      db: {
        webhook: {
          findMany: vi.fn().mockResolvedValue([]),
          update: vi.fn(),
        },
      },
    }));
    vi.mock("@/lib/logger", () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));

    const { fireWebhooks } = await import("@/lib/webhook");
    await fireWebhooks("site-1", "page.published", { pageId: "p1" });
    // Should complete without errors
  });

  it("does not throw on db query error", async () => {
    vi.mock("@/lib/db", () => ({
      db: {
        webhook: {
          findMany: vi.fn().mockRejectedValue(new Error("DB down")),
          update: vi.fn(),
        },
      },
    }));
    vi.mock("@/lib/logger", () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));

    const { fireWebhooks } = await import("@/lib/webhook");
    // Should not throw, just log the error
    await expect(
      fireWebhooks("site-1", "page.published", { pageId: "p1" })
    ).resolves.toBeUndefined();
  });
});
