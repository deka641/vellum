import { describe, it, expect } from "vitest";
import { timingSafeEqual } from "node:crypto";
import {
  validateBlockHierarchy,
  DISALLOWED_NESTED_TYPES,
  updateBlocksSchema,
  blockTypeEnum,
  formSubmissionSchema,
  parseBody,
  webhookCreateSchema,
  webhookUpdateSchema,
  webhookEventEnum,
} from "../validations";

// ===========================================================================
// 1. Block Hierarchy Validation Tests
// ===========================================================================
describe("Block Hierarchy Validation (integration scenarios)", () => {
  // Helper to build a columns block wrapping nested blocks in a single column
  function makeColumns(
    nestedBlocks: Array<{ type: string; content: Record<string, unknown> }>
  ) {
    return {
      type: "columns",
      content: {
        columns: [{ blocks: nestedBlocks }],
      },
    };
  }

  describe("valid flat blocks", () => {
    it("passes with a mix of all 15 block types at top level", () => {
      const blocks = [
        { type: "heading", content: { text: "Title", level: 1 } },
        { type: "text", content: { html: "<p>paragraph</p>" } },
        { type: "image", content: { src: "/photo.jpg", alt: "A photo" } },
        { type: "button", content: { text: "Click", url: "/page" } },
        { type: "spacer", content: { height: 40 } },
        { type: "divider", content: {} },
        { type: "columns", content: { columns: [{ blocks: [] }] } },
        { type: "video", content: { url: "https://youtube.com/watch?v=abc" } },
        { type: "quote", content: { text: "Wise words", attribution: "Author" } },
        { type: "form", content: { fields: [{ type: "text", label: "Name" }] } },
        { type: "code", content: { code: "console.log(1)", language: "js" } },
        { type: "social", content: { links: [{ platform: "twitter", url: "https://x.com" }] } },
        { type: "accordion", content: { items: [{ id: "1", title: "Q", content: "A" }] } },
        { type: "toc", content: {} },
        { type: "table", content: { headers: ["A"], rows: [["1"]] } },
      ];
      expect(validateBlockHierarchy(blocks)).toEqual({ valid: true });
    });

    it("passes with an empty block array", () => {
      expect(validateBlockHierarchy([])).toEqual({ valid: true });
    });

    it("passes with a single text block", () => {
      const blocks = [{ type: "text", content: { html: "<p>hello</p>" } }];
      expect(validateBlockHierarchy(blocks)).toEqual({ valid: true });
    });
  });

  describe("valid columns with nested blocks", () => {
    it("passes with text and heading inside columns", () => {
      const blocks = [
        makeColumns([
          { type: "text", content: { html: "<p>hello</p>" } },
          { type: "heading", content: { text: "Title" } },
        ]),
      ];
      expect(validateBlockHierarchy(blocks)).toEqual({ valid: true });
    });

    it("passes with all 11 allowed nested types in columns", () => {
      const allowedNested = [
        { type: "heading", content: { text: "H" } },
        { type: "text", content: { html: "<p>T</p>" } },
        { type: "image", content: { src: "/img.jpg" } },
        { type: "button", content: { text: "Btn" } },
        { type: "spacer", content: { height: 20 } },
        { type: "divider", content: {} },
        { type: "quote", content: { text: "Q" } },
        { type: "code", content: { code: "x=1" } },
        { type: "social", content: { links: [] } },
        { type: "accordion", content: { items: [] } },
        { type: "toc", content: {} },
      ];
      const blocks = [makeColumns(allowedNested)];
      expect(validateBlockHierarchy(blocks)).toEqual({ valid: true });
    });

    it("passes with multiple columns blocks each containing valid nested blocks", () => {
      const blocks = [
        makeColumns([{ type: "text", content: { html: "<p>col1</p>" } }]),
        makeColumns([{ type: "image", content: { src: "/img.png" } }]),
      ];
      expect(validateBlockHierarchy(blocks)).toEqual({ valid: true });
    });
  });

  describe("columns nested inside columns is rejected", () => {
    it("rejects columns directly nested in columns", () => {
      const blocks = [
        makeColumns([{ type: "columns", content: { columns: [] } }]),
      ];
      const result = validateBlockHierarchy(blocks);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("columns");
      expect(result.error).toContain("not allowed inside columns");
    });
  });

  describe("form nested inside columns is rejected", () => {
    it("rejects form block nested in columns", () => {
      const blocks = [
        makeColumns([{ type: "form", content: { fields: [] } }]),
      ];
      const result = validateBlockHierarchy(blocks);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("form");
    });
  });

  describe("video nested inside columns is rejected", () => {
    it("rejects video block nested in columns", () => {
      const blocks = [
        makeColumns([{ type: "video", content: { url: "" } }]),
      ];
      const result = validateBlockHierarchy(blocks);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("video");
    });
  });

  describe("table nested inside columns is rejected", () => {
    it("rejects table block nested in columns", () => {
      const blocks = [
        makeColumns([{ type: "table", content: { headers: [], rows: [] } }]),
      ];
      const result = validateBlockHierarchy(blocks);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("table");
    });
  });

  describe("deeply nested valid blocks pass", () => {
    it("passes with multiple valid blocks in multiple columns", () => {
      const blocks = [
        {
          type: "columns",
          content: {
            columns: [
              {
                blocks: [
                  { type: "heading", content: { text: "Col 1 heading" } },
                  { type: "text", content: { html: "<p>Col 1 text</p>" } },
                  { type: "image", content: { src: "/img1.jpg", alt: "photo" } },
                ],
              },
              {
                blocks: [
                  { type: "button", content: { text: "Buy", url: "/buy" } },
                  { type: "quote", content: { text: "Quote here" } },
                  { type: "divider", content: {} },
                ],
              },
              {
                blocks: [
                  { type: "accordion", content: { items: [] } },
                  { type: "code", content: { code: "fn()", language: "ts" } },
                ],
              },
            ],
          },
        },
      ];
      expect(validateBlockHierarchy(blocks)).toEqual({ valid: true });
    });
  });

  describe("mixed valid and disallowed detects the first violation", () => {
    it("rejects when a disallowed type appears among valid nested blocks", () => {
      const blocks = [
        makeColumns([
          { type: "text", content: { html: "<p>ok</p>" } },
          { type: "heading", content: { text: "ok" } },
          { type: "video", content: { url: "https://youtube.com/..." } },
          { type: "image", content: { src: "/img.jpg" } },
        ]),
      ];
      const result = validateBlockHierarchy(blocks);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("video");
    });

    it("rejects disallowed type in the second column slot", () => {
      const blocks = [
        {
          type: "columns",
          content: {
            columns: [
              { blocks: [{ type: "text", content: { html: "<p>fine</p>" } }] },
              { blocks: [{ type: "table", content: { headers: [], rows: [] } }] },
            ],
          },
        },
      ];
      const result = validateBlockHierarchy(blocks);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("table");
    });
  });

  describe("DISALLOWED_NESTED_TYPES constant", () => {
    it("contains exactly the 4 disallowed types", () => {
      expect(DISALLOWED_NESTED_TYPES).toEqual(
        expect.arrayContaining(["columns", "form", "video", "table"])
      );
      expect(DISALLOWED_NESTED_TYPES).toHaveLength(4);
    });
  });
});

