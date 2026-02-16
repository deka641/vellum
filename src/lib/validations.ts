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

export const updateSiteSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
});

// --- Pages ---

export const createPageSchema = z.object({
  title: z.string().min(1).max(200),
  siteId: z.string().min(1),
  templateBlocks: z.array(blockSchema).optional(),
});

export const updatePageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
});

// --- Blocks endpoint ---

export const updateBlocksSchema = z.object({
  blocks: z.array(blockSchema).max(500).optional(),
  title: z.string().min(1).max(200).optional(),
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

// --- Register ---

export const registerSchema = z.object({
  name: z.string().max(200).optional().default(""),
  email: z.string().email().max(254),
  password: z.string().min(6).max(200),
});
