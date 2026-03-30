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
            pageTags: { include: { tag: { select: { slug: true } } } },
          },
        },
        tags: { select: { name: true, slug: true } },
        redirects: { select: { fromPath: true, toPath: true, permanent: true } },
        webhooks: { select: { url: true, events: true, active: true } },
      },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const exportData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      site: {
        name: site.name,
        description: site.description,
        theme: site.theme,
        logo: site.logo,
        footer: site.footer,
        customHead: site.customHead,
        customFooter: site.customFooter,
        notificationEmail: site.notificationEmail,
        favicon: site.favicon,
        defaultOgImage: site.defaultOgImage,
        cookieConsent: site.cookieConsent,
        autoBackup: site.autoBackup,
      },
      tags: site.tags.map((tag) => ({
        name: tag.name,
        slug: tag.slug,
      })),
      redirects: site.redirects.map((r) => ({
        fromPath: r.fromPath,
        toPath: r.toPath,
        permanent: r.permanent,
      })),
      webhooks: site.webhooks.map((w) => ({
        url: w.url,
        events: w.events,
        active: w.active,
      })),
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
        tags: page.pageTags.map((pt) => pt.tag.slug),
        blocks: page.blocks.map((block) => ({
          id: block.id,
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
