"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { Plus, Trash2, Bold, Italic, Link } from "lucide-react";
import type { TableContent, BlockSettings } from "@/types/blocks";
import { useEditorStore } from "@/stores/editor-store";
import styles from "./blocks.module.css";

interface TableBlockProps {
  id: string;
  content: TableContent;
  settings: BlockSettings;
}

interface FocusedCell {
  type: "header" | "body";
  row: number;
  col: number;
}

export function TableBlock({ id, content }: TableBlockProps) {
  const updateBlockContent = useEditorStore((s) => s.updateBlockContent);

  const headers = content.headers || [];
  const rows = content.rows || [];
  const caption = content.caption || "";
  const striped = content.striped ?? true;

  const [focusedCell, setFocusedCell] = useState<FocusedCell | null>(null);
  const [showLinkPrompt, setShowLinkPrompt] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const toolbarRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const isLocalUpdate = useRef(false);
  const savedSelection = useRef<Range | null>(null);

  const update = useCallback(
    (partial: Partial<TableContent>) => {
      updateBlockContent(id, { ...content, ...partial });
    },
    [id, content, updateBlockContent]
  );

  function getCellKey(type: "header" | "body", row: number, col: number) {
    return `${type}-${row}-${col}`;
  }

  function setCellRef(type: "header" | "body", row: number, col: number, el: HTMLDivElement | null) {
    const key = getCellKey(type, row, col);
    if (el) {
      cellRefs.current.set(key, el);
    } else {
      cellRefs.current.delete(key);
    }
  }

  // Sync store changes (e.g. undo/redo) back to DOM
  useEffect(() => {
    if (isLocalUpdate.current) {
      isLocalUpdate.current = false;
      return;
    }
    // Sync header cells
    headers.forEach((h, ci) => {
      const el = cellRefs.current.get(getCellKey("header", 0, ci));
      if (el && el.innerHTML !== h) {
        el.innerHTML = h;
      }
    });
    // Sync body cells
    rows.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        const el = cellRefs.current.get(getCellKey("body", ri, ci));
        if (el && el.innerHTML !== cell) {
          el.innerHTML = cell;
        }
      });
    });
  }, [headers, rows]);

  function updateHeader(colIndex: number, value: string) {
    isLocalUpdate.current = true;
    const newHeaders = [...headers];
    newHeaders[colIndex] = value;
    update({ headers: newHeaders });
  }

  function updateCell(rowIndex: number, colIndex: number, value: string) {
    isLocalUpdate.current = true;
    const newRows = rows.map((row) => [...row]);
    newRows[rowIndex][colIndex] = value;
    update({ rows: newRows });
  }

  function addColumn() {
    const newHeaders = [...headers, `Column ${headers.length + 1}`];
    const newRows = rows.map((row) => [...row, ""]);
    update({ headers: newHeaders, rows: newRows });
  }

  function removeColumn(colIndex: number) {
    if (headers.length <= 1) return;
    const newHeaders = headers.filter((_, i) => i !== colIndex);
    const newRows = rows.map((row) => row.filter((_, i) => i !== colIndex));
    update({ headers: newHeaders, rows: newRows });
  }

  function addRow() {
    const newRow = headers.map(() => "");
    update({ rows: [...rows, newRow] });
  }

  function removeRow(rowIndex: number) {
    if (rows.length <= 1) return;
    update({ rows: rows.filter((_, i) => i !== rowIndex) });
  }

  function handleCellFocus(type: "header" | "body", row: number, col: number) {
    setFocusedCell({ type, row, col });
    setShowLinkPrompt(false);
  }

  function handleCellBlur(e: React.FocusEvent<HTMLDivElement>, type: "header" | "body", row: number, col: number) {
    const html = e.currentTarget.innerHTML;
    if (type === "header") {
      updateHeader(col, html);
    } else {
      updateCell(row, col, html);
    }

    // Delay clearing focus to allow toolbar clicks
    setTimeout(() => {
      const active = document.activeElement;
      if (
        toolbarRef.current?.contains(active) ||
        cellRefs.current.has(getCellKey(
          focusedCell?.type || type,
          focusedCell?.row ?? row,
          focusedCell?.col ?? col
        ))
      ) {
        return;
      }
      setFocusedCell(null);
      setShowLinkPrompt(false);
    }, 200);
  }

  function handleCellInput(e: React.FormEvent<HTMLDivElement>, type: "header" | "body", row: number, col: number) {
    const html = e.currentTarget.innerHTML;
    if (type === "header") {
      updateHeader(col, html);
    } else {
      updateCell(row, col, html);
    }
  }

  function execFormatCommand(command: string, value?: string) {
    // Restore saved selection if available
    if (savedSelection.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedSelection.current);
      }
    }
    document.execCommand(command, false, value);
    // After command, update the store with the new HTML
    if (focusedCell) {
      const key = getCellKey(focusedCell.type, focusedCell.row, focusedCell.col);
      const el = cellRefs.current.get(key);
      if (el) {
        const html = el.innerHTML;
        if (focusedCell.type === "header") {
          updateHeader(focusedCell.col, html);
        } else {
          updateCell(focusedCell.row, focusedCell.col, html);
        }
      }
    }
  }

  function handleBold(e: React.MouseEvent) {
    e.preventDefault();
    execFormatCommand("bold");
  }

  function handleItalic(e: React.MouseEvent) {
    e.preventDefault();
    execFormatCommand("italic");
  }

  function handleLinkClick(e: React.MouseEvent) {
    e.preventDefault();
    // Save the current selection before opening link prompt
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelection.current = sel.getRangeAt(0).cloneRange();
    }
    setShowLinkPrompt(true);
    setLinkUrl("");
  }

  function handleLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (linkUrl.trim()) {
      execFormatCommand("createLink", linkUrl.trim());
    }
    setShowLinkPrompt(false);
    setLinkUrl("");
    savedSelection.current = null;
  }

  function handleLinkCancel() {
    setShowLinkPrompt(false);
    setLinkUrl("");
    savedSelection.current = null;
    // Refocus the cell
    if (focusedCell) {
      const key = getCellKey(focusedCell.type, focusedCell.row, focusedCell.col);
      const el = cellRefs.current.get(key);
      if (el) el.focus();
    }
  }

  function handleToolbarMouseDown(e: React.MouseEvent) {
    // Prevent toolbar from stealing focus from the cell
    e.preventDefault();
  }

  // Compute toolbar position relative to focused cell
  function getToolbarPosition(): React.CSSProperties {
    if (!focusedCell) return { display: "none" };
    const key = getCellKey(focusedCell.type, focusedCell.row, focusedCell.col);
    const el = cellRefs.current.get(key);
    if (!el || !el.parentElement) return { display: "none" };

    // Position relative to the table wrapper
    const tableWrapper = el.closest(`.${styles.tableWrapper}`);
    if (!tableWrapper) return { display: "none" };

    const wrapperRect = tableWrapper.getBoundingClientRect();
    const cellRect = el.getBoundingClientRect();

    return {
      position: "absolute",
      top: `${cellRect.top - wrapperRect.top - 40}px`,
      left: `${cellRect.left - wrapperRect.left + cellRect.width / 2}px`,
      transform: "translateX(-50%)",
      zIndex: 10,
    };
  }

  return (
    <div className={styles.tableEditor}>
      <div className={styles.tableWrapper} style={{ position: "relative" }}>
        {focusedCell && (
          <div
            ref={toolbarRef}
            className={styles.tableMiniToolbar}
            style={getToolbarPosition()}
            onMouseDown={handleToolbarMouseDown}
          >
            {showLinkPrompt ? (
              <form onSubmit={handleLinkSubmit} className={styles.tableLinkForm}>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className={styles.tableLinkInput}
                  autoFocus
                />
                <button type="submit" className={styles.tableLinkSubmitBtn} title="Apply link">
                  OK
                </button>
                <button type="button" onClick={handleLinkCancel} className={styles.tableLinkCancelBtn} title="Cancel">
                  &times;
                </button>
              </form>
            ) : (
              <>
                <button
                  className={styles.tableFormatBtn}
                  onClick={handleBold}
                  title="Bold"
                  type="button"
                >
                  <Bold size={14} />
                </button>
                <button
                  className={styles.tableFormatBtn}
                  onClick={handleItalic}
                  title="Italic"
                  type="button"
                >
                  <Italic size={14} />
                </button>
                <button
                  className={styles.tableFormatBtn}
                  onClick={handleLinkClick}
                  title="Link"
                  type="button"
                >
                  <Link size={14} />
                </button>
              </>
            )}
          </div>
        )}
        <table className={styles.table}>
          <thead>
            <tr>
              {headers.map((header, colIndex) => (
                <th key={colIndex} className={styles.tableHeaderCell}>
                  <div
                    ref={(el) => setCellRef("header", 0, colIndex, el)}
                    contentEditable
                    suppressContentEditableWarning
                    className={`${styles.tableCellEditable} ${styles.tableCellEditableHeader}`}
                    onFocus={() => handleCellFocus("header", 0, colIndex)}
                    onBlur={(e) => handleCellBlur(e, "header", 0, colIndex)}
                    onInput={(e) => handleCellInput(e as React.FormEvent<HTMLDivElement>, "header", 0, colIndex)}
                    data-placeholder="Header"
                    dangerouslySetInnerHTML={{ __html: header }}
                  />
                  {headers.length > 1 && (
                    <button
                      className={styles.tableRemoveColBtn}
                      onClick={() => removeColumn(colIndex)}
                      title="Remove column"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </th>
              ))}
              <th className={styles.tableAddColCell}>
                <button
                  className={styles.tableAddColBtn}
                  onClick={addColumn}
                  title="Add column"
                >
                  <Plus size={14} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={striped && rowIndex % 2 === 1 ? styles.tableStripedRow : undefined}>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className={styles.tableCell}>
                    <div
                      ref={(el) => setCellRef("body", rowIndex, colIndex, el)}
                      contentEditable
                      suppressContentEditableWarning
                      className={styles.tableCellEditable}
                      onFocus={() => handleCellFocus("body", rowIndex, colIndex)}
                      onBlur={(e) => handleCellBlur(e, "body", rowIndex, colIndex)}
                      onInput={(e) => handleCellInput(e as React.FormEvent<HTMLDivElement>, "body", rowIndex, colIndex)}
                      data-placeholder="..."
                      dangerouslySetInnerHTML={{ __html: cell }}
                    />
                  </td>
                ))}
                <td className={styles.tableRowActions}>
                  {rows.length > 1 && (
                    <button
                      className={styles.tableRemoveRowBtn}
                      onClick={() => removeRow(rowIndex)}
                      title="Remove row"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.tableFooter}>
        <button className={styles.tableAddRowBtn} onClick={addRow}>
          <Plus size={14} /> Add row
        </button>
        <label className={styles.tableStripedToggle}>
          <input
            type="checkbox"
            checked={striped}
            onChange={(e) => update({ striped: e.target.checked })}
          />
          Striped rows
        </label>
      </div>
      <input
        type="text"
        value={caption}
        onChange={(e) => update({ caption: e.target.value })}
        className={styles.tableCaptionInput}
        placeholder="Table caption (optional)"
      />
    </div>
  );
}
