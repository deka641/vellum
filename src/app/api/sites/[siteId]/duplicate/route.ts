import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseBody, duplicateSiteSchema, RESERVED_SLUGS } from "@/lib/validations";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";
import { sanitizeBlocks } from "@/lib/sanitize";
import { generateId } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import { logActivity } from "@/lib/activity";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const rl = rateLimit(`sites-mut:${userId}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { siteId } = await params;

    let body = {};
    try {
      body = await req.json();
    } catch {
      // Optional body — default name will be used
    }

    const parsed = parseBody(duplicateSiteSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    // Fetch source site with all pages and blocks
    const sourceSite = await db.site.findFirst({
      where: { id: siteId, userId },
      include: {
        pages: {
          where: { deletedAt: null },
          include: {
            blocks: { orderBy: { sortOrder: "asc" } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!sourceSite) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (sourceSite.pages.length > 200) {
      return NextResponse.json(
        { error: "Site has too many pages to duplicate (max 200)" },
        { status: 400 }
      );
    }

    const newName = parsed.data.name || `${sourceSite.name} (Copy)`;

    // Generate slug with P2002 retry loop
    let newSite;
    for (let attempt = 0; attempt < 3; attempt++) {
      const baseSlug = newName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${generateId().slice(0, 6)}`;

      if (RESERVED_SLUGS.includes(slug)) continue;

      try {
        newSite = await db.$transaction(async (tx) => {
          // Create the new site
          const site = await tx.site.create({
            data: {
              name: newName,
              slug,
              description: sourceSite.description,
              favicon: sourceSite.favicon,
              logo: sourceSite.logo,
              notificationEmail: sourceSite.notificationEmail,
              theme: (sourceSite.theme || {}) as Prisma.InputJsonValue,
              footer: (sourceSite.footer || {}) as Prisma.InputJsonValue,
              customHead: sourceSite.customHead,
              customFooter: sourceSite.customFooter,
              userId,
            },
          });

          // Duplicate all pages with blocks
          for (const page of sourceSite.pages) {
            // Build block ID map for remapping parentId references
            const idMap = new Map<string, string>();
            const newBlocks = page.blocks.map((block) => {
              const newId = generateId();
              idMap.set(block.id, newId);
              return { ...block, newId };
            });

            const newPage = await tx.page.create({
              data: {
                title: page.title,
                slug: page.slug,
                description: page.description,
                metaTitle: page.metaTitle,
                ogImage: page.ogImage,
                noindex: page.noindex,
                status: "DRAFT",
                isHomepage: page.isHomepage,
                showInNav: page.showInNav,
                sortOrder: page.sortOrder,
                siteId: site.id,
              },
            });

            if (newBlocks.length > 0) {
              const sanitizedBlocks = sanitizeBlocks(
                newBlocks.map((b) => ({
                  type: b.type,
                  content: b.content as Record<string, unknown>,
                  settings: b.settings as Record<string, unknown>,
                  parentId: b.parentId,
                }))
              );

              await tx.block.createMany({
                data: newBlocks.map((b, i) => ({
                  id: b.newId,
                  type: sanitizedBlocks[i].type,
                  content: sanitizedBlocks[i].content as Prisma.InputJsonValue,
                  settings: (sanitizedBlocks[i].settings || {}) as Prisma.InputJsonValue,
                  sortOrder: b.sortOrder,
                  pageId: newPage.id,
                  parentId: b.parentId ? (idMap.get(b.parentId) || null) : null,
                })),
              });
            }
          }

          return site;
        });

        break; // Success
      } catch (err: unknown) {
        const prismaErr = err as { code?: string };
        if (prismaErr.code === "P2002" && attempt < 2) {
          continue; // Retry with different slug
        }
        throw err;
      }
    }

    if (!newSite) {
      return NextResponse.json(
        { error: "Could not generate a unique URL for this site. Please try a different name." },
        { status: 409 }
      );
    }

    revalidateTag("dashboard", { expire: 0 });
    logger.info("POST /api/sites/[siteId]/duplicate", `Site ${siteId} duplicated as ${newSite.id}`);
    logActivity({
      userId,
      siteId: newSite.id,
      action: "site.duplicate",
      details: { sourceSiteId: siteId, name: newSite.name },
    });

    return NextResponse.json(newSite, { status: 201 });
  } catch (error) {
    return apiError("POST /api/sites/[siteId]/duplicate", error);
  }
}
