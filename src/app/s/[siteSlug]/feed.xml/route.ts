import { db } from "@/lib/db";
import { getBaseUrl } from "@/lib/url";

export const revalidate = 3600;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function extractDescription(
  blocks: Array<{ type: string; content: Record<string, unknown> }>,
  maxLen = 300
): string {
  for (const block of blocks) {
    if (block.type === "text" && typeof block.content.html === "string") {
      const text = stripHtmlTags(block.content.html);
      if (text && text !== "Start writing...") {
        return text.length > maxLen ? text.slice(0, maxLen - 1) + "\u2026" : text;
      }
    }
  }
  return "";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ siteSlug: string }> }
) {
  const { siteSlug } = await params;
  const baseUrl = await getBaseUrl();

  const site = await db.site.findUnique({
    where: { slug: siteSlug },
    select: { id: true, name: true, slug: true, description: true },
  });

  if (!site) {
    return new Response("Not found", { status: 404 });
  }

  const pages = await db.page.findMany({
    where: {
      siteId: site.id,
      status: "PUBLISHED",
      deletedAt: null,
    },
    include: {
      blocks: {
        where: { parentId: null },
        orderBy: { sortOrder: "asc" },
        select: { type: true, content: true },
        take: 5,
      },
    },
    orderBy: { publishedAt: "desc" },
    take: 50,
  });

  const siteUrl = `${baseUrl}/s/${site.slug}`;
  const feedUrl = `${siteUrl}/feed.xml`;

  const items = pages
    .map((page) => {
      const pageUrl = page.isHomepage ? siteUrl : `${siteUrl}/${page.slug}`;
      const description =
        page.description ||
        extractDescription(
          page.blocks.map((b) => ({
            type: b.type,
            content: b.content as Record<string, unknown>,
          }))
        );
      const pubDate = page.publishedAt || page.createdAt;

      return `    <item>
      <title>${escapeXml(page.title)}</title>
      <link>${escapeXml(pageUrl)}</link>
      <guid isPermaLink="true">${escapeXml(pageUrl)}</guid>
      <description>${escapeXml(description)}</description>
      <pubDate>${pubDate.toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(site.name)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(site.description || `${site.name} — Published with Vellum`)}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
