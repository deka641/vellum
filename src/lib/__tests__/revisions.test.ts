import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock db
vi.mock("@/lib/db", () => ({
  db: {
    pageRevision: {
      count: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $executeRaw: vi.fn(),
  },
}));

describe("prunePageRevisions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function importFresh() {
    vi.resetModules();
    vi.doMock("@/lib/logger", () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));
    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
    }));
    vi.doMock("@/lib/db", () => ({
      db: {
        pageRevision: {
          count: vi.fn(),
          findMany: vi.fn(),
          deleteMany: vi.fn(),
        },
        $executeRaw: vi.fn(),
      },
    }));
    return import("@/lib/revisions");
  }

  it("does not delete when count is at or below maxRevisions", async () => {
    const { prunePageRevisions } = await importFresh();
    const tx = {
      pageRevision: {
        count: vi.fn().mockResolvedValue(20),
        findMany: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock
    await prunePageRevisions(tx as any, "page-1", 20);
    expect(tx.pageRevision.findMany).not.toHaveBeenCalled();
    expect(tx.pageRevision.deleteMany).not.toHaveBeenCalled();
  });

  it("does not delete when count is below maxRevisions", async () => {
    const { prunePageRevisions } = await importFresh();
    const tx = {
      pageRevision: {
        count: vi.fn().mockResolvedValue(5),
        findMany: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock
    await prunePageRevisions(tx as any, "page-1", 20);
    expect(tx.pageRevision.findMany).not.toHaveBeenCalled();
  });

  it("deletes oldest revisions when count exceeds maxRevisions", async () => {
    const { prunePageRevisions } = await importFresh();
    const tx = {
      pageRevision: {
        count: vi.fn().mockResolvedValue(25),
        findMany: vi.fn().mockResolvedValue([
          { id: "rev-1" },
          { id: "rev-2" },
          { id: "rev-3" },
          { id: "rev-4" },
          { id: "rev-5" },
        ]),
        deleteMany: vi.fn(),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock
    await prunePageRevisions(tx as any, "page-1", 20);

    expect(tx.pageRevision.findMany).toHaveBeenCalledWith({
      where: { pageId: "page-1" },
      orderBy: { createdAt: "asc" },
      take: 5,
      select: { id: true },
    });
    expect(tx.pageRevision.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["rev-1", "rev-2", "rev-3", "rev-4", "rev-5"] } },
    });
  });

  it("uses default maxRevisions of 20", async () => {
    const { prunePageRevisions } = await importFresh();
    const tx = {
      pageRevision: {
        count: vi.fn().mockResolvedValue(22),
        findMany: vi.fn().mockResolvedValue([{ id: "rev-1" }, { id: "rev-2" }]),
        deleteMany: vi.fn(),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock
    await prunePageRevisions(tx as any, "page-1");
    expect(tx.pageRevision.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 2 })
    );
  });

  it("does not call deleteMany when findMany returns empty", async () => {
    const { prunePageRevisions } = await importFresh();
    const tx = {
      pageRevision: {
        count: vi.fn().mockResolvedValue(21),
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn(),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock
    await prunePageRevisions(tx as any, "page-1", 20);
    expect(tx.pageRevision.deleteMany).not.toHaveBeenCalled();
  });
});

describe("prunePageRevisionsBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function importFresh() {
    vi.resetModules();
    vi.doMock("@/lib/logger", () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));
    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
    }));
    vi.doMock("@/lib/db", () => ({
      db: {
        pageRevision: {
          count: vi.fn(),
          findMany: vi.fn(),
          deleteMany: vi.fn(),
        },
        $executeRaw: vi.fn(),
      },
    }));
    return import("@/lib/revisions");
  }

  it("is a no-op when pageIds array is empty", async () => {
    const { prunePageRevisionsBatch } = await importFresh();
    const tx = { $executeRaw: vi.fn() };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock
    await prunePageRevisionsBatch(tx as any, []);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  it("calls $executeRaw with page IDs", async () => {
    const { prunePageRevisionsBatch } = await importFresh();
    const tx = { $executeRaw: vi.fn() };

    const pageIds = ["page-1", "page-2"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock
    await prunePageRevisionsBatch(tx as any, pageIds, 20);
    expect(tx.$executeRaw).toHaveBeenCalled();
  });
});

describe("revalidatePublishedPages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function importFresh() {
    vi.resetModules();
    vi.doMock("@/lib/logger", () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));
    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
    }));
    vi.doMock("@/lib/db", () => ({
      db: {},
    }));
    return import("@/lib/revisions");
  }

  it("revalidates homepage path without slug", async () => {
    const { revalidatePublishedPages } = await importFresh();
    const mockRevalidatePath = (await import("next/cache")).revalidatePath;

    await revalidatePublishedPages([
      { id: "p1", slug: "home", isHomepage: true, site: { slug: "my-site" } },
    ]);

    expect(mockRevalidatePath).toHaveBeenCalledWith("/s/my-site");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/s/my-site", "layout");
  });

  it("revalidates regular page path with slug", async () => {
    const { revalidatePublishedPages } = await importFresh();
    const mockRevalidatePath = (await import("next/cache")).revalidatePath;

    await revalidatePublishedPages([
      { id: "p2", slug: "about", isHomepage: false, site: { slug: "my-site" } },
    ]);

    expect(mockRevalidatePath).toHaveBeenCalledWith("/s/my-site/about");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/s/my-site", "layout");
  });

  it("handles multiple pages", async () => {
    const { revalidatePublishedPages } = await importFresh();
    const mockRevalidatePath = (await import("next/cache")).revalidatePath;

    await revalidatePublishedPages([
      { id: "p1", slug: "home", isHomepage: true, site: { slug: "site-a" } },
      { id: "p2", slug: "contact", isHomepage: false, site: { slug: "site-a" } },
    ]);

    expect(mockRevalidatePath).toHaveBeenCalledWith("/s/site-a");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/s/site-a/contact");
  });

  it("logs warning when revalidation fails", async () => {
    const { revalidatePublishedPages } = await importFresh();
    const mockRevalidatePath = (await import("next/cache")).revalidatePath;
    const mockLogger = (await import("@/lib/logger")).logger;
    vi.mocked(mockRevalidatePath).mockImplementation(() => {
      throw new Error("revalidation failed");
    });

    await revalidatePublishedPages([
      { id: "p1", slug: "home", isHomepage: true, site: { slug: "broken" } },
    ]);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      "revalidation",
      expect.stringContaining("revalidations failed")
    );
  });

  it("handles empty pages array", async () => {
    const { revalidatePublishedPages } = await importFresh();
    const mockRevalidatePath = (await import("next/cache")).revalidatePath;

    await revalidatePublishedPages([]);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
