import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";
import { Prisma } from "@prisma/client";
import { computeContentScore, type ContentScoreInput } from "@/lib/content-score";
import { runSeoAudit } from "@/lib/seo-audit";
import type { EditorBlock } from "@/types/blocks";

interface BlockLike {
  type: string;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
  id: string;
  parentId: string | null;
  sortOrder: number;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`content-scores:${session.user.id}`, "read");
    if (!rl.success) return rateLimitResponse(rl);

    const { siteId } = await params;

    const site = await db.site.findFirst({
      where: { id: siteId, userId: session.user.id },
      select: { id: true },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Get all published pages with blocks
    const pages = await db.page.findMany({
      where: { siteId, status: "PUBLISHED", deletedAt: null },
      select: {
        id: true,
        title: true,
        metaTitle: true,
        description: true,
        ogImage: true,
        publishedAt: true,
        updatedAt: true,
        blocks: { orderBy: { sortOrder: "asc" }, select: { id: true, type: true, content: true, settings: true, parentId: true, sortOrder: true } },
      },
    });

    // Get views for all pages (last 30 days)
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const viewsRaw = await db.$queryRaw<Array<{ pageId: string; views: bigint }>>(
      Prisma.sql`
        SELECT "pageId", COUNT(*)::bigint AS views
        FROM "PageView"
        WHERE "siteId" = ${siteId} AND "viewedAt" >= ${since} AND "pageId" IS NOT NULL
        GROUP BY "pageId"
      `
    );

    const viewsMap = new Map<string, number>();
    let maxViews = 0;
    for (const row of viewsRaw) {
      const v = Number(row.views);
      viewsMap.set(row.pageId, v);
      if (v > maxViews) maxViews = v;
    }

    // Compute scores
    const scores: Record<string, { total: number; label: string }> = {};

    for (const page of pages) {
      const rawBlocks = page.blocks as unknown as BlockLike[];
      const blocks = rawBlocks as unknown as EditorBlock[];

      // Run SEO audit
      const seoResult = runSeoAudit(
        blocks,
        page.title,
        page.metaTitle,
        page.description,
        page.ogImage,
      );

      // Count words using raw block data (JSON from DB)
      let wordCount = 0;
      for (const block of rawBlocks) {
        if (block.type === "text" && typeof block.content.html === "string") {
          wordCount += block.content.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean).length;
        }
        if (block.type === "heading" && typeof block.content.text === "string") {
          wordCount += block.content.text.split(/\s+/).filter(Boolean).length;
        }
      }

      const input: ContentScoreInput = {
        seoScore: seoResult.score,
        views: viewsMap.get(page.id) || 0,
        maxViews,
        wordCount,
        publishedAt: page.publishedAt,
        updatedAt: page.updatedAt,
      };

      const score = computeContentScore(input);
      scores[page.id] = { total: score.total, label: score.label };
    }

    return NextResponse.json(scores);
  } catch (error) {
    return apiError("GET /api/sites/[siteId]/content-scores", error);
  }
}
