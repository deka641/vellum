import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseBody, bulkDeleteMediaSchema } from "@/lib/validations";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { unlink } from "fs/promises";
import { join } from "path";

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

    // Delete files from disk
    for (const item of media) {
      try {
        const filePath = join(process.cwd(), "public", item.url);
        await unlink(filePath);
      } catch {
        // File may already be deleted, continue
      }
    }

    // Delete DB records
    await db.media.deleteMany({
      where: { id: { in: media.map((m) => m.id) }, userId },
    });

    return NextResponse.json({ deleted: media.length });
  } catch (error) {
    console.error("POST /api/media/bulk-delete failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
