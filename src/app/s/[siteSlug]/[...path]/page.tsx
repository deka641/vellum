import { notFound } from "next/navigation";
import { type Metadata } from "next";
import { db } from "@/lib/db";
import { PublishedPage } from "@/components/published/PublishedPage";

interface Props {
  params: Promise<{ siteSlug: string; path: string[] }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { siteSlug, path: pathSegments } = await params;
  const pageSlug = pathSegments?.[0] || "home";

  const site = await db.site.findUnique({ where: { slug: siteSlug } });
  if (!site) return {};

  const page = await db.page.findFirst({
    where: { siteId: site.id, slug: pageSlug, status: "PUBLISHED" },
  });

  if (!page) return {};

  return {
    title: `${page.title} - ${site.name}`,
    description: page.description || site.description || undefined,
    openGraph: {
      title: page.title,
      description: page.description || undefined,
      siteName: site.name,
    },
  };
}

export default async function PublicSitePage({ params }: Props) {
  const { siteSlug, path: pathSegments } = await params;
  const pageSlug = pathSegments?.[0] || "home";

  const site = await db.site.findUnique({ where: { slug: siteSlug } });
  if (!site) notFound();

  const page = await db.page.findFirst({
    where: { siteId: site.id, slug: pageSlug, status: "PUBLISHED" },
    include: { blocks: { orderBy: { sortOrder: "asc" } } },
  });

  if (!page) notFound();

  const blocks = page.blocks.map((b) => ({
    id: b.id,
    type: b.type,
    content: b.content as Record<string, unknown>,
    settings: (b.settings || {}) as Record<string, unknown>,
    parentId: b.parentId,
  }));

  return <PublishedPage title={page.title} blocks={blocks} />;
}
