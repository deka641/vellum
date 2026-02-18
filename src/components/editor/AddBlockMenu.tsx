"use client";

import { useState } from "react";
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
  Search,
  ChevronDown,
  List,
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
  ChevronDown: <ChevronDown size={20} />,
  List: <List size={20} />,
};

function BlockPreview({ type }: { type: string }) {
  switch (type) {
    case "heading":
      return (
        <div className={styles.preview}>
          <div className={styles.previewHeadingLg} />
          <div className={styles.previewLine} style={{ width: "60%" }} />
        </div>
      );
    case "text":
      return (
        <div className={styles.preview}>
          <div className={styles.previewLine} />
          <div className={styles.previewLine} style={{ width: "90%" }} />
          <div className={styles.previewLine} style={{ width: "70%" }} />
        </div>
      );
    case "image":
      return (
        <div className={styles.preview}>
          <div className={styles.previewImage}>
            <Image size={12} />
          </div>
        </div>
      );
    case "button":
      return (
        <div className={styles.preview}>
          <div className={styles.previewButton} />
        </div>
      );
    case "spacer":
      return (
        <div className={styles.preview}>
          <div className={styles.previewSpacer}>
            <MoveVertical size={10} />
          </div>
        </div>
      );
    case "divider":
      return (
        <div className={styles.preview}>
          <div className={styles.previewDivider} />
        </div>
      );
    case "columns":
      return (
        <div className={styles.preview}>
          <div className={styles.previewColumns}>
            <div className={styles.previewCol} />
            <div className={styles.previewCol} />
          </div>
        </div>
      );
    case "video":
      return (
        <div className={styles.preview}>
          <div className={styles.previewVideo}>
            <Play size={12} />
          </div>
        </div>
      );
    case "quote":
      return (
        <div className={styles.preview}>
          <div className={styles.previewQuote}>
            <span>&ldquo;</span>
            <div className={styles.previewLine} style={{ width: "80%" }} />
          </div>
        </div>
      );
    case "form":
      return (
        <div className={styles.preview}>
          <div className={styles.previewInput} />
          <div className={styles.previewInput} />
          <div className={styles.previewButton} style={{ width: "50%" }} />
        </div>
      );
    case "code":
      return (
        <div className={styles.preview}>
          <div className={styles.previewCode}>
            <div className={styles.previewLine} style={{ width: "60%", background: "var(--color-accent-light)" }} />
            <div className={styles.previewLine} style={{ width: "80%", background: "var(--color-accent-light)" }} />
          </div>
        </div>
      );
    case "social":
      return (
        <div className={styles.preview}>
          <div className={styles.previewSocial}>
            <div className={styles.previewDot} />
            <div className={styles.previewDot} />
            <div className={styles.previewDot} />
          </div>
        </div>
      );
    case "accordion":
      return (
        <div className={styles.preview}>
          <div className={styles.previewAccordionRow} />
          <div className={styles.previewAccordionRow} />
        </div>
      );
    case "toc":
      return (
        <div className={styles.preview}>
          <div className={styles.previewTocLine} />
          <div className={styles.previewTocLine} style={{ marginLeft: "6px", width: "60%" }} />
          <div className={styles.previewTocLine} style={{ width: "55%" }} />
        </div>
      );
    default:
      return null;
  }
}

interface AddBlockMenuProps {
  onAdd: (type: BlockType) => void;
}

export function AddBlockMenu({ onAdd }: AddBlockMenuProps) {
  const [filter, setFilter] = useState("");
  const lowerFilter = filter.toLowerCase();

  const hasResults = blockCategories.some((cat) =>
    Object.values(blockDefinitions).some(
      (b) => b.category === cat.key && (!lowerFilter || b.label.toLowerCase().includes(lowerFilter))
    )
  );

  return (
    <div className={styles.menu}>
      <div className={styles.searchWrapper}>
        <Search size={14} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search blocks..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      {blockCategories.map((cat) => {
        const blocks = Object.values(blockDefinitions).filter(
          (b) => b.category === cat.key && (!lowerFilter || b.label.toLowerCase().includes(lowerFilter))
        );
        if (blocks.length === 0) return null;
        return (
          <div key={cat.key} className={styles.category}>
            <span className={styles.categoryLabel}>{cat.label}</span>
            <div className={styles.grid}>
              {blocks.map((block) => (
                <button
                  key={block.type}
                  className={styles.blockButton}
                  onClick={() => onAdd(block.type)}
                >
                  <span className={styles.blockIcon}>
                    {iconMap[block.icon]}
                  </span>
                  <BlockPreview type={block.type} />
                  <span className={styles.blockLabel}>{block.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {!hasResults && filter && (
        <p className={styles.noResults}>No blocks matching &ldquo;{filter}&rdquo;</p>
      )}
    </div>
  );
}
