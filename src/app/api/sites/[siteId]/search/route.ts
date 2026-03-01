import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";
import { extractTextFromBlocks, getSnippet } from "@/lib/search";

const MAX_RESULTS = 50;
const BATCH_SIZE = 25;

interface SearchResult {
  pageId: string;
  pageTitle: string;
  pageSlug: string;
  status: string;
  matchType: "title" | "description" | "content";
  snippet: string;
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

    if (q.length > 200) {
      return NextResponse.json({ error: "Query must be at most 200 characters" }, { status: 400 });
    }

    // Verify site ownership
    const site = await db.site.findFirst({
      where: { id: siteId, userId },
      select: { id: true },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const results: SearchResult[] = [];

    // Stage 1: Search titles and descriptions via database (efficient, uses indexes)
    const titleDescMatches = await db.page.findMany({
      where: {
        siteId,
        deletedAt: null,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, slug: true, status: true, description: true },
      take: MAX_RESULTS,
      orderBy: { updatedAt: "desc" },
    });

    for (const page of titleDescMatches) {
      if (results.length >= MAX_RESULTS) break;

      if (page.title.toLowerCase().includes(q.toLowerCase())) {
        results.push({
          pageId: page.id,
          pageTitle: page.title,
          pageSlug: page.slug,
          status: page.status,
          matchType: "title",
          snippet: page.title,
        });
      } else if (page.description) {
        results.push({
          pageId: page.id,
          pageTitle: page.title,
          pageSlug: page.slug,
          status: page.status,
          matchType: "description",
          snippet: getSnippet(page.description, q),
        });
      }
    }

    // Stage 2: Search block content in batches (only if we still need more results)
    if (results.length < MAX_RESULTS) {
      const matchedPageIds = new Set(results.map((r) => r.pageId));
      let cursor: string | undefined;

      while (results.length < MAX_RESULTS) {
        const pages = await db.page.findMany({
          where: {
            siteId,
            deletedAt: null,
            id: { notIn: Array.from(matchedPageIds) },
          },
          include: {
            blocks: {
              orderBy: { sortOrder: "asc" },
              select: { content: true, type: true },
            },
          },
          orderBy: { updatedAt: "desc" },
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
              pageId: page.id,
              pageTitle: page.title,
              pageSlug: page.slug,
              status: page.status,
              matchType: "content",
              snippet: getSnippet(blockText, q),
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
    return apiError("GET /api/sites/[siteId]/search", error);
  }
}
