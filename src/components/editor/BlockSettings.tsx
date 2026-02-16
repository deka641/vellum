"use client";

import { useState } from "react";
import { FolderOpen } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { Input } from "@/components/ui/Input/Input";
import { PageSettings } from "./PageSettings";
import { MediaPickerModal } from "./MediaPickerModal";
import type { HeadingContent, ImageContent, ButtonContent, VideoContent, QuoteContent, BlockSettings as BlockSettingsType } from "@/types/blocks";
import styles from "./BlockSettings.module.css";

export function BlockSettings() {
  const { blocks, selectedBlockId, updateBlockContent, updateBlockSettings } =
    useEditorStore();
  const [pickerOpen, setPickerOpen] = useState(false);

  const block = blocks.find((b) => b.id === selectedBlockId);

  if (!block) {
    return <PageSettings />;
  }

  const hasAlign = ["heading", "text", "button", "quote"].includes(block.type);
  const hasStyle = ["heading", "text", "button", "image", "columns", "quote"].includes(block.type);

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>
        {block.type.charAt(0).toUpperCase() + block.type.slice(1)} Settings
      </h3>

      <div className={styles.section}>
        {/* Alignment for most blocks */}
        {hasAlign && (
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
            <div className={styles.field}>
              <label className={styles.label}>Image</label>
              <button
                className={styles.browseBtn}
                onClick={() => setPickerOpen(true)}
              >
                <FolderOpen size={14} />
                Choose image
              </button>
              <MediaPickerModal
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                onSelect={(media) => {
                  updateBlockContent(block.id, {
                    src: media.url,
                    alt: media.alt || "",
                    mediaId: media.id,
                  });
                }}
              />
            </div>
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

        {/* Quote-specific */}
        {block.type === "quote" && (
          <div className={styles.field}>
            <label className={styles.label}>Style</label>
            <div className={styles.buttonGroup}>
              {(["default", "bordered", "filled"] as const).map((s) => (
                <button
                  key={s}
                  className={`${styles.alignBtn} ${
                    ((block.content as QuoteContent).style || "default") === s ? styles.active : ""
                  }`}
                  onClick={() => updateBlockContent(block.id, { style: s })}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Style Section */}
        {hasStyle && (
          <>
            <div className={styles.separator} />
            <div className={styles.sectionLabel}>Style</div>

            {["heading", "text", "button", "quote"].includes(block.type) && (
              <div className={styles.field}>
                <label className={styles.label}>Text color</label>
                <div className={styles.colorRow}>
                  <input
                    type="color"
                    className={styles.colorInput}
                    value={block.settings.textColor || "#000000"}
                    onChange={(e) => updateBlockSettings(block.id, { textColor: e.target.value })}
                  />
                  <span className={styles.colorHex}>{block.settings.textColor || "default"}</span>
                  {block.settings.textColor && (
                    <button className={styles.clearBtn} onClick={() => updateBlockSettings(block.id, { textColor: undefined })}>
                      clear
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className={styles.field}>
              <label className={styles.label}>Background</label>
              <div className={styles.colorRow}>
                <input
                  type="color"
                  className={styles.colorInput}
                  value={block.settings.backgroundColor || "#ffffff"}
                  onChange={(e) => updateBlockSettings(block.id, { backgroundColor: e.target.value })}
                />
                <span className={styles.colorHex}>{block.settings.backgroundColor || "default"}</span>
                {block.settings.backgroundColor && (
                  <button className={styles.clearBtn} onClick={() => updateBlockSettings(block.id, { backgroundColor: undefined })}>
                    clear
                  </button>
                )}
              </div>
            </div>

            {["heading", "text", "quote"].includes(block.type) && (
              <div className={styles.field}>
                <label className={styles.label}>Font size</label>
                <div className={styles.buttonGroup}>
                  {([
                    { label: "S", value: "0.875rem" },
                    { label: "M", value: "" },
                    { label: "L", value: "1.25rem" },
                    { label: "XL", value: "1.5rem" },
                  ] as const).map((size) => (
                    <button
                      key={size.label}
                      className={`${styles.alignBtn} ${
                        (block.settings.fontSize || "") === size.value ? styles.active : ""
                      }`}
                      onClick={() => updateBlockSettings(block.id, { fontSize: size.value || undefined })}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.field}>
              <label className={styles.label}>Padding</label>
              <div className={styles.paddingRow}>
                <div className={styles.paddingField}>
                  <span className={styles.paddingLabel}>Top</span>
                  <input
                    type="number"
                    className={styles.paddingInput}
                    value={block.settings.paddingY ? parseInt(block.settings.paddingY as string) : ""}
                    placeholder="0"
                    min={0}
                    max={200}
                    onChange={(e) => updateBlockSettings(block.id, { paddingY: e.target.value ? `${e.target.value}px` : undefined })}
                  />
                </div>
                <div className={styles.paddingField}>
                  <span className={styles.paddingLabel}>Side</span>
                  <input
                    type="number"
                    className={styles.paddingInput}
                    value={block.settings.paddingX ? parseInt(block.settings.paddingX as string) : ""}
                    placeholder="0"
                    min={0}
                    max={200}
                    onChange={(e) => updateBlockSettings(block.id, { paddingX: e.target.value ? `${e.target.value}px` : undefined })}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
