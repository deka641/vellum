import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api-helpers";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`revisions:${session.user.id}`, "read");
    if (!rl.success) return rateLimitResponse(rl);

    const { pageId } = await params;

    const page = await db.page.findFirst({
      where: { id: pageId, deletedAt: null, site: { userId: session.user.id } },
      select: { id: true },
    });

    if (!page) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const revisionId = searchParams.get("revisionId");

    if (revisionId) {
      const revision = await db.pageRevision.findFirst({
        where: { id: revisionId, pageId },
        select: {
          id: true,
          title: true,
          note: true,
          blocks: true,
          createdAt: true,
        },
      });

      if (!revision) {
        return NextResponse.json({ error: "Revision not found" }, { status: 404 });
      }

      return NextResponse.json(revision);
    }

    const revisions = await db.pageRevision.findMany({
      where: { pageId },
      select: {
        id: true,
        title: true,
        note: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(revisions);
  } catch (error) {
    return apiError("GET /api/pages/[pageId]/revisions", error);
  }
}
