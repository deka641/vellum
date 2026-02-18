import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";
import { generateId, slugify } from "@/lib/utils";
import { sanitizeBlocks } from "@/lib/sanitize";
import { validateBlockHierarchy } from "@/lib/validations";
import { logger } from "@/lib/logger";

interface ImportBlock {
  type: string;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
  sortOrder: number;
  parentId?: string | null;
}

interface ImportPage {
  title: string;
  slug: string;
  description?: string | null;
  status?: string;
  isHomepage?: boolean;
  showInNav?: boolean;
  sortOrder?: number;
  metaTitle?: string | null;
  ogImage?: string | null;
  noindex?: boolean;
  blocks: ImportBlock[];
}

interface ImportData {
  version: number;
  site: {
    name: string;
    description?: string | null;
    theme?: unknown;
    footer?: unknown;
  };
  pages: ImportPage[];
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`site-import:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    let body: ImportData;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Validate structure
    if (!body.version || !body.site?.name || !Array.isArray(body.pages)) {
      return NextResponse.json(
        { error: "Invalid export format. Expected { version, site, pages }." },
        { status: 400 }
      );
    }

    if (body.pages.length > 200) {
      return NextResponse.json(
        { error: "Too many pages (max 200)" },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Generate unique slug
    let baseSlug = slugify(body.site.name);
    if (!baseSlug) baseSlug = "imported-site";
    let slug = baseSlug;
    let suffix = 1;
    while (await db.site.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
      if (suffix > 100) {
        return NextResponse.json({ error: "Could not generate unique slug" }, { status: 409 });
      }
    }

    // Create site and pages in a transaction
    const site = await db.$transaction(async (tx) => {
      const newSite = await tx.site.create({
        data: {
          name: body.site.name,
          slug,
          description: body.site.description || null,
          theme: (body.site.theme as object) || {},
          footer: (body.site.footer as object) || {},
          userId,
        },
      });

      for (let i = 0; i < body.pages.length; i++) {
        const pageData = body.pages[i];

        // Validate blocks
        const hierarchy = validateBlockHierarchy(
          pageData.blocks as Array<{ type: string; content: Record<string, unknown> }>
        );
        if (!hierarchy.valid) {
          logger.warn("POST /api/sites/import", `Skipping invalid blocks for page "${pageData.title}": ${hierarchy.error}`);
        }

        const sanitized = sanitizeBlocks(pageData.blocks);

        // Ensure unique slug within site
        let pageSlug = slugify(pageData.slug || pageData.title);
        if (!pageSlug) pageSlug = `page-${i + 1}`;

        const page = await tx.page.create({
          data: {
            title: pageData.title || `Page ${i + 1}`,
            slug: pageSlug,
            description: pageData.description || null,
            status: "DRAFT",
            isHomepage: pageData.isHomepage === true && i === body.pages.findIndex((p) => p.isHomepage),
            showInNav: pageData.showInNav !== false,
            sortOrder: pageData.sortOrder ?? i,
            metaTitle: pageData.metaTitle || null,
            ogImage: null,
            noindex: pageData.noindex === true,
            siteId: newSite.id,
          },
        });

        if (sanitized.length > 0) {
          await tx.block.createMany({
            data: sanitized.map((block, bi) => ({
              id: generateId(),
              type: block.type,
              content: block.content as object,
              settings: (block.settings as object) || {},
              sortOrder: bi,
              parentId: block.parentId || null,
              pageId: page.id,
            })),
          });
        }
      }

      return newSite;
    });

    revalidateTag("dashboard", { expire: 0 });

    return NextResponse.json({
      id: site.id,
      name: site.name,
      slug: site.slug,
      pageCount: body.pages.length,
    }, { status: 201 });
  } catch (error) {
    return apiError("POST /api/sites/import", error);
  }
}
