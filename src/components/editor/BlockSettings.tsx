"use client";

import { useState, useMemo } from "react";
import { FolderOpen } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { Input } from "@/components/ui/Input/Input";
import { PageSettings } from "./PageSettings";
import { SeoAudit } from "./SeoAudit";
import { MediaPickerModal } from "./MediaPickerModal";
import type { EditorBlock, HeadingContent, ImageContent, ButtonContent, VideoContent, QuoteContent, CodeContent, BlockSettings as BlockSettingsType, ColumnsContent } from "@/types/blocks";
import styles from "./BlockSettings.module.css";

function findBlockInTree(blocks: EditorBlock[], id: string): EditorBlock | null {
  for (const b of blocks) {
    if (b.id === id) return b;
    if (b.type === "columns") {
      const cols = (b.content as ColumnsContent).columns;
      for (const col of cols) {
        for (const cb of col.blocks) {
          if (cb.id === id) return cb;
        }
      }
    }
  }
  return null;
}

function findColumnParent(blocks: EditorBlock[], id: string): string | null {
  for (const b of blocks) {
    if (b.type === "columns") {
      const cols = (b.content as ColumnsContent).columns;
      for (const col of cols) {
        if (col.blocks.some((cb) => cb.id === id)) return b.id;
      }
    }
  }
  return null;
}

