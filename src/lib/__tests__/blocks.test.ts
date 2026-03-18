import { describe, it, expect } from "vitest";
import { blockDefinitions, createBlock, blockCategories } from "@/lib/blocks";
import type { BlockType } from "@/types/blocks";

const ALL_BLOCK_TYPES: BlockType[] = [
  "heading",
  "text",
  "image",
  "button",
  "spacer",
  "divider",
  "columns",
  "video",
  "quote",
  "form",
  "code",
  "social",
  "accordion",
  "toc",
  "table",
];

const VALID_CATEGORIES = ["text", "media", "layout", "interactive"];

// ---------------------------------------------------------------------------
// blockDefinitions registry
// ---------------------------------------------------------------------------
describe("blockDefinitions", () => {
  it("has exactly 15 block types", () => {
    expect(Object.keys(blockDefinitions)).toHaveLength(15);
  });

  it("contains all expected block types", () => {
    for (const type of ALL_BLOCK_TYPES) {
      expect(blockDefinitions).toHaveProperty(type);
    }
  });

  it("each entry has required properties", () => {
    for (const [, def] of Object.entries(blockDefinitions)) {
      expect(def).toHaveProperty("type");
      expect(def).toHaveProperty("label");
      expect(def).toHaveProperty("icon");
      expect(def).toHaveProperty("category");
      expect(def).toHaveProperty("defaultContent");
      expect(def).toHaveProperty("defaultSettings");
    }
  });

  it("each entry's key matches its type value", () => {
    for (const [key, def] of Object.entries(blockDefinitions)) {
      expect(def.type).toBe(key);
    }
  });

  it("each entry has a non-empty label string", () => {
    for (const [, def] of Object.entries(blockDefinitions)) {
      expect(typeof def.label).toBe("string");
      expect(def.label.length).toBeGreaterThan(0);
    }
  });

  it("each entry has a non-empty icon string", () => {
    for (const [, def] of Object.entries(blockDefinitions)) {
      expect(typeof def.icon).toBe("string");
      expect(def.icon.length).toBeGreaterThan(0);
    }
  });

  it("each entry has a valid category", () => {
    for (const [, def] of Object.entries(blockDefinitions)) {
      expect(VALID_CATEGORIES).toContain(def.category);
    }
  });

  it("each entry has defaultContent as an object", () => {
    for (const [, def] of Object.entries(blockDefinitions)) {
      expect(typeof def.defaultContent).toBe("object");
      expect(def.defaultContent).not.toBeNull();
    }
  });

  it("each entry has defaultSettings as an object", () => {
    for (const [, def] of Object.entries(blockDefinitions)) {
      expect(typeof def.defaultSettings).toBe("object");
      expect(def.defaultSettings).not.toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// createBlock() factory
// ---------------------------------------------------------------------------
describe("createBlock", () => {
  it("returns a block with a 24-character hex id", () => {
    const block = createBlock("heading");
    expect(block.id).toMatch(/^[0-9a-f]{24}$/);
  });

  it("returns a block with the correct type", () => {
    const block = createBlock("text");
    expect(block.type).toBe("text");
  });

  it("two calls produce different IDs", () => {
    const a = createBlock("heading");
    const b = createBlock("heading");
    expect(a.id).not.toBe(b.id);
  });

  it("returns deep-cloned content (modifying result does not affect definition)", () => {
    const block = createBlock("heading");
    const originalText = blockDefinitions.heading.defaultContent.text;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (block.content as any).text = "MUTATED";
    expect(blockDefinitions.heading.defaultContent.text).toBe(originalText);
  });

  it("returns deep-cloned settings (modifying result does not affect definition)", () => {
    const block = createBlock("heading");
    const originalAlign = blockDefinitions.heading.defaultSettings.align;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (block.settings as any).align = "MUTATED";
    expect(blockDefinitions.heading.defaultSettings.align).toBe(originalAlign);
  });

  it("returns deep-cloned nested content (columns blocks array)", () => {
    const block = createBlock("columns");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cols = (block.content as any).columns;
    cols[0].blocks.push({ id: "fake", type: "text" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const defCols = (blockDefinitions.columns.defaultContent as any).columns;
    expect(defCols[0].blocks).toHaveLength(0);
  });

  it.each(ALL_BLOCK_TYPES)("creates a valid structure for %s", (type) => {
    const block = createBlock(type);
    expect(block).toHaveProperty("id");
    expect(block).toHaveProperty("type", type);
    expect(block).toHaveProperty("content");
    expect(block).toHaveProperty("settings");
    expect(typeof block.id).toBe("string");
    expect(block.id.length).toBe(24);
  });
});

// ---------------------------------------------------------------------------
// blockCategories
// ---------------------------------------------------------------------------
describe("blockCategories", () => {
  it("has exactly 4 entries", () => {
    expect(blockCategories).toHaveLength(4);
  });

  it("contains text, media, layout, and interactive keys", () => {
    const keys = blockCategories.map((c) => c.key);
    expect(keys).toContain("text");
    expect(keys).toContain("media");
    expect(keys).toContain("layout");
    expect(keys).toContain("interactive");
  });

  it("each entry has key and label strings", () => {
    for (const cat of blockCategories) {
      expect(typeof cat.key).toBe("string");
      expect(typeof cat.label).toBe("string");
      expect(cat.key.length).toBeGreaterThan(0);
      expect(cat.label.length).toBeGreaterThan(0);
    }
  });

  it("labels are capitalized versions of keys", () => {
    for (const cat of blockCategories) {
      const expected = cat.key.charAt(0).toUpperCase() + cat.key.slice(1);
      expect(cat.label).toBe(expected);
    }
  });
});

// ---------------------------------------------------------------------------
// Specific block defaults
// ---------------------------------------------------------------------------
describe("specific block defaults", () => {
  describe("heading", () => {
    it("default content has text and level", () => {
      const content = blockDefinitions.heading.defaultContent;
      expect(content).toHaveProperty("text");
      expect(content).toHaveProperty("level");
    });

    it("default level is 2", () => {
      const content = blockDefinitions.heading.defaultContent;
      expect(content.level).toBe(2);
    });

    it("default text is 'Untitled heading'", () => {
      const content = blockDefinitions.heading.defaultContent;
      expect(content.text).toBe("Untitled heading");
    });
  });

  describe("text", () => {
    it("default content has html", () => {
      const content = blockDefinitions.text.defaultContent;
      expect(content).toHaveProperty("html");
    });

    it("default html contains a paragraph tag", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const html = (blockDefinitions.text.defaultContent as any).html;
      expect(html).toContain("<p>");
    });
  });

  describe("columns", () => {
    it("default content has columns array with 2 empty columns", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content = blockDefinitions.columns.defaultContent as any;
      expect(content).toHaveProperty("columns");
      expect(content.columns).toHaveLength(2);
      expect(content.columns[0].blocks).toHaveLength(0);
      expect(content.columns[1].blocks).toHaveLength(0);
    });

    it("default content has columnWidths summing to 100", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content = blockDefinitions.columns.defaultContent as any;
      expect(content).toHaveProperty("columnWidths");
      const sum = content.columnWidths.reduce(
        (acc: number, w: number) => acc + w,
        0
      );
      expect(sum).toBe(100);
    });
  });

  describe("form", () => {
    it("default content has fields array with 3 default fields", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content = blockDefinitions.form.defaultContent as any;
      expect(content).toHaveProperty("fields");
      expect(content.fields).toHaveLength(3);
    });

    it("default fields include name, email, and message", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fields = (blockDefinitions.form.defaultContent as any).fields;
      const ids = fields.map((f: { id: string }) => f.id);
      expect(ids).toContain("name");
      expect(ids).toContain("email");
      expect(ids).toContain("message");
    });

    it("default content has submitText and successMessage", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content = blockDefinitions.form.defaultContent as any;
      expect(content).toHaveProperty("submitText");
      expect(content).toHaveProperty("successMessage");
      expect(content.submitText.length).toBeGreaterThan(0);
      expect(content.successMessage.length).toBeGreaterThan(0);
    });
  });

  describe("table", () => {
    it("default content has headers, rows, and striped", () => {
      const content = blockDefinitions.table.defaultContent;
      expect(content).toHaveProperty("headers");
      expect(content).toHaveProperty("rows");
      expect(content).toHaveProperty("striped");
    });
  });

  describe("accordion", () => {
    it("default content has items array with 3 items", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content = blockDefinitions.accordion.defaultContent as any;
      expect(content).toHaveProperty("items");
      expect(content.items).toHaveLength(3);
    });

    it("each accordion item has id, title, and content", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = (blockDefinitions.accordion.defaultContent as any).items;
      for (const item of items) {
        expect(item).toHaveProperty("id");
        expect(item).toHaveProperty("title");
        expect(item).toHaveProperty("content");
      }
    });
  });
});
