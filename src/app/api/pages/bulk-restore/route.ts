import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";
import { parseBody } from "@/lib/validations";
import { z } from "zod";
import { logger } from "@/lib/logger";

const bulkRestoreSchema = z.object({
  pageIds: z.array(z.string().min(1)).min(1).max(50),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`bulk-restore:${session.user.id}`, "mutation");
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

    const parsed = parseBody(bulkRestoreSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { pageIds } = parsed.data;

    const pages = await db.page.findMany({
      where: { id: { in: pageIds }, site: { userId: session.user.id }, deletedAt: { not: null } },
      select: { id: true },
    });

    const validIds = pages.map((p) => p.id);

    if (validIds.length === 0) {
      return NextResponse.json(
        { error: "No valid pages to restore" },
        { status: 400 }
      );
    }

    await db.page.updateMany({
      where: { id: { in: validIds } },
      data: { deletedAt: null },
    });

    logger.info(
      "POST /api/pages/bulk-restore",
      `Bulk restore: ${validIds.length} pages`
    );
    revalidateTag("dashboard", { expire: 0 });

    return NextResponse.json({ restored: validIds.length });
  } catch (error) {
    return apiError("POST /api/pages/bulk-restore", error);
  }
}
