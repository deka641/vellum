"use client";

import type { CSSProperties } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEditorStore } from "@/stores/editor-store";
import type { TextContent, BlockSettings } from "@/types/blocks";
import styles from "./blocks.module.css";

interface TextBlockProps {
  id: string;
  content: TextContent;
  settings: BlockSettings;
}

export function TextBlock({ id, content, settings }: TextBlockProps) {
  const updateBlockContent = useEditorStore((s) => s.updateBlockContent);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      LinkExtension.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: "Start writing...",
      }),
    ],
    content: content.html,
    onUpdate: ({ editor }) => {
      updateBlockContent(id, { html: editor.getHTML() });
    },
    editorProps: {
      attributes: {
        class: styles.tiptapEditor,
      },
    },
  });

  const wrapperStyle: CSSProperties = {
    ...(settings.textColor && { color: settings.textColor }),
    ...(settings.backgroundColor && { backgroundColor: settings.backgroundColor }),
    ...(settings.fontSize && { fontSize: settings.fontSize }),
    ...(settings.paddingY && { paddingTop: settings.paddingY, paddingBottom: settings.paddingY }),
    ...(settings.paddingX && { paddingLeft: settings.paddingX, paddingRight: settings.paddingX }),
    ...(settings.align && { textAlign: settings.align }),
  };

  return (
    <div className={styles.textBlock} style={wrapperStyle}>
      <EditorContent editor={editor} />
    </div>
  );
}
