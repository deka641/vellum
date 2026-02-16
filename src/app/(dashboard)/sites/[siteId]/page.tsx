"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, FileText, ArrowLeft } from "lucide-react";
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

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [site, setSite] = useState<SiteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewPage, setShowNewPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch(`/api/sites/${params.siteId}`)
      .then((res) => res.json())
      .then(setSite)
      .finally(() => setLoading(false));
  }, [params.siteId]);

  async function handleCreatePage() {
    if (!newPageTitle.trim()) return;
    setCreating(true);

    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newPageTitle,
          siteId: params.siteId,
        }),
      });

      if (res.ok) {
        const page = await res.json();
        toast("Page created!");
        setShowNewPage(false);
        setNewPageTitle("");
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
            <Button leftIcon={<Plus size={16} />} size="sm" onClick={() => setShowNewPage(true)}>
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
            <Button leftIcon={<Plus size={16} />} onClick={() => setShowNewPage(true)}>
              Create a page
            </Button>
          </div>
        ) : (
          <PageList pages={site.pages} onDelete={handleDeletePage} />
        )}
      </div>

      <Dialog open={showNewPage} onOpenChange={setShowNewPage}>
        <DialogContent>
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
