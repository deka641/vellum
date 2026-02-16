"use client";

import {
  Type,
  AlignLeft,
  Image,
  MousePointer,
  MoveVertical,
  Minus,
  Columns2,
  Play,
  Quote,
  FileInput,
  Code,
  Share2,
} from "lucide-react";
import { type BlockType } from "@/types/blocks";
import { blockDefinitions, blockCategories } from "@/lib/blocks";
import styles from "./AddBlockMenu.module.css";

const iconMap: Record<string, React.ReactNode> = {
  Type: <Type size={20} />,
  AlignLeft: <AlignLeft size={20} />,
  Image: <Image size={20} />,
  MousePointer: <MousePointer size={20} />,
  MoveVertical: <MoveVertical size={20} />,
  Minus: <Minus size={20} />,
  Columns: <Columns2 size={20} />,
  Play: <Play size={20} />,
  Quote: <Quote size={20} />,
  FileInput: <FileInput size={20} />,
  Code: <Code size={20} />,
  Share2: <Share2 size={20} />,
};

interface AddBlockMenuProps {
  onAdd: (type: BlockType) => void;
}

export function AddBlockMenu({ onAdd }: AddBlockMenuProps) {
  return (
    <div className={styles.menu}>
      {blockCategories.map((cat) => (
        <div key={cat.key} className={styles.category}>
          <span className={styles.categoryLabel}>{cat.label}</span>
          <div className={styles.grid}>
            {Object.values(blockDefinitions)
              .filter((b) => b.category === cat.key)
              .map((block) => (
                <button
                  key={block.type}
                  className={styles.blockButton}
                  onClick={() => onAdd(block.type)}
                >
                  <span className={styles.blockIcon}>
                    {iconMap[block.icon]}
                  </span>
                  <span className={styles.blockLabel}>{block.label}</span>
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
