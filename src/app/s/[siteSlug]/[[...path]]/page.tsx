import { cache } from "react";
import { notFound, redirect, permanentRedirect } from "next/navigation";
import { type Metadata } from "next";
import { db } from "@/lib/db";
import { getBaseUrl, buildPageUrl } from "@/lib/url";
import { PublishedPage } from "@/components/published/PublishedPage";
import { WebPageJsonLd, BreadcrumbJsonLd, FaqJsonLd, ContactPageJsonLd, ArticleJsonLd } from "@/components/published/JsonLd";
import { Breadcrumbs } from "@/components/published/Breadcrumbs";
import { PageNavigation } from "@/components/published/PageNavigation";
import { SocialShareBar } from "@/components/published/SocialShareBar";
import type { BlockData } from "@/types/blocks";
import { toBlockType } from "@/lib/blocks";

const getSite = cache((slug: string) =>
  db.site.findUnique({
    where: { slug },
    include: { user: { select: { name: true } } },
  })
);

const getPage = cache((siteId: string, pageSlug: string) =>
  db.page.findFirst({
    where: { siteId, slug: pageSlug, status: "PUBLISHED", deletedAt: null },
    include: {
      blocks: { orderBy: { sortOrder: "asc" } },
      pageTags: { include: { tag: true } },
    },
  })
);

