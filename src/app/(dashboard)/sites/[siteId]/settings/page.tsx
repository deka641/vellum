"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Upload, X, Plus, Trash2, Download } from "lucide-react";
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
  const [logo, setLogo] = useState<string | null>(null);
  const [footerText, setFooterText] = useState("");
  const [footerDescription, setFooterDescription] = useState("");
  const [footerLinks, setFooterLinks] = useState<{ label: string; url: string }[]>([]);
  const [footerColumns, setFooterColumns] = useState<{ title: string; links: { label: string; url: string }[] }[]>([]);
  const [footerSocialLinks, setFooterSocialLinks] = useState<{ platform: string; url: string }[]>([]);
  const [showBranding, setShowBranding] = useState(true);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [customHead, setCustomHead] = useState("");
  const [customFooter, setCustomFooter] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/sites/${params.siteId}`)
      .then((res) => res.json())
      .then((site) => {
        setName(site.name);
        setDescription(site.description || "");
        setFavicon(site.favicon || null);
        setLogo(site.logo || null);
        const parsed = parseSiteTheme(site.theme);
        if (parsed) setTheme(parsed);
        setNotificationEmail(site.notificationEmail || "");
        setCustomHead(site.customHead || "");
        setCustomFooter(site.customFooter || "");
        if (site.footer && typeof site.footer === "object") {
          const f = site.footer as {
            text?: string; description?: string;
            links?: { label: string; url: string }[];
            columns?: { title?: string; links: { label: string; url: string }[] }[];
            socialLinks?: { platform: string; url: string }[];
            showBranding?: boolean;
          };
          setFooterText(f.text || "");
          setFooterDescription(f.description || "");
          setFooterLinks(f.links || []);
          setFooterColumns((f.columns || []).map((c) => ({ title: c.title || "", links: c.links || [] })));
          setFooterSocialLinks(f.socialLinks || []);
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

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/media", { method: "POST", body: formData });
      if (res.ok) {
        const media = await res.json();
        setLogo(media.url);
        toast("Logo uploaded");
      } else {
        toast("Failed to upload logo", "error");
      }
    } catch {
      toast("Upload failed", "error");
    } finally {
      setUploadingLogo(false);
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
          logo,
          notificationEmail: notificationEmail.trim() || null,
          customHead: customHead.trim() || null,
          customFooter: customFooter.trim() || null,
          footer: {
            text: footerText || undefined,
            description: footerDescription || undefined,
            links: footerLinks.filter((l) => l.label && l.url),
            columns: footerColumns
              .map((c) => ({ title: c.title || undefined, links: c.links.filter((l) => l.label && l.url) }))
              .filter((c) => c.links.length > 0),
            socialLinks: footerSocialLinks.filter((sl) => sl.platform && sl.url),
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
          <Input
            label="Notification email"
            type="email"
            value={notificationEmail}
            onChange={(e) => setNotificationEmail(e.target.value)}
            placeholder="Receive form submissions at this email"
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

          <div className={styles.faviconSection}>
            <label className={styles.faviconLabel}>Site Logo</label>
            <div className={styles.faviconRow}>
              {logo ? (
                <div className={styles.logoPreview}>
                  <img src={logo} alt="Site logo" />
                  <button
                    type="button"
                    className={styles.faviconRemove}
                    onClick={() => setLogo(null)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className={styles.faviconPlaceholder}>No logo</div>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<Upload size={14} />}
                disabled={uploadingLogo}
                onClick={() => logoInputRef.current?.click()}
              >
                {uploadingLogo ? "Uploading..." : "Upload"}
              </Button>
              <input
                ref={logoInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLogoUpload(file);
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
            <Input
              label="Footer description"
              value={footerDescription}
              onChange={(e) => setFooterDescription(e.target.value)}
              placeholder="A short tagline or description"
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
            <div className={styles.footerLinksEditor}>
              <label className={styles.footerLinksLabel}>Footer columns</label>
              {footerColumns.map((col, ci) => (
                <div key={ci} className={styles.footerColumnEditor}>
                  <div className={styles.footerLinkRow}>
                    <input
                      className={styles.footerLinkInput}
                      value={col.title}
                      onChange={(e) => {
                        const updated = [...footerColumns];
                        updated[ci] = { ...updated[ci], title: e.target.value };
                        setFooterColumns(updated);
                      }}
                      placeholder="Column title"
                    />
                    <button
                      type="button"
                      className={styles.footerLinkRemove}
                      onClick={() => setFooterColumns(footerColumns.filter((_, j) => j !== ci))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {col.links.map((link, li) => (
                    <div key={li} className={styles.footerLinkRow} style={{ paddingLeft: 16 }}>
                      <input
                        className={styles.footerLinkInput}
                        value={link.label}
                        onChange={(e) => {
                          const updated = [...footerColumns];
                          const links = [...updated[ci].links];
                          links[li] = { ...links[li], label: e.target.value };
                          updated[ci] = { ...updated[ci], links };
                          setFooterColumns(updated);
                        }}
                        placeholder="Label"
                      />
                      <input
                        className={styles.footerLinkInput}
                        value={link.url}
                        onChange={(e) => {
                          const updated = [...footerColumns];
                          const links = [...updated[ci].links];
                          links[li] = { ...links[li], url: e.target.value };
                          updated[ci] = { ...updated[ci], links };
                          setFooterColumns(updated);
                        }}
                        placeholder="https://..."
                      />
                      <button
                        type="button"
                        className={styles.footerLinkRemove}
                        onClick={() => {
                          const updated = [...footerColumns];
                          updated[ci] = { ...updated[ci], links: updated[ci].links.filter((_, j) => j !== li) };
                          setFooterColumns(updated);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className={styles.footerLinkAdd}
                    onClick={() => {
                      const updated = [...footerColumns];
                      updated[ci] = { ...updated[ci], links: [...updated[ci].links, { label: "", url: "" }] };
                      setFooterColumns(updated);
                    }}
                    style={{ marginLeft: 16 }}
                  >
                    <Plus size={14} /> Add link to column
                  </button>
                </div>
              ))}
              {footerColumns.length < 4 && (
                <button
                  type="button"
                  className={styles.footerLinkAdd}
                  onClick={() => setFooterColumns([...footerColumns, { title: "", links: [{ label: "", url: "" }] }])}
                >
                  <Plus size={14} /> Add column
                </button>
              )}
            </div>
            <div className={styles.footerLinksEditor}>
              <label className={styles.footerLinksLabel}>Social links</label>
              {footerSocialLinks.map((sl, i) => (
                <div key={i} className={styles.footerLinkRow}>
                  <select
                    className={styles.footerLinkInput}
                    value={sl.platform}
                    onChange={(e) => {
                      const updated = [...footerSocialLinks];
                      updated[i] = { ...updated[i], platform: e.target.value };
                      setFooterSocialLinks(updated);
                    }}
                  >
                    {["twitter", "facebook", "instagram", "linkedin", "youtube", "github", "tiktok", "email", "discord", "threads", "bluesky", "mastodon", "pinterest", "dribbble", "behance", "whatsapp"].map((p) => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                  <input
                    className={styles.footerLinkInput}
                    value={sl.url}
                    onChange={(e) => {
                      const updated = [...footerSocialLinks];
                      updated[i] = { ...updated[i], url: e.target.value };
                      setFooterSocialLinks(updated);
                    }}
                    placeholder="https://..."
                  />
                  <button
                    type="button"
                    className={styles.footerLinkRemove}
                    onClick={() => setFooterSocialLinks(footerSocialLinks.filter((_, j) => j !== i))}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={styles.footerLinkAdd}
                onClick={() => setFooterSocialLinks([...footerSocialLinks, { platform: "twitter", url: "" }])}
              >
                <Plus size={14} /> Add social link
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

          <details className={styles.customCodeSection}>
            <summary className={styles.customCodeSummary}>Custom Code (Advanced)</summary>
            <p className={styles.customCodeWarning}>
              Only add code from trusted sources. Malicious scripts can compromise your site.
            </p>
            <div className={styles.customCodeField}>
              <label className={styles.customCodeLabel}>Head Code</label>
              <p className={styles.customCodeHint}>Scripts and meta tags injected into the &lt;head&gt; section.</p>
              <textarea
                className={styles.customCodeTextarea}
                value={customHead}
                onChange={(e) => setCustomHead(e.target.value)}
                rows={6}
                placeholder="<!-- e.g. analytics, custom fonts -->"
                spellCheck={false}
              />
            </div>
            <div className={styles.customCodeField}>
              <label className={styles.customCodeLabel}>Footer Code</label>
              <p className={styles.customCodeHint}>Scripts and widgets injected before the closing &lt;/body&gt; tag.</p>
              <textarea
                className={styles.customCodeTextarea}
                value={customFooter}
                onChange={(e) => setCustomFooter(e.target.value)}
                rows={6}
                placeholder="<!-- e.g. chat widgets, tracking pixels -->"
                spellCheck={false}
              />
            </div>
          </details>

          <div className={styles.actions}>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>

        <div style={{ marginTop: "var(--space-12)", padding: "var(--space-5)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}>
          <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", marginBottom: "var(--space-2)" }}>Backup</h3>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-4)" }}>Export your site as a JSON backup file containing all pages, blocks, and settings.</p>
          <Button
            variant="secondary"
            leftIcon={<Download size={16} />}
            onClick={() => {
              window.location.href = `/api/sites/${params.siteId}/export`;
            }}
          >
            Export site
          </Button>
        </div>

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
