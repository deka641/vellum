import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`pages-mut:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { pageId } = await params;

    const page = await db.page.findFirst({
      where: {
        id: pageId,
        site: { userId: session.user.id },
      },
    });

    if (!page) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!page.deletedAt) {
      return NextResponse.json({ error: "Page is not deleted" }, { status: 400 });
    }

    const restored = await db.page.update({
      where: { id: pageId },
      data: { deletedAt: null },
    });

    revalidateTag("dashboard", { expire: 0 });

    return NextResponse.json(restored);
  } catch (error) {
    return apiError("POST /api/pages/[pageId]/restore", error);
  }
}
