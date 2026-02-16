"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, FileText, ArrowLeft, Navigation2 } from "lucide-react";
import Link from "next/link";
import { Topbar } from "@/components/dashboard/Topbar";
import { PageList } from "@/components/dashboard/PageList";
import { Button } from "@/components/ui/Button/Button";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { useToast } from "@/components/ui/Toast/Toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog/Dialog";
import { Input } from "@/components/ui/Input/Input";
import styles from "./site-detail.module.css";
import dialogStyles from "@/components/ui/Dialog/Dialog.module.css";

interface SiteDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  pages: Array<{
    id: string;
    title: string;
    slug: string;
    status: "DRAFT" | "PUBLISHED";
    isHomepage: boolean;
    updatedAt: string;
  }>;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isSystem: boolean;
  blocks: unknown[];
}

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [site, setSite] = useState<SiteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewPage, setShowNewPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/sites/${params.siteId}`)
      .then((res) => res.json())
      .then(setSite)
      .finally(() => setLoading(false));
  }, [params.siteId]);

  useEffect(() => {
    fetch("/api/templates")
      .then((res) => res.json())
      .then(setTemplates)
      .catch(() => {});
  }, []);

  function handleOpenNewPage() {
    setShowNewPage(true);
    setNewPageTitle("");
    setSelectedTemplateId(null);
  }

  async function handleCreatePage() {
    if (!newPageTitle.trim()) return;
    setCreating(true);

    try {
      const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
      const body: Record<string, unknown> = {
        title: newPageTitle,
        siteId: params.siteId,
      };
      if (selectedTemplate && selectedTemplate.blocks.length > 0) {
        body.templateBlocks = selectedTemplate.blocks;
      }

      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const page = await res.json();
        toast("Page created!");
        setShowNewPage(false);
        setNewPageTitle("");
        setSelectedTemplateId(null);
        router.push(`/editor/${page.id}`);
      } else {
        toast("Failed to create page", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeletePage(pageId: string) {
    if (!confirm("Are you sure you want to delete this page?")) return;

    const res = await fetch(`/api/pages/${pageId}`, { method: "DELETE" });
    if (res.ok) {
      setSite((prev) =>
        prev ? { ...prev, pages: prev.pages.filter((p) => p.id !== pageId) } : null
      );
      toast("Page deleted");
    } else {
      toast("Failed to delete page", "error");
    }
  }

  if (loading) {
    return (
      <>
        <Topbar title="" />
        <div className={styles.content}>
          <Skeleton height={20} width={200} />
          <Skeleton height={300} />
        </div>
      </>
    );
  }

  if (!site) {
    return (
      <>
        <Topbar title="Site not found" />
        <div className={styles.content}>
          <p>This site could not be found.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar
        title={site.name}
        description={`${site.pages.length} ${site.pages.length === 1 ? "page" : "pages"}`}
        actions={
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <Link href="/sites">
              <Button variant="ghost" leftIcon={<ArrowLeft size={16} />} size="sm">
                Back
              </Button>
            </Link>
            <Link href={`/sites/${site.id}/navigation`}>
              <Button variant="secondary" leftIcon={<Navigation2 size={16} />} size="sm">
                Navigation
              </Button>
            </Link>
            <Button leftIcon={<Plus size={16} />} size="sm" onClick={handleOpenNewPage}>
              New page
            </Button>
          </div>
        }
      />
      <div className={styles.content}>
        {site.pages.length === 0 ? (
          <div className={styles.empty}>
            <FileText size={48} strokeWidth={1} />
            <h3>No pages yet</h3>
            <p>Create your first page to start building</p>
            <Button leftIcon={<Plus size={16} />} onClick={handleOpenNewPage}>
              Create a page
            </Button>
          </div>
        ) : (
          <PageList pages={site.pages} onDelete={handleDeletePage} />
        )}
      </div>

      <Dialog open={showNewPage} onOpenChange={setShowNewPage}>
        <DialogContent className={dialogStyles.contentWide}>
          <DialogHeader>
            <DialogTitle>Create new page</DialogTitle>
          </DialogHeader>
          <Input
            label="Page title"
            placeholder="About, Blog, Contact..."
            value={newPageTitle}
            onChange={(e) => setNewPageTitle(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCreatePage()}
          />
          {templates.length > 0 && (
            <div className={styles.templateSection}>
              <div className={styles.templateLabel}>Template</div>
              <div className={styles.templateGrid}>
                <div
                  className={`${styles.templateCard} ${selectedTemplateId === null ? styles.templateCardSelected : ""}`}
                  onClick={() => setSelectedTemplateId(null)}
                >
                  <span className={styles.templateCardName}>Blank</span>
                  <span className={styles.templateCardDesc}>Start from scratch</span>
                </div>
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`${styles.templateCard} ${selectedTemplateId === template.id ? styles.templateCardSelected : ""}`}
                    onClick={() => setSelectedTemplateId(template.id)}
                  >
                    <span className={styles.templateCardName}>{template.name}</span>
                    {template.description && (
                      <span className={styles.templateCardDesc}>{template.description}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowNewPage(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePage} disabled={creating || !newPageTitle.trim()}>
              {creating ? "Creating..." : "Create page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
