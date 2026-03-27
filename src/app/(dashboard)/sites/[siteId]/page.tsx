"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Plus, FileText, ArrowLeft, Navigation2, ExternalLink, Search, Send, Trash2, RotateCcw, Calendar, Tag, X } from "lucide-react";
import Link from "next/link";
import { Topbar } from "@/components/dashboard/Topbar";
import { PageList } from "@/components/dashboard/PageList";
import { ContentCalendar } from "@/components/dashboard/ContentCalendar";
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
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { PageAnalytics } from "@/components/dashboard/PageAnalytics";
import styles from "./site-detail.module.css";
import dialogStyles from "@/components/ui/Dialog/Dialog.module.css";

interface TagItem {
  id: string;
  name: string;
  slug: string;
}

interface PageItem {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED";
  isHomepage: boolean;
  updatedAt: string;
  deletedAt: string | null;
  scheduledPublishAt: string | null;
  sortOrder: number;
  showInNav: boolean;
  ogImage?: string | null;
  description?: string | null;
  publishedAt?: string | null;
  pageTags?: Array<{ tag: TagItem }>;
}

type HealthFilter = "stale" | "no-description" | "no-alt" | "draft";

const HEALTH_FILTER_LABELS: Record<HealthFilter, string> = {
  stale: "Stale pages (>90 days)",
  "no-description": "Missing descriptions",
  "no-alt": "Missing alt text",
  draft: "Unpublished drafts",
};

interface SiteDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  pages: PageItem[];
  tags?: TagItem[];
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isSystem: boolean;
  blocks: unknown[];
}

function SiteDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [tagFilter, setTagFilter] = useState<string>("ALL");
  const [showTrash, setShowTrash] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [trashedPages, setTrashedPages] = useState<PageItem[]>([]);
  const [deletePageId, setDeletePageId] = useState<string | null>(null);
  const [permDeletePageId, setPermDeletePageId] = useState<string | null>(null);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const [bulkTrashLoading, setBulkTrashLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [crossSiteSources, setCrossSiteSources] = useState<Array<{ id: string; name: string; pages: Array<{ id: string; title: string }> }>>([]);
  const [selectedSourcePageId, setSelectedSourcePageId] = useState<string | null>(null);
  const [selectedSourceSiteId, setSelectedSourceSiteId] = useState<string | null>(null);
  const [contentSearchResults, setContentSearchResults] = useState<Array<{
    pageId: string;
    pageTitle: string;
    pageSlug: string;
    status: string;
    matchType: string;
    snippet: string;
  }> | null>(null);
  const [contentSearching, setContentSearching] = useState(false);
  const contentSearchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Health filter from dashboard deep-links
  const filterParam = searchParams.get("filter");
  const healthFilter: HealthFilter | null =
    filterParam && filterParam in HEALTH_FILTER_LABELS
      ? (filterParam as HealthFilter)
      : null;
  const [noAltPageIds, setNoAltPageIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    setFetchError(false);
    fetch(`/api/sites/${params.siteId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load site (${res.status})`);
        return res.json();
      })
      .then(setSite)
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));

    // Fetch unread submissions count
    fetch(`/api/sites/${params.siteId}/submissions?pageSize=1&unreadOnly=true`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data) setUnreadCount(data.total); })
      .catch(() => {
        // Non-critical: badge simply won't show rather than showing 0
        setUnreadCount(-1);
      });
  }, [params.siteId]);

  // When no-alt filter is active, fetch image blocks to identify pages with missing alt text
  useEffect(() => {
    if (healthFilter !== "no-alt" || !site) {
      setNoAltPageIds(null);
      return;
    }

    const publishedPageIds = site.pages
      .filter((p) => p.status === "PUBLISHED")
      .map((p) => p.id);

    if (publishedPageIds.length === 0) {
      setNoAltPageIds(new Set());
      return;
    }

    const pageIdsWithMissingAlt = new Set<string>();
    Promise.all(
      publishedPageIds.map(async (pageId) => {
        try {
          const res = await fetch(`/api/pages/${pageId}/blocks`);
          if (!res.ok) return;
          const blocks = await res.json();
          const hasNoAlt = blocks.some(
            (b: { type: string; content: Record<string, unknown> }) =>
              b.type === "image" &&
              (!b.content.alt ||
                (typeof b.content.alt === "string" && b.content.alt.trim() === ""))
          );
          if (hasNoAlt) pageIdsWithMissingAlt.add(pageId);
        } catch {
          // Skip pages that fail to load
        }
      })
    ).then(() => {
      setNoAltPageIds(new Set(pageIdsWithMissingAlt));
    });
  }, [healthFilter, site]);

  useEffect(() => {
    fetch("/api/templates")
      .then((res) => res.json())
      .then(setTemplates)
      .catch((e) => {
        console.warn("Failed to load templates:", e);
        toast("Templates couldn't be loaded", "error");
      });
  }, []);

  function handleOpenNewPage() {
    setShowNewPage(true);
    setNewPageTitle("");
    setSelectedTemplateId(null);
    setSelectedSourcePageId(null);
    setSelectedSourceSiteId(null);
    // Load other sites for cross-site copy
    fetch("/api/sites")
      .then((res) => res.ok ? res.json() : [])
      .then((sites: Array<{ id: string; name: string }>) => {
        const otherSites = sites.filter((s) => s.id !== params.siteId);
        if (otherSites.length === 0) { setCrossSiteSources([]); return; }
        Promise.all(
          otherSites.map(async (s) => {
            const res = await fetch(`/api/pages?siteId=${s.id}`);
            const pages = res.ok ? await res.json() : [];
            return { id: s.id, name: s.name, pages: pages.map((p: { id: string; title: string }) => ({ id: p.id, title: p.title })) };
          })
        ).then(setCrossSiteSources).catch(() => setCrossSiteSources([]));
      })
      .catch(() => setCrossSiteSources([]));
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
      if (selectedSourcePageId && selectedSourceSiteId) {
        body.sourcePageId = selectedSourcePageId;
        body.sourceSiteId = selectedSourceSiteId;
      } else if (selectedTemplate && selectedTemplate.blocks.length > 0) {
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
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Failed to create page", "error");
      }
    } catch {
      toast("Network error — please check your connection", "error");
    } finally {
      setCreating(false);
    }
  }

  async function loadTrashedPages() {
    try {
      const res = await fetch(`/api/pages?siteId=${params.siteId}&includeDeleted=true`);
      if (res.ok) {
        const pages = await res.json();
        setTrashedPages(pages.filter((p: PageItem) => p.deletedAt !== null));
      }
    } catch (e) {
      console.error("Failed to load trashed pages:", e);
      toast("Failed to load trash", "error");
    }
  }

  function handleDeletePage(pageId: string) {
    const page = site?.pages.find((p) => p.id === pageId);
    if (page?.isHomepage) {
      toast("Cannot delete the homepage", "error");
      return;
    }
    setDeletePageId(pageId);
  }

  async function confirmDeletePage() {
    if (!deletePageId) return;
    try {
      const res = await fetch(`/api/pages/${deletePageId}`, { method: "DELETE" });
      if (res.ok) {
        const deletedPage = site?.pages.find((p) => p.id === deletePageId);
        setSite((prev) =>
          prev ? { ...prev, pages: prev.pages.filter((p) => p.id !== deletePageId) } : null
        );
        if (deletedPage) {
          setTrashedPages((prev) => [...prev, { ...deletedPage, deletedAt: new Date().toISOString(), status: "DRAFT", scheduledPublishAt: null }]);
        }
        toast("Page moved to trash");
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Failed to delete page", "error");
      }
    } catch {
      toast("Network error — could not delete page", "error");
    }
    setDeletePageId(null);
  }

  async function handleRestorePage(pageId: string) {
    const res = await fetch(`/api/pages/${pageId}/restore`, { method: "POST" });
    if (res.ok) {
      const restored = await res.json();
      setTrashedPages((prev) => prev.filter((p) => p.id !== pageId));
      setSite((prev) =>
        prev ? { ...prev, pages: [...prev.pages, { ...restored, deletedAt: null, sortOrder: restored.sortOrder ?? prev.pages.length, showInNav: restored.showInNav ?? false }] } : null
      );
      toast("Page restored");
    } else {
      toast("Failed to restore page", "error");
    }
  }

  function handlePermanentDelete(pageId: string) {
    setPermDeletePageId(pageId);
  }

  async function confirmPermanentDelete() {
    if (!permDeletePageId) return;
    const res = await fetch(`/api/pages/${permDeletePageId}?permanent=true`, { method: "DELETE" });
    if (res.ok) {
      setTrashedPages((prev) => prev.filter((p) => p.id !== permDeletePageId));
      toast("Page permanently deleted");
    } else {
      toast("Failed to delete page", "error");
    }
    setPermDeletePageId(null);
  }

  async function handleRestoreAll() {
    if (trashedPages.length === 0) return;
    setBulkTrashLoading(true);
    try {
      const res = await fetch("/api/pages/bulk-restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageIds: trashedPages.map((p) => p.id) }),
      });
      if (res.ok) {
        const data = await res.json();
        setSite((prev) =>
          prev ? { ...prev, pages: [...prev.pages, ...trashedPages.map((p) => ({ ...p, deletedAt: null }))] } : null
        );
        setTrashedPages([]);
        toast(`${data.restored} ${data.restored === 1 ? "page" : "pages"} restored`);
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Failed to restore pages", "error");
      }
    } catch {
      toast("Network error — could not restore pages", "error");
    } finally {
      setBulkTrashLoading(false);
    }
  }

  async function handleEmptyTrash() {
    setBulkTrashLoading(true);
    try {
      const results = await Promise.allSettled(
        trashedPages.map((p) =>
          fetch(`/api/pages/${p.id}?permanent=true`, { method: "DELETE" })
        )
      );
      const succeeded = results.filter((r) => r.status === "fulfilled" && (r.value as Response).ok).length;
      if (succeeded > 0) {
        setTrashedPages((prev) => {
          const deletedIds = new Set(
            results
              .map((r, i) => r.status === "fulfilled" && (r.value as Response).ok ? trashedPages[i].id : null)
              .filter((id): id is string => id !== null)
          );
          return prev.filter((p) => !deletedIds.has(p.id));
        });
        toast(`${succeeded} ${succeeded === 1 ? "page" : "pages"} permanently deleted`);
      } else {
        toast("Failed to empty trash", "error");
      }
    } catch {
      toast("Network error — could not empty trash", "error");
    } finally {
      setBulkTrashLoading(false);
      setConfirmEmptyTrash(false);
    }
  }

  async function handlePublishPage(pageId: string) {
    try {
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
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Failed to publish page", "error");
      }
    } catch {
      toast("Network error — could not publish page", "error");
    }
  }

  async function handleUnpublishPage(pageId: string) {
    try {
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
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Failed to unpublish page", "error");
      }
    } catch {
      toast("Network error — could not unpublish page", "error");
    }
  }

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const saveNavigation = useCallback((pages: PageItem[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/sites/${params.siteId}/navigation`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pages: pages.map((p, i) => ({
              id: p.id,
              sortOrder: i,
              showInNav: p.showInNav,
            })),
          }),
        });
      } catch {
        toast("Failed to save page order", "error");
      }
    }, 800);
  }, [params.siteId, toast]);

  function handleReorderPages(reorderedPages: { id: string; title: string; slug: string; status: "DRAFT" | "PUBLISHED"; isHomepage: boolean; updatedAt: string; deletedAt?: string | null; scheduledPublishAt?: string | null; sortOrder?: number; showInNav?: boolean }[]) {
    if (!site) return;
    const reorderedFull = reorderedPages.map((rp, i) => {
      const existing = site.pages.find((p) => p.id === rp.id);
      return existing ? { ...existing, sortOrder: i } : null;
    }).filter((p): p is PageItem => p !== null);
    setSite((prev) => prev ? { ...prev, pages: reorderedFull } : null);
    saveNavigation(reorderedFull);
  }

  function handleToggleNav(pageId: string) {
    setSite((prev) => {
      if (!prev) return null;
      const updated = prev.pages.map((p) =>
        p.id === pageId ? { ...p, showInNav: !p.showInNav } : p
      );
      saveNavigation(updated);
      return { ...prev, pages: updated };
    });
  }

  function handleContentSearch(query: string) {
    setSearchQuery(query);
    setContentSearchResults(null);

    if (contentSearchTimerRef.current) clearTimeout(contentSearchTimerRef.current);
    if (query.trim().length < 3) return;

    contentSearchTimerRef.current = setTimeout(async () => {
      setContentSearching(true);
      try {
        const res = await fetch(
          `/api/sites/${params.siteId}/search?q=${encodeURIComponent(query.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setContentSearchResults(data.results);
        }
      } catch {
        // Silently fail — local filter still works
      } finally {
        setContentSearching(false);
      }
    }, 400);
  }

  async function handleSetHomepage(pageId: string) {
    try {
      const res = await fetch(`/api/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHomepage: true }),
      });
      if (res.ok) {
        setSite((prev) =>
          prev
            ? {
                ...prev,
                pages: prev.pages.map((p) => ({
                  ...p,
                  isHomepage: p.id === pageId,
                })),
              }
            : null
        );
        toast("Homepage updated");
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Failed to set homepage", "error");
      }
    } catch {
      toast("Network error — could not set homepage", "error");
    }
  }

  async function handleDuplicatePage(pageId: string) {
    try {
      const sourcePage = site?.pages.find((p) => p.id === pageId);
      if (!sourcePage || !site) return;

      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${sourcePage.title} (Copy)`,
          siteId: site.id,
          sourcePageId: pageId,
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
                    deletedAt: null,
                    scheduledPublishAt: null,
                    sortOrder: newPage.sortOrder ?? prev.pages.length,
                    showInNav: newPage.showInNav ?? false,
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

  async function handleBulkTagAction(action: "add" | "remove", pageIds: string[], tagIds: string[]) {
    try {
      const res = await fetch("/api/pages/bulk-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageIds, tagIds, action }),
      });

      if (res.ok) {
        const data = await res.json();
        // Refresh site data to get updated page tags
        const siteRes = await fetch(`/api/sites/${params.siteId}`);
        if (siteRes.ok) {
          setSite(await siteRes.json());
        }
        const label = action === "add" ? "added to" : "removed from";
        toast(`Tags ${label} ${pageIds.length} ${pageIds.length === 1 ? "page" : "pages"} (${data.updated} ${data.updated === 1 ? "change" : "changes"})`);
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error || `Failed to ${action} tags`, "error");
      }
    } catch {
      toast(`Network error — could not ${action} tags`, "error");
    }
  }

  async function handleBulkAction(action: "publish" | "unpublish", pageIds: string[]) {
    try {
      const res = await fetch("/api/pages/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageIds, action }),
      });

      if (res.ok) {
        const data = await res.json();
        const newStatus = action === "publish" ? "PUBLISHED" as const : "DRAFT" as const;
        const updatedSet = new Set(pageIds);
        setSite((prev) =>
          prev
            ? {
                ...prev,
                pages: prev.pages.map((p) =>
                  updatedSet.has(p.id) && !(action === "unpublish" && p.isHomepage)
                    ? { ...p, status: newStatus }
                    : p
                ),
              }
            : null
        );
        const label = action === "publish" ? "published" : "unpublished";
        toast(`${data.updated} ${data.updated === 1 ? "page" : "pages"} ${label}`);
        if (action === "publish" && data.updated > (data.revisionsCreated ?? data.updated)) {
          toast("Pages published. Some revision snapshots could not be saved.", "info");
        }
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error || `Failed to ${action} pages`, "error");
      }
    } catch {
      toast(`Network error — could not ${action} pages`, "error");
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

  if (fetchError) {
    return (
      <>
        <Topbar title="Error" />
        <div className={styles.content}>
          <div className={styles.empty}>
            <h3>Failed to load site</h3>
            <p>Something went wrong. Please try again.</p>
            <Button
              leftIcon={<RotateCcw size={16} />}
              onClick={() => {
                setLoading(true);
                setFetchError(false);
                fetch(`/api/sites/${params.siteId}`)
                  .then((res) => {
                    if (!res.ok) throw new Error(`Failed (${res.status})`);
                    return res.json();
                  })
                  .then(setSite)
                  .catch(() => setFetchError(true))
                  .finally(() => setLoading(false));
              }}
            >
              Try again
            </Button>
          </div>
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
            <Link href={`/sites/${site.id}/tags`}>
              <Button variant="secondary" leftIcon={<Tag size={16} />} size="sm">
                Tags
              </Button>
            </Link>
            <Link href={`/sites/${site.id}/submissions`}>
              <Button variant="secondary" leftIcon={<Send size={16} />} size="sm">
                Submissions
                {unreadCount > 0 && unreadCount !== -1 && (
                  <span className={styles.unreadBadge}>{unreadCount}</span>
                )}
              </Button>
            </Link>
            <a href={`/s/${site.slug}`} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" leftIcon={<ExternalLink size={16} />} size="sm">
                View site
              </Button>
            </a>
            <Button
              variant={showCalendar ? "primary" : "secondary"}
              leftIcon={<Calendar size={16} />}
              size="sm"
              onClick={() => { setShowCalendar(!showCalendar); setShowTrash(false); }}
            >
              Calendar
            </Button>
            <Button
              variant={showTrash ? "primary" : "secondary"}
              leftIcon={<Trash2 size={16} />}
              size="sm"
              onClick={() => {
                const next = !showTrash;
                setShowTrash(next);
                setShowCalendar(false);
                if (next) loadTrashedPages();
              }}
            >
              Trash
            </Button>
            <Button leftIcon={<Plus size={16} />} size="sm" onClick={handleOpenNewPage}>
              New page
            </Button>
          </div>
        }
      />
      <div className={styles.content}>
        {showCalendar ? (
          <ContentCalendar
            pages={site.pages
              .filter((p) => p.scheduledPublishAt)
              .map((p) => ({
                id: p.id,
                title: p.title,
                scheduledPublishAt: p.scheduledPublishAt!,
              }))}
          />
        ) : showTrash ? (
          <div>
            <div className={styles.trashHeader}>
              <h3 className={styles.trashTitle}>
                <Trash2 size={18} />
                Trash
              </h3>
              {trashedPages.length > 1 && (
                <div className={styles.trashBulkActions}>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<RotateCcw size={14} />}
                    onClick={handleRestoreAll}
                    disabled={bulkTrashLoading}
                  >
                    Restore all
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Trash2 size={14} />}
                    onClick={() => setConfirmEmptyTrash(true)}
                    disabled={bulkTrashLoading}
                  >
                    Empty trash
                  </Button>
                </div>
              )}
            </div>
            {trashedPages.length === 0 ? (
              <div className={styles.empty}>
                <Trash2 size={48} strokeWidth={1} />
                <h3>Trash is empty</h3>
                <p>Deleted pages will appear here</p>
              </div>
            ) : (
              <div className={styles.trashList}>
                {trashedPages.map((page) => (
                  <div key={page.id} className={styles.trashItem}>
                    <div className={styles.trashItemInfo}>
                      <span className={styles.trashItemTitle}>{page.title}</span>
                      <span className={styles.trashItemMeta}>/{page.slug}</span>
                    </div>
                    <div className={styles.trashItemActions}>
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<RotateCcw size={14} />}
                        onClick={() => handleRestorePage(page.id)}
                      >
                        Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Trash2 size={14} />}
                        onClick={() => handlePermanentDelete(page.id)}
                      >
                        Delete forever
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : site.pages.length === 0 ? (
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
            {healthFilter && (
              <div className={styles.filterBadge}>
                <span>Showing: {HEALTH_FILTER_LABELS[healthFilter]}</span>
                {healthFilter === "no-alt" && noAltPageIds === null && (
                  <span className={styles.filterLoading}>Loading...</span>
                )}
                <button
                  className={styles.filterClear}
                  onClick={() => router.replace(`/sites/${site.id}`)}
                  aria-label="Clear filter"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <div className={styles.filterBar}>
              <div className={styles.searchWrap}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  className={styles.searchInput}
                  type="text"
                  placeholder="Search pages and content..."
                  value={searchQuery}
                  onChange={(e) => handleContentSearch(e.target.value)}
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
              {site.tags && site.tags.length > 0 && (
                <select
                  className={styles.statusSelect}
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                >
                  <option value="ALL">All tags</option>
                  {site.tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))}
                </select>
              )}
            </div>
            {contentSearching && (
              <div className={styles.searchLoading}>Searching content...</div>
            )}
            {contentSearchResults && contentSearchResults.length > 0 && !contentSearching && (
              <div className={styles.searchResults}>
                <div className={styles.searchResultsHeader}>
                  <span>Content matches ({contentSearchResults.length})</span>
                  <button className={styles.contentSearchBtn} onClick={() => setContentSearchResults(null)}>
                    Clear
                  </button>
                </div>
                {contentSearchResults.map((r) => (
                  <Link
                    key={r.pageId}
                    href={`/editor/${r.pageId}`}
                    className={styles.searchResultItem}
                  >
                    <span className={styles.searchResultTitle}>{r.pageTitle}</span>
                    <div className={styles.searchResultMeta}>
                      <span className={styles.matchBadge}>{r.matchType}</span>
                      <span>{r.status === "PUBLISHED" ? "Published" : "Draft"}</span>
                    </div>
                    <span className={styles.searchResultSnippet}>{r.snippet}</span>
                  </Link>
                ))}
              </div>
            )}
            {contentSearchResults && contentSearchResults.length === 0 && !contentSearching && searchQuery.trim().length >= 3 && (
              <div className={styles.searchLoading}>No content matches found</div>
            )}
            <PageList
              pages={site.pages.filter((p) => {
                const q = searchQuery.toLowerCase();
                const matchesSearch = !q || p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
                const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
                const matchesTag = tagFilter === "ALL" || (p.pageTags?.some((pt) => pt.tag.id === tagFilter) ?? false);

                // Health filter
                let matchesHealth = true;
                if (healthFilter === "stale") {
                  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
                  matchesHealth = p.status === "PUBLISHED" && new Date(p.updatedAt).getTime() < ninetyDaysAgo;
                } else if (healthFilter === "no-description") {
                  matchesHealth = p.status === "PUBLISHED" && (!p.description || p.description.trim() === "");
                } else if (healthFilter === "no-alt") {
                  matchesHealth = noAltPageIds !== null && noAltPageIds.has(p.id);
                } else if (healthFilter === "draft") {
                  matchesHealth = p.status === "DRAFT" && !p.publishedAt;
                }

                return matchesSearch && matchesStatus && matchesTag && matchesHealth;
              })}
              siteSlug={site.slug}
              onDelete={handleDeletePage}
              onPublish={handlePublishPage}
              onUnpublish={handleUnpublishPage}
              onDuplicate={handleDuplicatePage}
              onSetHomepage={handleSetHomepage}
              onReorder={handleReorderPages}
              onToggleNav={handleToggleNav}
              onBulkAction={handleBulkAction}
              tags={site.tags}
              onBulkTagAction={handleBulkTagAction}
            />
            <PageAnalytics siteId={site.id} />
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
                  {nonBlankTemplates.map((template) => {
                    const blockTypes = (template.blocks as Array<{ type: string }>)
                      .map((b) => b.type)
                      .filter((t, i, arr) => arr.indexOf(t) === i);
                    return (
                      <div
                        key={template.id}
                        className={`${styles.templateCard} ${selectedTemplateId === template.id ? styles.templateCardSelected : ""}`}
                        onClick={() => setSelectedTemplateId(template.id)}
                      >
                        <span className={styles.templateCardName}>{template.name}</span>
                        {template.description && (
                          <span className={styles.templateCardDesc}>{template.description}</span>
                        )}
                        <span className={styles.templateCardMeta}>
                          {template.blocks.length} block{template.blocks.length !== 1 ? "s" : ""}
                          {blockTypes.length > 0 && `: ${blockTypes.slice(0, 4).join(", ")}${blockTypes.length > 4 ? "..." : ""}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          {crossSiteSources.length > 0 && (
            <div className={styles.templateSection}>
              <div className={styles.templateLabel}>Copy from another site</div>
              <div className={styles.templateGrid}>
                {crossSiteSources.map((source) =>
                  source.pages.map((p) => (
                    <div
                      key={p.id}
                      className={`${styles.templateCard} ${selectedSourcePageId === p.id ? styles.templateCardSelected : ""}`}
                      onClick={() => {
                        setSelectedSourcePageId(p.id);
                        setSelectedSourceSiteId(source.id);
                        setSelectedTemplateId(null);
                        if (!newPageTitle.trim()) setNewPageTitle(p.title);
                      }}
                    >
                      <span className={styles.templateCardName}>{p.title}</span>
                      <span className={styles.templateCardDesc}>{source.name}</span>
                    </div>
                  ))
                )}
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
      <ConfirmDialog
        open={deletePageId !== null}
        onOpenChange={(open) => { if (!open) setDeletePageId(null); }}
        title="Move to trash"
        description="Move this page to trash? You can restore it later."
        confirmLabel="Move to trash"
        variant="danger"
        onConfirm={confirmDeletePage}
      />
      <ConfirmDialog
        open={permDeletePageId !== null}
        onOpenChange={(open) => { if (!open) setPermDeletePageId(null); }}
        title="Permanently delete"
        description="Permanently delete this page? This cannot be undone."
        confirmLabel="Delete forever"
        variant="danger"
        onConfirm={confirmPermanentDelete}
      />
      <ConfirmDialog
        open={confirmEmptyTrash}
        onOpenChange={(open) => { if (!open) setConfirmEmptyTrash(false); }}
        title="Empty trash"
        description={`Permanently delete all ${trashedPages.length} trashed pages? This cannot be undone.`}
        confirmLabel="Delete all forever"
        variant="danger"
        onConfirm={handleEmptyTrash}
        loading={bulkTrashLoading}
      />
    </>
  );
}

export default function SiteDetailPage() {
  return (
    <Suspense>
      <SiteDetailContent />
    </Suspense>
  );
}
