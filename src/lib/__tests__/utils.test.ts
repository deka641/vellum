import { describe, it, expect } from "vitest";
import {
  cn,
  formatDate,
  formatRelativeDate,
  slugify,
  generateId,
  truncate,
  formatFileSize,
  truncateAtWord,
} from "@/lib/utils";

// ---------------------------------------------------------------------------
// cn
// ---------------------------------------------------------------------------
describe("cn", () => {
  it("merges simple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    const condition = false;
    expect(cn("base", condition && "hidden", "visible")).toBe("base visible");
  });

  it("returns empty string when no inputs", () => {
    expect(cn()).toBe("");
  });

  it("filters out falsy values", () => {
    expect(cn("a", undefined, null, false, 0, "", "b")).toBe("a b");
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------
describe("formatDate", () => {
  it("formats a Date object", () => {
    const result = formatDate(new Date("2024-06-15T12:00:00Z"));
    expect(result).toBe("Jun 15, 2024");
  });

  it("formats a date string", () => {
    const result = formatDate("2023-01-01T00:00:00Z");
    expect(result).toBe("Jan 1, 2023");
  });

  it("formats a date at year boundary", () => {
    const result = formatDate("2023-12-31T23:59:59Z");
    // Could be Dec 31 or Jan 1 depending on TZ, just check it returns a string
    expect(result).toMatch(/\w{3} \d{1,2}, \d{4}/);
  });
});

// ---------------------------------------------------------------------------
// formatRelativeDate
// ---------------------------------------------------------------------------
describe("formatRelativeDate", () => {
  it('returns "Just now" for a date less than 1 minute ago', () => {
    const date = new Date(Date.now() - 30_000); // 30 seconds ago
    expect(formatRelativeDate(date)).toBe("Just now");
  });

  it('returns "Just now" for the current moment', () => {
    expect(formatRelativeDate(new Date())).toBe("Just now");
  });

  it("returns minutes ago for 1-59 minutes", () => {
    const date = new Date(Date.now() - 5 * 60_000); // 5 minutes ago
    expect(formatRelativeDate(date)).toBe("5m ago");
  });

  it("returns 1m ago for exactly 1 minute", () => {
    const date = new Date(Date.now() - 60_000);
    expect(formatRelativeDate(date)).toBe("1m ago");
  });

  it("returns 59m ago just before the hour threshold", () => {
    const date = new Date(Date.now() - 59 * 60_000);
    expect(formatRelativeDate(date)).toBe("59m ago");
  });

  it("returns hours ago for 1-23 hours", () => {
    const date = new Date(Date.now() - 3 * 3_600_000); // 3 hours ago
    expect(formatRelativeDate(date)).toBe("3h ago");
  });

  it("returns 1h ago for exactly 1 hour", () => {
    const date = new Date(Date.now() - 3_600_000);
    expect(formatRelativeDate(date)).toBe("1h ago");
  });

  it("returns days ago for 1-6 days", () => {
    const date = new Date(Date.now() - 2 * 86_400_000); // 2 days ago
    expect(formatRelativeDate(date)).toBe("2d ago");
  });

  it("falls back to formatted date for 7+ days ago", () => {
    const date = new Date(Date.now() - 10 * 86_400_000); // 10 days ago
    const result = formatRelativeDate(date);
    // Should return a formatted date like "Mar 8, 2026"
    expect(result).toMatch(/\w{3} \d{1,2}, \d{4}/);
  });

  it("accepts a string date", () => {
    const date = new Date(Date.now() - 120_000).toISOString(); // 2 minutes ago
    expect(formatRelativeDate(date)).toBe("2m ago");
  });
});

// ---------------------------------------------------------------------------
// slugify
// ---------------------------------------------------------------------------
describe("slugify", () => {
  it("converts to lowercase", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("replaces spaces with dashes", () => {
    expect(slugify("my page title")).toBe("my-page-title");
  });

  it("removes special characters", () => {
    expect(slugify("Hello! @World# $2024")).toBe("hello-world-2024");
  });

  it("collapses multiple dashes into one", () => {
    expect(slugify("hello---world")).toBe("hello-world");
  });

  it("strips leading and trailing dashes", () => {
    expect(slugify("--hello-world--")).toBe("hello-world");
  });

  it("replaces underscores with dashes", () => {
    expect(slugify("hello_world_page")).toBe("hello-world-page");
  });

  it("trims whitespace", () => {
    expect(slugify("  hello  ")).toBe("hello");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("handles string with only special characters", () => {
    expect(slugify("!!!@@@###")).toBe("");
  });

  it("handles mixed whitespace and underscores", () => {
    expect(slugify("hello _ world")).toBe("hello-world");
  });

  it("handles unicode accented characters (strips them)", () => {
    // \w in JS regex does not match accented chars, so they are removed
    expect(slugify("cafe")).toBe("cafe");
    expect(slugify("caf\u00e9")).toBe("caf");
  });

  it("handles numbers", () => {
    expect(slugify("page 123")).toBe("page-123");
  });

  it("handles tabs and newlines", () => {
    expect(slugify("hello\tworld\ntest")).toBe("hello-world-test");
  });
});

// ---------------------------------------------------------------------------
// generateId
// ---------------------------------------------------------------------------
describe("generateId", () => {
  it("returns a 24-character string", () => {
    expect(generateId()).toHaveLength(24);
  });

  it("returns only hex characters", () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{24}$/);
  });

  it("generates unique IDs across multiple calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// truncate
// ---------------------------------------------------------------------------
describe("truncate", () => {
  it("returns original string when shorter than limit", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("returns original string when exactly at limit", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });

  it("truncates and appends ellipsis when longer than limit", () => {
    expect(truncate("hello world", 5)).toBe("hello...");
  });

  it("handles empty string", () => {
    expect(truncate("", 5)).toBe("");
  });

  it("handles limit of 0", () => {
    expect(truncate("hello", 0)).toBe("...");
  });
});

// ---------------------------------------------------------------------------
// formatFileSize
// ---------------------------------------------------------------------------
describe("formatFileSize", () => {
  it('returns "0 B" for zero bytes', () => {
    expect(formatFileSize(0)).toBe("0 B");
  });

  it("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats 1 byte", () => {
    expect(formatFileSize(1)).toBe("1 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(1024)).toBe("1 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(1_048_576)).toBe("1 MB");
    expect(formatFileSize(5_242_880)).toBe("5 MB");
  });

  it("formats gigabytes", () => {
    expect(formatFileSize(1_073_741_824)).toBe("1 GB");
  });

  it("formats fractional values with one decimal", () => {
    // 2.5 MB = 2621440 bytes
    expect(formatFileSize(2_621_440)).toBe("2.5 MB");
  });

  it("drops trailing zero in decimal", () => {
    // 2.0 KB = 2048 bytes -> should be "2 KB" not "2.0 KB"
    expect(formatFileSize(2048)).toBe("2 KB");
  });
});

// ---------------------------------------------------------------------------
// truncateAtWord
// ---------------------------------------------------------------------------
describe("truncateAtWord", () => {
  it("returns text unchanged when shorter than max", () => {
    expect(truncateAtWord("hello", 16)).toBe("hello");
  });

  it("returns text unchanged when exactly at max", () => {
    expect(truncateAtWord("exactly sixteen!", 16)).toBe("exactly sixteen!");
  });

  it("truncates at word boundary when space is in second half", () => {
    // "hello wonderful world" -> first 16 chars = "hello wonderful " -> lastSpace at 15
    // 15 > 8 (16/2) so truncate at space
    expect(truncateAtWord("hello wonderful world", 16)).toBe(
      "hello wonderful"
    );
  });

  it("truncates hard when last space is too early", () => {
    // "ab longwordwithoutspaces" -> first 16 chars = "ab longwordwitho" -> lastSpace at 2
    // 2 is NOT > 8 (16/2), so return full 16 chars
    expect(truncateAtWord("ab longwordwithoutspaces", 16)).toBe(
      "ab longwordwitho"
    );
  });

  it("truncates hard when there is no space at all", () => {
    // No space found -> lastIndexOf returns -1, -1 is not > max/2, return truncated
    expect(truncateAtWord("abcdefghijklmnopqrst", 16)).toBe(
      "abcdefghijklmnop"
    );
  });

  it("uses default max of 16", () => {
    expect(truncateAtWord("this is a longer text string")).toBe("this is a");
  });

  it("handles empty string", () => {
    expect(truncateAtWord("", 16)).toBe("");
  });

  it("handles max of 1 with spaces", () => {
    // " hello" -> first 1 char = " " -> lastSpace at 0, 0 is not > 0.5, return " "
    expect(truncateAtWord("a hello", 1)).toBe("a");
  });
});
