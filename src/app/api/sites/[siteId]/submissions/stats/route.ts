import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`submissions-stats:${session.user.id}`, "read");
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
    since.setHours(0, 0, 0, 0);

    const submissions = await db.formSubmission.findMany({
      where: {
        page: { siteId, site: { userId: session.user.id } },
        createdAt: { gte: since },
      },
      select: { createdAt: true, isRead: true },
    });

    // Group submissions by date string (YYYY-MM-DD)
    const countsByDate = new Map<string, number>();
    let unread = 0;

    for (const sub of submissions) {
      const dateStr = sub.createdAt.toISOString().split("T")[0];
      countsByDate.set(dateStr, (countsByDate.get(dateStr) || 0) + 1);
      if (!sub.isRead) unread++;
    }

    // Build daily array with all dates in the range (including zero-count days)
    const daily: Array<{ date: string; count: number }> = [];
    const cursor = new Date(since);
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    while (cursor <= now) {
      const dateStr = cursor.toISOString().split("T")[0];
      daily.push({ date: dateStr, count: countsByDate.get(dateStr) || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    return NextResponse.json({
      daily,
      total: submissions.length,
      unread,
    });
  } catch (error) {
    return apiError("GET /api/sites/[siteId]/submissions/stats", error);
  }
}
