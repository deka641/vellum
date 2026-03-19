import { describe, it, expect } from "vitest";
import { STARTER_PAGE_CONFIG, makeStarterBlocks } from "@/lib/starter-templates";
import type { StarterPageKey } from "@/lib/starter-templates";
import { blockTypeEnum, validateBlockHierarchy } from "@/lib/validations";

describe("STARTER_PAGE_CONFIG", () => {
  const keys = Object.keys(STARTER_PAGE_CONFIG) as StarterPageKey[];

  it("has exactly 7 entries", () => {
    expect(keys).toHaveLength(7);
  });

  it("contains all expected page keys", () => {
    expect(keys).toEqual(
      expect.arrayContaining(["homepage", "about", "contact", "blog", "services", "faq", "pricing"])
    );
  });

  it("has exactly one homepage entry", () => {
    const homepages = keys.filter((k) => STARTER_PAGE_CONFIG[k].isHomepage);
    expect(homepages).toHaveLength(1);
    expect(homepages[0]).toBe("homepage");
  });

  it("every entry has required fields", () => {
    for (const key of keys) {
      const config = STARTER_PAGE_CONFIG[key];
      expect(config.title).toBeTruthy();
      expect(config.slug).toBeTruthy();
      expect(typeof config.isHomepage).toBe("boolean");
      expect(typeof config.showInNav).toBe("boolean");
      expect(typeof config.sortOrder).toBe("number");
    }
  });

  it("has unique sortOrder values", () => {
    const sortOrders = keys.map((k) => STARTER_PAGE_CONFIG[k].sortOrder);
    expect(new Set(sortOrders).size).toBe(sortOrders.length);
  });

  it("has unique slugs", () => {
    const slugs = keys.map((k) => STARTER_PAGE_CONFIG[k].slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("makeStarterBlocks", () => {
  const keys: StarterPageKey[] = ["homepage", "about", "contact", "blog", "services", "faq", "pricing"];

  it.each(keys)("returns non-empty array for %s", (key) => {
    const blocks = makeStarterBlocks(key, "Test Site");
    expect(blocks.length).toBeGreaterThan(0);
  });

  it("returns empty array for unknown page key", () => {
    const blocks = makeStarterBlocks("unknown", "Test Site");
    expect(blocks).toEqual([]);
  });

  it.each(keys)("all blocks have id, type, content, settings for %s", (key) => {
    const blocks = makeStarterBlocks(key, "Test Site");
    for (const block of blocks) {
      expect(block.id).toBeTruthy();
      expect(typeof block.id).toBe("string");
      expect(block.type).toBeTruthy();
      expect(typeof block.type).toBe("string");
      expect(block.content).toBeDefined();
      expect(block.settings).toBeDefined();
    }
  });

  it.each(keys)("all block types are valid for %s", (key) => {
    const blocks = makeStarterBlocks(key, "Test Site");
    for (const block of blocks) {
      const result = blockTypeEnum.safeParse(block.type);
      expect(result.success).toBe(true);

      // Check nested column blocks too
      if (block.type === "columns") {
        const columns = (block.content as { columns?: Array<{ blocks?: Array<{ type: string }> }> }).columns || [];
        for (const col of columns) {
          for (const nestedBlock of col.blocks || []) {
            const nestedResult = blockTypeEnum.safeParse(nestedBlock.type);
            expect(nestedResult.success).toBe(true);
          }
        }
      }
    }
  });

  it.each(keys)("passes block hierarchy validation for %s", (key) => {
    const blocks = makeStarterBlocks(key, "Test Site");
    const result = validateBlockHierarchy(
      blocks as Array<{ type: string; content: Record<string, unknown> }>
    );
    expect(result.valid).toBe(true);
  });

  it.each(keys)("has no duplicate block IDs for %s", (key) => {
    const blocks = makeStarterBlocks(key, "Test Site");
    const allIds: string[] = [];

    for (const block of blocks) {
      allIds.push(block.id);
      if (block.type === "columns") {
        const columns = (block.content as { columns?: Array<{ blocks?: Array<{ id: string }> }> }).columns || [];
        for (const col of columns) {
          for (const nestedBlock of col.blocks || []) {
            allIds.push(nestedBlock.id);
          }
        }
      }
      if (block.type === "accordion") {
        const items = (block.content as { items?: Array<{ id: string }> }).items || [];
        for (const item of items) {
          allIds.push(item.id);
        }
      }
    }

    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("incorporates site name in homepage blocks", () => {
    const blocks = makeStarterBlocks("homepage", "My Awesome Site");
    const headingBlock = blocks.find((b) => b.type === "heading");
    expect(headingBlock).toBeDefined();
    const text = (headingBlock!.content as { text?: string }).text || "";
    expect(text).toContain("My Awesome Site");
  });

  it("incorporates site name in about page blocks", () => {
    const blocks = makeStarterBlocks("about", "My Awesome Site");
    const headingBlock = blocks.find((b) => b.type === "heading");
    expect(headingBlock).toBeDefined();
    const text = (headingBlock!.content as { text?: string }).text || "";
    expect(text).toContain("My Awesome Site");
  });

  it("contact page contains a form block", () => {
    const blocks = makeStarterBlocks("contact", "Test Site");
    const formBlock = blocks.find((b) => b.type === "form");
    expect(formBlock).toBeDefined();
    const fields = (formBlock!.content as { fields?: unknown[] }).fields || [];
    expect(fields.length).toBeGreaterThan(0);
  });

  it("faq page contains accordion blocks", () => {
    const blocks = makeStarterBlocks("faq", "Test Site");
    const accordionBlocks = blocks.filter((b) => b.type === "accordion");
    expect(accordionBlocks.length).toBeGreaterThan(0);
  });

  it("pricing page contains a table block", () => {
    const blocks = makeStarterBlocks("pricing", "Test Site");
    const tableBlock = blocks.find((b) => b.type === "table");
    expect(tableBlock).toBeDefined();
  });

  it("services page contains a video block", () => {
    const blocks = makeStarterBlocks("services", "Test Site");
    const videoBlock = blocks.find((b) => b.type === "video");
    expect(videoBlock).toBeDefined();
  });

  it("blog page contains a code block", () => {
    const blocks = makeStarterBlocks("blog", "Test Site");
    const codeBlock = blocks.find((b) => b.type === "code");
    expect(codeBlock).toBeDefined();
  });

  it("generates unique IDs across multiple calls", () => {
    const blocks1 = makeStarterBlocks("homepage", "Site 1");
    const blocks2 = makeStarterBlocks("homepage", "Site 2");

    const ids1 = blocks1.map((b) => b.id);
    const ids2 = blocks2.map((b) => b.id);

    // No ID from the first call should appear in the second
    for (const id of ids1) {
      expect(ids2).not.toContain(id);
    }
  });
});
