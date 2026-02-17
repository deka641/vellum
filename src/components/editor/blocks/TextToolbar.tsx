"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { LinkDialog } from "./LinkDialog";
import styles from "./TextToolbar.module.css";

interface TextToolbarProps {
  editor: Editor;
}

export function TextToolbar({ editor }: TextToolbarProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

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

  function handleLinkClick() {
    if (editor.isActive("link")) {
      // If already a link, open dialog to edit
      setLinkDialogOpen(true);
    } else {
      setLinkDialogOpen(true);
    }
  }

  const linkAttrs = editor.getAttributes("link");
  const currentHref = (linkAttrs.href as string) || "";
  const currentTarget = (linkAttrs.target as string) || "";
  const isEditingLink = editor.isActive("link");

  return (
    <>
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
        {btn(
          isEditingLink ? "\u{1F517}\u{FE0E}\u2715" : "\u{1F517}\u{FE0E}",
          handleLinkClick,
          isEditingLink,
          isEditingLink ? "Edit link" : "Add link",
        )}
      </div>
      <LinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        initialUrl={currentHref}
        initialNewTab={currentTarget === "_blank"}
        isEditing={isEditingLink}
        onSubmit={(url, newTab) => {
          editor
            .chain()
            .focus()
            .setLink({ href: url, target: newTab ? "_blank" : null })
            .run();
        }}
        onRemove={() => {
          editor.chain().focus().unsetLink().run();
        }}
      />
    </>
  );
}
