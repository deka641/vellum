"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import type { SocialContent, SocialLink, BlockSettings } from "@/types/blocks";
import styles from "./blocks.module.css";

const PLATFORMS = [
  "twitter",
  "facebook",
  "instagram",
  "linkedin",
  "youtube",
  "github",
  "tiktok",
  "email",
  "discord",
  "threads",
  "bluesky",
  "mastodon",
  "pinterest",
  "dribbble",
  "behance",
  "whatsapp",
] as const;

interface SocialBlockProps {
  id: string;
  content: SocialContent;
  settings: BlockSettings;
}

export function SocialBlock({ id, content, settings }: SocialBlockProps) {
  const updateBlockContent = useEditorStore((s) => s.updateBlockContent);
  const links = content.links || [];

  function updateLink(index: number, updates: Partial<SocialLink>) {
    const newLinks = links.map((l, i) =>
      i === index ? { ...l, ...updates } : l
    );
    updateBlockContent(id, { links: newLinks });
  }

  function addLink() {
    updateBlockContent(id, {
      links: [...links, { platform: "twitter", url: "" }],
    });
  }

  function removeLink(index: number) {
    updateBlockContent(id, {
      links: links.filter((_, i) => i !== index),
    });
  }

  return (
    <div className={styles.socialEditor} style={{ textAlign: settings.align || "center" }}>
      <div className={styles.socialStyleToggle}>
        <button
          className={`${styles.socialStyleBtn} ${content.style === "icons" ? styles.socialStyleActive : ""}`}
          onClick={(e) => { e.stopPropagation(); updateBlockContent(id, { style: "icons" }); }}
        >
          Icons
        </button>
        <button
          className={`${styles.socialStyleBtn} ${content.style === "pills" ? styles.socialStyleActive : ""}`}
          onClick={(e) => { e.stopPropagation(); updateBlockContent(id, { style: "pills" }); }}
        >
          Pills
        </button>
      </div>
      {links.map((link, i) => (
        <div key={i} className={styles.socialLinkRow}>
          <select
            className={styles.socialPlatformSelect}
            value={link.platform}
            onChange={(e) => updateLink(i, { platform: e.target.value })}
            onClick={(e) => e.stopPropagation()}
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
          <input
            className={styles.socialUrlInput}
            value={link.url}
            onChange={(e) => updateLink(i, { url: e.target.value })}
            placeholder={link.platform === "email" ? "mailto:you@example.com" : "https://..."}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className={styles.socialRemoveBtn}
            onClick={(e) => { e.stopPropagation(); removeLink(i); }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        className={styles.socialAddBtn}
        onClick={(e) => { e.stopPropagation(); addLink(); }}
      >
        <Plus size={14} />
        Add link
      </button>
    </div>
  );
}
