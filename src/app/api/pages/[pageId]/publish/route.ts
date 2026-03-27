import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api-helpers";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";
import { logActivity } from "@/lib/activity";
import { prunePageRevisions } from "@/lib/revisions";
import { fireWebhooks } from "@/lib/webhook";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`publish:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { pageId } = await params;

    // Parse optional body for scheduled publishing
    let scheduledAt: string | undefined;
    try {
      const body = await req.json();
      scheduledAt = body?.scheduledAt;
    } catch {
      // No body or invalid JSON is fine — means immediate publish
    }

    const page = await db.page.findFirst({
      where: { id: pageId, deletedAt: null, site: { userId: session.user.id } },
      include: { site: { select: { slug: true } } },
    });

    if (!page) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Scheduled publish
    if (scheduledAt) {
      const date = new Date(scheduledAt);
      if (isNaN(date.getTime())) {
        return NextResponse.json({ error: "Invalid scheduled date" }, { status: 400 });
      }
      const now = new Date();
      if (date.getTime() < now.getTime() - 60_000) {
        return NextResponse.json({ error: "Scheduled date cannot be in the past" }, { status: 400 });
      }
      const oneYear = new Date(now);
      oneYear.setFullYear(oneYear.getFullYear() + 1);
      if (date.getTime() > oneYear.getTime()) {
        return NextResponse.json({ error: "Scheduled date cannot be more than 1 year in the future" }, { status: 400 });
      }

      const updated = await db.page.update({
        where: { id: pageId },
        data: {
          scheduledPublishAt: date,
        },
      });

      logger.info("publish", `Page ${pageId} scheduled for ${date.toISOString()}`);

      revalidateTag("dashboard", { expire: 0 });

      return NextResponse.json({
        ...updated,
        scheduledPublishAt: updated.scheduledPublishAt?.toISOString() ?? null,
      });
    }

    // Immediate publish — page update + revision snapshot in one transaction
    const updated = await db.$transaction(async (tx) => {
      const page_updated = await tx.page.update({
        where: { id: pageId },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          scheduledPublishAt: null, // Clear any existing schedule
        },
      });

      // Create a revision snapshot on publish
      const blocks = await tx.block.findMany({
        where: { pageId },
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
          pageId,
          title: page_updated.title,
          blocks: blockData as unknown as Prisma.InputJsonValue,
          note: "Published",
        },
      });

      // Limit to 20 revisions per page — delete oldest if over limit
      await prunePageRevisions(tx, pageId);

      return page_updated;
    });

    // Revalidation happens outside the transaction (side effects)
    try {
      const siteSlug = page.site.slug;
      if (page.isHomepage) {
        revalidatePath(`/s/${siteSlug}`);
      } else {
        revalidatePath(`/s/${siteSlug}/${page.slug}`);
      }
      revalidatePath(`/s/${siteSlug}`, "layout");
    } catch (err) { logger.warn("revalidation", "Publish revalidation failed:", err); }

    revalidateTag("dashboard", { expire: 0 });

    const userId = session.user.id;
    logActivity({ userId, siteId: page.siteId, pageId, action: "page.published", details: { title: page.title } });

    // Fire webhooks (fire-and-forget)
    fireWebhooks(page.siteId, "page.published", {
      pageId,
      title: page.title,
      slug: page.slug,
      siteId: page.siteId,
    }).catch(() => {});

    return NextResponse.json(updated);
  } catch (error) {
    return apiError("POST /api/pages/[pageId]/publish", error);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`publish:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { pageId } = await params;

    const page = await db.page.findFirst({
      where: { id: pageId, deletedAt: null, site: { userId: session.user.id } },
      include: { site: { select: { slug: true } } },
    });

    if (!page) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check if this is a cancel-schedule request
    const url = new URL(req.url);
    const cancelSchedule = url.searchParams.get("cancelSchedule") === "true";
    const cancelUnpublishSchedule = url.searchParams.get("cancelUnpublishSchedule") === "true";

    if (cancelUnpublishSchedule) {
      const updated = await db.page.update({
        where: { id: pageId },
        data: {
          scheduledUnpublishAt: null,
        },
      });

      logger.info("publish", `Unpublish schedule cancelled for page ${pageId}`);
      revalidateTag("dashboard", { expire: 0 });

      return NextResponse.json({
        ...updated,
        scheduledUnpublishAt: null,
      });
    }

    if (cancelSchedule) {
      const updated = await db.page.update({
        where: { id: pageId },
        data: {
          scheduledPublishAt: null,
        },
      });

      logger.info("publish", `Schedule cancelled for page ${pageId}`);
      revalidateTag("dashboard", { expire: 0 });

      return NextResponse.json({
        ...updated,
        scheduledPublishAt: null,
      });
    }

    // Standard unpublish
    const updated = await db.page.update({
      where: { id: pageId },
      data: {
        status: "DRAFT",
        publishedAt: null,
        scheduledPublishAt: null, // Clear any schedule when unpublishing
        scheduledUnpublishAt: null, // Clear any unpublish schedule
      },
    });

    try {
      const siteSlug = page.site.slug;
      if (page.isHomepage) {
        revalidatePath(`/s/${siteSlug}`);
      } else {
        revalidatePath(`/s/${siteSlug}/${page.slug}`);
      }
      revalidatePath(`/s/${siteSlug}`, "layout");
    } catch (err) { logger.warn("revalidation", "Publish revalidation failed:", err); }

    revalidateTag("dashboard", { expire: 0 });

    const userId = session.user.id;
    logActivity({ userId, siteId: page.siteId, pageId, action: "page.unpublished", details: { title: page.title } });

    // Fire webhooks (fire-and-forget)
    fireWebhooks(page.siteId, "page.unpublished", {
      pageId,
      title: page.title,
      slug: page.slug,
      siteId: page.siteId,
    }).catch(() => {});

    return NextResponse.json(updated);
  } catch (error) {
    return apiError("DELETE /api/pages/[pageId]/publish", error);
  }
}
