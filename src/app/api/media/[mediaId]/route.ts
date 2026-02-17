import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { unlink } from "fs/promises";
import { parseBody, updateMediaSchema } from "@/lib/validations";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { safeMediaFilePath } from "@/lib/upload";
import { apiError } from "@/lib/api-helpers";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`media-mut:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { mediaId } = await params;

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = parseBody(updateMediaSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const media = await db.media.findFirst({
      where: { id: mediaId, userId: session.user.id },
    });

    if (!media) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await db.media.update({
      where: { id: mediaId },
      data: { alt: parsed.data.alt },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return apiError("PATCH /api/media/[mediaId]", error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`media-mut:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { mediaId } = await params;

    const media = await db.media.findFirst({
      where: { id: mediaId, userId: session.user.id },
    });

    if (!media) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete file from disk
    const filepath = safeMediaFilePath(media.url);
    if (filepath) {
      try {
        await unlink(filepath);
      } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT")
          console.error("Failed to delete media file:", err);
      }
    }

    await db.media.delete({ where: { id: mediaId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError("DELETE /api/media/[mediaId]", error);
  }
}
