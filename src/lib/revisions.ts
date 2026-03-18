import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";

type TransactionClient = Omit<
  typeof db,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

/**
 * Prune page revisions to keep at most `maxRevisions` per page.
 * Deletes the oldest revisions first.
 */
export async function prunePageRevisions(
  tx: TransactionClient,
  pageId: string,
  maxRevisions = 20
) {
  const revisionCount = await tx.pageRevision.count({ where: { pageId } });
  if (revisionCount > maxRevisions) {
    const oldest = await tx.pageRevision.findMany({
      where: { pageId },
      orderBy: { createdAt: "asc" },
      take: revisionCount - maxRevisions,
      select: { id: true },
    });
    if (oldest.length > 0) {
      await tx.pageRevision.deleteMany({
        where: { id: { in: oldest.map((r) => r.id) } },
      });
    }
  }
}

/**
 * Prune revisions for multiple pages in batch.
 * Uses a single SQL query with ROW_NUMBER() to delete excess revisions
 * across all pages at once — O(1) queries instead of O(N).
 */
export async function prunePageRevisionsBatch(
  tx: TransactionClient,
  pageIds: string[],
  maxRevisions = 20
) {
  if (pageIds.length === 0) return;
  await tx.$executeRaw`
    DELETE FROM "PageRevision"
    WHERE "id" IN (
      SELECT "id" FROM (
        SELECT "id", ROW_NUMBER() OVER (
          PARTITION BY "pageId" ORDER BY "createdAt" DESC
        ) AS rn
        FROM "PageRevision"
        WHERE "pageId" = ANY(${pageIds})
      ) ranked
      WHERE rn > ${maxRevisions}
    )
  `;
}

/**
 * Revalidate published page paths using Promise.allSettled so one failure
 * doesn't block the rest.
 */
export async function revalidatePublishedPages(
  pages: Array<{
    id: string;
    slug: string;
    isHomepage: boolean;
    site: { slug: string };
  }>
) {
  const results = await Promise.allSettled(
    pages.map((page) => {
      const siteSlug = page.site.slug;
      if (page.isHomepage) {
        revalidatePath(`/s/${siteSlug}`);
      } else {
        revalidatePath(`/s/${siteSlug}/${page.slug}`);
      }
      revalidatePath(`/s/${siteSlug}`, "layout");
      return Promise.resolve();
    })
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    logger.warn(
      "revalidation",
      `${failed.length}/${results.length} page revalidations failed`
    );
  }
}
