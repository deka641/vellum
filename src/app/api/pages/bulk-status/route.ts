import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";
import { parseBody } from "@/lib/validations";
import { z } from "zod";
import { logger } from "@/lib/logger";

const bulkStatusSchema = z.object({
  pageIds: z.array(z.string().min(1)).min(1).max(50),
  action: z.enum(["publish", "unpublish"]),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`bulk-status:${session.user.id}`, "mutation");
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

    const parsed = parseBody(bulkStatusSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { pageIds, action } = parsed.data;
    const userId = session.user.id;

    // Verify all pages belong to the user's sites
    const pages = await db.page.findMany({
      where: { id: { in: pageIds }, site: { userId }, deletedAt: null },
      select: { id: true, isHomepage: true },
    });

    let validIds = pages.map((p) => p.id);

    // Protect homepage from being unpublished
    if (action === "unpublish") {
      const homepageIds = new Set(
        pages.filter((p) => p.isHomepage).map((p) => p.id)
      );
      validIds = validIds.filter((id) => !homepageIds.has(id));
    }

    if (validIds.length === 0) {
      return NextResponse.json(
        { error: "No valid pages to update" },
        { status: 400 }
      );
    }

    if (action === "publish") {
      await db.page.updateMany({
        where: { id: { in: validIds } },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });
    } else {
      await db.page.updateMany({
        where: { id: { in: validIds } },
        data: { status: "DRAFT" },
      });
    }

    logger.info(
      "POST /api/pages/bulk-status",
      `Bulk ${action}: ${validIds.length} pages`
    );
    revalidateTag("dashboard", { expire: 0 });

    return NextResponse.json({ updated: validIds.length });
  } catch (error) {
    return apiError("POST /api/pages/bulk-status", error);
  }
}
