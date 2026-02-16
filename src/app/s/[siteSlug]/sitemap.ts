import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { getBaseUrl, buildPageUrl } from "@/lib/url";

export async function generateSitemaps() {
  const sites = await db.site.findMany({
    select: { slug: true },
  });

  return sites.map((site) => ({ id: site.slug }));
}

export default async function sitemap({
  id,
}: {
  id: string;
}): Promise<MetadataRoute.Sitemap> {
  const siteSlug = id;

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
