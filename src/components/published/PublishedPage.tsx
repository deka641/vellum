import { PublishedBlock } from "./PublishedBlock";
import { SafePublishedBlock } from "./SafePublishedBlock";
import styles from "./published.module.css";

interface BlockData {
  id: string;
  type: string;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
  parentId?: string | null;
}

interface PublishedPageProps {
  title: string;
  blocks: BlockData[];
  pageId?: string;
}

export function PublishedPage({ title, blocks, pageId }: PublishedPageProps) {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {blocks.filter(b => !b.parentId).map((block) => (
          <SafePublishedBlock key={block.id} block={block} pageId={pageId} />
        ))}
      </div>
    </div>
  );
}
