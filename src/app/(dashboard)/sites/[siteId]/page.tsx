"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, FileText, ArrowLeft, Navigation2, ExternalLink, Search, Send } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "DRAFT" | "PUBLISHED">("ALL");

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

  async function handlePublishPage(pageId: string) {
    const res = await fetch(`/api/pages/${pageId}/publish`, { method: "POST" });
    if (res.ok) {
      setSite((prev) =>
        prev
          ? {
              ...prev,
              pages: prev.pages.map((p) =>
                p.id === pageId ? { ...p, status: "PUBLISHED" as const } : p
              ),
            }
          : null
      );
      toast("Page published");
    } else {
      toast("Failed to publish page", "error");
    }
  }

  async function handleUnpublishPage(pageId: string) {
    const res = await fetch(`/api/pages/${pageId}/publish`, { method: "DELETE" });
    if (res.ok) {
      setSite((prev) =>
        prev
          ? {
              ...prev,
              pages: prev.pages.map((p) =>
                p.id === pageId ? { ...p, status: "DRAFT" as const } : p
              ),
            }
          : null
      );
      toast("Page unpublished");
    } else {
      toast("Failed to unpublish page", "error");
    }
  }

  async function handleDuplicatePage(pageId: string) {
    try {
      const blocksRes = await fetch(`/api/pages/${pageId}/blocks`);
      if (!blocksRes.ok) {
        toast("Failed to duplicate page", "error");
        return;
      }
      const blocks = await blocksRes.json();

      const sourcePage = site?.pages.find((p) => p.id === pageId);
      if (!sourcePage || !site) return;

      // Remap block IDs to new unique IDs, preserving parentId references for columns
      const idMap = new Map<string, string>();
      for (const block of blocks) {
        const newId = crypto.randomUUID();
        idMap.set(block.id, newId);
      }

      const templateBlocks = blocks.map((block: { id: string; type: string; content: unknown; settings: unknown; parentId: string | null }, i: number) => ({
        id: idMap.get(block.id),
        type: block.type,
        content: block.content,
        settings: block.settings,
        sortOrder: i,
        parentId: block.parentId ? idMap.get(block.parentId) || null : null,
      }));

      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${sourcePage.title} (Copy)`,
          siteId: site.id,
          templateBlocks,
        }),
      });

      if (res.ok) {
        const newPage = await res.json();
        setSite((prev) =>
          prev
            ? {
                ...prev,
                pages: [
                  ...prev.pages,
                  {
                    id: newPage.id,
                    title: newPage.title,
                    slug: newPage.slug,
                    status: newPage.status,
                    isHomepage: newPage.isHomepage,
                    updatedAt: newPage.updatedAt,
                  },
                ],
              }
            : null
        );
        toast("Page duplicated");
      } else {
        toast("Failed to duplicate page", "error");
      }
    } catch {
      toast("Failed to duplicate page", "error");
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
          <div className={styles.topbarActions}>
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
            <Link href={`/sites/${site.id}/submissions`}>
              <Button variant="secondary" leftIcon={<Send size={16} />} size="sm">
                Submissions
              </Button>
            </Link>
            <a href={`/s/${site.slug}`} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" leftIcon={<ExternalLink size={16} />} size="sm">
                View site
              </Button>
            </a>
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
          <>
            <div className={styles.filterBar}>
              <div className={styles.searchWrap}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  className={styles.searchInput}
                  type="text"
                  placeholder="Search pages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className={styles.statusSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "ALL" | "DRAFT" | "PUBLISHED")}
              >
                <option value="ALL">All status</option>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>
            <PageList
              pages={site.pages.filter((p) => {
                const q = searchQuery.toLowerCase();
                const matchesSearch = !q || p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
                const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
                return matchesSearch && matchesStatus;
              })}
              siteSlug={site.slug}
              onDelete={handleDeletePage}
              onPublish={handlePublishPage}
              onUnpublish={handleUnpublishPage}
              onDuplicate={handleDuplicatePage}
            />
          </>
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
          {(() => {
            const nonBlankTemplates = templates.filter((t) => t.blocks.length > 0);
            return (
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
                  {nonBlankTemplates.map((template) => (
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
            );
          })()}
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
