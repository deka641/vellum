"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEditorStore } from "@/stores/editor-store";
import type { TextContent } from "@/types/blocks";
import styles from "./blocks.module.css";

interface TextBlockProps {
  id: string;
  content: TextContent;
}

export function TextBlock({ id, content }: TextBlockProps) {
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

  return (
    <div className={styles.textBlock}>
      <EditorContent editor={editor} />
    </div>
  );
}
