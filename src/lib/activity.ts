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
        const count = await db.activityLog.count({
          where: { userId: entry.userId },
        });
        if (count > 500) {
          const oldest = await db.activityLog.findMany({
            where: { userId: entry.userId },
            orderBy: { createdAt: "asc" },
            take: count - 500,
            select: { id: true },
          });
          if (oldest.length > 0) {
            await db.activityLog.deleteMany({
              where: { id: { in: oldest.map((o) => o.id) } },
            });
          }
        }
      } catch (err) {
        logger.warn("activity-cleanup", "Failed to prune old activity logs", err);
      }
    })
    .catch((err) => {
      logger.warn("logActivity", "Failed to log activity", err);
    });
}
