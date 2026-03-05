"use client";

import { useRef, useEffect, useState, type CSSProperties } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEditorStore } from "@/stores/editor-store";
import { TextToolbar } from "./TextToolbar";
import type { QuoteContent, BlockSettings } from "@/types/blocks";
import styles from "./blocks.module.css";

interface QuoteBlockProps {
  id: string;
  content: QuoteContent;
  settings: BlockSettings;
}

export function QuoteBlock({ id, content, settings }: QuoteBlockProps) {
  const updateBlockContent = useEditorStore((s) => s.updateBlockContent);
  const variant = content.style || "default";
  const isLocalEdit = useRef(false);
  const [focused, setFocused] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        code: false,
        listItem: false,
      }),
      LinkExtension.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: "Enter quote text...",
      }),
    ],
    content: content.html || (content.text ? `<p>${content.text}</p>` : ""),
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      isLocalEdit.current = true;
      const html = editor.getHTML();
      const text = editor.getText();
      updateBlockContent(id, { html, text });
    },
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    editorProps: {
      attributes: {
        class: styles.tiptapEditor,
      },
    },
  });

  // Sync store changes (e.g. undo/redo) back to TipTap
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (isLocalEdit.current) {
      isLocalEdit.current = false;
      return;
    }
    const currentHtml = editor.getHTML();
    const storeHtml = content.html || (content.text ? `<p>${content.text}</p>` : "");
    if (currentHtml !== storeHtml) {
      editor.commands.setContent(storeHtml, { emitUpdate: false });
    }
  }, [content.html, content.text, editor]);

  const inlineStyle: CSSProperties = {
    ...(settings.textColor && { color: settings.textColor }),
    ...(settings.backgroundColor && { backgroundColor: settings.backgroundColor }),
    ...(settings.fontSize && { fontSize: settings.fontSize }),
    ...(settings.paddingY && { paddingTop: settings.paddingY, paddingBottom: settings.paddingY }),
    ...(settings.paddingX && { paddingLeft: settings.paddingX, paddingRight: settings.paddingX }),
    ...(settings.align && { textAlign: settings.align }),
  };

  return (
    <blockquote
      className={`${styles.quote} ${styles[`quote-${variant}`] || ""}`}
      style={inlineStyle}
    >
      <div className={styles.quoteText}>
        {focused && editor && <TextToolbar editor={editor} />}
        <EditorContent editor={editor} />
      </div>
      <input
        className={styles.quoteAttribution}
        placeholder="Attribution (optional)"
        value={content.attribution || ""}
        onChange={(e) => updateBlockContent(id, { attribution: e.target.value })}
        onClick={(e) => e.stopPropagation()}
      />
    </blockquote>
  );
}
