"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog/Dialog";
import { Button } from "@/components/ui/Button/Button";
import styles from "./LinkDialog.module.css";

interface LinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUrl: string;
  initialNewTab: boolean;
  onSubmit: (url: string, newTab: boolean) => void;
  onRemove?: () => void;
  isEditing: boolean;
}

const VALID_URL_RE = /^(https?:\/\/|mailto:|\/|#)/i;

function validateUrl(url: string): string | null {
  if (!url.trim()) return "URL is required";
  if (!VALID_URL_RE.test(url.trim())) {
    return "URL must start with http://, https://, mailto:, /, or #";
  }
  return null;
}

export function LinkDialog({
  open,
  onOpenChange,
  initialUrl,
  initialNewTab,
  onSubmit,
  onRemove,
  isEditing,
}: LinkDialogProps) {
  const [url, setUrl] = useState(initialUrl);
  const [newTab, setNewTab] = useState(initialNewTab);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setUrl(initialUrl);
      setNewTab(initialNewTab);
      setError(null);
    }
  }, [open, initialUrl, initialNewTab]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateUrl(url);
    if (validationError) {
      setError(validationError);
      return;
    }
    onSubmit(url.trim(), newTab);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit link" : "Add link"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="link-url" className={styles.label}>URL</label>
            <input
              id="link-url"
              type="text"
              className={`${styles.input}${error ? ` ${styles.inputError}` : ""}`}
              placeholder="https://example.com"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
              }}
              autoFocus
              spellCheck={false}
              aria-invalid={!!error || undefined}
              aria-describedby={error ? "link-url-error" : undefined}
            />
            {error && <span id="link-url-error" className={styles.error}>{error}</span>}
          </div>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={newTab}
              onChange={(e) => setNewTab(e.target.checked)}
            />
            <span>Open in new tab</span>
          </label>
          <DialogFooter>
            {isEditing && onRemove && (
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  onRemove();
                  onOpenChange(false);
                }}
              >
                Remove link
              </Button>
            )}
            <div style={{ flex: 1 }} />
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? "Update link" : "Add link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
