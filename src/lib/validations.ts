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
]);

const blockSchema = z.object({
  id: z.string().min(1).max(100),
  type: blockTypeEnum,
  content: z.record(z.string(), z.unknown()),
  settings: z.record(z.string(), z.unknown()).optional().default({}),
  parentId: z.string().nullable().optional(),
});

// --- Sites ---

export const createSiteSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
});

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

export const updateSiteSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  theme: siteThemeSchema.optional(),
  favicon: z.string().max(2000).nullable().optional(),
});

// --- Pages ---

const templateBlockSchema = z.object({
  id: z.string().min(1).max(100).optional(),
  type: blockTypeEnum,
  content: z.record(z.string(), z.unknown()),
  settings: z.record(z.string(), z.unknown()).optional().default({}),
  parentId: z.string().nullable().optional(),
});

export const createPageSchema = z.object({
  title: z.string().min(1).max(200),
  siteId: z.string().min(1),
  templateBlocks: z.array(templateBlockSchema).optional(),
});

export const updatePageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  slug: z.string().min(1).max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens")
    .optional(),
});

// --- Blocks endpoint ---

export const updateBlocksSchema = z.object({
  blocks: z.array(blockSchema).max(500).optional(),
  title: z.string().min(1).max(200).optional(),
  expectedUpdatedAt: z.string().optional(),
});

// --- Media ---

export const updateMediaSchema = z.object({
  alt: z.string().max(1000),
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
  password: z.string().min(6).max(200),
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

export const formSubmissionSchema = z.object({
  data: z.record(z.string(), z.string().max(10000)),
});
