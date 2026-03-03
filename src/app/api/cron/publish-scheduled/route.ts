import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";
import { prunePageRevisionsBatch, revalidatePublishedPages } from "@/lib/revisions";

export async function POST(req: Request) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error("cron", "CRON_SECRET environment variable is not set");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const expected = `Bearer ${cronSecret}`;
    const provided = authHeader || "";
    if (
      provided.length !== expected.length ||
      !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Find all pages that are scheduled to be published
    const pagesToPublish = await db.page.findMany({
      where: {
        status: "DRAFT",
        deletedAt: null,
        scheduledPublishAt: {
          not: null,
          lte: now,
        },
      },
      include: {
        site: { select: { slug: true } },
      },
    });

    if (pagesToPublish.length === 0) {
      logger.info("cron", "No pages to publish");
      return NextResponse.json({ published: 0 });
    }

    // Capture page IDs before transaction closure (TypeScript narrowing)
    const pageIds = pagesToPublish.map((p) => p.id);

    // Perform all DB operations in a single transaction:
    // 1. Update page statuses
    // 2. Load blocks for each page
    // 3. Create PageRevisions
    // 4. Prune old revisions
    await db.$transaction(async (tx) => {
      // 1. Batch update all pages at once
      await tx.page.updateMany({
        where: { id: { in: pageIds } },
        data: {
          status: "PUBLISHED",
          publishedAt: now,
          scheduledPublishAt: null,
        },
      });

      // 2. Batch load ALL blocks for all pages (1 query instead of N)
      const allBlocks = await tx.block.findMany({
        where: { pageId: { in: pageIds } },
        orderBy: { sortOrder: "asc" },
      });

      // Group blocks by pageId in memory
      const blocksByPageId = new Map<string, typeof allBlocks>();
      for (const block of allBlocks) {
        const existing = blocksByPageId.get(block.pageId) || [];
        existing.push(block);
        blocksByPageId.set(block.pageId, existing);
      }

      // 3. Batch create all revisions (1 createMany instead of N creates)
      await tx.pageRevision.createMany({
        data: pagesToPublish.map((page) => {
          const blocks = blocksByPageId.get(page.id) || [];
          const blockData = blocks.map((b) => ({
            id: b.id,
            type: b.type,
            content: b.content,
            settings: b.settings,
            parentId: b.parentId,
          }));
          return {
            pageId: page.id,
            title: page.title,
            blocks: blockData as unknown as Prisma.InputJsonValue,
            note: "Published (scheduled)",
          };
        }),
      });

      // 4. Prune revisions exceeding 20 per page
      await prunePageRevisionsBatch(tx, pageIds);
    });

    // Revalidation happens outside the transaction (using allSettled for resilience)
    await revalidatePublishedPages(pagesToPublish);

    revalidateTag("dashboard", { expire: 0 });

    const publishedCount = pagesToPublish.length;
    for (const page of pagesToPublish) {
      logger.info("cron", `Published scheduled page: ${page.id} (${page.title})`);
    }

    logger.info("cron", `Scheduled publishing complete: ${publishedCount}/${pagesToPublish.length} pages published`);

    return NextResponse.json({ published: publishedCount });
  } catch (error) {
    return apiError("POST /api/cron/publish-scheduled", error);
  }
}
