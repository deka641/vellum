import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseBody, bulkDeleteMediaSchema } from "@/lib/validations";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { unlink } from "fs/promises";
import { safeMediaFilePath } from "@/lib/upload";
import { apiError } from "@/lib/api-helpers";

export async function POST(req: Request) {
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

    const parsed = parseBody(bulkDeleteMediaSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const userId = session.user.id;
    const { ids } = parsed.data;

    const media = await db.media.findMany({
      where: { id: { in: ids }, userId },
    });

    if (media.length === 0) {
      return NextResponse.json({ error: "No matching files found" }, { status: 404 });
    }

    // Delete DB records first in a transaction to prevent data loss
    await db.$transaction(async (tx) => {
      await tx.media.deleteMany({
        where: { id: { in: media.map((m) => m.id) }, userId },
      });
    });

    // Then delete files from disk — orphaned files are harmless, lost DB entries are not
    for (const item of media) {
      const filePath = safeMediaFilePath(item.url);
      if (filePath) {
        try {
          await unlink(filePath);
        } catch (err: unknown) {
          if ((err as NodeJS.ErrnoException).code !== "ENOENT")
            console.error("Failed to delete media file (orphaned):", err);
        }
      }
    }

    return NextResponse.json({ deleted: media.length });
  } catch (error) {
    return apiError("POST /api/media/bulk-delete", error);
  }
}
