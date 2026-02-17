import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify, generateId } from "@/lib/utils";
import { sanitizeBlocks } from "@/lib/sanitize";
import { Prisma } from "@prisma/client";
import { parseBody, createPageSchema, validateBlockHierarchy } from "@/lib/validations";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

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
    console.error("GET /api/pages failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
    const { title, siteId, templateBlocks, sourcePageId } = parsed.data;

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

    let slug = slugify(title);
    const existingPage = await db.page.findFirst({
      where: { siteId, slug },
    });
    if (existingPage) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const page = await db.$transaction(async (tx) => {
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
        await tx.block.createMany({
          data: cleanBlocks.map((block, i: number) => ({
            ...(block.id ? { id: block.id as string } : {}),
            type: block.type,
            content: (block.content || {}) as Prisma.InputJsonValue,
            settings: (block.settings || {}) as Prisma.InputJsonValue,
            sortOrder: i,
            pageId: p.id,
            parentId: (block.parentId as string) || null,
          })),
        });
      }

      return p;
    });

    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    console.error("POST /api/pages failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
