"use client";

import type { Editor } from "@tiptap/react";
import styles from "./TextToolbar.module.css";

interface TextToolbarProps {
  editor: Editor;
}

export function TextToolbar({ editor }: TextToolbarProps) {
  function btn(
    label: string,
    action: () => void,
    active: boolean,
    title: string,
  ) {
    return (
      <button
        type="button"
        className={`${styles.btn} ${active ? styles.active : ""}`}
        onMouseDown={(e) => {
          e.preventDefault();
          action();
        }}
        aria-pressed={active}
        title={title}
      >
        {label}
      </button>
    );
  }

  function handleLink() {
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = prompt("Enter URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Text formatting">
      {btn("B", () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"), "Bold (Ctrl+B)")}
      {btn("I", () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"), "Italic (Ctrl+I)")}
      {btn("S", () => editor.chain().focus().toggleStrike().run(), editor.isActive("strike"), "Strikethrough")}
      <span className={styles.separator} />
      {btn("\u2022", () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"), "Bullet list")}
      {btn("1.", () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"), "Ordered list")}
      {btn("\u201C", () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"), "Blockquote")}
      {btn("<>", () => editor.chain().focus().toggleCode().run(), editor.isActive("code"), "Inline code")}
      <span className={styles.separator} />
      {btn(editor.isActive("link") ? "\u{1F517}\u{FE0E}\u2715" : "\u{1F517}\u{FE0E}", handleLink, editor.isActive("link"), editor.isActive("link") ? "Remove link" : "Add link")}
    </div>
  );
}
