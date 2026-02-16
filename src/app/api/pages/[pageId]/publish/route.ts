import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`publish:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { pageId } = await params;

    const page = await db.page.findFirst({
      where: { id: pageId, site: { userId: session.user.id } },
    });

    if (!page) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await db.page.update({
      where: { id: pageId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/pages/[pageId]/publish failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`publish:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { pageId } = await params;

    const page = await db.page.findFirst({
      where: { id: pageId, site: { userId: session.user.id } },
    });

    if (!page) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await db.page.update({
      where: { id: pageId },
      data: {
        status: "DRAFT",
        publishedAt: null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("DELETE /api/pages/[pageId]/publish failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
