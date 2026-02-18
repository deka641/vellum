import type { EditorBlock, HeadingContent, ImageContent, ColumnsContent } from "@/types/blocks";

export type SeoStatus = "good" | "warning" | "error";

export interface SeoCheck {
  id: string;
  label: string;
  status: SeoStatus;
  message: string;
}

export interface SeoAuditResult {
  checks: SeoCheck[];
  score: number; // 0-100
}

function collectBlocks(blocks: EditorBlock[]): EditorBlock[] {
  const all: EditorBlock[] = [];
  for (const block of blocks) {
    all.push(block);
    if (block.type === "columns") {
      const cols = (block.content as ColumnsContent).columns;
      for (const col of cols) {
        all.push(...collectBlocks(col.blocks));
      }
    }
  }
  return all;
}

export function runSeoAudit(
  blocks: EditorBlock[],
  pageTitle: string,
  metaTitle: string | null,
  description: string | null,
  ogImage: string | null,
): SeoAuditResult {
  const checks: SeoCheck[] = [];
  const allBlocks = collectBlocks(blocks);

  // 1. Title length
  const title = metaTitle || pageTitle;
  if (!title || title.length === 0) {
    checks.push({ id: "title", label: "Page title", status: "error", message: "No title set" });
  } else if (title.length < 15) {
    checks.push({ id: "title", label: "Page title", status: "warning", message: `Too short (${title.length} chars, aim for 30-60)` });
  } else if (title.length > 60) {
    checks.push({ id: "title", label: "Page title", status: "warning", message: `Too long (${title.length} chars, aim for 30-60)` });
  } else {
    checks.push({ id: "title", label: "Page title", status: "good", message: `${title.length} characters` });
  }

  // 2. Meta description
  if (!description || description.length === 0) {
    checks.push({ id: "description", label: "Meta description", status: "error", message: "Missing — add a description for search results" });
  } else if (description.length < 50) {
    checks.push({ id: "description", label: "Meta description", status: "warning", message: `Too short (${description.length} chars, aim for 120-160)` });
  } else if (description.length > 160) {
    checks.push({ id: "description", label: "Meta description", status: "warning", message: `Too long (${description.length} chars, aim for 120-160)` });
  } else {
    checks.push({ id: "description", label: "Meta description", status: "good", message: `${description.length} characters` });
  }

  // 3. Heading hierarchy
  const headings = allBlocks
    .filter((b) => b.type === "heading")
    .map((b) => (b.content as HeadingContent).level);

  if (headings.length === 0) {
    checks.push({ id: "headings", label: "Headings", status: "warning", message: "No headings found — add at least one H1" });
  } else {
    const h1Count = headings.filter((l) => l === 1).length;
    if (h1Count === 0) {
      checks.push({ id: "headings", label: "Headings", status: "warning", message: "No H1 heading — add exactly one for SEO" });
    } else if (h1Count > 1) {
      checks.push({ id: "headings", label: "Headings", status: "warning", message: `${h1Count} H1 headings — use exactly one` });
    } else {
      // Check for skipped levels (e.g. H1 → H3 without H2)
      let skipped = false;
      for (let i = 1; i < headings.length; i++) {
        if (headings[i] > headings[i - 1] + 1) {
          skipped = true;
          break;
        }
      }
      if (skipped) {
        checks.push({ id: "headings", label: "Headings", status: "warning", message: "Skipped heading levels — use sequential order" });
      } else {
        checks.push({ id: "headings", label: "Headings", status: "good", message: `${headings.length} heading${headings.length === 1 ? "" : "s"}, proper hierarchy` });
      }
    }
  }

  // 4. Image alt texts
  const images = allBlocks.filter((b) => b.type === "image");
  if (images.length > 0) {
    const missingAlt = images.filter((b) => {
      const content = b.content as ImageContent;
      return !content.alt || content.alt.trim().length === 0;
    });
    if (missingAlt.length > 0) {
      checks.push({
        id: "alt",
        label: "Image alt text",
        status: "error",
        message: `${missingAlt.length} of ${images.length} image${images.length === 1 ? "" : "s"} missing alt text`,
      });
    } else {
      checks.push({
        id: "alt",
        label: "Image alt text",
        status: "good",
        message: `All ${images.length} image${images.length === 1 ? "" : "s"} have alt text`,
      });
    }
  } else {
    checks.push({ id: "alt", label: "Image alt text", status: "good", message: "No images to check" });
  }

  // 5. OG Image
  if (ogImage) {
    checks.push({ id: "og", label: "Social image", status: "good", message: "OG image set" });
  } else if (images.length > 0) {
    checks.push({ id: "og", label: "Social image", status: "warning", message: "No OG image — first page image will be used" });
  } else {
    checks.push({ id: "og", label: "Social image", status: "warning", message: "No OG image or page images" });
  }

  // 6. Content length
  const textContent = allBlocks
    .filter((b) => b.type === "text" || b.type === "heading" || b.type === "quote")
    .map((b) => {
      const c = b.content as Record<string, unknown>;
      const text = (c.text ?? c.html ?? "") as string;
      return text.replace(/<[^>]*>/g, " ").trim();
    })
    .join(" ");

  const wordCount = textContent.split(/\s+/).filter(Boolean).length;
  if (wordCount < 50) {
    checks.push({ id: "content", label: "Content length", status: "warning", message: `${wordCount} words — aim for 300+ for SEO` });
  } else if (wordCount < 300) {
    checks.push({ id: "content", label: "Content length", status: "warning", message: `${wordCount} words — consider adding more content` });
  } else {
    checks.push({ id: "content", label: "Content length", status: "good", message: `${wordCount} words` });
  }

  // Calculate score
  const weights: Record<SeoStatus, number> = { good: 1, warning: 0.5, error: 0 };
  const total = checks.length;
  const score = Math.round((checks.reduce((acc, c) => acc + weights[c.status], 0) / total) * 100);

  return { checks, score };
}
