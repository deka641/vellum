import { cache } from "react";
import { notFound } from "next/navigation";
import { type Metadata } from "next";
import { db } from "@/lib/db";
import { getBaseUrl, buildPageUrl } from "@/lib/url";
import { PublishedPage } from "@/components/published/PublishedPage";
import { WebPageJsonLd } from "@/components/published/JsonLd";

const getSite = cache((slug: string) =>
  db.site.findUnique({ where: { slug } })
);

const getPage = cache((siteId: string, pageSlug: string) =>
  db.page.findFirst({
    where: { siteId, slug: pageSlug, status: "PUBLISHED", deletedAt: null },
    include: { blocks: { orderBy: { sortOrder: "asc" } } },
  })
);

export const revalidate = 3600;

interface Props {
  params: Promise<{ siteSlug: string; path?: string[] }>;
}

interface BlockLike {
  type: string;
  content: Record<string, unknown>;
}

function findFirstImageSrc(blocks: BlockLike[]): string | undefined {
  for (const block of blocks) {
    if (block.type === "image" && typeof block.content.src === "string" && block.content.src) {
      return block.content.src;
    }
    if (block.type === "columns" && Array.isArray(block.content.columns)) {
      for (const col of block.content.columns as Array<{ blocks?: BlockLike[] }>) {
        if (Array.isArray(col.blocks)) {
          const src = findFirstImageSrc(col.blocks);
          if (src) return src;
        }
      }
    }
  }
  return undefined;
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function extractTextSnippet(blocks: BlockLike[], maxLength = 160): string | undefined {
  for (const block of blocks) {
    if (block.type === "text" && typeof block.content.html === "string") {
      const text = stripHtmlTags(block.content.html);
      if (text) {
        return text.length > maxLength ? text.slice(0, maxLength - 1) + "\u2026" : text;
      }
    }
    if (block.type === "heading" && typeof block.content.text === "string") {
      const text = block.content.text.trim();
      if (text) {
        return text.length > maxLength ? text.slice(0, maxLength - 1) + "\u2026" : text;
      }
    }
    if (block.type === "columns" && Array.isArray(block.content.columns)) {
      for (const col of block.content.columns as Array<{ blocks?: BlockLike[] }>) {
        if (Array.isArray(col.blocks)) {
          const snippet = extractTextSnippet(col.blocks, maxLength);
          if (snippet) return snippet;
        }
      }
    }
  }
  return undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { siteSlug, path: pathSegments } = await params;
  const pageSlug = pathSegments?.[0] || "home";

  const site = await getSite(siteSlug);
  if (!site) return {};

  const page = await getPage(site.id, pageSlug);

  if (!page) return {};

  const baseUrl = await getBaseUrl();
  const canonical = buildPageUrl(baseUrl, siteSlug, page.isHomepage, page.slug);

  const blockData = page.blocks.map((b) => ({
    type: b.type,
    content: b.content as Record<string, unknown>,
  }));

  const description = page.description
    || extractTextSnippet(blockData)
    || (page.isHomepage ? site.description : undefined)
    || undefined;
  const ogImage = findFirstImageSrc(blockData);

  return {
    title: `${page.title} - ${site.name}`,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      url: canonical,
      title: page.title,
      description: description || undefined,
      siteName: site.name,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: page.title,
      description: description || undefined,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function PublicSitePage({ params }: Props) {
  const { siteSlug, path: pathSegments } = await params;
  const pageSlug = pathSegments?.[0] || "home";

  const site = await getSite(siteSlug);
  if (!site) notFound();

  const page = await getPage(site.id, pageSlug);

  if (!page) notFound();

  const baseUrl = await getBaseUrl();
  const canonical = buildPageUrl(baseUrl, siteSlug, page.isHomepage, page.slug);
  const siteUrl = `${baseUrl}/s/${siteSlug}`;

  const blocks = page.blocks.map((b) => ({
    id: b.id,
    type: b.type,
    content: b.content as Record<string, unknown>,
    settings: (b.settings || {}) as Record<string, unknown>,
    parentId: b.parentId,
  }));

  return (
    <>
      <WebPageJsonLd
        name={page.title}
        description={page.description}
        url={canonical}
        datePublished={page.publishedAt}
        dateModified={page.updatedAt}
        isPartOf={{ name: site.name, url: siteUrl }}
      />
      <PublishedPage title={page.title} blocks={blocks} pageId={page.id} />
    </>
  );
}
