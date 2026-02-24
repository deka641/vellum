"use client";

import { useState } from "react";
import { Eye, Code, Terminal } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { sanitizeEmbedHtml } from "@/lib/sanitize";
import type { CodeContent, BlockSettings } from "@/types/blocks";
import styles from "./blocks.module.css";

const SNIPPET_LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "bash", label: "Bash" },
  { value: "sql", label: "SQL" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "php", label: "PHP" },
  { value: "plaintext", label: "Plain Text" },
];

interface CodeBlockProps {
  id: string;
  content: CodeContent;
  settings: BlockSettings;
}

export function CodeBlock({ id, content }: CodeBlockProps) {
  const updateBlockContent = useEditorStore((s) => s.updateBlockContent);
  const [showPreview, setShowPreview] = useState(false);

  const displayMode = content.displayMode || "embed";
  const isSnippet = displayMode === "snippet";

  const handleModeSwitch = (mode: "embed" | "snippet") => {
    if (mode === displayMode) return;
    // Clear code when switching modes to avoid confusion
    updateBlockContent(id, {
      displayMode: mode,
      code: "",
      snippetLanguage: mode === "snippet" ? "javascript" : undefined,
    });
    setShowPreview(false);
  };

  return (
    <div className={styles.codeEditor}>
      <div className={styles.codeToolbar}>
        <div className={styles.codeModeToggle}>
          <button
            className={`${styles.codeModeBtn} ${!isSnippet ? styles.codeModeBtnActive : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              handleModeSwitch("embed");
            }}
          >
            <Code size={12} />
            Embed
          </button>
          <button
            className={`${styles.codeModeBtn} ${isSnippet ? styles.codeModeBtnActive : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              handleModeSwitch("snippet");
            }}
          >
            <Terminal size={12} />
            Code Snippet
          </button>
        </div>
        {isSnippet ? (
          <select
            className={styles.snippetLanguageSelect}
            value={content.snippetLanguage || "javascript"}
            onChange={(e) => {
              e.stopPropagation();
              updateBlockContent(id, { snippetLanguage: e.target.value });
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {SNIPPET_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        ) : (
          <button
            className={styles.codeToggle}
            onClick={(e) => {
              e.stopPropagation();
              setShowPreview(!showPreview);
            }}
            title={showPreview ? "Edit code" : "Preview"}
          >
            {showPreview ? <Code size={14} /> : <Eye size={14} />}
            {showPreview ? "Code" : "Preview"}
          </button>
        )}
      </div>
      {isSnippet ? (
        <textarea
          className={styles.snippetTextarea}
          value={content.code || ""}
          onChange={(e) => updateBlockContent(id, { code: e.target.value })}
          placeholder="Paste your code here..."
          rows={8}
          onClick={(e) => e.stopPropagation()}
          spellCheck={false}
        />
      ) : showPreview ? (
        <div
          className={styles.codePreview}
          dangerouslySetInnerHTML={{ __html: sanitizeEmbedHtml(content.code) || "<p style='color:#999;text-align:center'>No code to preview</p>" }}
        />
      ) : (
        <textarea
          className={styles.codeTextarea}
          value={content.code || ""}
          onChange={(e) => updateBlockContent(id, { code: e.target.value })}
          placeholder="Paste your HTML or embed code here..."
          rows={6}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}
