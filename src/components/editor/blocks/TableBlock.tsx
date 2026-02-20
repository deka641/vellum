"use client";

import { useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { TableContent, BlockSettings } from "@/types/blocks";
import { useEditorStore } from "@/stores/editor-store";
import styles from "./blocks.module.css";

interface TableBlockProps {
  id: string;
  content: TableContent;
  settings: BlockSettings;
}

export function TableBlock({ id, content }: TableBlockProps) {
  const updateBlockContent = useEditorStore((s) => s.updateBlockContent);

  const headers = content.headers || [];
  const rows = content.rows || [];
  const caption = content.caption || "";
  const striped = content.striped ?? true;

  const update = useCallback(
    (partial: Partial<TableContent>) => {
      updateBlockContent(id, { ...content, ...partial });
    },
    [id, content, updateBlockContent]
  );

  function updateHeader(colIndex: number, value: string) {
    const newHeaders = [...headers];
    newHeaders[colIndex] = value;
    update({ headers: newHeaders });
  }

  function updateCell(rowIndex: number, colIndex: number, value: string) {
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

  return (
    <div className={styles.tableEditor}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {headers.map((header, colIndex) => (
                <th key={colIndex} className={styles.tableHeaderCell}>
                  <input
                    type="text"
                    value={header}
                    onChange={(e) => updateHeader(colIndex, e.target.value)}
                    className={styles.tableCellInput}
                    placeholder="Header"
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
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                      className={styles.tableCellInput}
                      placeholder="..."
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
