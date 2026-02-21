import * as z from "zod";

// --- Helper ---

export function parseBody<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const issue = result.error.issues[0];
  const path = issue.path.length > 0 ? issue.path.join(".") + ": " : "";
  return { success: false, error: `${path}${issue.message}` };
}

// --- Blocks (shared) ---

const blockTypeEnum = z.enum([
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
]);

// Allowlisted block setting keys and safe value patterns
const ALLOWED_SETTING_KEYS = new Set([
  "textColor", "backgroundColor", "fontSize", "paddingY", "paddingX",
  "marginTop", "marginBottom", "hidden", "align", "style", "color",
  "gap", "rounded", "shadow", "aspectRatio", "thickness", "maxWidth",
]);

const safeCssValuePattern = /^[a-zA-Z0-9#.,% ()_-]+$/;

const blockSettingsSchema = z.record(z.string(), z.unknown()).optional().default({}).transform((settings) => {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(settings)) {
    if (!ALLOWED_SETTING_KEYS.has(key)) continue;
    if (typeof value === "boolean" || typeof value === "number") {
      filtered[key] = value;
    } else if (typeof value === "string") {
      // Block CSS injection: only allow safe patterns
      if (safeCssValuePattern.test(value) && value.length <= 200) {
        filtered[key] = value;
      }
    }
  }
  return filtered;
});

// Per-block-type content schemas — validates top-level keys to prevent arbitrary JSON storage
const headingContentSchema = z.object({ text: z.string().optional(), level: z.number().optional() }).passthrough();
const textContentSchema = z.object({ html: z.string().optional() }).passthrough();
const imageContentSchema = z.object({ src: z.string().optional(), alt: z.string().optional() }).passthrough();
const buttonContentSchema = z.object({ text: z.string().optional(), url: z.string().optional() }).passthrough();
const spacerContentSchema = z.object({ height: z.union([z.string(), z.number()]).optional() }).passthrough();
const dividerContentSchema = z.object({}).passthrough();
const columnsContentSchema = z.object({ columns: z.array(z.object({ blocks: z.array(z.lazy(() => blockSchema)).optional() }).passthrough()).optional() }).passthrough();
const videoContentSchema = z.object({ url: z.string().optional() }).passthrough();
const quoteContentSchema = z.object({ text: z.string().optional(), attribution: z.string().optional() }).passthrough();
const formContentSchema = z.object({ fields: z.array(z.record(z.string(), z.unknown())).optional(), submitText: z.string().optional() }).passthrough();
const codeContentSchema = z.object({ code: z.string().optional(), language: z.string().optional() }).passthrough();
const socialContentSchema = z.object({ links: z.array(z.object({ platform: z.string(), url: z.string() }).passthrough()).optional() }).passthrough();
const accordionContentSchema = z.object({ items: z.array(z.object({ id: z.string(), title: z.string(), content: z.string() }).passthrough()).optional() }).passthrough();
const tocContentSchema = z.object({}).passthrough();
const tableContentSchema = z.object({ headers: z.array(z.string()).optional(), rows: z.array(z.array(z.string())).optional(), caption: z.string().optional(), striped: z.boolean().optional() }).passthrough();

const blockContentByType: Record<string, z.ZodType> = {
  heading: headingContentSchema,
  text: textContentSchema,
  image: imageContentSchema,
  button: buttonContentSchema,
  spacer: spacerContentSchema,
  divider: dividerContentSchema,
  columns: columnsContentSchema,
  video: videoContentSchema,
  quote: quoteContentSchema,
  form: formContentSchema,
  code: codeContentSchema,
  social: socialContentSchema,
  accordion: accordionContentSchema,
  toc: tocContentSchema,
  table: tableContentSchema,
};

interface ParsedBlock {
  id: string;
  type: string;
  content: Record<string, unknown>;
  settings?: Record<string, unknown>;
  parentId?: string | null;
}

const blockSchema: z.ZodType<ParsedBlock> = z.object({
  id: z.string().min(1).max(100),
  type: blockTypeEnum,
  content: z.record(z.string(), z.unknown()),
  settings: blockSettingsSchema,
  parentId: z.string().nullable().optional(),
}).superRefine((block, ctx) => {
  const schema = blockContentByType[block.type];
  if (schema) {
    const result = schema.safeParse(block.content);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({
          ...issue,
          path: ["content", ...issue.path],
        });
      }
    }
  }
});

// --- Reserved slugs ---

export const RESERVED_SLUGS = [
  "api", "admin", "editor", "login", "register", "settings",
  "media", "templates", "preview", "s", "uploads", "_next",
];

// --- Sites ---

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const fontPresetEnum = z.enum(["modern", "clean", "classic", "bold", "elegant"]);

export const siteThemeSchema = z.object({
  colors: z.object({
    primary: hexColorSchema,
    background: hexColorSchema,
    surface: hexColorSchema,
    text: hexColorSchema,
  }),
  fontPreset: fontPresetEnum,
});

export const createSiteSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  theme: siteThemeSchema.optional(),
  starterPages: z.array(z.enum(["homepage", "about", "contact"])).optional(),
}).refine(
  (data) => {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return !RESERVED_SLUGS.includes(slug);
  },
  { message: "This name would create a reserved URL slug. Please choose a different name.", path: ["name"] }
);

