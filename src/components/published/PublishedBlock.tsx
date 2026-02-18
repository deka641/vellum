import type { CSSProperties } from "react";
import { sanitizeRichHtml, sanitizeUrl, sanitizeImageSrc, getSafeVideoEmbedUrl, sanitizeEmbedHtml } from "@/lib/sanitize";
import { PublishedForm } from "./PublishedForm";
import { ImageLightbox } from "./ImageLightbox";
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
  allBlocks?: BlockData[];
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
  if (settings.marginTop && typeof settings.marginTop === "string") style.marginTop = settings.marginTop;
  if (settings.marginBottom && typeof settings.marginBottom === "string") style.marginBottom = settings.marginBottom;
  return style;
}

function slugifyText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function PublishedBlock({ block, pageId, allBlocks }: PublishedBlockProps) {
  const { type, content, settings } = block;

  // Block visibility toggle
  if (settings.hidden === true) return null;

  const align = (settings.align as CSSProperties["textAlign"]) || "left";
  const extraStyle = buildBlockStyle(settings);

  switch (type) {
    case "heading": {
      const text = content.text as string;
      if (!text || text.trim() === "" || text === "Untitled heading") return null;
      const level = (content.level || 2) as number;
      const headingMap = { 1: "h1", 2: "h2", 3: "h3", 4: "h4" } as const;
      const Tag = headingMap[level as 1 | 2 | 3 | 4] || "h2";
      const headingId = slugifyText(text);
      return (
        <Tag
          id={headingId}
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

    case "image": {
      if (!content.src) return null;
      const imgLink = content.link ? sanitizeUrl(content.link as string) : null;
      const imgContent = (
        <>
          <img
            src={sanitizeImageSrc(content.src as string)}
            alt={(content.alt as string) || ""}
            className={styles.image}
            loading="lazy"
            {...(typeof content.width === "number" && content.width > 0 ? { width: content.width } : {})}
            {...(typeof content.height === "number" && content.height > 0 ? { height: content.height } : {})}
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
        </>
      );
      return (
        <figure className={styles.figure} style={settings.backgroundColor ? { backgroundColor: settings.backgroundColor as string } : undefined}>
          {imgLink && imgLink !== "#" ? (
            <a
              href={imgLink}
              aria-label={(content.alt as string) || "Image link"}
              {...(content.linkNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {imgContent}
            </a>
          ) : (
            <ImageLightbox
              src={sanitizeImageSrc(content.src as string)}
              alt={(content.alt as string) || ""}
            >
              {imgContent}
            </ImageLightbox>
          )}
        </figure>
      );
    }

    case "button":
      return (
        <div className={styles.buttonContainer} style={{ textAlign: align, ...extraStyle }}>
          <a
            href={sanitizeUrl(content.url as string)}
            className={`${styles.button} ${
              styles[`btn-${content.variant || "primary"}`]
            }`}
            {...(content.openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
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
      const columnWidths = content.columnWidths as number[] | undefined;
      return (
        <div
          className={styles.columns}
          style={{
            gap: (settings.gap as string) || "24px",
            ...(columnWidths ? { gridTemplateColumns: columnWidths.map(w => `${w}%`).join(" ") } : {}),
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
            title="Embedded video"
            loading="lazy"
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
        options?: string[];
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
              ) : field.type === "select" ? (
                <select className={styles.formSelect} disabled>
                  <option>{field.placeholder || "Select..."}</option>
                  {(field.options || []).map((opt, i) => <option key={i}>{opt}</option>)}
                </select>
              ) : field.type === "radio" ? (
                <div className={styles.formRadioGroup}>
                  {(field.options || []).map((opt, i) => (
                    <label key={i} className={styles.formRadioLabel}>
                      <input type="radio" disabled /> {opt}
                    </label>
                  ))}
                </div>
              ) : field.type === "checkbox" ? (
                <label className={styles.formCheckboxLabel}>
                  <input type="checkbox" disabled /> {field.placeholder || "Yes"}
                </label>
              ) : (
                <input className={styles.formInput} type={field.type} placeholder={field.placeholder} disabled />
              )}
            </div>
          ))}
          <button className={styles.formSubmit} disabled>{submitText}</button>
        </div>
      );
    }

    case "code": {
      const code = content.code as string;
      if (!code) return null;
      return (
        <div
          className={styles.codeBlock}
          style={extraStyle}
          dangerouslySetInnerHTML={{ __html: sanitizeEmbedHtml(code) }}
        />
      );
    }

    case "social": {
      const links = (content.links || []) as Array<{ platform: string; url: string }>;
      if (links.length === 0) return null;
      const socialStyle = (content.style as string) || "icons";
      return (
        <div className={styles.socialBlock} style={{ textAlign: align, ...extraStyle }}>
          {links.map((link, i) => (
            <a
              key={i}
              href={sanitizeUrl(link.url)}
              className={`${styles.socialLink} ${socialStyle === "pills" ? styles.socialPill : ""}`}
              target="_blank"
              rel="noopener noreferrer"
              title={link.platform}
              aria-label={link.platform}
            >
              <SocialIcon platform={link.platform} />
              {socialStyle === "pills" && (
                <span>{link.platform.charAt(0).toUpperCase() + link.platform.slice(1)}</span>
              )}
            </a>
          ))}
        </div>
      );
    }

    case "accordion": {
      const items = (content.items || []) as Array<{ id: string; title: string; content: string }>;
      if (items.length === 0) return null;
      const accordionStyle = (content.style as string) || "bordered";
      return (
        <div className={styles.accordion} style={extraStyle}>
          {items.map((item) => (
            <details
              key={item.id}
              className={`${styles.accordionItem} ${accordionStyle === "bordered" ? styles.accordionItemBordered : styles.accordionItemMinimal}`}
            >
              <summary className={styles.accordionSummary}>
                {item.title}
              </summary>
              <div
                className={styles.accordionBody}
                dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(item.content) }}
              />
            </details>
          ))}
        </div>
      );
    }

    case "toc": {
      const blocksToScan = allBlocks || [];
      const maxDepth = (content.maxDepth as number) || 3;
      const tocStyle = (content.style as string) || "boxed";
      const ordered = content.ordered === true;

      interface TocEntry { text: string; level: number; id: string }
      const headings: TocEntry[] = [];

      function collectHeadings(blocks: BlockData[]) {
        for (const b of blocks) {
          if (b.type === "heading") {
            const text = b.content.text as string;
            const level = (b.content.level || 2) as number;
            if (text && text.trim() !== "" && text !== "Untitled heading" && level <= maxDepth) {
              headings.push({ text, level, id: slugifyText(text) });
            }
          }
          if (b.type === "columns" && Array.isArray(b.content.columns)) {
            for (const col of b.content.columns as Array<{ blocks?: BlockData[] }>) {
              if (Array.isArray(col.blocks)) collectHeadings(col.blocks);
            }
          }
        }
      }
      collectHeadings(blocksToScan);

      if (headings.length === 0) return null;

      const ListTag = ordered ? "ol" : "ul";
      return (
        <nav
          className={`${styles.toc} ${tocStyle === "boxed" ? styles.tocBoxed : styles.tocMinimal}`}
          aria-label="Table of Contents"
          style={extraStyle}
        >
          <ListTag className={styles.tocList}>
            {headings.map((h, i) => (
              <li
                key={i}
                className={styles.tocItem}
                style={{ paddingLeft: `${(h.level - 1) * 16}px` }}
              >
                <a href={`#${h.id}`} className={styles.tocLink}>
                  {h.text}
                </a>
              </li>
            ))}
          </ListTag>
        </nav>
      );
    }

    default:
      return null;
  }
}

function SocialIcon({ platform }: { platform: string }) {
  const size = 20;
  const svgProps = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (platform) {
    case "twitter":
      return <svg {...svgProps}><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>;
    case "facebook":
      return <svg {...svgProps}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>;
    case "instagram":
      return <svg {...svgProps}><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>;
    case "linkedin":
      return <svg {...svgProps}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>;
    case "youtube":
      return <svg {...svgProps}><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" /></svg>;
    case "github":
      return <svg {...svgProps}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /></svg>;
    case "tiktok":
      return <svg {...svgProps}><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /></svg>;
    case "email":
      return <svg {...svgProps}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>;
    default:
      return <svg {...svgProps}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
  }
}
