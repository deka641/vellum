import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";
import { extractTextFromBlocks, getSnippet } from "@/lib/search";

const MAX_RESULTS = 50;
const BATCH_SIZE = 25;

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
