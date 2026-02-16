import { PublishedBlock } from "./PublishedBlock";
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
}

export function PublishedPage({ title, blocks }: PublishedPageProps) {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {blocks.map((block) => (
          <PublishedBlock key={block.id} block={block} />
        ))}
      </div>
    </div>
  );
}
