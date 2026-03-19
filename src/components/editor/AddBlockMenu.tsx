"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
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
  ChevronRight,
  List,
  Table,
  Trash2,
  Bookmark,
} from "lucide-react";
import { type BlockType } from "@/types/blocks";
import { blockDefinitions, blockCategories } from "@/lib/blocks";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { useToast } from "@/components/ui/Toast/Toast";
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
  Table: <Table size={20} />,
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
    case "table":
      return (
        <div className={styles.preview}>
          <div className={styles.previewTable}>
            <div className={styles.previewTableRow}>
              <div className={styles.previewTableCell} style={{ background: "var(--color-text-tertiary)", opacity: 0.5 }} />
              <div className={styles.previewTableCell} style={{ background: "var(--color-text-tertiary)", opacity: 0.5 }} />
              <div className={styles.previewTableCell} style={{ background: "var(--color-text-tertiary)", opacity: 0.5 }} />
            </div>
            <div className={styles.previewTableRow}>
              <div className={styles.previewTableCell} />
              <div className={styles.previewTableCell} />
              <div className={styles.previewTableCell} />
            </div>
          </div>
        </div>
      );
    default:
      return null;
  }
}

interface AddBlockMenuProps {
  onAdd: (type: BlockType, contentOverride?: Record<string, unknown>) => void;
  insertAtIndex?: number;
}

const COLUMN_PRESETS: { label: string; widths: number[] }[] = [
  { label: "50 / 50", widths: [50, 50] },
  { label: "33 / 33 / 33", widths: [33, 34, 33] },
  { label: "66 / 34", widths: [66, 34] },
  { label: "34 / 66", widths: [34, 66] },
  { label: "75 / 25", widths: [75, 25] },
  { label: "25 / 75", widths: [25, 75] },
];

interface SavedBlockTemplate {
  id: string;
  name: string;
  type: string;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
}

const ALL_CATEGORIES = [{ key: "all", label: "All" }, { key: "saved", label: "Saved" }, ...blockCategories] as const;

