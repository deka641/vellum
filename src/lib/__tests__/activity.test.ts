import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db module
vi.mock("@/lib/db", () => ({
  db: {
    activityLog: {
      create: vi.fn(),
    },
    $executeRaw: vi.fn(),
  },
}));

// Mock logger module
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { logActivity } from "@/lib/activity";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

beforeEach(() => {
  vi.clearAllMocks();
  // Default: create resolves, no cleanup triggered
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  (db.activityLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
  (db.$executeRaw as ReturnType<typeof vi.fn>).mockResolvedValue(0);
});

// ---------------------------------------------------------------------------
// logActivity basics
// ---------------------------------------------------------------------------
describe("logActivity", () => {
  it("calls db.activityLog.create with correct data", async () => {
    logActivity({
      userId: "user-1",
      action: "page.create",
      siteId: "site-1",
      pageId: "page-1",
      details: { title: "Hello" },
    });

    // Let the promise chain settle
    await vi.waitFor(() => {
      expect(db.activityLog.create).toHaveBeenCalledTimes(1);
    });

    expect(db.activityLog.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        action: "page.create",
        siteId: "site-1",
        pageId: "page-1",
        details: { title: "Hello" },
      },
    });
  });

  it("passes userId and action from entry", async () => {
    logActivity({ userId: "u-abc", action: "site.delete" });

    await vi.waitFor(() => {
      expect(db.activityLog.create).toHaveBeenCalledTimes(1);
    });

    const call = (db.activityLog.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(call.data.userId).toBe("u-abc");
    expect(call.data.action).toBe("site.delete");
  });

  it("passes siteId as null when not provided", async () => {
    logActivity({ userId: "u-1", action: "test" });

    await vi.waitFor(() => {
      expect(db.activityLog.create).toHaveBeenCalledTimes(1);
    });

    const call = (db.activityLog.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(call.data.siteId).toBeNull();
  });

  it("passes pageId as null when not provided", async () => {
    logActivity({ userId: "u-1", action: "test" });

    await vi.waitFor(() => {
      expect(db.activityLog.create).toHaveBeenCalledTimes(1);
    });

    const call = (db.activityLog.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(call.data.pageId).toBeNull();
  });

  it("passes siteId when provided", async () => {
    logActivity({ userId: "u-1", action: "test", siteId: "s-42" });

    await vi.waitFor(() => {
      expect(db.activityLog.create).toHaveBeenCalledTimes(1);
    });

    const call = (db.activityLog.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(call.data.siteId).toBe("s-42");
  });

  it("passes details as empty object when not provided", async () => {
    logActivity({ userId: "u-1", action: "test" });

    await vi.waitFor(() => {
      expect(db.activityLog.create).toHaveBeenCalledTimes(1);
    });

    const call = (db.activityLog.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(call.data.details).toEqual({});
  });

  it("does not throw when db.create rejects (fire-and-forget)", async () => {
    (db.activityLog.create as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB down")
    );

    // Should not throw
    expect(() => {
      logActivity({ userId: "u-1", action: "test" });
    }).not.toThrow();

    // Let the rejection settle
    await vi.waitFor(() => {
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  it("logs warning when create fails", async () => {
    const dbError = new Error("Connection refused");
    (db.activityLog.create as ReturnType<typeof vi.fn>).mockRejectedValue(
      dbError
    );

    logActivity({ userId: "u-1", action: "test" });

    await vi.waitFor(() => {
      expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    expect(logger.warn).toHaveBeenCalledWith(
      "logActivity",
      "Failed to log activity",
      dbError
    );
  });
});

// ---------------------------------------------------------------------------
// Cleanup behavior
// ---------------------------------------------------------------------------
describe("logActivity cleanup", () => {
  it("runs cleanup query when Math.random returns < 0.01", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    logActivity({ userId: "u-1", action: "test" });

    await vi.waitFor(() => {
      expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });

  it("does not run cleanup query when Math.random returns >= 0.01", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    logActivity({ userId: "u-1", action: "test" });

    // Let the .then() settle
    await vi.waitFor(() => {
      expect(db.activityLog.create).toHaveBeenCalledTimes(1);
    });

    // Give extra time for any async chain to complete
    await new Promise((r) => setTimeout(r, 50));

    expect(db.$executeRaw).not.toHaveBeenCalled();
  });
});
