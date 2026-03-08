import { describe, it, expect } from "vitest";
import { runSeoAudit, type SeoCheck } from "../seo-audit";
import type { BlockType, EditorBlock } from "@/types/blocks";

function makeBlock(type: string, content: Record<string, unknown>): EditorBlock {
  return {
    id: crypto.randomUUID(),
    type: type as BlockType,
    content: content as EditorBlock["content"],
    settings: {},
  };
}

function makeHeading(level: 1 | 2 | 3 | 4, text = "Heading"): EditorBlock {
  return makeBlock("heading", { text, level });
}

function makeImage(alt: string, src = "https://example.com/img.jpg"): EditorBlock {
  return makeBlock("image", { src, alt });
}

function makeText(html: string): EditorBlock {
  return makeBlock("text", { html });
}

function makeColumns(columnBlocks: EditorBlock[][]): EditorBlock {
  return makeBlock("columns", {
    columns: columnBlocks.map((blocks) => ({ blocks })),
  });
}

function findCheck(checks: SeoCheck[], id: string): SeoCheck {
  const check = checks.find((c) => c.id === id);
  if (!check) throw new Error(`Check "${id}" not found`);
  return check;
}

// Generate a string of N words
function words(n: number): string {
  return Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
}

describe("runSeoAudit", () => {
  // ─── 1. Title length ───────────────────────────────────────────────

  describe("title length check", () => {
    it("returns error when no title is set", () => {
      const { checks } = runSeoAudit([], "", null, "A valid description here that is long enough.", null);
      const check = findCheck(checks, "title");
      expect(check.status).toBe("error");
      expect(check.message).toContain("No title");
    });

    it("returns error when pageTitle is empty and metaTitle is null", () => {
      const { checks } = runSeoAudit([], "", null, "desc".repeat(20), null);
      expect(findCheck(checks, "title").status).toBe("error");
    });

    it("returns warning for title shorter than 15 chars", () => {
      const { checks } = runSeoAudit([], "Short", null, "desc".repeat(20), null);
      const check = findCheck(checks, "title");
      expect(check.status).toBe("warning");
      expect(check.message).toContain("Too short");
      expect(check.message).toContain("5 chars");
    });

    it("returns warning for title longer than 60 chars", () => {
      const longTitle = "A".repeat(65);
      const { checks } = runSeoAudit([], longTitle, null, "desc".repeat(20), null);
      const check = findCheck(checks, "title");
      expect(check.status).toBe("warning");
      expect(check.message).toContain("Too long");
      expect(check.message).toContain("65 chars");
    });

    it("returns good for title between 30 and 60 chars", () => {
      const goodTitle = "A".repeat(40);
      const { checks } = runSeoAudit([], goodTitle, null, "desc".repeat(20), null);
      const check = findCheck(checks, "title");
      expect(check.status).toBe("good");
      expect(check.message).toContain("40 characters");
    });

    it("returns good for title exactly 15 chars", () => {
      const title = "A".repeat(15);
      const { checks } = runSeoAudit([], title, null, "desc".repeat(20), null);
      expect(findCheck(checks, "title").status).toBe("good");
    });

    it("returns good for title exactly 60 chars", () => {
      const title = "A".repeat(60);
      const { checks } = runSeoAudit([], title, null, "desc".repeat(20), null);
      expect(findCheck(checks, "title").status).toBe("good");
    });

    it("uses metaTitle over pageTitle when metaTitle is set", () => {
      // pageTitle is good length, but metaTitle is too short
      const { checks } = runSeoAudit([], "A Good Page Title Here!!", "Hi", "desc".repeat(20), null);
      const check = findCheck(checks, "title");
      expect(check.status).toBe("warning");
      expect(check.message).toContain("2 chars");
    });

    it("falls back to pageTitle when metaTitle is null", () => {
      const { checks } = runSeoAudit([], "A Good Page Title Here!!", null, "desc".repeat(20), null);
      const check = findCheck(checks, "title");
      expect(check.status).toBe("good");
    });

    it("uses metaTitle when it is a non-empty string", () => {
      const metaTitle = "A".repeat(45);
      const { checks } = runSeoAudit([], "short", metaTitle, "desc".repeat(20), null);
      const check = findCheck(checks, "title");
      expect(check.status).toBe("good");
      expect(check.message).toContain("45 characters");
    });
  });

  // ─── 2. Meta description ──────────────────────────────────────────

  describe("meta description check", () => {
    it("returns error when description is null", () => {
      const { checks } = runSeoAudit([], "Good Title For The Page", null, null, null);
      const check = findCheck(checks, "description");
      expect(check.status).toBe("error");
      expect(check.message).toContain("Missing");
    });

    it("returns error when description is empty string", () => {
      const { checks } = runSeoAudit([], "Good Title For The Page", null, "", null);
      expect(findCheck(checks, "description").status).toBe("error");
    });

    it("returns warning for description shorter than 50 chars", () => {
      const { checks } = runSeoAudit([], "Good Title For The Page", null, "Too short desc", null);
      const check = findCheck(checks, "description");
      expect(check.status).toBe("warning");
      expect(check.message).toContain("Too short");
    });

    it("returns warning for description longer than 160 chars", () => {
      const longDesc = "A".repeat(165);
      const { checks } = runSeoAudit([], "Good Title For The Page", null, longDesc, null);
      const check = findCheck(checks, "description");
      expect(check.status).toBe("warning");
      expect(check.message).toContain("Too long");
      expect(check.message).toContain("165 chars");
    });

    it("returns good for description between 50 and 160 chars", () => {
      const goodDesc = "A".repeat(120);
      const { checks } = runSeoAudit([], "Good Title For The Page", null, goodDesc, null);
      const check = findCheck(checks, "description");
      expect(check.status).toBe("good");
      expect(check.message).toContain("120 characters");
    });

    it("returns good for description exactly 50 chars", () => {
      const desc = "A".repeat(50);
      const { checks } = runSeoAudit([], "Good Title For The Page", null, desc, null);
      expect(findCheck(checks, "description").status).toBe("good");
    });

    it("returns good for description exactly 160 chars", () => {
      const desc = "A".repeat(160);
      const { checks } = runSeoAudit([], "Good Title For The Page", null, desc, null);
      expect(findCheck(checks, "description").status).toBe("good");
    });
  });

  // ─── 3. Heading hierarchy ─────────────────────────────────────────

  describe("heading hierarchy check", () => {
    it("returns warning when no headings exist", () => {
      const blocks = [makeText("<p>Hello world</p>")];
      const { checks } = runSeoAudit(blocks, "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "headings");
      expect(check.status).toBe("warning");
      expect(check.message).toContain("No headings found");
    });

    it("returns warning when there is no H1", () => {
      const blocks = [makeHeading(2), makeHeading(3)];
      const { checks } = runSeoAudit(blocks, "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "headings");
      expect(check.status).toBe("warning");
      expect(check.message).toContain("No H1");
    });

    it("returns warning when there are multiple H1s", () => {
      const blocks = [makeHeading(1), makeHeading(1), makeHeading(2)];
      const { checks } = runSeoAudit(blocks, "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "headings");
      expect(check.status).toBe("warning");
      expect(check.message).toContain("2 H1 headings");
    });

    it("returns warning with blockIds when heading levels are skipped", () => {
      const h1 = makeHeading(1);
      const h3 = makeHeading(3); // skipped H2
      const blocks = [h1, h3];
      const { checks } = runSeoAudit(blocks, "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "headings");
      expect(check.status).toBe("warning");
      expect(check.message).toContain("Skipped heading levels");
      expect(check.details?.blockIds).toContain(h3.id);
      expect(check.details?.blockIds).not.toContain(h1.id);
    });

    it("returns good for proper heading hierarchy", () => {
      const blocks = [makeHeading(1), makeHeading(2), makeHeading(3)];
      const { checks } = runSeoAudit(blocks, "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "headings");
      expect(check.status).toBe("good");
      expect(check.message).toContain("3 headings");
      expect(check.message).toContain("proper hierarchy");
    });

    it("returns good for a single H1", () => {
      const blocks = [makeHeading(1)];
      const { checks } = runSeoAudit(blocks, "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "headings");
      expect(check.status).toBe("good");
      expect(check.message).toContain("1 heading");
      // singular, not "headings"
      expect(check.message).not.toContain("headings");
    });

    it("allows heading level to decrease (e.g. H3 then H2)", () => {
      const blocks = [makeHeading(1), makeHeading(3), makeHeading(2)];
      const { checks } = runSeoAudit(blocks, "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "headings");
      // H1->H3 is a skip, so this should be warning
      expect(check.status).toBe("warning");
      expect(check.message).toContain("Skipped");
    });

    it("collects headings inside columns", () => {
      const nestedH1 = makeHeading(1);
      const nestedH3 = makeHeading(3);
      const columns = makeColumns([[nestedH1], [nestedH3]]);
      const { checks } = runSeoAudit([columns], "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "headings");
      // H1 -> H3 skip
      expect(check.status).toBe("warning");
      expect(check.details?.blockIds).toContain(nestedH3.id);
    });

    it("returns good for H1 -> H2 with no skip", () => {
      const blocks = [makeHeading(1), makeHeading(2)];
      const { checks } = runSeoAudit(blocks, "Good Title For The Page", null, "A".repeat(100), null);
      expect(findCheck(checks, "headings").status).toBe("good");
    });

    it("detects multiple skipped levels", () => {
      const h1 = makeHeading(1);
      const h3 = makeHeading(3);
      const h2 = makeHeading(2);
      const h4skip = makeHeading(4);
      // H1->H3 skip, then H3->H2 ok (decrease), H2->H4 skip
      const blocks = [h1, h3, h2, h4skip];
      const { checks } = runSeoAudit(blocks, "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "headings");
      expect(check.status).toBe("warning");
      expect(check.details?.blockIds).toContain(h3.id);
      expect(check.details?.blockIds).toContain(h4skip.id);
      expect(check.details?.blockIds).toHaveLength(2);
    });
  });

  // ─── 4. Image alt text ────────────────────────────────────────────

  describe("image alt text check", () => {
    it("returns good with message when no images exist", () => {
      const { checks } = runSeoAudit([], "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "alt");
      expect(check.status).toBe("good");
      expect(check.message).toBe("No images to check");
    });

    it("returns error when images are missing alt text", () => {
      const blocks = [makeImage(""), makeImage("good alt")];
      const { checks } = runSeoAudit(blocks, "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "alt");
      expect(check.status).toBe("error");
      expect(check.message).toContain("1 of 2");
      expect(check.message).toContain("missing alt text");
    });

    it("returns error when alt is only whitespace", () => {
      const blocks = [makeImage("   ")];
      const { checks } = runSeoAudit(blocks, "Good Title For The Page", null, "A".repeat(100), null);
      expect(findCheck(checks, "alt").status).toBe("error");
    });

    it("returns good when all images have alt text", () => {
      const blocks = [makeImage("Photo of cat"), makeImage("Photo of dog")];
      const { checks } = runSeoAudit(blocks, "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "alt");
      expect(check.status).toBe("good");
      expect(check.message).toContain("All 2 images have alt text");
    });

    it("uses singular form for one image", () => {
      const blocks = [makeImage("Photo")];
      const { checks } = runSeoAudit(blocks, "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "alt");
      expect(check.message).toContain("1 image have alt text");
    });

    it("counts images inside columns", () => {
      const nestedImg = makeImage("");
      const columns = makeColumns([[nestedImg], []]);
      const { checks } = runSeoAudit([columns], "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "alt");
      expect(check.status).toBe("error");
      expect(check.message).toContain("1 of 1");
    });

    it("returns error when all images have no alt", () => {
      const blocks = [makeImage(""), makeImage(""), makeImage("")];
      const { checks } = runSeoAudit(blocks, "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "alt");
      expect(check.status).toBe("error");
      expect(check.message).toContain("3 of 3");
    });
  });

  // ─── 5. OG image ──────────────────────────────────────────────────

  describe("OG image check", () => {
    it("returns good when ogImage is set", () => {
      const { checks } = runSeoAudit([], "Good Title For The Page", null, "A".repeat(100), "https://example.com/og.jpg");
      const check = findCheck(checks, "og");
      expect(check.status).toBe("good");
      expect(check.message).toContain("OG image set");
    });

    it("returns warning with fallback message when no OG but images exist", () => {
      const blocks = [makeImage("alt text")];
      const { checks } = runSeoAudit(blocks, "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "og");
      expect(check.status).toBe("warning");
      expect(check.message).toContain("first page image will be used");
    });

    it("returns warning when no OG image and no page images", () => {
      const { checks } = runSeoAudit([], "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "og");
      expect(check.status).toBe("warning");
      expect(check.message).toContain("No OG image or page images");
    });

    it("considers images inside columns for fallback", () => {
      const columns = makeColumns([[makeImage("nested")]]);
      const { checks } = runSeoAudit([columns], "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "og");
      expect(check.status).toBe("warning");
      expect(check.message).toContain("first page image will be used");
    });
  });

  // ─── 6. Content length ────────────────────────────────────────────

  describe("content length check", () => {
    it("returns warning for fewer than 50 words", () => {
      const blocks = [makeText(words(10))];
      const { checks } = runSeoAudit(blocks, "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "content");
      expect(check.status).toBe("warning");
      expect(check.message).toContain("aim for 300+");
    });

    it("returns warning for 50-299 words", () => {
      const blocks = [makeText(words(150))];
      const { checks } = runSeoAudit(blocks, "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "content");
      expect(check.status).toBe("warning");
      expect(check.message).toContain("consider adding more");
    });

    it("returns good for 300+ words", () => {
      const blocks = [makeText(words(350))];
      const { checks } = runSeoAudit(blocks, "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "content");
      expect(check.status).toBe("good");
      expect(check.message).toContain("350 words");
    });

    it("returns warning for zero words (empty blocks)", () => {
      const { checks } = runSeoAudit([], "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "content");
      expect(check.status).toBe("warning");
      expect(check.message).toContain("0 words");
    });

    it("counts words from headings and quotes too", () => {
      const blocks = [
        makeHeading(1, words(100)),
        makeBlock("quote", { text: words(100), style: "default" }),
        makeText(words(100)),
      ];
      const { checks } = runSeoAudit(blocks, "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "content");
      expect(check.status).toBe("good");
      expect(check.message).toContain("300 words");
    });

    it("strips HTML tags before counting words", () => {
      const html = "<p>" + words(350).split(" ").join("</p><p>") + "</p>";
      const blocks = [makeText(html)];
      const { checks } = runSeoAudit(blocks, "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "content");
      expect(check.status).toBe("good");
    });

    it("does not count non-text block types (e.g. image, button)", () => {
      const blocks = [
        makeImage("alt"),
        makeBlock("button", { text: "Click me", url: "#", variant: "primary" }),
        makeBlock("spacer", { height: 40 }),
      ];
      const { checks } = runSeoAudit(blocks, "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "content");
      expect(check.status).toBe("warning");
      expect(check.message).toContain("0 words");
    });

    it("counts text content inside columns", () => {
      const nestedText = makeText(words(350));
      const columns = makeColumns([[nestedText], []]);
      const { checks } = runSeoAudit([columns], "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "content");
      expect(check.status).toBe("good");
    });

    it("returns warning at exactly 49 words", () => {
      const blocks = [makeText(words(49))];
      const { checks } = runSeoAudit(blocks, "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "content");
      expect(check.status).toBe("warning");
      expect(check.message).toContain("aim for 300+");
    });

    it("returns second-tier warning at exactly 50 words", () => {
      const blocks = [makeText(words(50))];
      const { checks } = runSeoAudit(blocks, "Good Title For The Page", null, "A".repeat(100), null);
      const check = findCheck(checks, "content");
      expect(check.status).toBe("warning");
      expect(check.message).toContain("consider adding more");
    });

    it("returns good at exactly 300 words", () => {
      const blocks = [makeText(words(300))];
      const { checks } = runSeoAudit(blocks, "Good Title For The Page", null, "A".repeat(100), null);
      expect(findCheck(checks, "content").status).toBe("good");
    });
  });

  // ─── Score calculation ─────────────────────────────────────────────

  describe("score calculation", () => {
    it("returns 100 when all checks are good", () => {
      const blocks = [
        makeHeading(1, words(100)),
        makeHeading(2, words(100)),
        makeText(words(200)),
        makeImage("Good alt text"),
      ];
      const { score } = runSeoAudit(
        blocks,
        "A".repeat(40),
        null,
        "A".repeat(120),
        "https://example.com/og.jpg",
      );
      expect(score).toBe(100);
    });

    it("returns 0 when all checks are error", () => {
      // title: error (empty), description: error (null), headings: warning (no headings),
      // alt: error (missing alt), og: warning, content: warning
      // So not all errors, let's craft carefully:
      // Actually, only title and description and alt can be errors.
      // headings, og, content only produce warning or good.
      // With 3 errors and 3 warnings: (0+0+0+0.5+0.5+0.5)/6*100 = 25
      const blocks = [makeImage("")];
      const { score } = runSeoAudit(blocks, "", null, null, null);
      // title: error, description: error, headings: warning, alt: error, og: warning, content: warning
      expect(score).toBe(25);
    });

    it("calculates mixed scores correctly", () => {
      // 6 checks total. Let's get: 3 good, 2 warning, 1 error
      // (3*1 + 2*0.5 + 1*0) / 6 * 100 = 4/6*100 = 66.67 -> 67
      const blocks = [
        makeHeading(1, words(150)),
        makeHeading(2, words(150)),
        makeImage(""), // alt: error (1 error)
      ];
      const { score, checks: _checks } = runSeoAudit(
        blocks,
        "A".repeat(40),     // title: good
        null,
        "A".repeat(120),    // description: good
        null,               // og: warning (images exist but no OG)
        // headings: good (proper hierarchy)
        // alt: error (missing alt)
        // content: good (300 words)
      );
      // title: good, description: good, headings: good, alt: error, og: warning, content: good
      // (4*1 + 1*0.5 + 1*0) / 6 * 100 = 4.5/6*100 = 75
      expect(score).toBe(75);
    });

    it("always produces exactly 6 checks", () => {
      const { checks } = runSeoAudit([], "Title", null, "Desc", null);
      expect(checks).toHaveLength(6);
      const ids = checks.map((c) => c.id);
      expect(ids).toContain("title");
      expect(ids).toContain("description");
      expect(ids).toContain("headings");
      expect(ids).toContain("alt");
      expect(ids).toContain("og");
      expect(ids).toContain("content");
    });

    it("score is an integer between 0 and 100", () => {
      const { score } = runSeoAudit([], "Title", null, "D", null);
      expect(Number.isInteger(score)).toBe(true);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  // ─── Empty blocks array ────────────────────────────────────────────

  describe("empty blocks array", () => {
    it("handles empty blocks without errors", () => {
      const result = runSeoAudit([], "Good Title For The Page", null, "A".repeat(100), null);
      expect(result.checks).toHaveLength(6);
      expect(findCheck(result.checks, "headings").status).toBe("warning");
      expect(findCheck(result.checks, "alt").status).toBe("good");
      expect(findCheck(result.checks, "alt").message).toBe("No images to check");
      expect(findCheck(result.checks, "content").status).toBe("warning");
    });
  });

  // ─── Blocks nested in columns ──────────────────────────────────────

  describe("blocks nested in columns", () => {
    it("collects all block types from nested columns", () => {
      const nestedH1 = makeHeading(1, words(100));
      const nestedH2 = makeHeading(2, words(100));
      const nestedImg = makeImage("Alt text");
      const nestedText = makeText(words(150));

      const columns = makeColumns([
        [nestedH1, nestedImg],
        [nestedH2, nestedText],
      ]);

      const { checks, score } = runSeoAudit(
        [columns],
        "A".repeat(40),
        null,
        "A".repeat(120),
        "https://example.com/og.jpg",
      );

      // headings: good (H1, H2 proper hierarchy)
      expect(findCheck(checks, "headings").status).toBe("good");
      // alt: good (image has alt)
      expect(findCheck(checks, "alt").status).toBe("good");
      // content: good (350 words from headings + text)
      expect(findCheck(checks, "content").status).toBe("good");
      // All checks should be good
      expect(score).toBe(100);
    });

    it("handles deeply nested columns (columns inside columns)", () => {
      const innerH1 = makeHeading(1);
      const innerColumns = makeColumns([[innerH1]]);
      const outerColumns = makeColumns([[innerColumns]]);

      const { checks } = runSeoAudit([outerColumns], "Good Title For The Page", null, "A".repeat(100), null);
      // The collectBlocks function is recursive, so inner heading should be found
      const headingCheck = findCheck(checks, "headings");
      expect(headingCheck.status).toBe("good");
      expect(headingCheck.message).toContain("1 heading");
    });
  });
});
