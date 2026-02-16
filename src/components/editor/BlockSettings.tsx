"use client";

import { useEditorStore } from "@/stores/editor-store";
import { Input } from "@/components/ui/Input/Input";
import type { HeadingContent, ImageContent, ButtonContent, VideoContent } from "@/types/blocks";
import styles from "./BlockSettings.module.css";

export function BlockSettings() {
  const { blocks, selectedBlockId, updateBlockContent, updateBlockSettings } =
    useEditorStore();

  const block = blocks.find((b) => b.id === selectedBlockId);

  if (!block) {
    return (
      <div className={styles.empty}>
        <p>Select a block to edit its settings</p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>
        {block.type.charAt(0).toUpperCase() + block.type.slice(1)} Settings
      </h3>

      <div className={styles.section}>
        {/* Alignment for most blocks */}
        {["heading", "text", "button"].includes(block.type) && (
          <div className={styles.field}>
            <label className={styles.label}>Alignment</label>
            <div className={styles.buttonGroup}>
              {(["left", "center", "right"] as const).map((align) => (
                <button
                  key={align}
                  className={`${styles.alignBtn} ${
                    (block.settings.align || "left") === align ? styles.active : ""
                  }`}
                  onClick={() => updateBlockSettings(block.id, { align })}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Heading-specific */}
        {block.type === "heading" && (
          <div className={styles.field}>
            <label className={styles.label}>Level</label>
            <div className={styles.buttonGroup}>
              {([1, 2, 3, 4] as const).map((level) => (
                <button
                  key={level}
                  className={`${styles.alignBtn} ${
                    (block.content as HeadingContent).level === level
                      ? styles.active
                      : ""
                  }`}
                  onClick={() => updateBlockContent(block.id, { level })}
                >
                  H{level}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Image-specific */}
        {block.type === "image" && (
          <>
            <Input
              label="Image URL"
              value={(block.content as ImageContent).src}
              onChange={(e) =>
                updateBlockContent(block.id, { src: e.target.value })
              }
              placeholder="https://..."
            />
            <Input
              label="Alt text"
              value={(block.content as ImageContent).alt}
              onChange={(e) =>
                updateBlockContent(block.id, { alt: e.target.value })
              }
              placeholder="Describe the image"
            />
            <Input
              label="Caption"
              value={(block.content as ImageContent).caption || ""}
              onChange={(e) =>
                updateBlockContent(block.id, { caption: e.target.value })
              }
              placeholder="Optional caption"
            />
          </>
        )}

        {/* Button-specific */}
        {block.type === "button" && (
          <>
            <Input
              label="URL"
              value={(block.content as ButtonContent).url}
              onChange={(e) =>
                updateBlockContent(block.id, { url: e.target.value })
              }
              placeholder="https://..."
            />
            <div className={styles.field}>
              <label className={styles.label}>Style</label>
              <div className={styles.buttonGroup}>
                {(["primary", "secondary", "outline"] as const).map((v) => (
                  <button
                    key={v}
                    className={`${styles.alignBtn} ${
                      (block.content as ButtonContent).variant === v
                        ? styles.active
                        : ""
                    }`}
                    onClick={() => updateBlockContent(block.id, { variant: v })}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Video-specific */}
        {block.type === "video" && (
          <Input
            label="Video URL"
            value={(block.content as VideoContent).url}
            onChange={(e) =>
              updateBlockContent(block.id, { url: e.target.value })
            }
            placeholder="YouTube or Vimeo URL"
          />
        )}

        {/* Divider-specific */}
        {block.type === "divider" && (
          <div className={styles.field}>
            <label className={styles.label}>Style</label>
            <div className={styles.buttonGroup}>
              {(["solid", "dashed", "dotted"] as const).map((s) => (
                <button
                  key={s}
                  className={`${styles.alignBtn} ${
                    (block.settings.style || "solid") === s ? styles.active : ""
                  }`}
                  onClick={() => updateBlockSettings(block.id, { style: s })}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
