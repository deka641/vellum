import Link from "next/link";
import { SafePublishedBlock } from "./SafePublishedBlock";
import { ScrollReveal } from "./ScrollReveal";
import type { BlockData } from "@/types/blocks";
import styles from "./published.module.css";

interface TagInfo {
  id: string;
  name: string;
  slug: string;
}

interface PublishedPageProps {
  title: string;
  blocks: BlockData[];
  pageId?: string;
  tags?: TagInfo[];
  siteSlug?: string;
  publishedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  turnstileSiteKey?: string;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function countWords(blocks: BlockData[]): number {
  let count = 0;
  for (const block of blocks) {
    if (block.type === "heading" && typeof block.content.text === "string") {
      count += block.content.text.split(/\s+/).filter(Boolean).length;
    }
    if (block.type === "text" && typeof block.content.html === "string") {
      count += stripHtml(block.content.html).split(/\s+/).filter(Boolean).length;
    }
    if (block.type === "quote" && typeof block.content.text === "string") {
      count += block.content.text.split(/\s+/).filter(Boolean).length;
    }
    if (block.type === "accordion" && Array.isArray(block.content.items)) {
      for (const item of block.content.items as Array<{ title?: string; content?: string }>) {
        if (item.title) count += item.title.split(/\s+/).filter(Boolean).length;
        if (item.content) count += stripHtml(item.content).split(/\s+/).filter(Boolean).length;
      }
    }
    if (block.type === "columns" && Array.isArray(block.content.columns)) {
      for (const col of block.content.columns as Array<{ blocks?: BlockData[] }>) {
        if (Array.isArray(col.blocks)) count += countWords(col.blocks);
      }
    }
  }
  return count;
}

function formatPublishedDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function PublishedPage({ title, blocks, pageId, tags, siteSlug, publishedAt, updatedAt, turnstileSiteKey }: PublishedPageProps) {
  const hasH1Block = blocks.some(
    (b) => !b.parentId && b.type === "heading" && (b.content as Record<string, unknown>).level === 1
  );

  const wordCount = countWords(blocks);
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const showReadingTime = wordCount > 100;

  const showPublishedDate = !!publishedAt;
  const showUpdatedDate = publishedAt && updatedAt &&
    new Date(updatedAt).getTime() - new Date(publishedAt).getTime() > 86400000; // > 1 day apart

  const hasMetaLine = showPublishedDate || showReadingTime;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {tags && tags.length > 0 && siteSlug && (
          <div className={styles.pageTags}>
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/s/${siteSlug}/tag/${tag.slug}`}
                className={styles.pageTag}
              >
                {tag.name}
              </Link>
            ))}
          </div>
        )}
        {!hasH1Block && title && (
          <h1 className={styles.heading} data-level="1">{title}</h1>
        )}
        {hasMetaLine && (
          <div className={styles.pageMeta}>
            {showPublishedDate && (
              <time dateTime={new Date(publishedAt!).toISOString()}>
                Published {formatPublishedDate(publishedAt!)}
              </time>
            )}
            {showUpdatedDate && (
              <time dateTime={new Date(updatedAt!).toISOString()}>
                Updated {formatPublishedDate(updatedAt!)}
              </time>
            )}
            {showReadingTime && (
              <span>{readingTime} min read</span>
            )}
          </div>
        )}
        {blocks.filter(b => !b.parentId).map((block, i) => (
          <ScrollReveal key={block.id} delay={Math.min(i * 50, 200)}>
            <SafePublishedBlock block={block} pageId={pageId} allBlocks={blocks} turnstileSiteKey={turnstileSiteKey} />
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