// ===========================================================================
// 2. Optimistic Locking Schema Tests
// ===========================================================================
describe("Optimistic Locking (expectedUpdatedAt)", () => {
  it("accepts a valid ISO date string for expectedUpdatedAt", () => {
    const result = updateBlocksSchema.safeParse({
      blocks: [],
      expectedUpdatedAt: "2025-06-15T10:30:00.000Z",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expectedUpdatedAt).toBe("2025-06-15T10:30:00.000Z");
    }
  });

  it("accepts a non-ISO but non-empty string (schema only requires min(1))", () => {
    // The schema validates string.min(1) only -- actual date parsing is the handler's job
    const result = updateBlocksSchema.safeParse({
      blocks: [],
      expectedUpdatedAt: "not-a-real-date",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty string for expectedUpdatedAt", () => {
    const result = updateBlocksSchema.safeParse({
      blocks: [],
      expectedUpdatedAt: "",
    });
    expect(result.success).toBe(false);
  });

  it("allows omitting expectedUpdatedAt entirely (optional field)", () => {
    const result = updateBlocksSchema.safeParse({
      blocks: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expectedUpdatedAt).toBeUndefined();
    }
  });

  it("accepts expectedUpdatedAt alongside blocks and title", () => {
    const result = updateBlocksSchema.safeParse({
      blocks: [
        { id: "b1", type: "text", content: { html: "<p>hi</p>" } },
      ],
      title: "My Page",
      expectedUpdatedAt: "2025-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("My Page");
      expect(result.data.expectedUpdatedAt).toBe("2025-01-01T00:00:00.000Z");
      expect(result.data.blocks).toHaveLength(1);
    }
  });
});

// ===========================================================================
// 3. Block Content Validation Tests
// ===========================================================================
describe("Block Content Validation (blockSchema via updateBlocksSchema)", () => {
  describe("valid block types", () => {
    it("accepts a valid heading block", () => {
      const result = updateBlocksSchema.safeParse({
        blocks: [
          {
            id: "h1",
            type: "heading",
            content: { text: "Hello World", html: "<h1>Hello World</h1>", level: 2 },
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("accepts a valid text block", () => {
      const result = updateBlocksSchema.safeParse({
        blocks: [
          {
            id: "t1",
            type: "text",
            content: { html: "<p>Some rich text here</p>" },
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("accepts a valid image block", () => {
      const result = updateBlocksSchema.safeParse({
        blocks: [
          {
            id: "i1",
            type: "image",
            content: { src: "/uploads/photo.jpg", alt: "A landscape" },
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("accepts a valid button block", () => {
      const result = updateBlocksSchema.safeParse({
        blocks: [
          {
            id: "btn1",
            type: "button",
            content: { text: "Learn More", url: "https://example.com" },
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("accepts a valid form block with fields", () => {
      const result = updateBlocksSchema.safeParse({
        blocks: [
          {
            id: "f1",
            type: "form",
            content: {
              fields: [
                { type: "text", label: "Name", required: true },
                { type: "email", label: "Email" },
              ],
              submitText: "Send",
            },
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("accepts a valid table block", () => {
      const result = updateBlocksSchema.safeParse({
        blocks: [
          {
            id: "tbl1",
            type: "table",
            content: {
              headers: ["Name", "Age"],
              rows: [["Alice", "30"], ["Bob", "25"]],
              caption: "Users",
              striped: true,
            },
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("accepts a valid code block with embed mode", () => {
      const result = updateBlocksSchema.safeParse({
        blocks: [
          {
            id: "c1",
            type: "code",
            content: {
              code: "<iframe src='https://example.com'></iframe>",
              displayMode: "embed",
            },
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("accepts a valid code block with snippet mode", () => {
      const result = updateBlocksSchema.safeParse({
        blocks: [
          {
            id: "c2",
            type: "code",
            content: {
              code: "const x = 1;",
              displayMode: "snippet",
              snippetLanguage: "typescript",
              language: "ts",
            },
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("accepts a valid accordion block", () => {
      const result = updateBlocksSchema.safeParse({
        blocks: [
          {
            id: "acc1",
            type: "accordion",
            content: {
              items: [
                { id: "item-1", title: "Question?", content: "Answer." },
              ],
            },
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("accepts a valid columns block with nested text", () => {
      const result = updateBlocksSchema.safeParse({
        blocks: [
          {
            id: "col1",
            type: "columns",
            content: {
              columns: [
                {
                  blocks: [
                    { id: "nested1", type: "text", content: { html: "<p>Col</p>" } },
                  ],
                },
              ],
            },
          },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid block type rejected", () => {
    it("rejects an unknown block type", () => {
      const result = updateBlocksSchema.safeParse({
        blocks: [
          { id: "x1", type: "script", content: {} },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects an empty string as block type", () => {
      const result = updateBlocksSchema.safeParse({
        blocks: [
          { id: "x1", type: "", content: {} },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("blockTypeEnum rejects non-enum values", () => {
      expect(blockTypeEnum.safeParse("html").success).toBe(false);
      expect(blockTypeEnum.safeParse("iframe").success).toBe(false);
      expect(blockTypeEnum.safeParse("HEADING").success).toBe(false);
    });
  });

  describe("block settings with disallowed CSS values rejected", () => {
    it("strips settings with semicolons (CSS injection)", () => {
      const result = updateBlocksSchema.safeParse({
        blocks: [
          {
            id: "s1",
            type: "text",
            content: { html: "<p>hi</p>" },
            settings: { textColor: "red; background: url(evil)" },
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const settings = result.data.blocks![0].settings as Record<string, unknown>;
        expect(settings).not.toHaveProperty("textColor");
      }
    });

    it("strips settings with curly braces", () => {
      const result = updateBlocksSchema.safeParse({
        blocks: [
          {
            id: "s2",
            type: "text",
            content: { html: "<p>hi</p>" },
            settings: { backgroundColor: "red} body{color:red" },
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const settings = result.data.blocks![0].settings as Record<string, unknown>;
        expect(settings).not.toHaveProperty("backgroundColor");
      }
    });

    it("strips settings with angle brackets (XSS attempt)", () => {
      const result = updateBlocksSchema.safeParse({
        blocks: [
          {
            id: "s3",
            type: "text",
            content: { html: "<p>hi</p>" },
            settings: { fontSize: "<script>alert(1)</script>" },
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const settings = result.data.blocks![0].settings as Record<string, unknown>;
        expect(settings).not.toHaveProperty("fontSize");
      }
    });

    it("strips settings exceeding 200 characters", () => {
      const result = updateBlocksSchema.safeParse({
        blocks: [
          {
            id: "s4",
            type: "text",
            content: { html: "<p>hi</p>" },
            settings: { textColor: "a".repeat(201) },
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const settings = result.data.blocks![0].settings as Record<string, unknown>;
        expect(settings).not.toHaveProperty("textColor");
      }
    });

    it("strips unknown setting keys entirely", () => {
      const result = updateBlocksSchema.safeParse({
        blocks: [
          {
            id: "s5",
            type: "text",
            content: { html: "<p>hi</p>" },
            settings: {
              textColor: "#000",
              dangerousKey: "payload",
              xss: "alert(1)",
            },
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const settings = result.data.blocks![0].settings as Record<string, unknown>;
        expect(settings.textColor).toBe("#000");
        expect(settings).not.toHaveProperty("dangerousKey");
        expect(settings).not.toHaveProperty("xss");
      }
    });
  });

  describe("block settings with valid CSS values pass", () => {
    it("passes standard hex colors", () => {
      const result = updateBlocksSchema.safeParse({
        blocks: [
          {
            id: "v1",
            type: "text",
            content: { html: "<p>hi</p>" },
            settings: {
              textColor: "#1C1917",
              backgroundColor: "#FAF9F7",
            },
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const settings = result.data.blocks![0].settings as Record<string, unknown>;
        expect(settings.textColor).toBe("#1C1917");
        expect(settings.backgroundColor).toBe("#FAF9F7");
      }
    });

    it("passes pixel-based values", () => {
      const result = updateBlocksSchema.safeParse({
        blocks: [
          {
            id: "v2",
            type: "text",
            content: { html: "<p>hi</p>" },
            settings: {
              fontSize: "18px",
              paddingY: "16px",
              paddingX: "24px",
              marginTop: "32px",
              marginBottom: "48px",
            },
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const settings = result.data.blocks![0].settings as Record<string, unknown>;
        expect(settings.fontSize).toBe("18px");
        expect(settings.paddingY).toBe("16px");
        expect(settings.marginTop).toBe("32px");
      }
    });

    it("passes named CSS colors", () => {
      const result = updateBlocksSchema.safeParse({
        blocks: [
          {
            id: "v3",
            type: "text",
            content: { html: "<p>hi</p>" },
            settings: { color: "blue" },
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const settings = result.data.blocks![0].settings as Record<string, unknown>;
        expect(settings.color).toBe("blue");
      }
    });
  });

  describe("block with hidden setting", () => {
    it("passes with hidden: true", () => {
      const result = updateBlocksSchema.safeParse({
        blocks: [
          {
            id: "h1",
            type: "heading",
            content: { text: "Hidden heading" },
            settings: { hidden: true },
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const settings = result.data.blocks![0].settings as Record<string, unknown>;
        expect(settings.hidden).toBe(true);
      }
    });

    it("passes with hidden: false", () => {
      const result = updateBlocksSchema.safeParse({
        blocks: [
          {
            id: "h2",
            type: "text",
            content: { html: "<p>visible</p>" },
            settings: { hidden: false },
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const settings = result.data.blocks![0].settings as Record<string, unknown>;
        expect(settings.hidden).toBe(false);
      }
    });
  });

  describe("block with parentId", () => {
    it("accepts a string parentId", () => {
      const result = updateBlocksSchema.safeParse({
        blocks: [
          {
            id: "child1",
            type: "text",
            content: { html: "<p>nested</p>" },
            parentId: "col-parent-1",
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.blocks![0].parentId).toBe("col-parent-1");
      }
    });

    it("accepts null parentId", () => {
      const result = updateBlocksSchema.safeParse({
        blocks: [
          {
            id: "top1",
            type: "text",
            content: { html: "<p>top-level</p>" },
            parentId: null,
          },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("block count limits", () => {
    it("rejects more than 500 blocks", () => {
      const blocks = Array.from({ length: 501 }, (_, i) => ({
        id: `block-${i}`,
        type: "text" as const,
        content: { html: `<p>${i}</p>` },
      }));
      const result = updateBlocksSchema.safeParse({ blocks });
      expect(result.success).toBe(false);
    });

    it("accepts exactly 500 blocks", () => {
      const blocks = Array.from({ length: 500 }, (_, i) => ({
        id: `block-${i}`,
        type: "text" as const,
        content: { html: `<p>${i}</p>` },
      }));
      const result = updateBlocksSchema.safeParse({ blocks });
      expect(result.success).toBe(true);
    });
  });
});

// ===========================================================================
// 4. Form Submission Validation Tests
// ===========================================================================
describe("Form Submission Validation (integration scenarios)", () => {
  describe("prototype pollution protection", () => {
    it("rejects 'constructor' key", () => {
      const result = formSubmissionSchema.safeParse({
        data: { constructor: "attack" },
      });
      expect(result.success).toBe(false);
    });

    it("rejects 'prototype' key", () => {
      const result = formSubmissionSchema.safeParse({
        data: { prototype: "attack" },
      });
      expect(result.success).toBe(false);
    });

    it("neutralizes '__proto__' key (Zod strips it during parsing)", () => {
      // Zod's z.record() strips __proto__ from parsed output
      const data = JSON.parse('{"__proto__":"evil"}');
      const result = formSubmissionSchema.safeParse({ data });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(Object.keys(result.data.data)).not.toContain("__proto__");
      }
    });

    it("rejects constructor alongside valid keys", () => {
      const result = formSubmissionSchema.safeParse({
        data: { name: "Alice", constructor: "attack", email: "alice@test.com" },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("key length limits", () => {
    it("rejects keys exceeding 100 characters", () => {
      const longKey = "k".repeat(101);
      const result = formSubmissionSchema.safeParse({
        data: { [longKey]: "value" },
      });
      expect(result.success).toBe(false);
    });

    it("accepts keys at exactly 100 characters", () => {
      const maxKey = "k".repeat(100);
      const result = formSubmissionSchema.safeParse({
        data: { [maxKey]: "value" },
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty string keys", () => {
      const result = formSubmissionSchema.safeParse({
        data: { "": "value" },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("value length limits", () => {
    it("rejects values exceeding 5000 characters", () => {
      const result = formSubmissionSchema.safeParse({
        data: { message: "x".repeat(5001) },
      });
      expect(result.success).toBe(false);
    });

    it("accepts values at exactly 5000 characters", () => {
      const result = formSubmissionSchema.safeParse({
        data: { message: "x".repeat(5000) },
      });
      expect(result.success).toBe(true);
    });
  });

  describe("field count limits", () => {
    it("rejects more than 50 keys", () => {
      const data: Record<string, string> = {};
      for (let i = 0; i < 51; i++) data[`field${i}`] = "value";
      const result = formSubmissionSchema.safeParse({ data });
      expect(result.success).toBe(false);
    });

    it("accepts exactly 50 keys", () => {
      const data: Record<string, string> = {};
      for (let i = 0; i < 50; i++) data[`field${i}`] = "value";
      const result = formSubmissionSchema.safeParse({ data });
      expect(result.success).toBe(true);
    });
  });

  describe("total payload size limits", () => {
    it("rejects total payload over 100KB", () => {
      // 25 fields * 4500 chars each = 112,500 bytes > 100,000
      const data: Record<string, string> = {};
      for (let i = 0; i < 25; i++) data[`field${i}`] = "x".repeat(4500);
      const result = formSubmissionSchema.safeParse({ data });
      expect(result.success).toBe(false);
    });

    it("accepts payload under 100KB", () => {
      const data: Record<string, string> = {};
      for (let i = 0; i < 10; i++) data[`field${i}`] = "x".repeat(100);
      const result = formSubmissionSchema.safeParse({ data });
      expect(result.success).toBe(true);
    });
  });

  describe("valid submission scenarios", () => {
    it("passes with typical contact form data", () => {
      const result = formSubmissionSchema.safeParse({
        data: {
          name: "Alice Johnson",
          email: "alice@example.com",
          subject: "Inquiry",
          message: "I would like to learn more about your services.",
        },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data.name).toBe("Alice Johnson");
        expect(result.data.data.email).toBe("alice@example.com");
      }
    });

    it("passes with a single field", () => {
      const result = formSubmissionSchema.safeParse({
        data: { email: "test@test.com" },
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing data field entirely", () => {
      const result = formSubmissionSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});

// ===========================================================================
// 5. Cron Authentication Pattern Tests (timing-safe comparison)
// ===========================================================================
describe("Cron Authentication Pattern (timing-safe comparison)", () => {
  // Replicate the exact auth check pattern from the cron routes:
  //   const expected = `Bearer ${cronSecret}`;
  //   const provided = authHeader || "";
  //   if (provided.length !== expected.length ||
  //       !timingSafeEqual(Buffer.from(provided), Buffer.from(expected)))
  //     -> unauthorized

  const CRON_SECRET = "test-cron-secret-abc123";

  function checkCronAuth(authHeader: string | null): boolean {
    const expected = `Bearer ${CRON_SECRET}`;
    const provided = authHeader || "";
    if (
      provided.length !== expected.length ||
      !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
    ) {
      return false;
    }
    return true;
  }

  it("succeeds with correct bearer token", () => {
    const header = `Bearer ${CRON_SECRET}`;
    expect(checkCronAuth(header)).toBe(true);
  });

  it("fails with wrong bearer token", () => {
    expect(checkCronAuth("Bearer wrong-secret")).toBe(false);
  });

  it("fails with missing authorization header (null)", () => {
    expect(checkCronAuth(null)).toBe(false);
  });

  it("fails with empty authorization header", () => {
    expect(checkCronAuth("")).toBe(false);
  });

  it("fails with correct secret but missing Bearer prefix", () => {
    expect(checkCronAuth(CRON_SECRET)).toBe(false);
  });

  it("fails with wrong length (short-circuits before timingSafeEqual)", () => {
    expect(checkCronAuth("Bearer short")).toBe(false);
  });

  it("fails with wrong length (too long)", () => {
    expect(checkCronAuth(`Bearer ${CRON_SECRET}extra-chars`)).toBe(false);
  });

  it("length check prevents timingSafeEqual from receiving mismatched buffers", () => {
    // Verify the length check is the first guard
    const expected = `Bearer ${CRON_SECRET}`;
    const wrongLength = "Bearer x";
    expect(wrongLength.length).not.toBe(expected.length);
    // timingSafeEqual would throw on mismatched lengths, but our check
    // prevents it from being called
    expect(checkCronAuth(wrongLength)).toBe(false);
  });

  it("timing-safe comparison works with same-length but different strings", () => {
    // Build a string of the exact same length as the correct token but different content
    const expected = `Bearer ${CRON_SECRET}`;
    const wrongSameLength = "Bearer " + "z".repeat(CRON_SECRET.length);
    expect(wrongSameLength.length).toBe(expected.length);
    expect(checkCronAuth(wrongSameLength)).toBe(false);
  });

  it("timingSafeEqual throws when buffer lengths differ (demonstrating why length check is needed)", () => {
    const buf1 = Buffer.from("short");
    const buf2 = Buffer.from("much-longer-string");
    expect(() => timingSafeEqual(buf1, buf2)).toThrow();
  });
});

// ===========================================================================
// 6. Webhook Schema Validation Tests
// ===========================================================================
describe("Webhook Schema Validation", () => {
  describe("webhookCreateSchema", () => {
    it("accepts HTTPS URLs with valid events", () => {
      const result = parseBody(webhookCreateSchema, {
        url: "https://example.com/webhook",
        events: ["page.published"],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.url).toBe("https://example.com/webhook");
        expect(result.data.events).toEqual(["page.published"]);
      }
    });

    it("accepts all four valid event types together", () => {
      const result = parseBody(webhookCreateSchema, {
        url: "https://hooks.example.com/ingest",
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

    it("rejects HTTP URLs (non-HTTPS)", () => {
      const result = parseBody(webhookCreateSchema, {
        url: "http://example.com/webhook",
        events: ["page.published"],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("HTTPS");
      }
    });

    it("rejects plain string that is not a URL", () => {
      const result = parseBody(webhookCreateSchema, {
        url: "not-a-url-at-all",
        events: ["page.published"],
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty events array", () => {
      const result = parseBody(webhookCreateSchema, {
        url: "https://example.com/hook",
        events: [],
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid event names", () => {
      const result = parseBody(webhookCreateSchema, {
        url: "https://example.com/hook",
        events: ["page.deleted"],
      });
      expect(result.success).toBe(false);
    });

    it("rejects mixed valid and invalid event names", () => {
      const result = parseBody(webhookCreateSchema, {
        url: "https://example.com/hook",
        events: ["page.published", "invalid.event"],
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing URL", () => {
      const result = parseBody(webhookCreateSchema, {
        events: ["page.published"],
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing events", () => {
      const result = parseBody(webhookCreateSchema, {
        url: "https://example.com/hook",
      });
      expect(result.success).toBe(false);
    });

    it("rejects URL exceeding max length (2000 chars)", () => {
      const longUrl = "https://example.com/" + "a".repeat(2000);
      const result = parseBody(webhookCreateSchema, {
        url: longUrl,
        events: ["page.published"],
      });
      expect(result.success).toBe(false);
    });

    it("rejects more than 4 events", () => {
      const result = parseBody(webhookCreateSchema, {
        url: "https://example.com/hook",
        events: [
          "page.published",
          "page.unpublished",
          "form.submitted",
          "site.updated",
          "page.published", // 5th element
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("webhookUpdateSchema", () => {
    it("accepts partial update with only url", () => {
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
        events: ["form.submitted"],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.events).toEqual(["form.submitted"]);
      }
    });

    it("accepts partial update with only active boolean", () => {
      const result = parseBody(webhookUpdateSchema, {
        active: false,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.active).toBe(false);
      }
    });

    it("accepts empty object (all fields optional)", () => {
      const result = parseBody(webhookUpdateSchema, {});
      expect(result.success).toBe(true);
    });

    it("accepts full update with all fields", () => {
      const result = parseBody(webhookUpdateSchema, {
        url: "https://updated.example.com/hook",
        events: ["page.published", "site.updated"],
        active: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.url).toBe("https://updated.example.com/hook");
        expect(result.data.events).toHaveLength(2);
        expect(result.data.active).toBe(true);
      }
    });

    it("rejects HTTP URL in update", () => {
      const result = parseBody(webhookUpdateSchema, {
        url: "http://insecure.example.com/hook",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("HTTPS");
      }
    });

    it("rejects invalid event in update", () => {
      const result = parseBody(webhookUpdateSchema, {
        events: ["page.published", "bogus.event"],
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-boolean active value", () => {
      const result = parseBody(webhookUpdateSchema, {
        active: "yes",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty events array in update", () => {
      const result = parseBody(webhookUpdateSchema, {
        events: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("webhookEventEnum", () => {
    it("accepts all 4 valid event types", () => {
      const validEvents = [
        "page.published",
        "page.unpublished",
        "form.submitted",
        "site.updated",
      ];
      for (const event of validEvents) {
        expect(webhookEventEnum.safeParse(event).success).toBe(true);
      }
    });

    it("rejects unknown event types", () => {
      const invalidEvents = [
        "page.deleted",
        "page.created",
        "user.registered",
        "site.deleted",
        "",
        "published",
      ];
      for (const event of invalidEvents) {
        expect(webhookEventEnum.safeParse(event).success).toBe(false);
      }
    });
  });
});

// ===========================================================================
// 7. Cross-cutting Integration Scenarios
// ===========================================================================
describe("Cross-cutting Integration Scenarios", () => {
  describe("full block update payload (blocks + title + optimistic lock)", () => {
    it("validates a realistic editor save payload", () => {
      const result = updateBlocksSchema.safeParse({
        title: "My Article",
        expectedUpdatedAt: "2025-06-15T14:30:00.000Z",
        blocks: [
          {
            id: "heading-1",
            type: "heading",
            content: { text: "Introduction", html: "<h1>Introduction</h1>", level: 1 },
            settings: { marginBottom: "24px" },
          },
          {
            id: "text-1",
            type: "text",
            content: { html: "<p>Welcome to my article about CMS architecture.</p>" },
            settings: { textColor: "#333333" },
          },
          {
            id: "image-1",
            type: "image",
            content: { src: "/uploads/architecture-diagram.png", alt: "Architecture diagram" },
            settings: { marginTop: "16px", marginBottom: "16px" },
          },
          {
            id: "columns-1",
            type: "columns",
            content: {
              columns: [
                {
                  blocks: [
                    {
                      id: "col-text-1",
                      type: "text",
                      content: { html: "<p>Left column content</p>" },
                      parentId: "columns-1",
                    },
                  ],
                },
                {
                  blocks: [
                    {
                      id: "col-text-2",
                      type: "text",
                      content: { html: "<p>Right column content</p>" },
                      parentId: "columns-1",
                    },
                  ],
                },
              ],
            },
            settings: { gap: 16 },
          },
          {
            id: "divider-1",
            type: "divider",
            content: {},
            settings: { marginTop: "32px", marginBottom: "32px" },
          },
          {
            id: "accordion-1",
            type: "accordion",
            content: {
              items: [
                { id: "faq-1", title: "What is Vellum?", content: "A modern CMS." },
                { id: "faq-2", title: "Is it free?", content: "Yes, open source." },
              ],
            },
            settings: {},
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("My Article");
        expect(result.data.expectedUpdatedAt).toBe("2025-06-15T14:30:00.000Z");
        expect(result.data.blocks).toHaveLength(6);
      }
    });
  });

  describe("block hierarchy + schema validation together", () => {
    it("schema accepts blocks that pass hierarchy validation", () => {
      const blocksPayload = {
        blocks: [
          {
            id: "col-1",
            type: "columns",
            content: {
              columns: [
                {
                  blocks: [
                    { id: "t1", type: "text", content: { html: "<p>hi</p>" } },
                    { id: "h1", type: "heading", content: { text: "Title" } },
                  ],
                },
              ],
            },
          },
        ],
      };

      // Schema validation passes
      const schemaResult = updateBlocksSchema.safeParse(blocksPayload);
      expect(schemaResult.success).toBe(true);

      // Hierarchy validation also passes
      const hierarchyBlocks = blocksPayload.blocks.map((b) => ({
        type: b.type,
        content: b.content as Record<string, unknown>,
      }));
      expect(validateBlockHierarchy(hierarchyBlocks)).toEqual({ valid: true });
    });

    it("hierarchy catches violations that schema alone would accept", () => {
      // The blockSchema validates that "form" is a valid type, and the columns
      // content schema validates nested blocks. But the hierarchy check ensures
      // form is not nested inside columns at the API level.
      const blocksPayload = [
        {
          type: "columns",
          content: {
            columns: [
              {
                blocks: [{ type: "form", content: { fields: [] } }],
              },
            ],
          },
        },
      ];

      // Hierarchy validation catches the violation
      const hierarchyResult = validateBlockHierarchy(blocksPayload);
      expect(hierarchyResult.valid).toBe(false);
      expect(hierarchyResult.error).toContain("form");
    });
  });

  describe("settings sanitization across multiple blocks", () => {
    it("strips malicious settings while preserving valid ones across blocks", () => {
      const result = updateBlocksSchema.safeParse({
        blocks: [
          {
            id: "b1",
            type: "heading",
            content: { text: "Title" },
            settings: { textColor: "#000", evilKey: "payload" },
          },
          {
            id: "b2",
            type: "text",
            content: { html: "<p>body</p>" },
            settings: { backgroundColor: "#fff", fontSize: "red; injection: true" },
          },
          {
            id: "b3",
            type: "image",
            content: { src: "/img.jpg" },
            settings: { hidden: true, marginTop: "16px" },
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const s1 = result.data.blocks![0].settings as Record<string, unknown>;
        expect(s1.textColor).toBe("#000");
        expect(s1).not.toHaveProperty("evilKey");

        const s2 = result.data.blocks![1].settings as Record<string, unknown>;
        expect(s2.backgroundColor).toBe("#fff");
        // "red; injection: true" contains semicolon, gets stripped
        expect(s2).not.toHaveProperty("fontSize");

        const s3 = result.data.blocks![2].settings as Record<string, unknown>;
        expect(s3.hidden).toBe(true);
        expect(s3.marginTop).toBe("16px");
      }
    });
  });
});
