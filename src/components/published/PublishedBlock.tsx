import type { CSSProperties } from "react";
import { sanitizeRichHtml, sanitizeUrl, sanitizeImageSrc, getSafeVideoEmbedUrl, sanitizeEmbedHtml } from "@/lib/sanitize";
import { slugify } from "@/lib/utils";
import { PublishedForm } from "./PublishedForm";
import { ImageLightbox } from "./ImageLightbox";
import { SocialIcon } from "./SocialIcon";
import type { BlockData } from "@/types/blocks";
import styles from "./published.module.css";

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
      const headingId = slugify(text);
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
            decoding="async"
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
            borderTopWidth: (settings.thickness as string) || "1px",
            maxWidth: (settings.maxWidth as string) || "100%",
            margin: settings.align === "center" ? "var(--space-6) auto" :
                    settings.align === "right" ? "var(--space-6) 0 var(--space-6) auto" :
                    "var(--space-6) 0",
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
          <div className={styles.formPreviewBanner}>Form preview — submissions are disabled</div>
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
        <nav className={styles.socialBlock} style={{ textAlign: align, ...extraStyle }} aria-label="Social links">
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
        </nav>
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

    case "table": {
      const headers = (content.headers || []) as string[];
      const tableRows = (content.rows || []) as string[][];
      const caption = content.caption as string | undefined;
      const striped = content.striped !== false;
      if (headers.length === 0 && tableRows.length === 0) return null;
      return (
        <figure className={styles.tableContainer} style={extraStyle}>
          <table className={`${styles.table} ${striped ? styles.tableStriped : ""}`}>
            {headers.length > 0 && (
              <thead>
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className={styles.tableHeader} scope="col">{h}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {tableRows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className={styles.tableCell}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {caption && <figcaption className={styles.tableCaption}>{caption}</figcaption>}
        </figure>
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
              headings.push({ text, level, id: slugify(text) });
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

