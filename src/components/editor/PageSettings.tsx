"use client";

import { useState, useEffect } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { Input, Textarea } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import { useToast } from "@/components/ui/Toast/Toast";
import { slugify } from "@/lib/utils";
import { Save, Globe } from "lucide-react";
import styles from "./PageSettings.module.css";

export function PageSettings() {
  const { toast } = useToast();
  const {
    pageId,
    pageDescription,
    pageSlug,
    setPageDescription,
    setPageSlug,
    setLastSavedAt,
  } = useEditorStore();

  const [description, setDescription] = useState(pageDescription ?? "");
  const [slug, setSlug] = useState(pageSlug);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isHomepage, setIsHomepage] = useState(false);
  const [siteSlug, setSiteSlug] = useState("");

  // Sync from store when page loads or store values change externally
  useEffect(() => {
    setDescription(pageDescription ?? "");
  }, [pageDescription]);

  useEffect(() => {
    setSlug(pageSlug);
  }, [pageSlug]);

  // Load page metadata for homepage check and site slug
  useEffect(() => {
    if (!pageId) return;
    async function loadMeta() {
      try {
        const res = await fetch(`/api/pages/${pageId}`);
        if (res.ok) {
          const data = await res.json();
          setIsHomepage(data.isHomepage);
          setSiteSlug(data.site?.slug ?? "");
        }
      } catch {
        // Silently fail — not critical
      }
    }
    loadMeta();
  }, [pageId]);

  const hasChanges =
    description !== (pageDescription ?? "") || slug !== pageSlug;

  const handleSlugChange = (value: string) => {
    const slugified = slugify(value);
    setSlug(slugified);
    setSlugError(null);
  };

  const handleSave = async () => {
    if (!pageId || !hasChanges) return;

    // Validate slug format
    if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setSlugError("Slug must be lowercase letters, numbers, and hyphens");
      return;
    }

    setSaving(true);
    setSlugError(null);

    try {
      const body: { description?: string | null; slug?: string } = {};

      if (description !== (pageDescription ?? "")) {
        body.description = description || null;
      }
      if (slug !== pageSlug) {
        body.slug = slug;
      }

      const res = await fetch(`/api/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 409) {
        const data = await res.json();
        setSlugError(data.error || "Slug already in use");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "Failed to save page settings", "error");
        return;
      }

      const updated = await res.json();
      setPageDescription(updated.description);
      setPageSlug(updated.slug);
      setLastSavedAt(updated.updatedAt);
      toast("Page settings saved");
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setSaving(false);
    }
  };

  const publishedUrl = isHomepage
    ? `/s/${siteSlug}`
    : `/s/${siteSlug}/${slug}`;

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>Page Settings</h3>

      <div className={styles.section}>
        <Textarea
          label="Meta description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description for search engines and social sharing"
          rows={3}
          maxLength={2000}
          hint={`${description.length}/160 recommended for SEO`}
        />

        <div className={styles.field}>
          <Input
            label="Page slug"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="page-url-slug"
            disabled={isHomepage}
            error={slugError ?? undefined}
            hint={isHomepage ? "Homepage slug cannot be changed" : undefined}
          />
        </div>

        {siteSlug && (
          <div className={styles.urlPreview}>
            <Globe size={14} />
            <span className={styles.urlText}>{publishedUrl}</span>
          </div>
        )}

        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className={styles.saveButton}
        >
          <Save size={14} />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