const getNavPages = cache((siteId: string) =>
  db.page.findMany({
    where: { siteId, status: "PUBLISHED", showInNav: true, deletedAt: null },
    orderBy: { sortOrder: "asc" },
    select: { id: true, title: true, slug: true, isHomepage: true },
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

function extractFaqItems(blocks: BlockLike[]): { question: string; answer: string }[] {
  const items: { question: string; answer: string }[] = [];
  for (const block of blocks) {
    if (block.type === "accordion" && Array.isArray(block.content.items)) {
      for (const item of block.content.items as Array<{ title?: string; content?: string }>) {
        if (item.title && item.content) {
          items.push({ question: item.title, answer: stripHtmlTags(item.content) });
        }
      }
    }
    if (block.type === "columns" && Array.isArray(block.content.columns)) {
      for (const col of block.content.columns as Array<{ blocks?: BlockLike[] }>) {
        if (Array.isArray(col.blocks)) {
          items.push(...extractFaqItems(col.blocks));
        }
      }
    }
  }
  return items;
}

function hasFormBlock(blocks: BlockLike[]): boolean {
  for (const block of blocks) {
    if (block.type === "form") return true;
    if (block.type === "columns" && Array.isArray(block.content.columns)) {
      for (const col of block.content.columns as Array<{ blocks?: BlockLike[] }>) {
        if (Array.isArray(col.blocks) && hasFormBlock(col.blocks)) return true;
      }
    }
  }
  return false;
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
  const ogImage = page.ogImage || findFirstImageSrc(blockData) || (site.defaultOgImage as string | null) || "/og-default.png";
  const metaTitle = page.metaTitle || page.title;

  return {
    title: `${metaTitle} - ${site.name}`,
    description,
    alternates: {
      canonical,
    },
    ...(page.noindex ? { robots: "noindex, nofollow" } : {}),
    openGraph: {
      type: "website",
      url: canonical,
      title: metaTitle,
      description: description || undefined,
      siteName: site.name,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: metaTitle,
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

  if (!page) {
    // Check for redirects before returning 404
    const redirectRecord = await db.redirect.findUnique({
      where: {
        siteId_fromPath: {
          siteId: site.id,
          fromPath: pageSlug,
        },
      },
    });

    if (redirectRecord) {
      const targetPath = redirectRecord.toPath === "home"
        ? `/s/${siteSlug}`
        : `/s/${siteSlug}/${redirectRecord.toPath}`;
      if (redirectRecord.permanent) {
        permanentRedirect(targetPath);
      } else {
        redirect(targetPath);
      }
    }

    notFound();
  }

  const baseUrl = await getBaseUrl();
  const canonical = buildPageUrl(baseUrl, siteSlug, page.isHomepage, page.slug);
  const siteUrl = `${baseUrl}/s/${siteSlug}`;

  const blocks: BlockData[] = page.blocks.reduce<BlockData[]>((acc, b) => {
    const blockType = toBlockType(b.type);
    if (blockType) {
      acc.push({
        id: b.id,
        type: blockType,
        content: b.content as Record<string, unknown>,
        settings: (b.settings || {}) as Record<string, unknown>,
        parentId: b.parentId,
      });
    }
    return acc;
  }, []);

  const homeHref = `/s/${siteSlug}`;

  // Build prev/next navigation from sibling nav pages
  const navPages = await getNavPages(site.id);
  const currentIndex = navPages.findIndex((p) => p.id === page.id);

  let prevPage: { title: string; href: string } | null = null;
  let nextPage: { title: string; href: string } | null = null;

  if (currentIndex > 0) {
    const prev = navPages[currentIndex - 1];
    // Skip homepage as prev link
    if (!prev.isHomepage) {
      prevPage = {
        title: prev.title,
        href: `/s/${siteSlug}/${prev.slug}`,
      };
    }
  }

  if (currentIndex >= 0 && currentIndex < navPages.length - 1) {
    const next = navPages[currentIndex + 1];
    nextPage = {
      title: next.title,
      href: next.isHomepage ? homeHref : `/s/${siteSlug}/${next.slug}`,
    };
  }

  // Build breadcrumb JSON-LD items
  const breadcrumbItems = [{ name: site.name, url: siteUrl }];
  if (!page.isHomepage) {
    breadcrumbItems.push({ name: page.title, url: canonical });
  }

  const blockData = blocks.map((b) => ({
    type: b.type,
    content: b.content as Record<string, unknown>,
  }));
  const faqItems = extractFaqItems(blockData);
  const pageHasForm = hasFormBlock(blockData);

  // Article JSON-LD for non-homepage content pages with >100 words
  const wordCount = blockData.reduce((count, b) => {
    if (b.type === "text" && typeof b.content.html === "string") {
      return count + stripHtmlTags(b.content.html).split(/\s+/).filter(Boolean).length;
    }
    return count;
  }, 0);
  const hasBlogTag = page.pageTags.some((pt) => pt.tag.slug === "blog" || pt.tag.name.toLowerCase() === "blog");
  const showArticleJsonLd = !page.isHomepage && page.publishedAt && wordCount > 100;

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
      <BreadcrumbJsonLd items={breadcrumbItems} />
      {faqItems.length > 0 && <FaqJsonLd items={faqItems} />}
      {pageHasForm && <ContactPageJsonLd name={page.title} url={canonical} />}
      {showArticleJsonLd && (
        <ArticleJsonLd
          title={page.title}
          description={page.description}
          url={canonical}
          datePublished={page.publishedAt!}
          dateModified={page.updatedAt}
          ogImage={page.ogImage || findFirstImageSrc(blockData) || (site.defaultOgImage as string | null)}
          siteName={site.name}
          isBlogPost={hasBlogTag}
          authorName={site.user?.name}
        />
      )}
      <Breadcrumbs
        siteName={site.name}
        siteHref={homeHref}
        pageTitle={page.isHomepage ? undefined : page.title}
      />
      <PublishedPage
        title={page.title}
        blocks={blocks}
        pageId={page.id}
        tags={page.pageTags.map((pt) => ({ id: pt.tag.id, name: pt.tag.name, slug: pt.tag.slug }))}
        siteSlug={siteSlug}
        publishedAt={page.publishedAt}
        updatedAt={page.updatedAt}
        turnstileSiteKey={site.turnstileSiteKey ?? undefined}
      />
      <SocialShareBar
        title={page.title}
        siteSlug={siteSlug}
        pageSlug={page.slug}
        isHomepage={page.isHomepage}
      />
      <PageNavigation prevPage={prevPage} nextPage={nextPage} />
    </>
  );
}
