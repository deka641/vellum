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
}

export function PublishedPage({ title, blocks, pageId, tags, siteSlug }: PublishedPageProps) {
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
        {blocks.filter(b => !b.parentId).map((block, i) => (
          <ScrollReveal key={block.id} delay={Math.min(i * 50, 200)}>
            <SafePublishedBlock block={block} pageId={pageId} allBlocks={blocks} />
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
