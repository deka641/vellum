import { describe, it, expect } from "vitest";
import {
  parseBody,
  validateBlockHierarchy,
  formSubmissionSchema,
  DISALLOWED_NESTED_TYPES,
  updateBlocksSchema,
  createSiteSchema,
  updatePageSchema,
  registerSchema,
  changePasswordSchema,
  bulkDeleteMediaSchema,
  RESERVED_SLUGS,
  blockTypeEnum,
} from "../validations";
import * as z from "zod";

describe("parseBody", () => {
  const schema = z.object({ name: z.string().min(1) });

  it("returns success with valid data", () => {
    const result = parseBody(schema, { name: "Test" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Test");
  });

  it("returns error with invalid data", () => {
    const result = parseBody(schema, { name: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeTruthy();
  });

  it("returns error for missing fields", () => {
    const result = parseBody(schema, {});
    expect(result.success).toBe(false);
  });

  it("returns error for wrong type", () => {
    const result = parseBody(schema, { name: 123 });
    expect(result.success).toBe(false);
  });

  it("includes path in error message", () => {
    const nestedSchema = z.object({ user: z.object({ name: z.string().min(1) }) });
    const result = parseBody(nestedSchema, { user: { name: "" } });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("user");
    }
  });

  it("returns success for valid nested data", () => {
    const nestedSchema = z.object({ user: z.object({ name: z.string() }) });
    const result = parseBody(nestedSchema, { user: { name: "Alice" } });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.user.name).toBe("Alice");
  });
});

describe("blockTypeEnum", () => {
  it("accepts all 15 block types", () => {
    const types = [
      "heading", "text", "image", "button", "spacer",
      "divider", "columns", "video", "quote", "form",
      "code", "social", "accordion", "toc", "table",
    ];
    for (const type of types) {
      expect(blockTypeEnum.safeParse(type).success).toBe(true);
    }
  });

  it("rejects unknown block types", () => {
    expect(blockTypeEnum.safeParse("unknown").success).toBe(false);
    expect(blockTypeEnum.safeParse("script").success).toBe(false);
    expect(blockTypeEnum.safeParse("").success).toBe(false);
  });
});

describe("blockSettingsSchema (via updateBlocksSchema)", () => {
  it("filters unknown setting keys", () => {
    const result = updateBlocksSchema.safeParse({
      blocks: [
        {
          id: "test1",
          type: "text",
          content: { html: "hello" },
          settings: {
            textColor: "#000",
            unknownKey: "evil",
            backgroundColor: "#fff",
          },
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const settings = result.data.blocks![0].settings as Record<
        string,
        unknown
      >;
      expect(settings.textColor).toBe("#000");
      expect(settings.backgroundColor).toBe("#fff");
      expect(settings).not.toHaveProperty("unknownKey");
    }
  });

  it("rejects CSS values with semicolons", () => {
    const result = updateBlocksSchema.safeParse({
      blocks: [
        {
          id: "test1",
          type: "text",
          content: { html: "hello" },
          settings: { textColor: "red; background: url(evil)" },
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const settings = result.data.blocks![0].settings as Record<
        string,
        unknown
      >;
      expect(settings).not.toHaveProperty("textColor");
    }
  });

  it("rejects CSS values with curly braces", () => {
    const result = updateBlocksSchema.safeParse({
      blocks: [
        {
          id: "test1",
          type: "text",
          content: { html: "hello" },
          settings: { textColor: "red} .evil{color:red" },
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const settings = result.data.blocks![0].settings as Record<
        string,
        unknown
      >;
      expect(settings).not.toHaveProperty("textColor");
    }
  });

  it("rejects CSS values with url(javascript:)", () => {
    const result = updateBlocksSchema.safeParse({
      blocks: [
        {
          id: "test1",
          type: "text",
          content: { html: "hello" },
          settings: { textColor: "url(javascript:alert(1))" },
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const settings = result.data.blocks![0].settings as Record<
        string,
        unknown
      >;
      // colon in javascript: fails the safeCssValuePattern
      expect(settings).not.toHaveProperty("textColor");
    }
  });

  it("rejects CSS values with angle brackets", () => {
    const result = updateBlocksSchema.safeParse({
      blocks: [
        {
          id: "test1",
          type: "text",
          content: { html: "hello" },
          settings: { textColor: "<script>" },
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const settings = result.data.blocks![0].settings as Record<
        string,
        unknown
      >;
      expect(settings).not.toHaveProperty("textColor");
    }
  });

  it("rejects CSS values over 200 characters", () => {
    const result = updateBlocksSchema.safeParse({
      blocks: [
        {
          id: "test1",
          type: "text",
          content: { html: "hello" },
          settings: { textColor: "a".repeat(201) },
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const settings = result.data.blocks![0].settings as Record<
        string,
        unknown
      >;
      expect(settings).not.toHaveProperty("textColor");
    }
  });

  it("allows valid CSS values", () => {
    const result = updateBlocksSchema.safeParse({
      blocks: [
        {
          id: "test1",
          type: "text",
          content: { html: "hello" },
          settings: {
            textColor: "#FF0000",
            fontSize: "16px",
            paddingY: "8px",
            hidden: true,
            marginTop: "24px",
          },
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const settings = result.data.blocks![0].settings as Record<
        string,
        unknown
      >;
      expect(settings.textColor).toBe("#FF0000");
      expect(settings.fontSize).toBe("16px");
      expect(settings.hidden).toBe(true);
    }
  });

  it("allows boolean and number values", () => {
    const result = updateBlocksSchema.safeParse({
      blocks: [
        {
          id: "test1",
          type: "text",
          content: { html: "hello" },
          settings: { hidden: true, gap: 16 },
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const settings = result.data.blocks![0].settings as Record<
        string,
        unknown
      >;
      expect(settings.hidden).toBe(true);
      expect(settings.gap).toBe(16);
    }
  });

  it("allows all 17 known setting keys", () => {
    const allSettings: Record<string, unknown> = {
      textColor: "#000",
      backgroundColor: "#fff",
      fontSize: "16px",
      paddingY: "8px",
      paddingX: "8px",
      marginTop: "16px",
      marginBottom: "16px",
      hidden: false,
      align: "center",
      style: "default",
      color: "blue",
      gap: 16,
      rounded: true,
      shadow: true,
      aspectRatio: "16-9",
      thickness: "2px",
      maxWidth: "800px",
    };
    const result = updateBlocksSchema.safeParse({
      blocks: [
        {
          id: "test1",
          type: "text",
          content: { html: "hello" },
          settings: allSettings,
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const settings = result.data.blocks![0].settings as Record<
        string,
        unknown
      >;
      expect(Object.keys(settings)).toHaveLength(17);
    }
  });

  it("defaults settings to empty object when undefined", () => {
    const result = updateBlocksSchema.safeParse({
      blocks: [
        {
          id: "test1",
          type: "text",
          content: { html: "hello" },
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.blocks![0].settings).toEqual({});
    }
  });

  it("passes through all allowed keys", () => {
    const result = updateBlocksSchema.safeParse({
      blocks: [
        {
          id: "test1",
          type: "text",
          content: { html: "hello" },
          settings: {
            textColor: "#000",
            backgroundColor: "#fff",
            fontSize: "16px",
            paddingY: "8px",
            paddingX: "8px",
            marginTop: "16px",
            marginBottom: "16px",
          },
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const settings = result.data.blocks![0].settings as Record<string, unknown>;
      expect(settings.textColor).toBe("#000");
      expect(settings.backgroundColor).toBe("#fff");
      expect(settings.fontSize).toBe("16px");
      expect(settings.paddingY).toBe("8px");
      expect(settings.paddingX).toBe("8px");
      expect(settings.marginTop).toBe("16px");
      expect(settings.marginBottom).toBe("16px");
    }
  });

  it("filters out multiple unknown keys", () => {
    const result = updateBlocksSchema.safeParse({
      blocks: [
        {
          id: "test1",
          type: "text",
          content: { html: "hello" },
          settings: {
            textColor: "#000",
            xssPayload: "alert(1)",
            malicious: "evil",
            __proto__: "bad",
          },
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const settings = result.data.blocks![0].settings as Record<string, unknown>;
      expect(settings.textColor).toBe("#000");
      expect(settings).not.toHaveProperty("xssPayload");
      expect(settings).not.toHaveProperty("malicious");
    }
  });

  it("rejects values containing angle brackets (<>)", () => {
    const result = updateBlocksSchema.safeParse({
      blocks: [
        {
          id: "test1",
          type: "text",
          content: { html: "hello" },
          settings: { backgroundColor: "red<img onerror=alert(1)>" },
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const settings = result.data.blocks![0].settings as Record<string, unknown>;
      expect(settings).not.toHaveProperty("backgroundColor");
    }
  });

  it("hidden boolean passes through correctly", () => {
    const result = updateBlocksSchema.safeParse({
      blocks: [
        {
          id: "test1",
          type: "text",
          content: { html: "hello" },
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

  it("empty settings object returns empty object", () => {
    const result = updateBlocksSchema.safeParse({
      blocks: [
        {
          id: "test1",
          type: "text",
          content: { html: "hello" },
          settings: {},
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.blocks![0].settings).toEqual({});
    }
  });
});

describe("validateBlockHierarchy", () => {
  it("accepts flat blocks", () => {
    const blocks = [
      { type: "heading", content: { text: "Hello" } },
      { type: "text", content: { html: "world" } },
    ];
    expect(validateBlockHierarchy(blocks)).toEqual({ valid: true });
  });

  it("accepts valid column blocks with allowed nested types", () => {
    const blocks = [
      {
        type: "columns",
        content: {
          columns: [
            { blocks: [{ type: "text", content: { html: "hello" } }] },
            {
              blocks: [{ type: "heading", content: { text: "world" } }],
            },
          ],
        },
      },
    ];
    expect(validateBlockHierarchy(blocks)).toEqual({ valid: true });
  });

  it("rejects columns nested inside columns", () => {
    const blocks = [
      {
        type: "columns",
        content: {
          columns: [
            {
              blocks: [
                {
                  type: "columns",
                  content: { columns: [] },
                },
              ],
            },
          ],
        },
      },
    ];
    const result = validateBlockHierarchy(blocks);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("columns");
  });

  it("rejects form inside columns", () => {
    const blocks = [
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
    expect(validateBlockHierarchy(blocks).valid).toBe(false);
  });

  it("rejects video inside columns", () => {
    const blocks = [
      {
        type: "columns",
        content: {
          columns: [
            {
              blocks: [{ type: "video", content: { url: "" } }],
            },
          ],
        },
      },
    ];
    expect(validateBlockHierarchy(blocks).valid).toBe(false);
  });

  it("rejects table inside columns", () => {
    const blocks = [
      {
        type: "columns",
        content: {
          columns: [
            {
              blocks: [{ type: "table", content: {} }],
            },
          ],
        },
      },
    ];
    expect(validateBlockHierarchy(blocks).valid).toBe(false);
  });

  it("DISALLOWED_NESTED_TYPES contains expected types", () => {
    expect(DISALLOWED_NESTED_TYPES).toContain("columns");
    expect(DISALLOWED_NESTED_TYPES).toContain("form");
    expect(DISALLOWED_NESTED_TYPES).toContain("video");
    expect(DISALLOWED_NESTED_TYPES).toContain("table");
    expect(DISALLOWED_NESTED_TYPES).toHaveLength(4);
  });

  it("accepts image/button/quote/etc inside columns", () => {
    const allowedTypes = [
      "heading",
      "text",
      "image",
      "button",
      "spacer",
      "divider",
      "quote",
      "code",
      "social",
      "accordion",
      "toc",
    ];
    for (const type of allowedTypes) {
      const blocks = [
        {
          type: "columns",
          content: {
            columns: [
              { blocks: [{ type, content: {} }] },
            ],
          },
        },
      ];
      expect(validateBlockHierarchy(blocks).valid).toBe(true);
    }
  });

  it("accepts empty columns array", () => {
    const blocks = [
      {
        type: "columns",
        content: { columns: [] },
      },
    ];
    expect(validateBlockHierarchy(blocks)).toEqual({ valid: true });
  });

  it("accepts columns with no blocks key", () => {
    const blocks = [
      {
        type: "columns",
        content: { columns: [{}] },
      },
    ];
    expect(validateBlockHierarchy(blocks)).toEqual({ valid: true });
  });

  it("accepts empty blocks array", () => {
    expect(validateBlockHierarchy([])).toEqual({ valid: true });
  });

  it("includes block type name in error message", () => {
    const blocks = [
      {
        type: "columns",
        content: {
          columns: [
            { blocks: [{ type: "form", content: {} }] },
          ],
        },
      },
    ];
    const result = validateBlockHierarchy(blocks);
    expect(result.error).toContain("form");
    expect(result.error).toContain("not allowed inside columns");
  });
});

describe("formSubmissionSchema", () => {
  it("accepts valid form data", () => {
    const result = formSubmissionSchema.safeParse({
      data: { name: "John", email: "john@example.com" },
    });
    expect(result.success).toBe(true);
  });

  it("neutralizes __proto__ key (Zod strips it from parsed output)", () => {
    // Zod's z.record drops __proto__ during parsing (moved to prototype chain, not own property)
    // so the key effectively never reaches the refine validator — but the data is safe
    const data = Object.fromEntries([["__proto__", "evil"]]);
    const result = formSubmissionSchema.safeParse({ data });
    // Passes validation because Zod silently drops __proto__
    expect(result.success).toBe(true);
    if (result.success) {
      // The __proto__ key is NOT in the parsed data as an own property
      expect(Object.keys(result.data.data)).not.toContain("__proto__");
    }
  });

  it("rejects constructor key", () => {
    const result = formSubmissionSchema.safeParse({
      data: { constructor: "evil" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects prototype key", () => {
    const result = formSubmissionSchema.safeParse({
      data: { prototype: "evil" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects too many keys (>50)", () => {
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

  it("rejects field values over 5000 chars", () => {
    const result = formSubmissionSchema.safeParse({
      data: { name: "x".repeat(5001) },
    });
    expect(result.success).toBe(false);
  });

  it("accepts field values at exactly 5000 chars", () => {
    const result = formSubmissionSchema.safeParse({
      data: { name: "x".repeat(5000) },
    });
    expect(result.success).toBe(true);
  });

  it("rejects total payload over 100KB", () => {
    const data: Record<string, string> = {};
    for (let i = 0; i < 25; i++) data[`field${i}`] = "x".repeat(4500);
    const result = formSubmissionSchema.safeParse({ data });
    expect(result.success).toBe(false);
  });

  it("rejects keys over 100 chars", () => {
    const result = formSubmissionSchema.safeParse({
      data: { ["k".repeat(101)]: "value" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts keys at exactly 100 chars", () => {
    const result = formSubmissionSchema.safeParse({
      data: { ["k".repeat(100)]: "value" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty keys", () => {
    const result = formSubmissionSchema.safeParse({
      data: { "": "value" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing data field", () => {
    const result = formSubmissionSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("createSiteSchema", () => {
  it("accepts valid site creation", () => {
    const result = createSiteSchema.safeParse({
      name: "My Blog",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createSiteSchema.safeParse({
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name over 200 chars", () => {
    const result = createSiteSchema.safeParse({
      name: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects reserved slug names", () => {
    // The schema converts name -> slug via: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
    // _next becomes "next" which is NOT in RESERVED_SLUGS, so we skip it
    const slugsThatMapToReserved = RESERVED_SLUGS.filter((slug) => {
      const generated = slug
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      return RESERVED_SLUGS.includes(generated);
    });
    for (const slug of slugsThatMapToReserved) {
      const result = createSiteSchema.safeParse({ name: slug });
      expect(result.success).toBe(false);
    }
  });

  it("accepts valid starter pages", () => {
    const result = createSiteSchema.safeParse({
      name: "My Blog",
      starterPages: ["homepage", "about", "contact"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid starter pages", () => {
    const result = createSiteSchema.safeParse({
      name: "My Blog",
      starterPages: ["nonexistent"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid theme", () => {
    const result = createSiteSchema.safeParse({
      name: "My Blog",
      theme: {
        colors: {
          primary: "#6366F1",
          background: "#FAF9F7",
          surface: "#FFFFFF",
          text: "#1C1917",
        },
        fontPreset: "modern",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid hex color", () => {
    const result = createSiteSchema.safeParse({
      name: "My Blog",
      theme: {
        colors: {
          primary: "not-a-color",
          background: "#FAF9F7",
          surface: "#FFFFFF",
          text: "#1C1917",
        },
        fontPreset: "modern",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid font preset", () => {
    const result = createSiteSchema.safeParse({
      name: "My Blog",
      theme: {
        colors: {
          primary: "#6366F1",
          background: "#FAF9F7",
          surface: "#FFFFFF",
          text: "#1C1917",
        },
        fontPreset: "invalid",
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("updatePageSchema", () => {
  it("accepts valid page update", () => {
    const result = updatePageSchema.safeParse({
      title: "My Page",
      description: "A description",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid slug", () => {
    const result = updatePageSchema.safeParse({
      slug: "my-page",
    });
    expect(result.success).toBe(true);
  });

  it("rejects slug with uppercase", () => {
    const result = updatePageSchema.safeParse({
      slug: "My-Page",
    });
    expect(result.success).toBe(false);
  });

  it("rejects slug with spaces", () => {
    const result = updatePageSchema.safeParse({
      slug: "my page",
    });
    expect(result.success).toBe(false);
  });

  it("rejects reserved slugs", () => {
    const result = updatePageSchema.safeParse({
      slug: "api",
    });
    expect(result.success).toBe(false);
  });

  it("rejects title over 200 chars", () => {
    const result = updatePageSchema.safeParse({
      title: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("accepts SEO fields", () => {
    const result = updatePageSchema.safeParse({
      metaTitle: "SEO Title",
      ogImage: "https://example.com/img.jpg",
      noindex: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts null for nullable fields", () => {
    const result = updatePageSchema.safeParse({
      description: null,
      metaTitle: null,
      ogImage: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("registerSchema", () => {
  it("accepts valid registration", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password over 200 chars", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      password: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("defaults name to empty string", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("");
    }
  });
});

describe("changePasswordSchema", () => {
  it("accepts valid password change", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old-password",
      newPassword: "new-password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty current password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "",
      newPassword: "new-password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short new password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old-password",
      newPassword: "short",
    });
    expect(result.success).toBe(false);
  });
});

describe("bulkDeleteMediaSchema", () => {
  it("accepts valid ids array", () => {
    const result = bulkDeleteMediaSchema.safeParse({
      ids: ["id1", "id2"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty ids array", () => {
    const result = bulkDeleteMediaSchema.safeParse({
      ids: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 100 ids", () => {
    const ids = Array.from({ length: 101 }, (_, i) => `id${i}`);
    const result = bulkDeleteMediaSchema.safeParse({ ids });
    expect(result.success).toBe(false);
  });

  it("rejects empty string ids", () => {
    const result = bulkDeleteMediaSchema.safeParse({
      ids: [""],
    });
    expect(result.success).toBe(false);
  });
});

describe("RESERVED_SLUGS", () => {
  it("contains expected reserved slugs", () => {
    expect(RESERVED_SLUGS).toContain("api");
    expect(RESERVED_SLUGS).toContain("admin");
    expect(RESERVED_SLUGS).toContain("editor");
    expect(RESERVED_SLUGS).toContain("login");
    expect(RESERVED_SLUGS).toContain("register");
    expect(RESERVED_SLUGS).toContain("settings");
    expect(RESERVED_SLUGS).toContain("media");
    expect(RESERVED_SLUGS).toContain("templates");
    expect(RESERVED_SLUGS).toContain("preview");
    expect(RESERVED_SLUGS).toContain("s");
    expect(RESERVED_SLUGS).toContain("uploads");
    expect(RESERVED_SLUGS).toContain("_next");
  });
});

describe("updateBlocksSchema", () => {
  it("accepts valid blocks", () => {
    const result = updateBlocksSchema.safeParse({
      blocks: [
        {
          id: "abc123",
          type: "text",
          content: { html: "<p>Hello</p>" },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional title", () => {
    const result = updateBlocksSchema.safeParse({
      title: "Page Title",
      blocks: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional expectedUpdatedAt", () => {
    const result = updateBlocksSchema.safeParse({
      blocks: [],
      expectedUpdatedAt: "2024-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects blocks with empty id", () => {
    const result = updateBlocksSchema.safeParse({
      blocks: [
        {
          id: "",
          type: "text",
          content: { html: "hello" },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects blocks with invalid type", () => {
    const result = updateBlocksSchema.safeParse({
      blocks: [
        {
          id: "abc",
          type: "invalid-type",
          content: {},
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 500 blocks", () => {
    const blocks = Array.from({ length: 501 }, (_, i) => ({
      id: `block${i}`,
      type: "text",
      content: { html: "hello" },
    }));
    const result = updateBlocksSchema.safeParse({ blocks });
    expect(result.success).toBe(false);
  });

  it("accepts blocks with parentId", () => {
    const result = updateBlocksSchema.safeParse({
      blocks: [
        {
          id: "child1",
          type: "text",
          content: { html: "hello" },
          parentId: "parent1",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts blocks with null parentId", () => {
    const result = updateBlocksSchema.safeParse({
      blocks: [
        {
          id: "block1",
          type: "text",
          content: { html: "hello" },
          parentId: null,
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
