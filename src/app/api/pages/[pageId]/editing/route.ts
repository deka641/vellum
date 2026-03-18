import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";

const LOCK_EXPIRY_MS = 60_000; // 60 seconds

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pageId } = await params;

    const rl = rateLimit(`editing:${session.user.id}`, "autosave");
    if (!rl.success) return rateLimitResponse(rl);

    const page = await db.page.findFirst({
      where: { id: pageId, site: { userId: session.user.id } },
      select: { editingBy: true, editingAt: true },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Check if someone else holds an active lock
    const now = new Date();
    if (
      page.editingBy &&
      page.editingBy !== session.user.id &&
      page.editingAt &&
      now.getTime() - page.editingAt.getTime() < LOCK_EXPIRY_MS
    ) {
      return NextResponse.json({
        editing: true,
        editingBy: page.editingBy,
        editingAt: page.editingAt.toISOString(),
      });
    }

    // Claim or refresh the lock
    await db.page.update({
      where: { id: pageId },
      data: { editingBy: session.user.id, editingAt: now },
    });

    return NextResponse.json({ editing: false });
  } catch (error) {
    return apiError("POST /api/pages/[pageId]/editing", error);
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

    const { pageId } = await params;

    // Release lock only if we own it
    await db.page.updateMany({
      where: { id: pageId, editingBy: session.user.id },
      data: { editingBy: null, editingAt: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError("DELETE /api/pages/[pageId]/editing", error);
  }
}
