"use client";

import { Play } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import type { VideoContent, BlockSettings } from "@/types/blocks";
import styles from "./blocks.module.css";

interface VideoBlockProps {
  id: string;
  content: VideoContent;
  settings: BlockSettings;
}

const YOUTUBE_HOSTNAMES = ["www.youtube.com", "youtube.com", "youtu.be"];
const VIMEO_HOSTNAMES = ["www.vimeo.com", "vimeo.com"];
const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

function getEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    // YouTube
    if (YOUTUBE_HOSTNAMES.includes(parsed.hostname)) {
      const videoId = parsed.hostname === "youtu.be"
        ? parsed.pathname.slice(1)
        : parsed.searchParams.get("v");
      if (videoId && VIDEO_ID_PATTERN.test(videoId)) return `https://www.youtube.com/embed/${videoId}`;
    }
    // Vimeo
    if (VIMEO_HOSTNAMES.includes(parsed.hostname)) {
      const videoId = parsed.pathname.split("/").pop();
      if (videoId && VIDEO_ID_PATTERN.test(videoId)) return `https://player.vimeo.com/video/${videoId}`;
    }
  } catch {
    // invalid URL
  }
  return null;
}

export function VideoBlock({ id, content, settings }: VideoBlockProps) {
  const updateBlockContent = useEditorStore((s) => s.updateBlockContent);
  const embedUrl = content.url ? getEmbedUrl(content.url) : null;

  if (!content.url || !embedUrl) {
    return (
      <div className={styles.videoPlaceholder}>
        <Play size={24} />
        <span>Add a video</span>
        <input
          type="text"
          className={styles.imageUrlInput}
          placeholder="Paste YouTube or Vimeo URL..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const url = e.currentTarget.value.trim();
              if (url) updateBlockContent(id, { url });
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  return (
    <div
      className={styles.videoWrapper}
      style={{ aspectRatio: settings.aspectRatio || "16/9" }}
    >
      <iframe
        src={embedUrl}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className={styles.videoIframe}
      />
    </div>
  );
}
