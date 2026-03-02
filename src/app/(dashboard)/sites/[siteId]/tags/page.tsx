"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Tag, Pencil, Trash2, Check, X } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/Button/Button";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { useToast } from "@/components/ui/Toast/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import styles from "./tags.module.css";

interface TagItem {
  id: string;
  name: string;
  slug: string;
  _count: { pageTags: number };
}

export default function TagsPage() {
  const params = useParams();
  const { toast } = useToast();
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTag, setDeleteTag] = useState<TagItem | null>(null);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await fetch(`/api/sites/${params.siteId}/tags`);
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      } else {
        setFetchError(true);
        console.error("Failed to fetch tags:", res.status);
      }
    } catch (error) {
      setFetchError(true);
      console.error("Failed to fetch tags:", error);
    } finally {
      setLoading(false);
    }
  }, [params.siteId]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  function startEdit(tag: TagItem) {
    setEditingId(tag.id);
    setEditName(tag.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
  }

  async function saveEdit(tagId: string) {
    if (!editName.trim()) {
      toast("Tag name cannot be empty", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/sites/${params.siteId}/tags/${tagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTags((prev) =>
          prev.map((t) => (t.id === tagId ? { ...t, name: updated.name, slug: updated.slug } : t))
        );
        toast("Tag renamed");
        setEditingId(null);
        setEditName("");
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to rename tag", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTag) return;
    try {
      const res = await fetch(`/api/sites/${params.siteId}/tags/${deleteTag.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTags((prev) => prev.filter((t) => t.id !== deleteTag.id));
        toast("Tag deleted");
      } else {
        toast("Failed to delete tag", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setDeleteTag(null);
    }
  }

  return (
    <>
      <Topbar
        title="Tags"
        description="Manage your site's content tags"
        actions={
          <Link href={`/sites/${params.siteId}`}>
            <Button variant="ghost" leftIcon={<ArrowLeft size={16} />} size="sm">
              Back
            </Button>
          </Link>
        }
      />
      <div className={styles.content}>
        {loading ? (
          <div className={styles.list}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height={48} />
            ))}
          </div>
        ) : fetchError ? (
          <div className={styles.errorState}>
            <p>Failed to load tags</p>
            <Button variant="secondary" size="sm" onClick={fetchTags}>
              Retry
            </Button>
          </div>
        ) : tags.length === 0 ? (
          <div className={styles.emptyState}>
            <Tag size={32} strokeWidth={1.5} />
            <h3>No tags yet</h3>
            <p>Tags can be added to pages from the editor&apos;s page settings panel.</p>
          </div>
        ) : (
          <div className={styles.list}>
            {tags.map((tag) => (
              <div key={tag.id} className={styles.tagRow}>
                {editingId === tag.id ? (
                  <div className={styles.editRow}>
                    <input
                      className={styles.editInput}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(tag.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      autoFocus
                      disabled={saving}
                    />
                    <button
                      className={styles.editAction}
                      onClick={() => saveEdit(tag.id)}
                      disabled={saving}
                      title="Save"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      className={styles.editAction}
                      onClick={cancelEdit}
                      disabled={saving}
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className={styles.tagInfo}>
                      <span className={styles.tagName}>{tag.name}</span>
                      <span className={styles.tagCount}>
                        {tag._count.pageTags} page{tag._count.pageTags !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className={styles.tagActions}>
                      <button
                        className={styles.actionBtn}
                        onClick={() => startEdit(tag)}
                        title="Rename tag"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                        onClick={() => setDeleteTag(tag)}
                        title="Delete tag"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={deleteTag !== null}
        onOpenChange={(open) => { if (!open) setDeleteTag(null); }}
        title="Delete tag"
        description={
          deleteTag
            ? deleteTag._count.pageTags > 0
              ? `This tag is used on ${deleteTag._count.pageTags} page${deleteTag._count.pageTags !== 1 ? "s" : ""}. It will be removed from all pages. This cannot be undone.`
              : "Are you sure you want to delete this tag? This cannot be undone."
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
      />
    </>
  );
}
