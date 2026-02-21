import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";
import { generateId, slugify } from "@/lib/utils";
import { sanitizeBlocks } from "@/lib/sanitize";
import { parseBody, importSiteSchema, validateBlockHierarchy } from "@/lib/validations";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`site-import:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseBody(importSiteSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const importData = parsed.data;

    const userId = session.user.id;

    // Create site and pages in a transaction
    const site = await db.$transaction(async (tx) => {
      // Generate unique slug inside transaction to prevent race conditions
      let baseSlug = slugify(importData.site.name);
      if (!baseSlug) baseSlug = "imported-site";
      let slug = baseSlug;
      let suffix = 1;
      while (await tx.site.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${suffix}`;
        suffix++;
        if (suffix > 100) {
          throw new Error("Could not generate unique slug");
        }
      }

      const newSite = await tx.site.create({
        data: {
          name: importData.site.name,
          slug,
          description: importData.site.description || null,
          theme: (importData.site.theme as object) || {},
          footer: (importData.site.footer as object) || {},
          userId,
        },
      });

      for (let i = 0; i < importData.pages.length; i++) {
        const pageData = importData.pages[i];

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
            isHomepage: pageData.isHomepage === true && i === importData.pages.findIndex((p) => p.isHomepage),
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
      pageCount: importData.pages.length,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Could not generate unique slug") {
      return NextResponse.json({ error: "Could not generate unique slug" }, { status: 409 });
    }
    return apiError("POST /api/sites/import", error);
  }
}