export function BlockSettings() {
  const blocks = useEditorStore((s) => s.blocks);
  const selectedBlockId = useEditorStore((s) => s.selectedBlockId);
  const updateBlockContent = useEditorStore((s) => s.updateBlockContent);
  const updateBlockSettings = useEditorStore((s) => s.updateBlockSettings);
  const updateColumnBlockContent = useEditorStore((s) => s.updateColumnBlockContent);
  const updateColumnBlockSettings = useEditorStore((s) => s.updateColumnBlockSettings);
  const [pickerOpen, setPickerOpen] = useState(false);

  const block = useMemo(
    () => (selectedBlockId ? findBlockInTree(blocks, selectedBlockId) : null),
    [blocks, selectedBlockId]
  );

  if (!block) {
    return (
      <>
        <PageSettings />
        <SeoAudit />
      </>
    );
  }

  const columnParentId = useMemo(
    () => findColumnParent(blocks, block.id),
    [blocks, block.id]
  );
  const handleContentUpdate = (id: string, content: Record<string, unknown>) => {
    if (columnParentId) {
      updateColumnBlockContent(columnParentId, id, content as Partial<import("@/types/blocks").BlockContent>);
    } else {
      updateBlockContent(id, content as Partial<import("@/types/blocks").BlockContent>);
    }
  };
  const handleSettingsUpdate = (id: string, settings: Partial<BlockSettingsType>) => {
    if (columnParentId) {
      updateColumnBlockSettings(columnParentId, id, settings);
    } else {
      updateBlockSettings(id, settings);
    }
  };

  const hasAlign = ["heading", "text", "button", "quote", "social", "divider"].includes(block.type);
  const hasStyle = ["heading", "text", "button", "image", "columns", "quote", "code", "divider", "video"].includes(block.type);

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>
        {block.type.charAt(0).toUpperCase() + block.type.slice(1)} Settings
      </h3>

      <div className={styles.section}>
        {/* Visibility toggle */}
        <div className={styles.field}>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={block.settings.hidden !== true}
              onChange={() => handleSettingsUpdate(block.id, { hidden: !block.settings.hidden })}
            />
            <span className={styles.label}>Visible on published site</span>
          </label>
        </div>

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
                  onClick={() => handleSettingsUpdate(block.id, { align })}
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
                  onClick={() => handleContentUpdate(block.id, { level })}
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
                  handleContentUpdate(block.id, {
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
                handleContentUpdate(block.id, { src: e.target.value })
              }
              placeholder="https://..."
            />
            <Input
              label="Alt text"
              value={(block.content as ImageContent).alt}
              onChange={(e) =>
                handleContentUpdate(block.id, { alt: e.target.value })
              }
              placeholder="Describe the image"
            />
            <Input
              label="Caption"
              value={(block.content as ImageContent).caption || ""}
              onChange={(e) =>
                handleContentUpdate(block.id, { caption: e.target.value })
              }
              placeholder="Optional caption"
            />
            <div className={styles.separator} />
            <Input
              label="Link URL"
              value={(block.content as ImageContent).link || ""}
              onChange={(e) =>
                handleContentUpdate(block.id, { link: e.target.value })
              }
              placeholder="https://... (optional)"
            />
            {(block.content as ImageContent).link && (
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={(block.content as ImageContent).linkNewTab || false}
                  onChange={(e) =>
                    handleContentUpdate(block.id, { linkNewTab: e.target.checked })
                  }
                />
                <span className={styles.label}>Open in new tab</span>
              </label>
            )}
            <div className={styles.separator} />
            <div className={styles.field}>
              <label className={styles.label}>Width</label>
              <div className={styles.buttonGroup}>
                {([
                  { label: "25%", value: "25%" },
                  { label: "50%", value: "50%" },
                  { label: "75%", value: "75%" },
                  { label: "100%", value: "" },
                ] as const).map((w) => (
                  <button
                    key={w.label}
                    className={`${styles.alignBtn} ${
                      (block.settings.width || "") === w.value ? styles.active : ""
                    }`}
                    onClick={() => handleSettingsUpdate(block.id, { width: w.value || undefined })}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={block.settings.rounded === true}
                onChange={(e) => handleSettingsUpdate(block.id, { rounded: e.target.checked || undefined })}
              />
              <span className={styles.label}>Rounded corners</span>
            </label>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={block.settings.shadow === true}
                onChange={(e) => handleSettingsUpdate(block.id, { shadow: e.target.checked || undefined })}
              />
              <span className={styles.label}>Shadow</span>
            </label>
          </>
        )}

        {/* Button-specific */}
        {block.type === "button" && (
          <>
            <Input
              label="URL"
              value={(block.content as ButtonContent).url}
              onChange={(e) =>
                handleContentUpdate(block.id, { url: e.target.value })
              }
              placeholder="https://..."
            />
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={(block.content as ButtonContent).openInNewTab || false}
                onChange={(e) =>
                  handleContentUpdate(block.id, { openInNewTab: e.target.checked })
                }
              />
              <span className={styles.label}>Open in new tab</span>
            </label>
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
                    onClick={() => handleContentUpdate(block.id, { variant: v })}
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
          <>
            <Input
              label="Video URL"
              value={(block.content as VideoContent).url}
              onChange={(e) =>
                handleContentUpdate(block.id, { url: e.target.value })
              }
              placeholder="YouTube or Vimeo URL"
            />
            <div className={styles.field}>
              <label className={styles.label}>Aspect ratio</label>
              <div className={styles.buttonGroup}>
                {([
                  { label: "16:9", value: "16/9" },
                  { label: "4:3", value: "4/3" },
                  { label: "1:1", value: "1/1" },
                ] as const).map((ar) => (
                  <button
                    key={ar.label}
                    className={`${styles.alignBtn} ${
                      ((block.settings.aspectRatio as string) || "16/9") === ar.value ? styles.active : ""
                    }`}
                    onClick={() => handleSettingsUpdate(block.id, { aspectRatio: ar.value })}
                  >
                    {ar.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Code-specific */}
        {block.type === "code" && (
          <div className={styles.field}>
            <label className={styles.label}>Mode</label>
            <div className={styles.buttonGroup}>
              {(["html", "embed"] as const).map((lang) => (
                <button
                  key={lang}
                  className={`${styles.alignBtn} ${
                    ((block.content as CodeContent).language || "html") === lang ? styles.active : ""
                  }`}
                  onClick={() => handleContentUpdate(block.id, { language: lang })}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Divider-specific */}
        {block.type === "divider" && (
          <>
            <div className={styles.field}>
              <label className={styles.label}>Style</label>
              <div className={styles.buttonGroup}>
                {(["solid", "dashed", "dotted"] as const).map((s) => (
                  <button
                    key={s}
                    className={`${styles.alignBtn} ${
                      (block.settings.style || "solid") === s ? styles.active : ""
                    }`}
                    onClick={() => handleSettingsUpdate(block.id, { style: s })}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Color</label>
              <div className={styles.colorRow}>
                <input
                  type="color"
                  className={styles.colorInput}
                  value={(block.settings.color as string) || "#d4d0cb"}
                  onChange={(e) => handleSettingsUpdate(block.id, { color: e.target.value })}
                />
                <span className={styles.colorHex}>{(block.settings.color as string) || "default"}</span>
                {block.settings.color && (
                  <button className={styles.clearBtn} onClick={() => handleSettingsUpdate(block.id, { color: undefined })}>
                    clear
                  </button>
                )}
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Thickness</label>
              <div className={styles.buttonGroup}>
                {([
                  { label: "Thin", value: "1px" },
                  { label: "Medium", value: "2px" },
                  { label: "Thick", value: "4px" },
                ] as const).map((t) => (
                  <button
                    key={t.label}
                    className={`${styles.alignBtn} ${
                      (block.settings.thickness || "1px") === t.value ? styles.active : ""
                    }`}
                    onClick={() => handleSettingsUpdate(block.id, { thickness: t.value })}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Width</label>
              <div className={styles.buttonGroup}>
                {([
                  { label: "Full", value: "" },
                  { label: "75%", value: "75%" },
                  { label: "50%", value: "50%" },
                  { label: "25%", value: "25%" },
                ] as const).map((w) => (
                  <button
                    key={w.label}
                    className={`${styles.alignBtn} ${
                      (block.settings.maxWidth || "") === w.value ? styles.active : ""
                    }`}
                    onClick={() => handleSettingsUpdate(block.id, { maxWidth: w.value || undefined })}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          </>
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
                  onClick={() => handleContentUpdate(block.id, { style: s })}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Columns-specific */}
        {block.type === "columns" && (
          <div className={styles.field}>
            <label className={styles.label}>Gap</label>
            <div className={styles.buttonGroup}>
              {([
                { label: "S", value: "12px" },
                { label: "M", value: "24px" },
                { label: "L", value: "48px" },
              ] as const).map((g) => (
                <button
                  key={g.label}
                  className={`${styles.alignBtn} ${
                    ((block.settings.gap as string) || "24px") === g.value ? styles.active : ""
                  }`}
                  onClick={() => handleSettingsUpdate(block.id, { gap: g.value })}
                >
                  {g.label}
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
                    onChange={(e) => handleSettingsUpdate(block.id, { textColor: e.target.value })}
                  />
                  <span className={styles.colorHex}>{block.settings.textColor || "default"}</span>
                  {block.settings.textColor && (
                    <button className={styles.clearBtn} onClick={() => handleSettingsUpdate(block.id, { textColor: undefined })}>
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
                  onChange={(e) => handleSettingsUpdate(block.id, { backgroundColor: e.target.value })}
                />
                <span className={styles.colorHex}>{block.settings.backgroundColor || "default"}</span>
                {block.settings.backgroundColor && (
                  <button className={styles.clearBtn} onClick={() => handleSettingsUpdate(block.id, { backgroundColor: undefined })}>
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
                      onClick={() => handleSettingsUpdate(block.id, { fontSize: size.value || undefined })}
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
                    onChange={(e) => handleSettingsUpdate(block.id, { paddingY: e.target.value ? `${e.target.value}px` : undefined })}
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
                    onChange={(e) => handleSettingsUpdate(block.id, { paddingX: e.target.value ? `${e.target.value}px` : undefined })}
                  />
                </div>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Margin</label>
              <div className={styles.paddingRow}>
                <div className={styles.paddingField}>
                  <span className={styles.paddingLabel}>Top</span>
                  <select
                    className={styles.paddingInput}
                    value={block.settings.marginTop || ""}
                    onChange={(e) => handleSettingsUpdate(block.id, { marginTop: e.target.value || undefined })}
                  >
                    <option value="">0</option>
                    <option value="8px">8px</option>
                    <option value="16px">16px</option>
                    <option value="24px">24px</option>
                    <option value="32px">32px</option>
                    <option value="48px">48px</option>
                    <option value="64px">64px</option>
                  </select>
                </div>
                <div className={styles.paddingField}>
                  <span className={styles.paddingLabel}>Bottom</span>
                  <select
                    className={styles.paddingInput}
                    value={block.settings.marginBottom || ""}
                    onChange={(e) => handleSettingsUpdate(block.id, { marginBottom: e.target.value || undefined })}
                  >
                    <option value="">0</option>
                    <option value="8px">8px</option>
                    <option value="16px">16px</option>
                    <option value="24px">24px</option>
                    <option value="32px">32px</option>
                    <option value="48px">48px</option>
                    <option value="64px">64px</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
