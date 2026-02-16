import type { CSSProperties } from "react";
import { sanitizeRichHtml, sanitizeUrl, sanitizeImageSrc, getSafeVideoEmbedUrl } from "@/lib/sanitize";
import { PublishedForm } from "./PublishedForm";
import styles from "./published.module.css";

interface BlockData {
  id: string;
  type: string;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
}

interface PublishedBlockProps {
  block: BlockData;
  pageId?: string;
}

function buildBlockStyle(settings: Record<string, unknown>): CSSProperties {
  const style: CSSProperties = {};
  if (settings.textColor && typeof settings.textColor === "string") style.color = settings.textColor;
  if (settings.backgroundColor && typeof settings.backgroundColor === "string") style.backgroundColor = settings.backgroundColor;
  if (settings.fontSize && typeof settings.fontSize === "string") style.fontSize = settings.fontSize;
  if (settings.paddingY && typeof settings.paddingY === "string") {
    style.paddingTop = settings.paddingY;
    style.paddingBottom = settings.paddingY;
  }
  if (settings.paddingX && typeof settings.paddingX === "string") {
    style.paddingLeft = settings.paddingX;
    style.paddingRight = settings.paddingX;
  }
  return style;
}

export function PublishedBlock({ block, pageId }: PublishedBlockProps) {
  const { type, content, settings } = block;
  const align = (settings.align as CSSProperties["textAlign"]) || "left";
  const extraStyle = buildBlockStyle(settings);

  switch (type) {
    case "heading": {
      const text = content.text as string;
      if (!text || text.trim() === "" || text === "Untitled heading") return null;
      const level = (content.level || 2) as number;
      const headingMap = { 1: "h1", 2: "h2", 3: "h3", 4: "h4" } as const;
      const Tag = headingMap[level as 1 | 2 | 3 | 4] || "h2";
      return (
        <Tag
          className={styles.heading}
          style={{ textAlign: align, ...extraStyle }}
          data-level={level}
        >
          {text}
        </Tag>
      );
    }

    case "text": {
      const html = content.html as string;
      if (
        !html ||
        html === "<p>Start writing...</p>" ||
        html === "<p></p>" ||
        html.replace(/<[^>]*>/g, "").trim() === ""
      ) {
        return null;
      }
      return (
        <div
          className={styles.text}
          style={{ textAlign: align, ...extraStyle }}
          dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html) }}
        />
      );
    }

    case "image":
      if (!content.src) return null;
      return (
        <figure className={styles.figure} style={settings.backgroundColor ? { backgroundColor: settings.backgroundColor as string } : undefined}>
          <img
            src={sanitizeImageSrc(content.src as string)}
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
        <div className={styles.buttonContainer} style={{ textAlign: align, ...extraStyle }}>
          <a
            href={sanitizeUrl(content.url as string)}
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
          style={{
            gap: (settings.gap as string) || "24px",
            ...(settings.backgroundColor ? { backgroundColor: settings.backgroundColor as string } : {}),
          }}
        >
          {columns.map((col, i) => (
            <div key={i} className={styles.column}>
              {col.blocks?.map((b: BlockData) => (
                <PublishedBlock key={b.id} block={b} pageId={pageId} />
              ))}
            </div>
          ))}
        </div>
      );
    }

    case "video": {
      const url = content.url as string;
      if (!url) return null;
      const embedUrl = getSafeVideoEmbedUrl(url);
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

    case "quote": {
      const text = content.text as string;
      if (!text || text.trim() === "") return null;
      const quoteStyle = (content.style as string) || "default";
      const attribution = content.attribution as string | undefined;
      return (
        <blockquote
          className={`${styles.quote} ${styles[`quote-${quoteStyle}`] || ""}`}
          style={{ textAlign: align, ...extraStyle }}
        >
          <p className={styles.quoteText}>{text}</p>
          {attribution && <cite className={styles.quoteAttribution}>{attribution}</cite>}
        </blockquote>
      );
    }

    case "form": {
      const fields = (content.fields || []) as Array<{
        id: string;
        type: string;
        label: string;
        required: boolean;
        placeholder?: string;
      }>;
      const submitText = (content.submitText as string) || "Submit";
      const successMessage = (content.successMessage as string) || "Thank you! Your submission has been received.";
      if (pageId) {
        return (
          <PublishedForm
            blockId={block.id}
            pageId={pageId}
            fields={fields}
            submitText={submitText}
            successMessage={successMessage}
          />
        );
      }
      return (
        <div className={styles.formBlock} style={extraStyle}>
          {fields.map((field) => (
            <div key={field.id} className={styles.formField}>
              <label className={styles.formLabel}>
                {field.label}
                {field.required && <span className={styles.formRequired}>*</span>}
              </label>
              {field.type === "textarea" ? (
                <textarea className={styles.formTextarea} placeholder={field.placeholder} rows={4} disabled />
              ) : (
                <input className={styles.formInput} type={field.type} placeholder={field.placeholder} disabled />
              )}
            </div>
          ))}
          <button className={styles.formSubmit} disabled>{submitText}</button>
        </div>
      );
    }

    default:
      return null;
  }
}
