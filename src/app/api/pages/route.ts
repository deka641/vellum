import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify, generateId } from "@/lib/utils";
import { sanitizeBlocks, sanitizePlainText } from "@/lib/sanitize";
import { Prisma } from "@prisma/client";
import { parseBody, createPageSchema, validateBlockHierarchy } from "@/lib/validations";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");

    if (!siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 });
    }

    const site = await db.site.findFirst({
      where: { id: siteId, userId: session.user.id },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const includeDeleted = searchParams.get("includeDeleted") === "true";
    const pages = await db.page.findMany({
      where: { siteId, ...(includeDeleted ? {} : { deletedAt: null }) },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(pages);
  } catch (error) {
    return apiError("GET /api/pages", error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`pages-post:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = parseBody(createPageSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { title: rawTitle, siteId, templateBlocks, sourcePageId } = parsed.data;
    const title = sanitizePlainText(rawTitle) || rawTitle;

    if (templateBlocks) {
      const hierarchy = validateBlockHierarchy(templateBlocks as Array<{ type: string; content: Record<string, unknown> }>);
      if (!hierarchy.valid) {
        return NextResponse.json({ error: hierarchy.error }, { status: 400 });
      }
    }

    const site = await db.site.findFirst({
      where: { id: siteId, userId: session.user.id },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const MAX_SLUG_RETRIES = 3;
    let page;
    for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt++) {
      try {
        page = await db.$transaction(async (tx) => {
          let slug = slugify(title);
          const existingPage = await tx.page.findFirst({
            where: { siteId, slug },
          });
          if (existingPage || attempt > 0) {
            slug = `${slug}-${Date.now().toString(36)}`;
          }

          const count = await tx.page.count({ where: { siteId } });

          const p = await tx.page.create({
            data: {
              title,
              slug,
              siteId,
              sortOrder: count,
            },
          });

          if (sourcePageId) {
            // Server-side page duplication: clone blocks from source page
            const sourcePage = await tx.page.findFirst({
              where: { id: sourcePageId, site: { userId: session.user!.id! } },
              include: { blocks: { orderBy: { sortOrder: "asc" } } },
            });

            if (sourcePage && sourcePage.blocks.length > 0) {
              // Remap IDs to new unique IDs, preserving parentId references
              const idMap = new Map<string, string>();
              for (const block of sourcePage.blocks) {
                idMap.set(block.id, generateId());
              }

              await tx.block.createMany({
                data: sourcePage.blocks.map((block, i) => ({
                  id: idMap.get(block.id)!,
                  type: block.type,
                  content: (block.content || {}) as Prisma.InputJsonValue,
                  settings: (block.settings || {}) as Prisma.InputJsonValue,
                  sortOrder: i,
                  pageId: p.id,
                  parentId: block.parentId ? idMap.get(block.parentId) || null : null,
                })),
              });
            }
          } else if (templateBlocks) {
            const cleanBlocks = sanitizeBlocks(templateBlocks);
            // Remap all IDs to prevent collisions when the same template is used multiple times
            const idMap = new Map<string, string>();
            for (const block of cleanBlocks) {
              if (block.id) {
                idMap.set(block.id as string, generateId());
              }
            }
            await tx.block.createMany({
              data: cleanBlocks.map((block, i: number) => ({
                id: block.id ? idMap.get(block.id as string)! : generateId(),
                type: block.type,
                content: (block.content || {}) as Prisma.InputJsonValue,
                settings: (block.settings || {}) as Prisma.InputJsonValue,
                sortOrder: i,
                pageId: p.id,
                parentId: block.parentId ? idMap.get(block.parentId as string) || null : null,
              })),
            });
          }

          return p;
        });
        break; // Success — exit retry loop
      } catch (error) {
        const isUniqueViolation = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
        if (isUniqueViolation && attempt < MAX_SLUG_RETRIES - 1) {
          continue; // Retry with different slug
        }
        throw error; // Rethrow if not a unique constraint error or out of retries
      }
    }

    revalidateTag("dashboard", { expire: 0 });
    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    return apiError("POST /api/pages", error);
  }
}
