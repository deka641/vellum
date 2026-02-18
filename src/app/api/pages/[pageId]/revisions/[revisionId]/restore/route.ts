import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api-helpers";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ pageId: string; revisionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`restore:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { pageId, revisionId } = await params;
    const userId = session.user.id;

    const result = await db.$transaction(async (tx) => {
      const page = await tx.page.findFirst({
        where: { id: pageId, site: { userId } },
        select: { id: true },
      });

      if (!page) {
        return { status: 404 as const };
      }

      const revision = await tx.pageRevision.findFirst({
        where: { id: revisionId, pageId },
      });

      if (!revision) {
        return { status: 404 as const };
      }

      const revisionBlocks = revision.blocks as Array<{
        id: string;
        type: string;
        content: Prisma.InputJsonValue;
        settings: Prisma.InputJsonValue;
        parentId?: string | null;
      }>;

      // Delete all current blocks
      await tx.block.deleteMany({ where: { pageId } });

      // Create blocks from the revision
      if (revisionBlocks.length > 0) {
        await tx.block.createMany({
          data: revisionBlocks.map((block, i) => ({
            id: block.id,
            type: block.type,
            content: block.content as Prisma.InputJsonValue,
            settings: (block.settings || {}) as Prisma.InputJsonValue,
            sortOrder: i,
            pageId,
            parentId: block.parentId || null,
          })),
        });
      }

      // Update page title
      const updated = await tx.page.update({
        where: { id: pageId },
        data: { title: revision.title },
        include: { blocks: { orderBy: { sortOrder: "asc" } } },
      });

      return { status: 200 as const, page: updated };
    });

    if (result.status === 404) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    try {
      revalidateTag("dashboard", { expire: 0 });
    } catch (err) {
      logger.warn("revalidation", "Dashboard revalidation failed after restore:", err);
    }

    return NextResponse.json(result.page);
  } catch (error) {
    return apiError("POST /api/pages/[pageId]/revisions/[revisionId]/restore", error);
  }
}
