import { SafePublishedBlock } from "./SafePublishedBlock";
import { ScrollReveal } from "./ScrollReveal";
import type { BlockData } from "@/types/blocks";
import styles from "./published.module.css";

interface PublishedPageProps {
  title: string;
  blocks: BlockData[];
  pageId?: string;
}

export function PublishedPage({ title, blocks, pageId }: PublishedPageProps) {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {blocks.filter(b => !b.parentId).map((block, i) => (
          <ScrollReveal key={block.id} delay={Math.min(i * 50, 200)}>
            <SafePublishedBlock block={block} pageId={pageId} allBlocks={blocks} />
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
