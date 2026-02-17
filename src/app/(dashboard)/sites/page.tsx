"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Globe } from "lucide-react";
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
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/sites")
      .then((res) => res.json())
      .then(setSites)
      .finally(() => setLoading(false));
  }, []);

  function handleDelete(id: string) {
    setDeleteSiteId(id);
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
          <Link href="/sites/new">
            <Button leftIcon={<Plus size={16} />}>New site</Button>
          </Link>
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
            <Globe size={48} strokeWidth={1} />
            <h3>No sites yet</h3>
            <p>Create your first website to get started</p>
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
