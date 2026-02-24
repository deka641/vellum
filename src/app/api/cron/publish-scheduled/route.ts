import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

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
      // Batch update all pages at once
      await tx.page.updateMany({
        where: { id: { in: pageIds } },
        data: {
          status: "PUBLISHED",
          publishedAt: now,
          scheduledPublishAt: null,
        },
      });

      // Create revision snapshots for each page
      for (const page of pagesToPublish) {
        const blocks = await tx.block.findMany({
          where: { pageId: page.id },
          orderBy: { sortOrder: "asc" },
        });

        const blockData = blocks.map((b) => ({
          id: b.id,
          type: b.type,
          content: b.content,
          settings: b.settings,
          parentId: b.parentId,
        }));

        await tx.pageRevision.create({
          data: {
            pageId: page.id,
            title: page.title,
            blocks: blockData as unknown as Prisma.InputJsonValue,
            note: "Published (scheduled)",
          },
        });

        // Prune old revisions — keep max 20 per page
        const revisionCount = await tx.pageRevision.count({ where: { pageId: page.id } });
        if (revisionCount > 20) {
          const oldest = await tx.pageRevision.findMany({
            where: { pageId: page.id },
            orderBy: { createdAt: "asc" },
            take: revisionCount - 20,
            select: { id: true },
          });
          await tx.pageRevision.deleteMany({
            where: { id: { in: oldest.map((r) => r.id) } },
          });
        }
      }
    });

    // Revalidation happens outside the transaction
    for (const page of pagesToPublish) {
      try {
        const siteSlug = page.site.slug;
        if (page.isHomepage) {
          revalidatePath(`/s/${siteSlug}`);
        } else {
          revalidatePath(`/s/${siteSlug}/${page.slug}`);
        }
        revalidatePath(`/s/${siteSlug}`, "layout");
      } catch (err) {
        logger.warn("revalidation", `Scheduled publish revalidation failed for page ${page.id}:`, err);
      }
    }

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
