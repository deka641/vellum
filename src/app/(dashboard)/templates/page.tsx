"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutTemplate, Trash2, Plus, RefreshCw, Eye, Pencil, Copy, Search } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { Card } from "@/components/ui/Card/Card";
import { Badge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { useToast } from "@/components/ui/Toast/Toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/Dialog/Dialog";
import { TemplatePreview } from "@/components/dashboard/TemplatePreview";
import styles from "./templates.module.css";

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isSystem: boolean;
  userId: string | null;
  blocks: unknown[];
}

interface Site {
  id: string;
  name: string;
}

export default function TemplatesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Preview state
  const [previewTarget, setPreviewTarget] = useState<Template | null>(null);

  // Use template state
  const [useTarget, setUseTarget] = useState<Template | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [pageTitle, setPageTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [useError, setUseError] = useState("");

  // Edit template state
  const [editTarget, setEditTarget] = useState<Template | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Duplicate state
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error("Failed to load templates");
      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      console.error("Failed to fetch templates:", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Derive unique categories from loaded templates
  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const t of templates) {
      if (t.category) cats.add(t.category);
    }
    return Array.from(cats).sort();
  }, [templates]);

  // Filter templates by search query and active category
  const filteredTemplates = useMemo(() => {
    let result = templates;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(q));
    }
    if (activeCategory) {
      result = result.filter((t) => t.category === activeCategory);
    }
    return result;
  }, [templates, searchQuery, activeCategory]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/templates/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast("Template deleted", "info");
    } catch (err) {
      console.error("Failed to delete template:", err);
      toast("Failed to delete template. Please try again.", "error");
    } finally {
      setDeleting(false);
    }
  }

  function openUseDialog(template: Template) {
    setUseTarget(template);
    setPageTitle(`${template.name} Page`);
    setSelectedSiteId("");
    setUseError("");
    // Fetch sites
    fetch("/api/sites")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load sites");
        return res.json();
      })
      .then((data: Site[]) => {
        setSites(data);
        if (data.length > 0) setSelectedSiteId(data[0].id);
      })
      .catch((err) => {
        console.error("Failed to fetch sites:", err);
        setUseError("Failed to load sites. Please close and try again.");
      });
  }

  async function handleUseTemplate() {
    if (!useTarget || !selectedSiteId || !pageTitle.trim()) {
      setUseError("Please select a site and enter a page title");
      return;
    }

    setCreating(true);
    setUseError("");

    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: pageTitle.trim(),
          siteId: selectedSiteId,
          templateBlocks: useTarget.blocks,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setUseError(data.error || "Failed to create page");
        return;
      }

      const page = await res.json();
      setUseTarget(null);
      router.push(`/editor/${page.id}`);
    } catch {
      setUseError("Something went wrong. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  function openEditDialog(template: Template) {
    setEditTarget(template);
    setEditName(template.name);
    setEditDescription(template.description || "");
    setEditCategory(template.category);
    setEditError("");
  }

  async function handleEditSave() {
    if (!editTarget) return;
    if (!editName.trim()) {
      setEditError("Name is required");
      return;
    }

    setEditSaving(true);
    setEditError("");

    try {
      const res = await fetch(`/api/templates/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
          category: editCategory.trim() || "general",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setEditError(data.error || "Failed to update template");
        return;
      }

      const updated = await res.json();
      setTemplates((prev) =>
        prev.map((t) => (t.id === updated.id ? { ...t, name: updated.name, description: updated.description, category: updated.category } : t))
      );
      setEditTarget(null);
      toast("Template updated", "success");
    } catch (err) {
      console.error("Failed to update template:", err);
      setEditError("Something went wrong. Please try again.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDuplicate(template: Template) {
    setDuplicating(template.id);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${template.name} (copy)`,
          description: template.description,
          category: template.category,
          blocks: template.blocks,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "Failed to duplicate template", "error");
        return;
      }

      const newTemplate = await res.json();
      setTemplates((prev) => [...prev, newTemplate]);
      toast("Template duplicated", "success");
    } catch (err) {
      console.error("Failed to duplicate template:", err);
      toast("Failed to duplicate template. Please try again.", "error");
    } finally {
      setDuplicating(null);
    }
  }

  return (
    <>
      <Topbar
        title="Templates"
        description="Pre-built page templates to get you started"
      />
      <div className={styles.content}>
        {loading ? (
          <div className={styles.grid}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height={200} />
            ))}
          </div>
        ) : fetchError ? (
          <div className={styles.empty}>
            <div className={styles.emptyIconCircle}>
              <LayoutTemplate size={28} strokeWidth={1.5} />
            </div>
            <h3>Failed to load templates</h3>
            <p>Something went wrong. Please try again.</p>
            <Button leftIcon={<RefreshCw size={16} />} onClick={fetchTemplates}>
              Retry
            </Button>
          </div>
        ) : templates.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIconCircle}>
              <LayoutTemplate size={28} strokeWidth={1.5} />
            </div>
            <h3>No templates yet</h3>
            <p>Save your page designs as templates from the editor, or create a site to get started</p>
            <Link href="/sites/new">
              <Button leftIcon={<Plus size={16} />}>Create a site</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className={styles.toolbar}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search templates"
              />
              {categories.length > 1 && (
                <div className={styles.filterChips}>
                  <button
                    className={`${styles.filterChip} ${activeCategory === null ? styles.filterChipActive : ""}`}
                    onClick={() => setActiveCategory(null)}
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      className={`${styles.filterChip} ${activeCategory === cat ? styles.filterChipActive : ""}`}
                      onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {filteredTemplates.length === 0 ? (
              <div className={styles.noResults}>
                <Search size={28} strokeWidth={1.5} />
                <h3>No templates found</h3>
                <p>Try a different search term or category filter</p>
              </div>
            ) : (
              <div className={styles.grid}>
                {filteredTemplates.map((template) => (
                  <Card key={template.id} hover padding="md">
                    <div className={styles.templatePreview}>
                      <LayoutTemplate size={24} />
                    </div>
                    <div className={styles.templateInfo}>
                      <h3 className={styles.templateName}>{template.name}</h3>
                      {template.description && (
                        <p className={styles.templateDesc}>{template.description}</p>
                      )}
                      <div className={styles.templateMeta}>
                        <Badge>{template.category}</Badge>
                        {template.isSystem && <Badge variant="accent">System</Badge>}
                        <Badge variant="default">
                          {Array.isArray(template.blocks) ? template.blocks.length : 0} block{Array.isArray(template.blocks) && template.blocks.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <div className={styles.templateActions}>
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<Eye size={14} />}
                          onClick={() => setPreviewTarget(template)}
                        >
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<Plus size={14} />}
                          onClick={() => openUseDialog(template)}
                        >
                          Use
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<Copy size={14} />}
                          onClick={() => handleDuplicate(template)}
                          disabled={duplicating === template.id}
                        >
                          {duplicating === template.id ? "Duplicating..." : "Duplicate"}
                        </Button>
                        {!template.isSystem && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              leftIcon={<Pencil size={14} />}
                              onClick={() => openEditDialog(template)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              leftIcon={<Trash2 size={14} />}
                              onClick={() => setDeleteTarget(template)}
                              className={styles.deleteBtn}
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" size="sm">Cancel</Button>
            </DialogClose>
            <Button size="sm" onClick={handleDelete} disabled={deleting} className={styles.deleteBtn}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template preview dialog */}
      {previewTarget && (
        <TemplatePreview
          open={!!previewTarget}
          onClose={() => setPreviewTarget(null)}
          name={previewTarget.name}
          blocks={previewTarget.blocks}
        />
      )}

      {/* Use template dialog */}
      <Dialog open={!!useTarget} onOpenChange={(open) => !open && setUseTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use template</DialogTitle>
            <DialogDescription>
              Create a new page using &ldquo;{useTarget?.name}&rdquo; as a starting point.
            </DialogDescription>
          </DialogHeader>
          <div className={styles.useForm}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Site</label>
              <select
                className={styles.fieldSelect}
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
              >
                {sites.length === 0 && <option value="">Loading...</option>}
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Page title</label>
              <input
                className={styles.fieldInput}
                value={pageTitle}
                onChange={(e) => setPageTitle(e.target.value)}
                placeholder="Enter page title"
              />
            </div>
            {useError && <p className={styles.useError}>{useError}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" size="sm">Cancel</Button>
            </DialogClose>
            <Button size="sm" onClick={handleUseTemplate} disabled={creating}>
              {creating ? "Creating..." : "Create page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit template dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit template</DialogTitle>
            <DialogDescription>
              Update the details of &ldquo;{editTarget?.name}&rdquo;.
            </DialogDescription>
          </DialogHeader>
          <div className={styles.editForm}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Name</label>
              <input
                className={styles.fieldInput}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Template name"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Description</label>
              <textarea
                className={styles.fieldTextarea}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Category</label>
              <input
                className={styles.fieldInput}
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                placeholder="e.g. general, landing, blog"
              />
            </div>
            {editError && <p className={styles.editError}>{editError}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" size="sm">Cancel</Button>
            </DialogClose>
            <Button size="sm" onClick={handleEditSave} disabled={editSaving}>
              {editSaving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
