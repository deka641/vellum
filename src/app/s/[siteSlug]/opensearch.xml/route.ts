import { db } from "@/lib/db";
import { getBaseUrl } from "@/lib/url";
import { escapeXml } from "@/lib/rss-helpers";
import { truncateAtWord } from "@/lib/utils";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ siteSlug: string }> }
) {
  const { siteSlug } = await params;
  const baseUrl = await getBaseUrl();

  const site = await db.site.findUnique({
    where: { slug: siteSlug },
    select: { id: true, name: true, slug: true, favicon: true },
  });

  if (!site) {
    return new Response("Not found", { status: 404 });
  }

  const siteUrl = `${baseUrl}/s/${site.slug}`;
  const faviconUrl = site.favicon
    ? (site.favicon.startsWith("http") ? site.favicon : `${baseUrl}${site.favicon}`)
    : `${baseUrl}/favicon.ico`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>${escapeXml(truncateAtWord(site.name, 16))}</ShortName>
  <Description>Search ${escapeXml(site.name)}</Description>
  <Url type="text/html" template="${escapeXml(siteUrl)}?q={searchTerms}"/>
  <Image width="16" height="16" type="image/x-icon">${escapeXml(faviconUrl)}</Image>
  <InputEncoding>UTF-8</InputEncoding>
</OpenSearchDescription>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/opensearchdescription+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
