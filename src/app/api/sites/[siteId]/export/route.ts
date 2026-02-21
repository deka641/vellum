import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`site-export:${session.user.id}`, "read");
    if (!rl.success) return rateLimitResponse(rl);

    const { siteId } = await params;

    const site = await db.site.findFirst({
      where: { id: siteId, userId: session.user.id },
      include: {
        pages: {
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
          include: {
            blocks: { orderBy: { sortOrder: "asc" } },
          },
        },
      },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      site: {
        name: site.name,
        description: site.description,
        theme: site.theme,
        footer: site.footer,
      },
      pages: site.pages.map((page) => ({
        title: page.title,
        slug: page.slug,
        description: page.description,
        status: page.status,
        isHomepage: page.isHomepage,
        showInNav: page.showInNav,
        sortOrder: page.sortOrder,
        metaTitle: page.metaTitle,
        ogImage: page.ogImage,
        noindex: page.noindex,
        blocks: page.blocks.map((block) => ({
          type: block.type,
          content: block.content,
          settings: block.settings,
          sortOrder: block.sortOrder,
          parentId: block.parentId,
        })),
      })),
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${site.slug}-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    return apiError("GET /api/sites/[siteId]/export", error);
  }
}
