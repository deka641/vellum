import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";

const MAX_RESULTS = 50;

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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const rl = rateLimit(`search:${userId}`, "read");
    if (!rl.success) return rateLimitResponse(rl);

    const { siteId } = await params;
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
    }

    // Verify site ownership
    const site = await db.site.findFirst({
      where: { id: siteId, userId },
      select: { id: true },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Search pages: title, description, and block content
    const pages = await db.page.findMany({
      where: {
        siteId,
        deletedAt: null,
      },
      include: {
        blocks: {
          orderBy: { sortOrder: "asc" },
          select: { content: true, type: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const qLower = q.toLowerCase();
    const results: Array<{
      pageId: string;
      pageTitle: string;
      pageSlug: string;
      status: string;
      matchType: "title" | "description" | "content";
      snippet: string;
    }> = [];

    for (const page of pages) {
      // Check title
      if (page.title.toLowerCase().includes(qLower)) {
        results.push({
          pageId: page.id,
          pageTitle: page.title,
          pageSlug: page.slug,
          status: page.status,
          matchType: "title",
          snippet: page.title,
        });
        continue;
      }

      // Check description
      if (page.description && page.description.toLowerCase().includes(qLower)) {
        results.push({
          pageId: page.id,
          pageTitle: page.title,
          pageSlug: page.slug,
          status: page.status,
          matchType: "description",
          snippet: getSnippet(page.description, q),
        });
        continue;
      }

      // Check block content
      const blockText = extractTextFromBlocks(
        page.blocks.map((b) => ({ content: b.content as Record<string, unknown>, type: b.type }))
      );
      if (blockText.toLowerCase().includes(qLower)) {
        results.push({
          pageId: page.id,
          pageTitle: page.title,
          pageSlug: page.slug,
          status: page.status,
          matchType: "content",
          snippet: getSnippet(blockText, q),
        });
      }

      if (results.length >= MAX_RESULTS) break;
    }

    return NextResponse.json({ results, total: results.length });
  } catch (error) {
    return apiError("GET /api/sites/[siteId]/search", error);
  }
}
