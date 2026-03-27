/**
 * Shared search utilities for text extraction and snippet generation.
 * Used by both authenticated and public search endpoints.
 */

/**
 * Extract searchable text content from blocks.
 * Supports: text, heading, quote, accordion, columns (recursive), table.
 * @param blocks Array of block-like objects with content
 * @param maxChars Stop extracting after this many characters (default: 10000)
 */
export function extractTextFromBlocks(
  blocks: Array<Record<string, unknown>>,
  maxChars = 10_000
): string {
  const parts: string[] = [];
  let charCount = 0;

  for (const block of blocks) {
    if (charCount >= maxChars) break;

    const content = block.content as Record<string, unknown> | undefined;
    if (!content) continue;

    if (typeof content.text === "string") {
      parts.push(content.text);
      charCount += content.text.length;
    }
    if (typeof content.html === "string") {
      const stripped = content.html.replace(/<[^>]*>/g, " ");
      parts.push(stripped);
      charCount += stripped.length;
    }
    if (typeof content.attribution === "string") {
      parts.push(content.attribution);
      charCount += content.attribution.length;
    }

    // Table content
    if (Array.isArray(content.headers)) {
      for (const header of content.headers) {
        if (typeof header === "string") {
          const stripped = header.replace(/<[^>]*>/g, " ");
          parts.push(stripped);
          charCount += stripped.length;
        }
      }
    }
    if (Array.isArray(content.rows)) {
      for (const row of content.rows) {
        if (Array.isArray(row)) {
          for (const cell of row) {
            if (typeof cell === "string") {
              const stripped = cell.replace(/<[^>]*>/g, " ");
              parts.push(stripped);
              charCount += stripped.length;
            }
          }
        }
        if (charCount >= maxChars) break;
      }
    }

    // Accordion items
    if (Array.isArray(content.items)) {
      for (const item of content.items) {
        if (typeof item === "object" && item !== null) {
          const i = item as Record<string, unknown>;
          if (typeof i.title === "string") {
            parts.push(i.title);
            charCount += i.title.length;
          }
          if (typeof i.content === "string") {
            const stripped = i.content.replace(/<[^>]*>/g, " ");
            parts.push(stripped);
            charCount += stripped.length;
          }
        }
      }
    }

    // Column children
    if (Array.isArray(content.columns)) {
      for (const col of content.columns) {
        if (typeof col === "object" && col !== null && Array.isArray((col as Record<string, unknown>).blocks)) {
          const colText = extractTextFromBlocks(
            (col as Record<string, unknown>).blocks as Array<Record<string, unknown>>,
            maxChars - charCount
          );
          parts.push(colText);
          charCount += colText.length;
        }
        if (charCount >= maxChars) break;
      }
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Generate a snippet of text centered around the query match.
 */
export function getSnippet(text: string, query: string, maxLen = 160): string {
  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx === -1) return text.slice(0, maxLen);

  const start = Math.max(0, idx - 60);
  const end = Math.min(text.length, idx + query.length + 100);
  let snippet = text.slice(start, end).trim();
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";
  return snippet;
}

/**
 * Escape HTML special characters to prevent XSS.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Wrap matching substrings with `<mark>` tags for search result highlighting.
 * Escapes HTML in the text first to prevent XSS, then inserts `<mark>` tags.
 * Uses case-insensitive matching.
 */
export function highlightSnippet(text: string, query: string): string {
  if (!query || query.length === 0) return escapeHtml(text);

  const escaped = escapeHtml(text);
  const escapedQuery = escapeHtml(query);

  // Escape regex special characters in the query so it can be used in a RegExp safely
  const regexSafe = escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (regexSafe.length === 0) return escaped;

  // eslint-disable-next-line security/detect-non-literal-regexp -- regexSafe is derived from user query with all special chars escaped; no ReDoS risk
  const regex = new RegExp(`(${regexSafe})`, "gi");
  return escaped.replace(regex, "<mark>$1</mark>");
}

/**
 * Sort search results by match-type relevance priority.
 * Title matches rank highest (3), then description (2), then content (1).
 * Stable sort preserves original ordering within each priority group.
 */
export function rankSearchResults<T extends { matchType: string }>(results: T[]): T[] {
  const priorityMap: Record<string, number> = {
    title: 3,
    description: 2,
    content: 1,
  };

  return [...results].sort((a, b) => {
    const aPriority = priorityMap[a.matchType] ?? 0;
    const bPriority = priorityMap[b.matchType] ?? 0;
    return bPriority - aPriority;
  });
}