export const siteFooterSchema = z.object({
  text: z.string().max(500).optional(),
  description: z.string().max(1000).optional(),
  links: z.array(z.object({
    label: z.string().min(1).max(200),
    url: z.string().max(2000),
  })).max(10).optional(),
  columns: z.array(z.object({
    title: z.string().max(200).optional(),
    links: z.array(z.object({
      label: z.string().min(1).max(200),
      url: z.string().max(2000),
    })).max(10),
  })).max(4).optional(),
  socialLinks: z.array(z.object({
    platform: z.string().min(1).max(50),
    url: z.string().max(2000),
  })).max(10).optional(),
  showBranding: z.boolean().optional(),
});

export const updateSiteSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  theme: siteThemeSchema.optional(),
  favicon: z.string().max(2000).nullable().optional(),
  footer: siteFooterSchema.optional(),
  notificationEmail: z.string().email().max(254).nullable().optional(),
});

// --- Import ---

const importPageSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().max(200).optional().default(""),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  isHomepage: z.boolean().optional(),
  showInNav: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  metaTitle: z.string().max(200).nullable().optional(),
  ogImage: z.string().max(2000).nullable().optional(),
  noindex: z.boolean().optional(),
  blocks: z.array(z.object({
    type: blockTypeEnum,
    content: z.record(z.string(), z.unknown()),
    settings: z.record(z.string(), z.unknown()).optional().default({}),
    sortOrder: z.number().int().optional(),
    parentId: z.string().nullable().optional(),
  })).max(500).optional().default([]),
});

export const importSiteSchema = z.object({
  version: z.number().int().min(1),
  site: z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).nullable().optional(),
    theme: siteThemeSchema.optional(),
    footer: siteFooterSchema.optional(),
  }),
  pages: z.array(importPageSchema).max(200),
});

// --- Pages ---

const templateBlockSchema = z.object({
  id: z.string().min(1).max(100).optional(),
  type: blockTypeEnum,
  content: z.record(z.string(), z.unknown()),
  settings: blockSettingsSchema,
  parentId: z.string().nullable().optional(),
});

export const createPageSchema = z.object({
  title: z.string().min(1).max(200),
  siteId: z.string().min(1),
  templateBlocks: z.array(templateBlockSchema).optional(),
  sourcePageId: z.string().min(1).optional(),
});

export const updatePageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  slug: z.string().min(1).max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens")
    .refine((s) => !RESERVED_SLUGS.includes(s), "This slug is reserved and cannot be used")
    .optional(),
  metaTitle: z.string().max(200).nullable().optional(),
  ogImage: z.string().max(2000).nullable().optional(),
  noindex: z.boolean().optional(),
  scheduledAt: z.string().optional().refine(
    (val) => {
      if (!val) return true;
      const date = new Date(val);
      if (isNaN(date.getTime())) return false;
      const now = new Date();
      if (date.getTime() < now.getTime() - 60_000) return false; // allow 1 min grace
      const oneYear = new Date(now);
      oneYear.setFullYear(oneYear.getFullYear() + 1);
      if (date.getTime() > oneYear.getTime()) return false;
      return true;
    },
    { message: "Scheduled date must be a valid ISO date, not in the past, and at most 1 year in the future" }
  ),
});

// --- Blocks endpoint ---

export const updateBlocksSchema = z.object({
  blocks: z.array(blockSchema).max(500).optional(),
  title: z.string().min(1).max(200).optional(),
  expectedUpdatedAt: z.string().min(1).optional(),
});

// --- Media ---

export const updateMediaSchema = z.object({
  alt: z.string().max(1000),
});

export const bulkDeleteMediaSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
});

// --- Templates ---

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  category: z.string().max(100).optional().default("general"),
  blocks: z.array(blockSchema).optional(),
});

// --- Navigation ---

export const updateNavigationSchema = z.object({
  pages: z.array(
    z.object({
      id: z.string().min(1),
      sortOrder: z.number().int().min(0),
      showInNav: z.boolean(),
    })
  ).min(1).max(500),
});

// --- Register ---

export const registerSchema = z.object({
  name: z.string().max(200).optional().default(""),
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
});

// --- User Profile ---

export const updateProfileSchema = z.object({
  name: z.string().max(200),
  email: z.string().email().max(254),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
});

// --- Form Submissions ---

const FORBIDDEN_KEYS = ["__proto__", "constructor", "prototype"];

const safeFormKeySchema = z.string().min(1).max(100).refine(
  (key) => !FORBIDDEN_KEYS.includes(key),
  { message: "Invalid field key" }
);

export const formSubmissionSchema = z.object({
  data: z.record(safeFormKeySchema, z.string().max(10000)).refine(
    (data) => Object.keys(data).length <= 50,
    { message: "Too many form fields (max 50)" }
  ),
});

// --- Password Reset ---

export const forgotPasswordSchema = z.object({
  email: z.string().email().max(254),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1).max(200),
  password: z.string().min(8).max(200),
});

// --- Block hierarchy validation ---

export const DISALLOWED_NESTED_TYPES = ["columns", "form", "video", "table"];

interface BlockLike {
  type: string;
  content: Record<string, unknown>;
}

export function validateBlockHierarchy(
  blocks: BlockLike[]
): { valid: boolean; error?: string } {
  for (const block of blocks) {
    if (block.type === "columns") {
      const columns = (block.content.columns || []) as Array<{ blocks?: BlockLike[] }>;
      for (const col of columns) {
        if (!Array.isArray(col.blocks)) continue;
        for (const nested of col.blocks) {
          if (DISALLOWED_NESTED_TYPES.includes(nested.type)) {
            return {
              valid: false,
              error: `Block type "${nested.type}" is not allowed inside columns`,
            };
          }
        }
      }
    }
  }
  return { valid: true };
}
