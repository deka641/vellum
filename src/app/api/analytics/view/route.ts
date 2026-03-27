import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (
      !body ||
      typeof body !== "object" ||
      !("siteId" in body) ||
      typeof (body as Record<string, unknown>).siteId !== "string" ||
      !("path" in body) ||
      typeof (body as Record<string, unknown>).path !== "string"
    ) {
      return NextResponse.json(
        { error: "siteId and path are required" },
        { status: 400 }
      );
    }

    const {
      siteId,
      pageId,
      path,
      referrer,
    } = body as {
      siteId: string;
      pageId?: string;
      path: string;
      referrer?: string;
    };

    // Rate limit by IP + site + path to prevent abuse
    const rl = rateLimit(`analytics:${ip}:${siteId}:${path}`, "read");
    if (!rl.success) return rateLimitResponse(rl);

    // Validate siteId format (cuid is alphanumeric, ~25 chars)
    if (siteId.length > 30 || !/^[a-z0-9]+$/i.test(siteId)) {
      return NextResponse.json({ error: "Invalid siteId" }, { status: 400 });
    }

    // Truncate values to prevent oversized storage
    const safePath = path.slice(0, 200);
    const safeReferrer = referrer ? referrer.slice(0, 500) : null;
    const safePageId =
      pageId && typeof pageId === "string" && pageId.length <= 30
        ? pageId
        : null;

    // Fire-and-forget DB write: verify site exists and create view in one go
    db.site
      .findUnique({ where: { id: siteId }, select: { id: true } })
      .then((site) => {
        if (!site) return;
        return db.pageView.create({
          data: {
            siteId,
            pageId: safePageId,
            path: safePath,
            referrer: safeReferrer,
          },
        });
      })
      .catch((err) => {
        logger.warn("analytics", `Failed to record page view: ${err}`);
      });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError("POST /api/analytics/view", error);
  }
}
