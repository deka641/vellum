import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error("cron", "CRON_SECRET environment variable is not set");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
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

    let publishedCount = 0;

    for (const page of pagesToPublish) {
      try {
        await db.page.update({
          where: { id: page.id },
          data: {
            status: "PUBLISHED",
            publishedAt: now,
            scheduledPublishAt: null,
          },
        });

        // Revalidate the published page path
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

        publishedCount++;
        logger.info("cron", `Published scheduled page: ${page.id} (${page.title})`);
      } catch (err) {
        logger.error("cron", `Failed to publish scheduled page ${page.id}:`, err);
      }
    }

    if (publishedCount > 0) {
      revalidateTag("dashboard", { expire: 0 });
    }

    logger.info("cron", `Scheduled publishing complete: ${publishedCount}/${pagesToPublish.length} pages published`);

    return NextResponse.json({ published: publishedCount });
  } catch (error) {
    return apiError("POST /api/cron/publish-scheduled", error);
  }
}
