import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

const EXPIRED_TOKEN_HOURS = 24;
const TRASH_RETENTION_DAYS = 30;

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

    let deletedTokens = 0;
    let deletedPages = 0;

    // 1. Delete expired/used password reset tokens (older than 24h)
    try {
      const tokenCutoff = new Date(Date.now() - EXPIRED_TOKEN_HOURS * 60 * 60 * 1000);
      const tokenResult = await db.passwordResetToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: tokenCutoff } },
            { usedAt: { not: null } },
          ],
        },
      });
      deletedTokens = tokenResult.count;
      if (deletedTokens > 0) {
        logger.info("cron", `Cleaned up ${deletedTokens} expired/used password reset tokens`);
      }
    } catch (err) {
      logger.error("cron", "Failed to clean up password reset tokens:", err);
    }

    // 2. Permanently delete trashed pages older than 30 days (cascade deletes blocks/revisions/submissions)
    try {
      const trashCutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const trashResult = await db.page.deleteMany({
        where: {
          deletedAt: {
            not: null,
            lt: trashCutoff,
          },
        },
      });
      deletedPages = trashResult.count;
      if (deletedPages > 0) {
        logger.info("cron", `Permanently deleted ${deletedPages} trashed pages (older than ${TRASH_RETENTION_DAYS} days)`);
      }
    } catch (err) {
      logger.error("cron", "Failed to clean up trashed pages:", err);
    }

    // 3. Delete old webhook delivery records (>30 days)
    let deletedDeliveries = 0;
    try {
      const deliveryCutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const deliveryResult = await db.webhookDelivery.deleteMany({
        where: { createdAt: { lt: deliveryCutoff } },
      });
      deletedDeliveries = deliveryResult.count;
      if (deletedDeliveries > 0) {
        logger.info("cron", `Deleted ${deletedDeliveries} old webhook deliveries`);
      }
    } catch (err) {
      logger.error("cron", "Failed to clean up webhook deliveries:", err);
    }

    logger.info("cron", `Cleanup complete: ${deletedTokens} tokens, ${deletedPages} trashed pages, ${deletedDeliveries} webhook deliveries`);

    return NextResponse.json({
      deletedTokens,
      deletedPages,
      deletedDeliveries,
    });
  } catch (error) {
    return apiError("POST /api/cron/cleanup", error);
  }
}
