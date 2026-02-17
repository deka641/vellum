"use client";

import { useState } from "react";
import { LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { IconButton } from "@/components/ui/IconButton/IconButton";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/Dialog/Dialog";
import { useEditorStore } from "@/stores/editor-store";
import styles from "./SaveAsTemplateDialog.module.css";

export function SaveAsTemplateDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      const { pageTitle } = useEditorStore.getState();
      setName(pageTitle ? `${pageTitle} Template` : "");
      setDescription("");
      setError("");
      setSuccess(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Template name is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { blocks } = useEditorStore.getState();
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          blocks,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save template");
        return;
      }

      setSuccess(true);
      setTimeout(() => setOpen(false), 1500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <IconButton icon={<LayoutTemplate size={16} />} label="Save as template" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as template</DialogTitle>
          <DialogDescription>
            Save the current page layout as a reusable template.
          </DialogDescription>
        </DialogHeader>
        {success ? (
          <p className={styles.success}>Template saved successfully!</p>
        ) : (
          <div className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Name</label>
              <input
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Template name"
                autoFocus
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Description (optional)</label>
              <textarea
                className={`${styles.input} ${styles.textarea}`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this template"
              />
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" size="sm">Cancel</Button>
              </DialogClose>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save template"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
