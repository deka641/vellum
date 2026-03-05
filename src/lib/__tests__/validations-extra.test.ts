import { describe, it, expect } from "vitest";
import {
  validateBlockHierarchy,
  DISALLOWED_NESTED_TYPES,
  parseBody,
  blockTypeEnum,
  formSubmissionSchema,
  createSiteSchema,
  RESERVED_SLUGS,
} from "@/lib/validations";

// ---------------------------------------------------------------------------
// validateBlockHierarchy
// ---------------------------------------------------------------------------
describe("validateBlockHierarchy", () => {
  // Helper to create a columns block with nested blocks
  function columnsBlock(nestedBlocks: Array<{ type: string; content: Record<string, unknown> }>) {
    return {
      type: "columns",
      content: {
        columns: [
          { blocks: nestedBlocks },
          { blocks: [] },
        ],
      },
    };
  }

  describe("disallowed types inside columns", () => {
    it("rejects columns inside columns", () => {
      const blocks = [columnsBlock([{ type: "columns", content: { columns: [] } }])];
      const result = validateBlockHierarchy(blocks);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("columns");
      expect(result.error).toContain("not allowed inside columns");
    });

    it("rejects form inside columns", () => {
      const blocks = [columnsBlock([{ type: "form", content: { fields: [] } }])];
      const result = validateBlockHierarchy(blocks);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("form");
    });

    it("rejects video inside columns", () => {
      const blocks = [columnsBlock([{ type: "video", content: { url: "" } }])];
      const result = validateBlockHierarchy(blocks);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("video");
    });

    it("rejects table inside columns", () => {
      const blocks = [columnsBlock([{ type: "table", content: { headers: [], rows: [] } }])];
      const result = validateBlockHierarchy(blocks);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("table");
    });

    it("DISALLOWED_NESTED_TYPES contains exactly columns, form, video, table", () => {
      expect(DISALLOWED_NESTED_TYPES).toEqual(
        expect.arrayContaining(["columns", "form", "video", "table"])
      );
      expect(DISALLOWED_NESTED_TYPES).toHaveLength(4);
    });
  });

  describe("allowed types inside columns", () => {
    it("allows heading inside columns", () => {
      const blocks = [columnsBlock([{ type: "heading", content: { text: "Hello" } }])];
      expect(validateBlockHierarchy(blocks).valid).toBe(true);
    });

    it("allows text inside columns", () => {
      const blocks = [columnsBlock([{ type: "text", content: { html: "<p>hi</p>" } }])];
      expect(validateBlockHierarchy(blocks).valid).toBe(true);
    });

    it("allows image inside columns", () => {
      const blocks = [columnsBlock([{ type: "image", content: { src: "/img.png" } }])];
      expect(validateBlockHierarchy(blocks).valid).toBe(true);
    });

    it("allows button inside columns", () => {
      const blocks = [columnsBlock([{ type: "button", content: { text: "Click" } }])];
      expect(validateBlockHierarchy(blocks).valid).toBe(true);
    });

    it("allows spacer inside columns", () => {
      const blocks = [columnsBlock([{ type: "spacer", content: { height: 20 } }])];
      expect(validateBlockHierarchy(blocks).valid).toBe(true);
    });

    it("allows divider inside columns", () => {
      const blocks = [columnsBlock([{ type: "divider", content: {} }])];
      expect(validateBlockHierarchy(blocks).valid).toBe(true);
    });

    it("allows quote inside columns", () => {
      const blocks = [columnsBlock([{ type: "quote", content: { text: "words" } }])];
      expect(validateBlockHierarchy(blocks).valid).toBe(true);
    });

    it("allows code inside columns", () => {
      const blocks = [columnsBlock([{ type: "code", content: { code: "x=1" } }])];
      expect(validateBlockHierarchy(blocks).valid).toBe(true);
    });

    it("allows social inside columns", () => {
      const blocks = [columnsBlock([{ type: "social", content: { links: [] } }])];
      expect(validateBlockHierarchy(blocks).valid).toBe(true);
    });

    it("allows accordion inside columns", () => {
      const blocks = [columnsBlock([{ type: "accordion", content: { items: [] } }])];
      expect(validateBlockHierarchy(blocks).valid).toBe(true);
    });

    it("allows toc inside columns", () => {
      const blocks = [columnsBlock([{ type: "toc", content: {} }])];
      expect(validateBlockHierarchy(blocks).valid).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("allows empty columns (no nested blocks)", () => {
      const blocks = [{
        type: "columns",
        content: { columns: [{ blocks: [] }, { blocks: [] }] },
      }];
      expect(validateBlockHierarchy(blocks).valid).toBe(true);
    });

    it("allows columns with no blocks arrays at all", () => {
      const blocks = [{
        type: "columns",
        content: { columns: [{}, {}] },
      }];
      expect(validateBlockHierarchy(blocks).valid).toBe(true);
    });

    it("allows empty block list", () => {
      expect(validateBlockHierarchy([]).valid).toBe(true);
    });

    it("allows non-column blocks at top level", () => {
      const blocks = [
        { type: "heading", content: { text: "Hi" } },
        { type: "text", content: { html: "<p>text</p>" } },
        { type: "form", content: { fields: [] } },
        { type: "video", content: { url: "" } },
        { type: "table", content: {} },
      ];
      expect(validateBlockHierarchy(blocks).valid).toBe(true);
    });

    it("detects disallowed type in second column", () => {
      const blocks = [{
        type: "columns",
        content: {
          columns: [
            { blocks: [{ type: "heading", content: { text: "ok" } }] },
            { blocks: [{ type: "form", content: { fields: [] } }] },
          ],
        },
      }];
      const result = validateBlockHierarchy(blocks);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("form");
    });

    it("detects disallowed type among valid nested blocks", () => {
      const blocks = [columnsBlock([
        { type: "heading", content: { text: "ok" } },
        { type: "text", content: { html: "<p>ok</p>" } },
        { type: "columns", content: { columns: [] } },
      ])];
      const result = validateBlockHierarchy(blocks);
      expect(result.valid).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// blockTypeEnum
// ---------------------------------------------------------------------------
describe("blockTypeEnum", () => {
  it("accepts all 15 block types", () => {
    const types = [
      "heading", "text", "image", "button", "spacer", "divider",
      "columns", "video", "quote", "form", "code", "social",
      "accordion", "toc", "table",
    ];
    for (const t of types) {
      expect(blockTypeEnum.safeParse(t).success).toBe(true);
    }
  });

  it("rejects unknown block type", () => {
    expect(blockTypeEnum.safeParse("unknown").success).toBe(false);
    expect(blockTypeEnum.safeParse("script").success).toBe(false);
    expect(blockTypeEnum.safeParse("").success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseBody
// ---------------------------------------------------------------------------
describe("parseBody", () => {
  it("returns success with valid data", () => {
    const result = parseBody(blockTypeEnum, "heading");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("heading");
    }
  });

  it("returns error string on invalid data", () => {
    const result = parseBody(blockTypeEnum, "invalid");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error).toBe("string");
      expect(result.error.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// formSubmissionSchema — prototype pollution protection
// ---------------------------------------------------------------------------
describe("formSubmissionSchema", () => {
  it("accepts normal form data", () => {
    const result = formSubmissionSchema.safeParse({
      data: { name: "Alice", email: "alice@test.com" },
    });
    expect(result.success).toBe(true);
  });

  it("__proto__ key is stripped by Zod record parsing (defense in depth with API handler)", () => {
    // Zod's z.record() internally strips __proto__ during parsing as a safety measure.
    // The FORBIDDEN_KEYS check handles "constructor" and "prototype"; __proto__ is
    // additionally protected by Zod itself and by the API handler's key validation.
    const data = JSON.parse('{"__proto__":"attack"}');
    const result = formSubmissionSchema.safeParse({ data });
    // Zod strips __proto__ so it passes validation with an empty data object
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data).not.toHaveProperty("__proto__");
    }
  });

  it("rejects constructor key", () => {
    const result = formSubmissionSchema.safeParse({
      data: { constructor: "attack" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects prototype key", () => {
    const result = formSubmissionSchema.safeParse({
      data: { prototype: "attack" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 50 fields", () => {
    const data: Record<string, string> = {};
    for (let i = 0; i < 51; i++) {
      data[`field${i}`] = "value";
    }
    const result = formSubmissionSchema.safeParse({ data });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createSiteSchema — reserved slug protection
// ---------------------------------------------------------------------------
describe("createSiteSchema", () => {
  it("rejects names that produce reserved slugs", () => {
    // Only test slugs whose names slugify to themselves (no underscores/special chars).
    // e.g. "_next" becomes "next" after slugification, so it won't match the reserved list.
    const pureAlphanumericSlugs = RESERVED_SLUGS.filter((s) => /^[a-z0-9-]+$/.test(s));
    expect(pureAlphanumericSlugs.length).toBeGreaterThan(0);
    for (const slug of pureAlphanumericSlugs) {
      const result = createSiteSchema.safeParse({ name: slug });
      expect(result.success).toBe(false);
    }
  });

  it("_next slugifies to 'next' which is not reserved, so it passes", () => {
    // This documents that _next is only blocked at the slug level, not the name level
    // when the name "_next" slugifies to "next"
    const result = createSiteSchema.safeParse({ name: "_next" });
    // "_next" -> slug "next" which is NOT in RESERVED_SLUGS
    expect(result.success).toBe(true);
  });

  it("accepts valid site names", () => {
    const result = createSiteSchema.safeParse({ name: "My Cool Site" });
    expect(result.success).toBe(true);
  });
});
