import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

interface ActivityEntry {
  userId: string;
  siteId?: string;
  pageId?: string;
  action: string;
  details?: Record<string, unknown>;
}

/**
 * Log an activity event. Non-blocking — never throws, never blocks the main flow.
 */
export function logActivity(entry: ActivityEntry): void {
  // Fire and forget — don't await, don't block
  db.activityLog
    .create({
      data: {
        userId: entry.userId,
        siteId: entry.siteId || null,
        pageId: entry.pageId || null,
        action: entry.action,
        details: (entry.details || {}) as Prisma.InputJsonValue,
      },
    })
    .then(async () => {
      // Probabilistic cleanup: ~1% chance per write to keep max 500 entries
      if (Math.random() >= 0.01) return;
      try {
        await db.$executeRaw`
          DELETE FROM "ActivityLog"
          WHERE "userId" = ${entry.userId}
            AND "id" NOT IN (
              SELECT "id" FROM "ActivityLog"
              WHERE "userId" = ${entry.userId}
              ORDER BY "createdAt" DESC
              LIMIT 500
            )
        `;
      } catch (err) {
        logger.warn("activity-cleanup", "Failed to prune old activity logs", err);
      }
    })
    .catch((err) => {
      logger.warn("logActivity", "Failed to log activity", err);
    });
}
