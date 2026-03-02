"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Globe, Upload, AlertCircle } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { SiteCard } from "@/components/dashboard/SiteCard";
import { Button } from "@/components/ui/Button/Button";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { useToast } from "@/components/ui/Toast/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog/Dialog";
import { Input } from "@/components/ui/Input/Input";
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
  const [fetchError, setFetchError] = useState(false);
  const [deleteSiteId, setDeleteSiteId] = useState<string | null>(null);
  const [duplicateSiteId, setDuplicateSiteId] = useState<string | null>(null);
  const [duplicateName, setDuplicateName] = useState("");
  const [duplicating, setDuplicating] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  function fetchSites() {
    setLoading(true);
    setFetchError(false);
    fetch("/api/sites")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then(setSites)
      .catch(() => {
        setFetchError(true);
        console.error("Failed to fetch sites");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchSites();
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

  function handleDuplicate(id: string) {
    const site = sites.find((s) => s.id === id);
    setDuplicateSiteId(id);
    setDuplicateName(site ? `${site.name} (Copy)` : "");
  }

  async function confirmDuplicateSite() {
    if (!duplicateSiteId || !duplicateName.trim()) return;
    setDuplicating(true);
    try {
      const res = await fetch(`/api/sites/${duplicateSiteId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: duplicateName.trim() }),
      });
      if (res.ok) {
        const newSite = await res.json();
        toast(`Site duplicated as "${newSite.name}"`);
        setDuplicateSiteId(null);
        setDuplicateName("");
        router.push(`/sites/${newSite.id}`);
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Failed to duplicate site", "error");
      }
    } catch {
      toast("Network error — could not duplicate site", "error");
    } finally {
      setDuplicating(false);
    }
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
        ) : fetchError ? (
          <div className={styles.empty}>
            <div className={styles.emptyIconCircle}>
              <AlertCircle size={28} strokeWidth={1.5} />
            </div>
            <h3>Could not load sites</h3>
            <p>Something went wrong. Please check your connection and try again.</p>
            <Button onClick={fetchSites} variant="secondary">Retry</Button>
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
              <SiteCard key={site.id} site={site} onDelete={handleDelete} onDuplicate={handleDuplicate} />
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
      <Dialog
        open={duplicateSiteId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDuplicateSiteId(null);
            setDuplicateName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate site</DialogTitle>
          </DialogHeader>
          <Input
            label="New site name"
            placeholder="My Site (Copy)"
            value={duplicateName}
            onChange={(e) => setDuplicateName(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && confirmDuplicateSite()}
          />
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setDuplicateSiteId(null);
                setDuplicateName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDuplicateSite}
              disabled={duplicating || !duplicateName.trim()}
            >
              {duplicating ? "Duplicating..." : "Duplicate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
