import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { getBaseUrl, buildPageUrl } from "@/lib/url";

export default async function sitemap({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}): Promise<MetadataRoute.Sitemap> {
  const { siteSlug } = await params;

  const site = await db.site.findUnique({
    where: { slug: siteSlug },
    include: {
      pages: {
        where: { status: "PUBLISHED" },
        select: {
          slug: true,
          isHomepage: true,
          publishedAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!site) return [];

  const baseUrl = await getBaseUrl();

  return site.pages.map((page) => ({
    url: buildPageUrl(baseUrl, site.slug, page.isHomepage, page.slug),
    lastModified: page.updatedAt || page.publishedAt || undefined,
    changeFrequency: page.isHomepage
      ? ("weekly" as const)
      : ("monthly" as const),
    priority: page.isHomepage ? 1.0 : 0.8,
  }));
}
