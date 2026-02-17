"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Upload, X, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { Topbar } from "@/components/dashboard/Topbar";
import { Input, Textarea } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import { useToast } from "@/components/ui/Toast/Toast";
import { ThemeConfigurator } from "@/components/dashboard/ThemeConfigurator";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { DEFAULT_THEME, parseSiteTheme, type SiteTheme } from "@/lib/theme";
import styles from "./settings.module.css";

export default function SiteSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [theme, setTheme] = useState<SiteTheme>(DEFAULT_THEME);
  const [favicon, setFavicon] = useState<string | null>(null);
  const [footerText, setFooterText] = useState("");
  const [footerLinks, setFooterLinks] = useState<{ label: string; url: string }[]>([]);
  const [showBranding, setShowBranding] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/sites/${params.siteId}`)
      .then((res) => res.json())
      .then((site) => {
        setName(site.name);
        setDescription(site.description || "");
        setFavicon(site.favicon || null);
        const parsed = parseSiteTheme(site.theme);
        if (parsed) setTheme(parsed);
        if (site.footer && typeof site.footer === "object") {
          const f = site.footer as { text?: string; links?: { label: string; url: string }[]; showBranding?: boolean };
          setFooterText(f.text || "");
          setFooterLinks(f.links || []);
          setShowBranding(f.showBranding !== false);
        }
      })
      .finally(() => setLoading(false));
  }, [params.siteId]);

  async function handleFaviconUpload(file: File) {
    setUploadingFavicon(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/media", { method: "POST", body: formData });
      if (res.ok) {
        const media = await res.json();
        setFavicon(media.url);
        toast("Favicon uploaded");
      } else {
        toast("Failed to upload favicon", "error");
      }
    } catch {
      toast("Upload failed", "error");
    } finally {
      setUploadingFavicon(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/sites/${params.siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          theme,
          favicon,
          footer: {
            text: footerText || undefined,
            links: footerLinks.filter((l) => l.label && l.url),
            showBranding,
          },
        }),
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

          <div className={styles.faviconSection}>
            <label className={styles.faviconLabel}>Favicon</label>
            <div className={styles.faviconRow}>
              {favicon ? (
                <div className={styles.faviconPreview}>
                  <img src={favicon} alt="Favicon" width={32} height={32} />
                  <button
                    type="button"
                    className={styles.faviconRemove}
                    onClick={() => setFavicon(null)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className={styles.faviconPlaceholder}>No favicon</div>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<Upload size={14} />}
                disabled={uploadingFavicon}
                onClick={() => faviconInputRef.current?.click()}
              >
                {uploadingFavicon ? "Uploading..." : "Upload"}
              </Button>
              <input
                ref={faviconInputRef}
                type="file"
                accept=".ico,.png,.jpg,.jpeg,.svg"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFaviconUpload(file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <ThemeConfigurator theme={theme} onChange={setTheme} />

          <div className={styles.footerSection}>
            <h3 className={styles.footerSectionTitle}>Footer</h3>
            <Input
              label="Footer text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="e.g. &copy; 2026 My Company"
            />
            <div className={styles.footerLinksEditor}>
              <label className={styles.footerLinksLabel}>Footer links</label>
              {footerLinks.map((link, i) => (
                <div key={i} className={styles.footerLinkRow}>
                  <input
                    className={styles.footerLinkInput}
                    value={link.label}
                    onChange={(e) => {
                      const updated = [...footerLinks];
                      updated[i] = { ...updated[i], label: e.target.value };
                      setFooterLinks(updated);
                    }}
                    placeholder="Label"
                  />
                  <input
                    className={styles.footerLinkInput}
                    value={link.url}
                    onChange={(e) => {
                      const updated = [...footerLinks];
                      updated[i] = { ...updated[i], url: e.target.value };
                      setFooterLinks(updated);
                    }}
                    placeholder="https://..."
                  />
                  <button
                    type="button"
                    className={styles.footerLinkRemove}
                    onClick={() => setFooterLinks(footerLinks.filter((_, j) => j !== i))}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={styles.footerLinkAdd}
                onClick={() => setFooterLinks([...footerLinks, { label: "", url: "" }])}
              >
                <Plus size={14} />
                Add link
              </button>
            </div>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={showBranding}
                onChange={(e) => setShowBranding(e.target.checked)}
              />
              <span>Show &quot;Built with Vellum&quot; branding</span>
            </label>
          </div>

          <div className={styles.actions}>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>

        <div className={styles.dangerZone}>
          <h3>Danger Zone</h3>
          <p>Permanently delete this site and all its pages.</p>
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete this site
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete site"
        description="Are you sure you want to delete this site? This cannot be undone."
        confirmLabel="Delete site"
        variant="danger"
        onConfirm={handleDelete}
      />
    </>
  );
}
