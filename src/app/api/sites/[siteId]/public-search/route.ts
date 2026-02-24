import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";

const MAX_RESULTS = 50;
const BATCH_SIZE = 50;

function extractTextFromBlocks(blocks: Array<Record<string, unknown>>): string {
  const parts: string[] = [];
  for (const block of blocks) {
    const content = block.content as Record<string, unknown> | undefined;
    if (!content) continue;

    if (typeof content.text === "string") parts.push(content.text);
    if (typeof content.html === "string") {
      parts.push(content.html.replace(/<[^>]*>/g, " "));
    }
    if (typeof content.attribution === "string") parts.push(content.attribution);

    // Accordion items
    if (Array.isArray(content.items)) {
      for (const item of content.items) {
        if (typeof item === "object" && item !== null) {
          const i = item as Record<string, unknown>;
          if (typeof i.title === "string") parts.push(i.title);
          if (typeof i.content === "string") parts.push(i.content.replace(/<[^>]*>/g, " "));
        }
      }
    }

    // Column children
    if (Array.isArray(content.columns)) {
      for (const col of content.columns) {
        if (typeof col === "object" && col !== null && Array.isArray((col as Record<string, unknown>).blocks)) {
          parts.push(extractTextFromBlocks((col as Record<string, unknown>).blocks as Array<Record<string, unknown>>));
        }
      }
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function getSnippet(text: string, query: string, maxLen = 160): string {
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

interface SearchResult {
  pageTitle: string;
  pageSlug: string;
  description: string | null;
  matchType: "title" | "description" | "content";
  snippet: string;
  isHomepage: boolean;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const ip = getClientIp(req);
    const rl = rateLimit(`public-search:${ip}`, "read");
    if (!rl.success) return rateLimitResponse(rl);

    const { siteId: siteSlug } = await params;
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
    }

    if (q.length > 200) {
      return NextResponse.json({ error: "Query must be at most 200 characters" }, { status: 400 });
    }

    // Look up site by slug (public — no auth needed)
    const site = await db.site.findUnique({
      where: { slug: siteSlug },
      select: { id: true },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const siteId = site.id;
    const results: SearchResult[] = [];

    // Stage 1: Search titles and descriptions via database (efficient, uses indexes)
    // Only search PUBLISHED pages
    const titleDescMatches = await db.page.findMany({
      where: {
        siteId,
        status: "PUBLISHED",
        deletedAt: null,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, slug: true, description: true, isHomepage: true },
      take: MAX_RESULTS,
      orderBy: { sortOrder: "asc" },
    });

    for (const page of titleDescMatches) {
      if (results.length >= MAX_RESULTS) break;

      if (page.title.toLowerCase().includes(q.toLowerCase())) {
        results.push({
          pageTitle: page.title,
          pageSlug: page.slug,
          description: page.description,
          matchType: "title",
          snippet: page.title,
          isHomepage: page.isHomepage,
        });
      } else if (page.description) {
        results.push({
          pageTitle: page.title,
          pageSlug: page.slug,
          description: page.description,
          matchType: "description",
          snippet: getSnippet(page.description, q),
          isHomepage: page.isHomepage,
        });
      }
    }

    // Stage 2: Search block content in batches (only if we still need more results)
    if (results.length < MAX_RESULTS) {
      const matchedPageIds = new Set(titleDescMatches.map((p) => p.id));
      let cursor: string | undefined;

      while (results.length < MAX_RESULTS) {
        const pages = await db.page.findMany({
          where: {
            siteId,
            status: "PUBLISHED",
            deletedAt: null,
            id: { notIn: Array.from(matchedPageIds) },
          },
          include: {
            blocks: {
              orderBy: { sortOrder: "asc" },
              select: { content: true, type: true },
            },
          },
          orderBy: { sortOrder: "asc" },
          take: BATCH_SIZE,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        });

        if (pages.length === 0) break;
        cursor = pages[pages.length - 1].id;

        for (const page of pages) {
          const blockText = extractTextFromBlocks(
            page.blocks.map((b) => ({ content: b.content as Record<string, unknown>, type: b.type }))
          );
          if (blockText.toLowerCase().includes(q.toLowerCase())) {
            results.push({
              pageTitle: page.title,
              pageSlug: page.slug,
              description: page.description,
              matchType: "content",
              snippet: getSnippet(blockText, q),
              isHomepage: page.isHomepage,
            });
            matchedPageIds.add(page.id);
          }

          if (results.length >= MAX_RESULTS) break;
        }

        if (pages.length < BATCH_SIZE) break;
      }
    }

    return NextResponse.json({ results, total: results.length });
  } catch (error) {
    return apiError("GET /api/sites/[siteSlug]/public-search", error);
  }
}
