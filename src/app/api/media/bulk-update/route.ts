import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseBody, mediaBulkUpdateSchema } from "@/lib/validations";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity";

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`media-mut:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = parseBody(mediaBulkUpdateSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const userId = session.user.id;
    const { updates } = parsed.data;

    const ids = updates.map((u) => u.id);

    // Verify all media items belong to the current user
    const ownedMedia = await db.media.findMany({
      where: { id: { in: ids }, userId },
      select: { id: true },
    });

    const ownedIds = new Set(ownedMedia.map((m) => m.id));
    const unauthorized = ids.filter((id) => !ownedIds.has(id));

    if (unauthorized.length > 0) {
      return NextResponse.json(
        { error: `${unauthorized.length} media item(s) not found or not owned by you` },
        { status: 403 }
      );
    }

    // Use $transaction with individual updates since each has different alt text
    await db.$transaction(
      updates.map((u) =>
        db.media.update({
          where: { id: u.id },
          data: { alt: u.alt },
        })
      )
    );

    revalidateTag("dashboard", { expire: 0 });
    logActivity({ userId, action: "media.bulk_update_alt", details: { count: updates.length } });

    return NextResponse.json({ updated: updates.length });
  } catch (error) {
    return apiError("PATCH /api/media/bulk-update", error);
  }
}
