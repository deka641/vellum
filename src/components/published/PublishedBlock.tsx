import type { CSSProperties } from "react";
import styles from "./published.module.css";

interface BlockData {
  id: string;
  type: string;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
}

interface PublishedBlockProps {
  block: BlockData;
}

export function PublishedBlock({ block }: PublishedBlockProps) {
  const { type, content, settings } = block;
  const align = (settings.align as CSSProperties["textAlign"]) || "left";

  switch (type) {
    case "heading": {
      const level = (content.level || 2) as number;
      const headingMap = { 1: "h1", 2: "h2", 3: "h3", 4: "h4" } as const;
      const Tag = headingMap[level as 1 | 2 | 3 | 4] || "h2";
      return (
        <Tag
          className={styles.heading}
          style={{ textAlign: align }}
          data-level={level}
        >
          {content.text as string}
        </Tag>
      );
    }

    case "text":
      return (
        <div
          className={styles.text}
          style={{ textAlign: align }}
          dangerouslySetInnerHTML={{ __html: content.html as string }}
        />
      );

    case "image":
      if (!content.src) return null;
      return (
        <figure className={styles.figure}>
          <img
            src={content.src as string}
            alt={(content.alt as string) || ""}
            className={styles.image}
            style={{
              borderRadius: settings.rounded ? "var(--radius-lg)" : undefined,
              boxShadow: settings.shadow ? "var(--shadow-lg)" : undefined,
            }}
          />
          {typeof content.caption === "string" && content.caption && (
            <figcaption className={styles.caption}>
              {content.caption}
            </figcaption>
          )}
        </figure>
      );

    case "button":
      return (
        <div className={styles.buttonContainer} style={{ textAlign: align }}>
          <a
            href={content.url as string}
            className={`${styles.button} ${
              styles[`btn-${content.variant || "primary"}`]
            }`}
          >
            {content.text as string}
          </a>
        </div>
      );

    case "spacer":
      return <div style={{ height: `${content.height || 48}px` }} />;

    case "divider":
      return (
        <hr
          className={styles.divider}
          style={{
            borderStyle: (settings.style as CSSProperties["borderStyle"]) || "solid",
            borderColor: (settings.color as string) || "var(--color-border)",
          }}
        />
      );

    case "columns": {
      const columns = (content.columns || []) as Array<{
        blocks: BlockData[];
      }>;
      return (
        <div
          className={styles.columns}
          style={{ gap: (settings.gap as string) || "24px" }}
        >
          {columns.map((col, i) => (
            <div key={i} className={styles.column}>
              {col.blocks?.map((b: BlockData) => (
                <PublishedBlock key={b.id} block={b} />
              ))}
            </div>
          ))}
        </div>
      );
    }

    case "video": {
      const url = content.url as string;
      if (!url) return null;
      let embedUrl = "";
      try {
        const parsed = new URL(url);
        if (parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtu.be")) {
          const videoId = parsed.hostname.includes("youtu.be")
            ? parsed.pathname.slice(1)
            : parsed.searchParams.get("v");
          if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (parsed.hostname.includes("vimeo.com")) {
          const videoId = parsed.pathname.split("/").pop();
          if (videoId) embedUrl = `https://player.vimeo.com/video/${videoId}`;
        }
      } catch { /* invalid URL */ }
      if (!embedUrl) return null;
      return (
        <div
          className={styles.video}
          style={{ aspectRatio: (settings.aspectRatio as string) || "16/9" }}
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

    default:
      return null;
  }
}
