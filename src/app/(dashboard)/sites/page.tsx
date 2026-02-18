"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Globe, Upload } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { SiteCard } from "@/components/dashboard/SiteCard";
import { Button } from "@/components/ui/Button/Button";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { useToast } from "@/components/ui/Toast/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import styles from "./sites.module.css";

interface Site {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  updatedAt: string;
  _count: { pages: number };
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteSiteId, setDeleteSiteId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/sites")
      .then((res) => res.json())
      .then(setSites)
      .finally(() => setLoading(false));
  }, []);

  function handleDelete(id: string) {
    setDeleteSiteId(id);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch("/api/sites/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const result = await res.json();
        toast(`Imported "${result.name}" with ${result.pageCount} pages`);
        router.push(`/sites/${result.id}`);
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Import failed", "error");
      }
    } catch {
      toast("Invalid import file", "error");
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  async function confirmDeleteSite() {
    if (!deleteSiteId) return;
    const res = await fetch(`/api/sites/${deleteSiteId}`, { method: "DELETE" });
    if (res.ok) {
      setSites((prev) => prev.filter((s) => s.id !== deleteSiteId));
      toast("Site deleted");
    } else {
      toast("Failed to delete site", "error");
    }
    setDeleteSiteId(null);
  }

  return (
    <>
      <Topbar
        title="Sites"
        description="Manage your websites"
        actions={
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <Button
              variant="secondary"
              leftIcon={<Upload size={16} />}
              disabled={importing}
              onClick={() => importInputRef.current?.click()}
            >
              {importing ? "Importing..." : "Import"}
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              style={{ display: "none" }}
              onChange={handleImport}
            />
            <Link href="/sites/new">
              <Button leftIcon={<Plus size={16} />}>New site</Button>
            </Link>
          </div>
        }
      />
      <div className={styles.content}>
        {loading ? (
          <div className={styles.grid}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height={240} />
            ))}
          </div>
        ) : sites.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIconCircle}>
              <Globe size={28} strokeWidth={1.5} />
            </div>
            <h3>No sites yet</h3>
            <p>Create your first website and start building beautiful pages</p>
            <Link href="/sites/new">
              <Button leftIcon={<Plus size={16} />}>Create your first site</Button>
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {sites.map((site) => (
              <SiteCard key={site.id} site={site} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={deleteSiteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteSiteId(null); }}
        title="Delete site"
        description="Are you sure you want to delete this site? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDeleteSite}
      />
    </>
  );
}
