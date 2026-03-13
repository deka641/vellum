import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";
import { parseBody, bulkTagsSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`bulk-tags:${session.user.id}`, "mutation");
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

    const parsed = parseBody(bulkTagsSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { pageIds, tagIds, action } = parsed.data;
    const userId = session.user.id;

    // Verify all pages belong to the user's sites
    const pages = await db.page.findMany({
      where: { id: { in: pageIds }, site: { userId }, deletedAt: null },
      select: { id: true, siteId: true },
    });

    const validPageIds = pages.map((p) => p.id);
    if (validPageIds.length === 0) {
      return NextResponse.json(
        { error: "No valid pages to update" },
        { status: 400 }
      );
    }

    // Verify all tags belong to the same site as the pages
    const pageSiteIds = new Set(pages.map((p) => p.siteId));
    const tags = await db.tag.findMany({
      where: { id: { in: tagIds }, siteId: { in: Array.from(pageSiteIds) } },
      select: { id: true },
    });

    const validTagIds = tags.map((t) => t.id);
    if (validTagIds.length === 0) {
      return NextResponse.json(
        { error: "No valid tags found" },
        { status: 400 }
      );
    }

    let count = 0;

    if (action === "add") {
      const records = validPageIds.flatMap((pageId) =>
        validTagIds.map((tagId) => ({ pageId, tagId }))
      );
      const result = await db.pageTag.createMany({
        data: records,
        skipDuplicates: true,
      });
      count = result.count;
    } else {
      const result = await db.pageTag.deleteMany({
        where: {
          pageId: { in: validPageIds },
          tagId: { in: validTagIds },
        },
      });
      count = result.count;
    }

    logger.info(
      "POST /api/pages/bulk-tags",
      `Bulk ${action} tags: ${count} records affected (${validPageIds.length} pages, ${validTagIds.length} tags)`
    );
    revalidateTag("dashboard", { expire: 0 });

    return NextResponse.json({ updated: count });
  } catch (error) {
    return apiError("POST /api/pages/bulk-tags", error);
  }
}
