import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

const BATCH_SIZE = 500;

function escapeCsv(value: string): string {
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
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
    const rl = rateLimit(`submissions-export:${userId}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { siteId } = await params;

    const site = await db.site.findFirst({
      where: { id: siteId, userId },
      select: { id: true },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const pageIdFilter = searchParams.get("pageId");

    const where = {
      page: {
        siteId,
        ...(pageIdFilter ? { id: pageIdFilter } : {}),
      },
    };

    // Check if there are any submissions
    const count = await db.formSubmission.count({ where });
    if (count === 0) {
      return new Response("No submissions found", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Pass 1: Collect all field keys (only keys, not data — O(1) memory per row)
    const allKeys = new Set<string>();
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const batch = await db.formSubmission.findMany({
        where,
        orderBy: { id: "asc" },
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        select: { id: true, data: true },
      });

      for (const sub of batch) {
        const data = sub.data as Record<string, string>;
        Object.keys(data).forEach((k) => allKeys.add(k));
      }

      hasMore = batch.length === BATCH_SIZE;
      if (batch.length > 0) cursor = batch[batch.length - 1].id;
    }

    const keysArray = Array.from(allKeys);
    const headers = ["Page", "Date", ...keysArray];
    const encoder = new TextEncoder();

    // Pass 2: Stream rows directly without accumulating in memory
    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(headers.map(escapeCsv).join(",") + "\n"));

          let streamCursor: string | undefined;
          let streamHasMore = true;

          while (streamHasMore) {
            const batch = await db.formSubmission.findMany({
              where,
              orderBy: { id: "asc" },
              take: BATCH_SIZE,
              ...(streamCursor ? { skip: 1, cursor: { id: streamCursor } } : {}),
              select: {
                id: true,
                data: true,
                createdAt: true,
                page: { select: { title: true } },
              },
            });

            for (const sub of batch) {
              const data = sub.data as Record<string, string>;
              const csvRow = [
                sub.page.title,
                new Date(sub.createdAt).toISOString(),
                ...keysArray.map((k) => data[k] || ""),
              ];
              controller.enqueue(encoder.encode(csvRow.map(escapeCsv).join(",") + "\n"));
            }

            streamHasMore = batch.length === BATCH_SIZE;
            if (batch.length > 0) streamCursor = batch[batch.length - 1].id;
          }

          controller.close();
        } catch (err) {
          logger.error("GET /api/sites/[siteId]/submissions/export", "CSV stream error", err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="submissions-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    return apiError("GET /api/sites/[siteId]/submissions/export", error);
  }
}
