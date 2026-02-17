import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sanitizeBlocks } from "@/lib/sanitize";
import type { Prisma } from "@prisma/client";
import { parseBody, updateBlocksSchema, validateBlockHierarchy } from "@/lib/validations";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pageId } = await params;

    const page = await db.page.findFirst({
      where: { id: pageId, site: { userId: session.user.id } },
      include: { blocks: { orderBy: { sortOrder: "asc" } } },
    });

    if (!page) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(page.blocks);
  } catch (error) {
    return apiError("GET /api/pages/[pageId]/blocks", error);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`blocks-put:${session.user.id}`, "autosave");
    if (!rl.success) return rateLimitResponse(rl);

    const { pageId } = await params;

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = parseBody(updateBlocksSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { blocks, title, expectedUpdatedAt } = parsed.data;

    if (blocks) {
      const hierarchy = validateBlockHierarchy(blocks as Array<{ type: string; content: Record<string, unknown> }>);
      if (!hierarchy.valid) {
        return NextResponse.json({ error: hierarchy.error }, { status: 400 });
      }
    }

    const userId = session.user.id;

    const result = await db.$transaction(async (tx) => {
      const page = await tx.page.findFirst({
        where: { id: pageId, site: { userId } },
      });

      if (!page) {
        return { status: 404 as const };
      }

      // Optimistic locking: check version if client sent expectedUpdatedAt
      if (expectedUpdatedAt) {
        const expected = new Date(expectedUpdatedAt).getTime();
        const actual = page.updatedAt.getTime();
        if (expected !== actual) {
          const serverBlocks = await tx.block.findMany({
            where: { pageId },
            orderBy: { sortOrder: "asc" },
          });
          return {
            status: 409 as const,
            serverState: {
              blocks: serverBlocks,
              title: page.title,
              updatedAt: page.updatedAt.toISOString(),
            },
          };
        }
      }

      if (title !== undefined) {
        await tx.page.update({
          where: { id: pageId },
          data: { title },
        });
      } else {
        // Bump updatedAt even for blocks-only saves
        await tx.page.update({
          where: { id: pageId },
          data: { updatedAt: new Date() },
        });
      }

      await tx.block.deleteMany({ where: { pageId } });

      if (blocks) {
        const cleanBlocks = sanitizeBlocks(blocks);
        await tx.block.createMany({
          data: cleanBlocks.map((block, i) => ({
            id: block.id as string,
            type: block.type,
            content: block.content as Prisma.InputJsonValue,
            settings: (block.settings || {}) as Prisma.InputJsonValue,
            sortOrder: i,
            pageId,
            parentId: block.parentId || null,
          })),
        });
      }

      // Re-read the page to get the final updatedAt
      const updated = await tx.page.findUniqueOrThrow({
        where: { id: pageId },
      });

      return {
        status: 200 as const,
        updatedAt: updated.updatedAt.toISOString(),
      };
    });

    if (result.status === 404) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (result.status === 409) {
      return NextResponse.json(
        { error: "Conflict: page was modified by another session", serverState: result.serverState },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, updatedAt: result.updatedAt });
  } catch (error) {
    return apiError("PUT /api/pages/[pageId]/blocks", error);
  }
}
