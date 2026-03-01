import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const rl = rateLimit(`activity:${userId}`, "read");
    if (!rl.success) return rateLimitResponse(rl);

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");
    const cursor = searchParams.get("cursor");

    const where: Record<string, unknown> = { userId };
    if (siteId) where.siteId = siteId;

    const activities = await db.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    return NextResponse.json({
      activities,
      nextCursor: activities.length === 20 ? activities[activities.length - 1].id : null,
    });
  } catch (error) {
    return apiError("GET /api/activity", error);
  }
}
