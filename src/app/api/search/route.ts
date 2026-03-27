import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";
import { extractTextFromBlocks, getSnippet, rankSearchResults, highlightSnippet } from "@/lib/search";

const MAX_RESULTS = 50;
const BATCH_SIZE = 25;

interface SearchResult {
  pageId: string;
  pageTitle: string;
  pageSlug: string;
  status: string;
  matchType: "title" | "description" | "content";
  snippet: string;
  siteId: string;
  siteName: string;
  siteSlug: string;
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const rl = rateLimit(`global-search:${userId}`, "read");
    if (!rl.success) return rateLimitResponse(rl);

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const statusFilter = searchParams.get("status");

    if (!q || q.length < 2) {
      return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
    }

    if (q.length > 200) {
      return NextResponse.json({ error: "Query must be at most 200 characters" }, { status: 400 });
    }

    // Get all user's sites
    const userSites = await db.site.findMany({
      where: { userId },
      select: { id: true, name: true, slug: true },
    });

    if (userSites.length === 0) {
      return NextResponse.json({ results: [], total: 0 });
    }

    const siteMap = new Map(userSites.map((s) => [s.id, s]));
    const siteIds = userSites.map((s) => s.id);
    const results: SearchResult[] = [];

    const statusWhere = statusFilter === "PUBLISHED" || statusFilter === "DRAFT"
      ? { status: statusFilter as "PUBLISHED" | "DRAFT" }
      : {};

    // Stage 1: Search titles and descriptions
    const titleDescMatches = await db.page.findMany({
      where: {
        siteId: { in: siteIds },
        deletedAt: null,
        ...statusWhere,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, slug: true, status: true, description: true, siteId: true },
      take: MAX_RESULTS,
      orderBy: { updatedAt: "desc" },
    });

    for (const page of titleDescMatches) {
      if (results.length >= MAX_RESULTS) break;
      const site = siteMap.get(page.siteId);
      if (!site) continue;

      if (page.title.toLowerCase().includes(q.toLowerCase())) {
        results.push({
          pageId: page.id,
          pageTitle: page.title,
          pageSlug: page.slug,
          status: page.status,
          matchType: "title",
          snippet: page.title,
          siteId: site.id,
          siteName: site.name,
          siteSlug: site.slug,
        });
      } else if (page.description) {
        results.push({
          pageId: page.id,
          pageTitle: page.title,
          pageSlug: page.slug,
          status: page.status,
          matchType: "description",
          snippet: getSnippet(page.description, q),
          siteId: site.id,
          siteName: site.name,
          siteSlug: site.slug,
        });
      }
    }

    // Stage 2: Search block content in batches
    if (results.length < MAX_RESULTS) {
      const matchedPageIds = new Set(results.map((r) => r.pageId));
      let cursor: string | undefined;

      while (results.length < MAX_RESULTS) {
        const pages = await db.page.findMany({
          where: {
            siteId: { in: siteIds },
            deletedAt: null,
            ...statusWhere,
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
          const site = siteMap.get(page.siteId);
          if (!site) continue;

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
              siteId: site.id,
              siteName: site.name,
              siteSlug: site.slug,
            });
            matchedPageIds.add(page.id);
          }

          if (results.length >= MAX_RESULTS) break;
        }

        if (pages.length < BATCH_SIZE) break;
      }
    }

    const ranked = rankSearchResults(results);
    const highlighted = ranked.map((r) => ({
      ...r,
      snippet: highlightSnippet(r.snippet, q),
    }));

    return NextResponse.json({ results: highlighted, total: highlighted.length });
  } catch (error) {
    return apiError("GET /api/search", error);
  }
}