export function AddBlockMenu({ onAdd }: AddBlockMenuProps) {
  const [filter, setFilter] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showColumnPresets, setShowColumnPresets] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [savedTemplates, setSavedTemplates] = useState<SavedBlockTemplate[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedFetched, setSavedFetched] = useState(false);
  const [savedFilter, setSavedFilter] = useState("");
  const [savedTypeFilter, setSavedTypeFilter] = useState<string>("all");
  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const lowerFilter = filter.toLowerCase();
  const { toast } = useToast();

  // Fetch saved templates when "Saved" tab is selected
  useEffect(() => {
    if (activeCategory === "saved" && !savedFetched) {
      setSavedLoading(true);
      fetch("/api/block-templates")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setSavedTemplates(data);
          }
        })
        .catch(() => {
          // silently fail
        })
        .finally(() => {
          setSavedLoading(false);
          setSavedFetched(true);
        });
    }
  }, [activeCategory, savedFetched]);

  const handleDeleteTemplate = useCallback(async (templateId: string) => {
    try {
      const res = await fetch(`/api/block-templates?id=${templateId}`, { method: "DELETE" });
      if (res.ok) {
        setSavedTemplates((prev) => prev.filter((t) => t.id !== templateId));
        toast("Template deleted", "info");
      } else {
        toast("Failed to delete template", "error");
      }
    } catch {
      toast("Failed to delete template", "error");
    }
  }, [toast]);

  const filteredBlocks = useMemo(() => {
    return Object.values(blockDefinitions).filter((b) => {
      if (activeCategory !== "all" && b.category !== activeCategory) return false;
      if (lowerFilter && !b.label.toLowerCase().includes(lowerFilter)) return false;
      return true;
    });
  }, [activeCategory, lowerFilter]);

  const categoriesToShow = useMemo(() => {
    if (activeCategory === "saved") return [];
    if (activeCategory !== "all") {
      const found = blockCategories.find((c) => c.key === activeCategory);
      return found ? [found] : [];
    }
    return [...blockCategories];
  }, [activeCategory]);

  const filteredSavedTemplates = useMemo(() => {
    const lowerSavedFilter = savedFilter.toLowerCase();
    return savedTemplates.filter((t) => {
      if (savedTypeFilter !== "all" && t.type !== savedTypeFilter) return false;
      if (lowerSavedFilter && !t.name.toLowerCase().includes(lowerSavedFilter)) return false;
      return true;
    });
  }, [savedTemplates, savedFilter, savedTypeFilter]);

  const savedTemplateTypes = useMemo(() => {
    const types = new Set(savedTemplates.map((t) => t.type));
    return Array.from(types).sort();
  }, [savedTemplates]);

  const savedTemplatesByType = useMemo(() => {
    const groups: Record<string, SavedBlockTemplate[]> = {};
    for (const t of filteredSavedTemplates) {
      if (!groups[t.type]) groups[t.type] = [];
      groups[t.type].push(t);
    }
    return groups;
  }, [filteredSavedTemplates]);

  const toggleTypeCollapsed = useCallback((type: string) => {
    setCollapsedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // Reset active index when filter or category changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [filter, activeCategory]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (filteredBlocks.length === 0) return;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % filteredBlocks.length);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          setActiveIndex((prev) => (prev <= 0 ? filteredBlocks.length - 1 : prev - 1));
          break;
        }
        case "Enter": {
          e.preventDefault();
          const idx = activeIndex >= 0 ? activeIndex : 0;
          const block = filteredBlocks[idx];
          if (block) {
            if (block.type === "columns") {
              setShowColumnPresets(true);
            } else {
              onAdd(block.type);
            }
          }
          break;
        }
      }
    },
    [filteredBlocks, onAdd, activeIndex]
  );

  return (
    <div className={styles.menu}>
      <div className={styles.searchWrapper}>
        <Search size={14} className={styles.searchIcon} />
        <input
          ref={inputRef}
          className={styles.searchInput}
          type="text"
          placeholder="Search blocks..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded="true"
          aria-controls="block-list"
          aria-activedescendant={activeIndex >= 0 && filteredBlocks[activeIndex] ? `block-option-${filteredBlocks[activeIndex].type}` : undefined}
        />
      </div>
      <div className={styles.filterChips}>
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            className={`${styles.filterChip} ${activeCategory === cat.key ? styles.filterChipActive : ""}`}
            onClick={() => setActiveCategory(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>
      {activeCategory !== "saved" && categoriesToShow.map((cat) => {
        const blocks = filteredBlocks.filter((b) => b.category === cat.key);
        if (blocks.length === 0) return null;
        return (
          <div key={cat.key} className={styles.category}>
            {activeCategory === "all" && (
              <span className={styles.categoryLabel}>{cat.label}</span>
            )}
            <div className={styles.grid} role="listbox" aria-label="Available blocks">
              {blocks.map((block) => {
                const globalIdx = filteredBlocks.indexOf(block);
                const isActive = globalIdx === activeIndex;
                return (
                  <button
                    key={block.type}
                    className={`${styles.blockButton} ${isActive ? styles.blockButtonActive : ""}`}
                    role="option"
                    aria-selected={isActive}
                    id={`block-option-${block.type}`}
                    onClick={() => {
                      if (block.type === "columns") {
                        setShowColumnPresets(true);
                      } else {
                        onAdd(block.type);
                      }
                    }}
                  >
                    <span className={styles.blockIcon}>
                      {iconMap[block.icon]}
                    </span>
                    <BlockPreview type={block.type} />
                    <span className={styles.blockLabel}>{block.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {activeCategory !== "saved" && filteredBlocks.length === 0 && (filter || activeCategory !== "all") && (
        <p className={styles.noResults}>No blocks matching &ldquo;{filter || activeCategory}&rdquo;</p>
      )}
      {activeCategory === "saved" && (
        <div className={styles.category}>
          {savedLoading ? (
            <div className={styles.savedLoadingContainer}>
              <Skeleton width="100%" height="48px" />
              <Skeleton width="100%" height="48px" />
              <Skeleton width="100%" height="48px" />
            </div>
          ) : savedTemplates.length === 0 ? (
            <div className={styles.savedEmpty}>
              <Bookmark size={24} />
              <p>No saved templates yet</p>
              <span>Use the bookmark icon on any block to save it as a template</span>
            </div>
          ) : (
            <>
              <div className={styles.savedSearchWrapper}>
                <Search size={14} className={styles.savedSearchIcon} />
                <input
                  className={styles.savedSearchInput}
                  type="text"
                  placeholder="Filter templates..."
                  value={savedFilter}
                  onChange={(e) => setSavedFilter(e.target.value)}
                />
              </div>
              {savedTemplateTypes.length > 1 && (
                <div className={styles.savedTypeChips}>
                  <button
                    className={`${styles.filterChip} ${savedTypeFilter === "all" ? styles.filterChipActive : ""}`}
                    onClick={() => setSavedTypeFilter("all")}
                  >
                    All
                  </button>
                  {savedTemplateTypes.map((type) => (
                    <button
                      key={type}
                      className={`${styles.filterChip} ${savedTypeFilter === type ? styles.filterChipActive : ""}`}
                      onClick={() => setSavedTypeFilter(type)}
                    >
                      {blockDefinitions[type as BlockType]?.label || type}
                    </button>
                  ))}
                </div>
              )}
              {filteredSavedTemplates.length === 0 ? (
                <p className={styles.noResults}>No templates matching &ldquo;{savedFilter || savedTypeFilter}&rdquo;</p>
              ) : savedTypeFilter !== "all" || savedTemplateTypes.length <= 1 ? (
                <div className={styles.savedList}>
                  {filteredSavedTemplates.map((template) => (
                    <div key={template.id} className={styles.savedItem}>
                      <button
                        className={styles.savedItemButton}
                        onClick={() => onAdd(template.type as BlockType, template.content)}
                        title={`Insert ${template.name}`}
                      >
                        <span className={styles.savedItemIcon}>
                          {iconMap[blockDefinitions[template.type as BlockType]?.icon] || <Bookmark size={20} />}
                        </span>
                        <span className={styles.savedItemName}>{template.name}</span>
                        <span className={styles.savedItemTypeBadge}>
                          {blockDefinitions[template.type as BlockType]?.label || template.type}
                        </span>
                      </button>
                      <button
                        className={styles.savedItemDelete}
                        onClick={() => handleDeleteTemplate(template.id)}
                        title="Delete template"
                        aria-label={`Delete template ${template.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.savedGrouped}>
                  {Object.entries(savedTemplatesByType).map(([type, templates]) => (
                    <div key={type} className={styles.savedGroup}>
                      <button
                        className={styles.savedGroupHeader}
                        onClick={() => toggleTypeCollapsed(type)}
                        aria-expanded={!collapsedTypes.has(type)}
                      >
                        <span className={styles.savedGroupChevron}>
                          {collapsedTypes.has(type) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                        </span>
                        <span className={styles.savedGroupLabel}>
                          {blockDefinitions[type as BlockType]?.label || type}
                        </span>
                        <span className={styles.savedGroupCount}>{templates.length}</span>
                      </button>
                      {!collapsedTypes.has(type) && (
                        <div className={styles.savedList}>
                          {templates.map((template) => (
                            <div key={template.id} className={styles.savedItem}>
                              <button
                                className={styles.savedItemButton}
                                onClick={() => onAdd(template.type as BlockType, template.content)}
                                title={`Insert ${template.name}`}
                              >
                                <span className={styles.savedItemIcon}>
                                  {iconMap[blockDefinitions[template.type as BlockType]?.icon] || <Bookmark size={20} />}
                                </span>
                                <span className={styles.savedItemName}>{template.name}</span>
                                <span className={styles.savedItemTypeBadge}>
                                  {blockDefinitions[template.type as BlockType]?.label || template.type}
                                </span>
                              </button>
                              <button
                                className={styles.savedItemDelete}
                                onClick={() => handleDeleteTemplate(template.id)}
                                title="Delete template"
                                aria-label={`Delete template ${template.name}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
      {showColumnPresets && (
        <div className={styles.presetOverlay}>
          <div className={styles.presetPanel}>
            <div className={styles.presetHeader}>
              <span className={styles.presetTitle}>Choose layout</span>
              <button
                className={styles.presetClose}
                onClick={() => setShowColumnPresets(false)}
                aria-label="Cancel"
              >
                &times;
              </button>
            </div>
            <div className={styles.presetGrid}>
              {COLUMN_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  className={styles.presetButton}
                  onClick={() => {
                    const cols = preset.widths.map(() => ({ blocks: [] }));
                    onAdd("columns", { columns: cols, columnWidths: preset.widths });
                    setShowColumnPresets(false);
                  }}
                  title={preset.label}
                >
                  <div className={styles.presetBars}>
                    {preset.widths.map((w, i) => (
                      <div
                        key={i}
                        className={styles.presetBar}
                        style={{ flex: w }}
                      />
                    ))}
                  </div>
                  <span className={styles.presetLabel}>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
