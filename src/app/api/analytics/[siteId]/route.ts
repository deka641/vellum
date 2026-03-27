import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";
import { Prisma } from "@prisma/client";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`analytics-get:${session.user.id}`, "read");
    if (!rl.success) return rateLimitResponse(rl);

    const { siteId } = await params;

    // Verify site ownership
    const site = await db.site.findFirst({
      where: { id: siteId, userId: session.user.id },
      select: { id: true },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const daysParam = parseInt(searchParams.get("days") || "7", 10);
    const days = Math.min(30, Math.max(1, isNaN(daysParam) ? 7 : daysParam));

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Total views in period
    const totalViews = await db.pageView.count({
      where: { siteId, viewedAt: { gte: since } },
    });

    // Top pages (top 10 by views)
    const topPagesRaw = await db.$queryRaw<
      Array<{ path: string; views: bigint }>
    >(
      Prisma.sql`
        SELECT path, COUNT(*)::bigint AS views
        FROM "PageView"
        WHERE "siteId" = ${siteId} AND "viewedAt" >= ${since}
        GROUP BY path
        ORDER BY views DESC
        LIMIT 10
      `
    );

    const topPages = topPagesRaw.map((row) => ({
      path: row.path,
      views: Number(row.views),
    }));

    // Daily view counts
    const dailyRaw = await db.$queryRaw<
      Array<{ date: string; views: bigint }>
    >(
      Prisma.sql`
        SELECT TO_CHAR("viewedAt", 'YYYY-MM-DD') AS date, COUNT(*)::bigint AS views
        FROM "PageView"
        WHERE "siteId" = ${siteId} AND "viewedAt" >= ${since}
        GROUP BY date
        ORDER BY date ASC
      `
    );

    const daily = dailyRaw.map((row) => ({
      date: row.date,
      views: Number(row.views),
    }));

    return NextResponse.json({ totalViews, topPages, daily });
  } catch (error) {
    return apiError("GET /api/analytics/[siteId]", error);
  }
}
