"use client";

import { useRef, useEffect, useState, type CSSProperties } from "react";
import { useEditor, EditorContent, Node } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import { useEditorStore } from "@/stores/editor-store";
import { AlertTriangle } from "lucide-react";
import { TextToolbar } from "./TextToolbar";
import type { HeadingContent, BlockSettings } from "@/types/blocks";
import styles from "./blocks.module.css";

interface HeadingBlockProps {
  id: string;
  content: HeadingContent;
  settings: BlockSettings;
}

const headingElements = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
} as const;

/**
 * Custom Document node that renders as a heading tag directly,
 * so TipTap content is inline (no wrapping <p>).
 */
function createHeadingDocument(level: 1 | 2 | 3 | 4) {
  return Node.create({
    name: "doc",
    topNode: true,
    content: "inline*",
    parseHTML() {
      return [{ tag: headingElements[level] }];
    },
    renderHTML({ HTMLAttributes }) {
      return [headingElements[level], HTMLAttributes, 0];
    },
  });
}

/**
 * Minimal text node for TipTap (normally provided by @tiptap/extension-text).
 */
const TextNode = Node.create({
  name: "text",
  group: "inline",
});

export function HeadingBlock({ id, content, settings }: HeadingBlockProps) {
  const updateBlockContent = useEditorStore((s) => s.updateBlockContent);
  const isLocalEdit = useRef(false);
  const editorReady = useRef(false);
  const [focused, setFocused] = useState(false);

  // Check for skipped heading levels
  const headingWarning = useEditorStore((s) => {
    const blocks = s.blocks;
    const headingBlocks = blocks.filter((b) => b.type === "heading");
    const myIndex = headingBlocks.findIndex((b) => b.id === id);
    if (myIndex <= 0) return null;
    const prevLevel = (headingBlocks[myIndex - 1].content as HeadingContent).level;
    const myLevel = content.level;
    if (myLevel > prevLevel + 1) {
      return `Skipped heading level (H${prevLevel} \u2192 H${myLevel})`;
    }
    return null;
  });

  const headingHtml = content.html || content.text;

  const editor = useEditor({
    extensions: [
      createHeadingDocument(content.level),
      TextNode,
      StarterKit.configure({
        document: false,
        text: false,
        paragraph: false,
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        hardBreak: false,
        dropcursor: false,
        gapcursor: false,
        link: false,
        trailingNode: false,
      }),
      LinkExtension.configure({
        openOnClick: false,
      }),
    ],
    content: headingHtml,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      isLocalEdit.current = true;
      const html = ed.getHTML();
      const plainText = ed.getText();
      updateBlockContent(id, { text: plainText, html });
    },
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    editorProps: {
      attributes: {
        class: styles.heading,
        "data-level": String(content.level),
      },
    },
  });

  // Sync store changes (e.g. undo/redo) back to TipTap
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    // Skip first sync — editor was already created with correct content
    if (!editorReady.current) {
      editorReady.current = true;
      return;
    }
    if (isLocalEdit.current) {
      isLocalEdit.current = false;
      return;
    }
    const storeHtml = content.html || content.text;
    const currentHtml = editor.getHTML();
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
    <>
      <div style={inlineStyle}>
        {focused && editor && <TextToolbar editor={editor} />}
        <EditorContent editor={editor} />
      </div>
      {headingWarning && (
        <div className={styles.headingWarning}>
          <AlertTriangle size={14} />
          <span>{headingWarning}</span>
        </div>
      )}
    </>
  );
}
