"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Topbar } from "@/components/dashboard/Topbar";
import { Input, Textarea } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import { useToast } from "@/components/ui/Toast/Toast";
import styles from "./settings.module.css";

export default function SiteSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sites/${params.siteId}`)
      .then((res) => res.json())
      .then((site) => {
        setName(site.name);
        setDescription(site.description || "");
      })
      .finally(() => setLoading(false));
  }, [params.siteId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/sites/${params.siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      if (res.ok) {
        toast("Settings saved");
      } else {
        toast("Failed to save settings", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this site? This cannot be undone.")) return;

    const res = await fetch(`/api/sites/${params.siteId}`, { method: "DELETE" });
    if (res.ok) {
      toast("Site deleted");
      router.push("/sites");
    } else {
      toast("Failed to delete site", "error");
    }
  }

  if (loading) return null;

  return (
    <>
      <Topbar
        title="Site Settings"
        actions={
          <Link href={`/sites/${params.siteId}`}>
            <Button variant="ghost" leftIcon={<ArrowLeft size={16} />} size="sm">
              Back
            </Button>
          </Link>
        }
      />
      <div className={styles.content}>
        <form onSubmit={handleSave} className={styles.form}>
          <Input
            label="Site name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <div className={styles.actions}>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>

        <div className={styles.dangerZone}>
          <h3>Danger Zone</h3>
          <p>Permanently delete this site and all its pages.</p>
          <Button variant="danger" onClick={handleDelete}>
            Delete this site
          </Button>
        </div>
      </div>
    </>
  );
}
