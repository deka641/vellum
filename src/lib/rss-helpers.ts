import { sanitizeRichHtml } from "@/lib/sanitize";

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export function extractDescription(
  blocks: Array<{ type: string; content: Record<string, unknown>; settings?: Record<string, unknown> }>,
  maxLen = 300
): string {
  for (const block of blocks) {
    if (block.settings?.hidden) continue;
    if (block.type === "text" && typeof block.content.html === "string") {
      const text = stripHtmlTags(block.content.html);
      if (text && text !== "Start writing...") {
        return text.length > maxLen ? text.slice(0, maxLen - 1) + "\u2026" : text;
      }
    }
  }
  return "";
}

export function resolveUrl(url: string, baseUrl: string): string {
  if (!url || url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function buildContentHtml(
  blocks: Array<{ type: string; content: Record<string, unknown>; settings?: Record<string, unknown> }>,
  baseUrl: string
): string {
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.settings?.hidden) continue;
    switch (block.type) {
      case "heading": {
        const level = (block.content.level || 2) as number;
        const html = block.content.html as string | undefined;
        const text = block.content.text as string;
        if (html) {
          parts.push(`<h${level}>${sanitizeRichHtml(html)}</h${level}>`);
        } else if (text) {
          parts.push(`<h${level}>${escapeXml(text)}</h${level}>`);
        }
        break;
      }
      case "text": {
        const html = block.content.html as string;
        if (html && html !== "<p>Start writing...</p>" && html !== "<p></p>") {
          parts.push(sanitizeRichHtml(html));
        }
        break;
      }
      case "image": {
        const src = block.content.src as string;
        const alt = (block.content.alt as string) || "";
        if (src) {
          parts.push(`<img src="${escapeXml(resolveUrl(src, baseUrl))}" alt="${escapeXml(alt)}" />`);
        }
        break;
      }
      case "quote": {
        const html = block.content.html as string | undefined;
        const text = block.content.text as string;
        if (html) {
          parts.push(`<blockquote>${sanitizeRichHtml(html)}</blockquote>`);
        } else if (text) {
          parts.push(`<blockquote><p>${escapeXml(text)}</p></blockquote>`);
        }
        break;
      }
      case "divider":
        parts.push("<hr />");
        break;
      case "button": {
        const text = block.content.text as string;
        const url = block.content.url as string;
        if (text && url) {
          parts.push(`<p><a href="${escapeXml(resolveUrl(url, baseUrl))}">${escapeXml(text)}</a></p>`);
        }
        break;
      }
      case "columns": {
        const columns = block.content.columns as Array<{ blocks: Array<{ type: string; content: Record<string, unknown> }> }> | undefined;
        if (columns) {
          for (const col of columns) {
            if (col.blocks && col.blocks.length > 0) {
              parts.push(buildContentHtml(col.blocks, baseUrl));
            }
          }
        }
        break;
      }
      case "table": {
        const rows = block.content.rows as string[][] | undefined;
        const caption = block.content.caption as string | undefined;
        if (rows && rows.length > 0) {
          let html = "<table>";
          if (caption) html += `<caption>${escapeXml(caption)}</caption>`;
          const [header, ...body] = rows;
          html += `<thead><tr>${header.map((c) => `<th>${sanitizeRichHtml(c)}</th>`).join("")}</tr></thead>`;
          if (body.length > 0) {
            html += `<tbody>${body.map((row) => `<tr>${row.map((c) => `<td>${sanitizeRichHtml(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
          }
          html += "</table>";
          parts.push(html);
        }
        break;
      }
      case "code": {
        const code = block.content.code as string | undefined;
        const language = block.content.language as string | undefined;
        if (code) {
          parts.push(`<pre><code${language ? ` class="language-${escapeXml(language)}"` : ""}>${escapeXml(code)}</code></pre>`);
        }
        break;
      }
      case "accordion": {
        const items = block.content.items as Array<{ question: string; answer: string }> | undefined;
        if (items && items.length > 0) {
          let html = "<dl>";
          for (const item of items) {
            html += `<dt><strong>${escapeXml(item.question)}</strong></dt>`;
            html += `<dd>${sanitizeRichHtml(item.answer)}</dd>`;
          }
          html += "</dl>";
          parts.push(html);
        }
        break;
      }
      case "video": {
        const url = block.content.url as string;
        if (url) {
          parts.push(`<p><a href="${escapeXml(resolveUrl(url, baseUrl))}">${escapeXml(url)}</a></p>`);
        }
        break;
      }
      case "social": {
        const links = block.content.links as Array<{ platform: string; url: string }> | undefined;
        if (links && links.length > 0) {
          const linkHtml = links
            .filter((l) => l.url)
            .map((l) => `<a href="${escapeXml(l.url)}">${escapeXml(l.platform)}</a>`)
            .join(" | ");
          if (linkHtml) parts.push(`<p>${linkHtml}</p>`);
        }
        break;
      }
      // spacer, toc, form: intentionally omitted from RSS output
    }
  }
  return parts.join("\n");
}
