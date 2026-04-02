import { NextResponse } from "next/server";
import { hashApiKey } from "@/lib/api-key";
import { db } from "@/lib/db";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;

    // Extract Bearer token from Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header. Use: Bearer <api-key>" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    if (!token || !token.startsWith("vk_")) {
      return NextResponse.json(
        { error: "Invalid API key format" },
        { status: 401 }
      );
    }

    // Hash the token and look up the key
    const keyHash = hashApiKey(token);
    const apiKey = await db.apiKey.findFirst({
      where: { keyHash, siteId },
      select: { id: true, siteId: true },
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }

    // Rate limit by IP
    const ip = getClientIp(req);
    const rl = rateLimit(`public-api:${ip}`, "read");
    if (!rl.success) return rateLimitResponse(rl);

    // Update lastUsedAt fire-and-forget
    db.apiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((err: unknown) => {
        logger.warn("public-api", `Failed to update lastUsedAt for key ${apiKey.id}`, err);
      });

    const { searchParams } = new URL(req.url);
    const slugFilter = searchParams.get("slug");

    // Build the where clause
    const where: {
      siteId: string;
      status: "PUBLISHED";
      deletedAt: null;
      slug?: string;
    } = {
      siteId,
      status: "PUBLISHED",
      deletedAt: null,
    };

    if (slugFilter) {
      where.slug = slugFilter;
    }

    const pages = await db.page.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        metaTitle: true,
        ogImage: true,
        isHomepage: true,
        publishedAt: true,
        updatedAt: true,
        blocks: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            type: true,
            content: true,
            settings: true,
            sortOrder: true,
            parentId: true,
          },
        },
        pageTags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    // Transform pageTags into a flat tags array for cleaner API output
    const result = pages.map((page) => ({
      id: page.id,
      title: page.title,
      slug: page.slug,
      description: page.description,
      metaTitle: page.metaTitle,
      ogImage: page.ogImage,
      isHomepage: page.isHomepage,
      publishedAt: page.publishedAt,
      updatedAt: page.updatedAt,
      tags: page.pageTags.map((pt) => ({
        id: pt.tag.id,
        name: pt.tag.name,
        slug: pt.tag.slug,
      })),
      blocks: page.blocks,
    }));

    return NextResponse.json(result);
  } catch (error) {
    return apiError("GET /api/public/sites/[siteId]/pages", error);
  }
}
