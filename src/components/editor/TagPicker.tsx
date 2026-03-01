"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, Tag } from "lucide-react";
import styles from "./TagPicker.module.css";

interface TagData {
  id: string;
  name: string;
  slug: string;
}

interface TagPickerProps {
  siteId: string;
  pageId: string;
}

export function TagPicker({ siteId, pageId }: TagPickerProps) {
  const [tags, setTags] = useState<TagData[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newTagName, setNewTagName] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Fetch site tags and page tags
  useEffect(() => {
    async function load() {
      try {
        const [tagsRes, pageRes] = await Promise.all([
          fetch(`/api/sites/${siteId}/tags`),
          fetch(`/api/pages/${pageId}`),
        ]);
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          setTags(tagsData);
        }
        if (pageRes.ok) {
          const pageData = await pageRes.json();
          if (pageData.pageTags) {
            setSelectedIds(new Set(pageData.pageTags.map((pt: { tagId: string }) => pt.tagId)));
          }
        }
      } catch {
        // Silently fail — tags are optional
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, [siteId, pageId]);

  const saveTagIds = useCallback(async (ids: Set<string>) => {
    setSaving(true);
    try {
      await fetch(`/api/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds: Array.from(ids) }),
      });
    } catch {
      // Silently fail
    } finally {
      setSaving(false);
    }
  }, [pageId]);

  function toggleTag(tagId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        if (next.size >= 10) return prev;
        next.add(tagId);
      }
      saveTagIds(next);
      return next;
    });
  }

  async function createTag() {
    const name = newTagName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const tag = await res.json();
        setTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
        setNewTagName("");
        // Auto-select the new tag
        if (selectedIds.size < 10) {
          const next = new Set(selectedIds);
          next.add(tag.id);
          setSelectedIds(next);
          saveTagIds(next);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setCreating(false);
    }
  }

  if (!loaded) return null;

  return (
    <div className={styles.tagPicker}>
      <label className={styles.label}>
        <Tag size={14} />
        Tags
        {saving && <span className={styles.saving}>Saving...</span>}
      </label>
      <div className={styles.chips}>
        {tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            className={`${styles.chip} ${selectedIds.has(tag.id) ? styles.chipSelected : ""}`}
            onClick={() => toggleTag(tag.id)}
            title={selectedIds.has(tag.id) ? `Remove "${tag.name}"` : `Add "${tag.name}"`}
          >
            {tag.name}
            {selectedIds.has(tag.id) && <X size={12} />}
          </button>
        ))}
      </div>
      <div className={styles.addTag}>
        <input
          type="text"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); createTag(); } }}
          placeholder="New tag..."
          className={styles.input}
          maxLength={100}
        />
        <button
          type="button"
          className={styles.addBtn}
          onClick={createTag}
          disabled={creating || !newTagName.trim()}
          title="Create tag"
        >
          <Plus size={14} />
        </button>
      </div>
      {selectedIds.size >= 10 && (
        <span className={styles.limit}>Maximum 10 tags per page</span>
      )}
    </div>
  );
}
