import { db } from "@/lib/db";
import { getBaseUrl } from "@/lib/url";
import {
  escapeXml,
  extractDescription,
  buildContentHtml,
} from "@/lib/rss-helpers";

export const revalidate = 3600;

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
      },
      pageTags: {
        include: { tag: { select: { name: true } } },
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
      const blockData = page.blocks.map((b) => ({
        type: b.type,
        content: b.content as Record<string, unknown>,
      }));
      const description =
        page.description || extractDescription(blockData);
      const pubDate = page.publishedAt || page.createdAt;

      const enclosure = page.ogImage
        ? `\n      <enclosure url="${escapeXml(page.ogImage.startsWith("http") ? page.ogImage : `${baseUrl}${page.ogImage}`)}" type="image/jpeg" length="0"/>`
        : "";
      const categories = page.pageTags
        .map((pt) => `\n      <category>${escapeXml(pt.tag.name)}</category>`)
        .join("");

      const contentHtml = buildContentHtml(blockData, baseUrl);
      const contentEncoded = contentHtml
        ? `\n      <content:encoded><![CDATA[${contentHtml}]]></content:encoded>`
        : "";

      return `    <item>
      <title>${escapeXml(page.title)}</title>
      <link>${escapeXml(pageUrl)}</link>
      <guid isPermaLink="true">${escapeXml(pageUrl)}</guid>
      <description><![CDATA[${description}]]></description>
      <pubDate>${pubDate.toUTCString()}</pubDate>${enclosure}${categories}${contentEncoded}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(site.name)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(site.description || `${site.name} — Published with Vellum`)}</description>
    <language>en</language>
    <lastBuildDate>${(pages[0]?.publishedAt || new Date()).toUTCString()}</lastBuildDate>
    <generator>Vellum CMS</generator>
    <docs>https://www.rssboard.org/rss-specification</docs>
    <ttl>60</ttl>
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
