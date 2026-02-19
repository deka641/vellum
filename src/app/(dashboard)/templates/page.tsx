"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutTemplate, Trash2, Plus, RefreshCw, Eye } from "lucide-react";
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
          <div className={styles.grid}>
            {templates.map((template) => (
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
                    {!template.isSystem && (
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon={<Trash2 size={14} />}
                        onClick={() => setDeleteTarget(template)}
                        className={styles.deleteBtn}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
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
    </>
  );
}
