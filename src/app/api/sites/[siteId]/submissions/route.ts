import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";
import { parseBody } from "@/lib/validations";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { Prisma } from "@prisma/client";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`submissions-get:${session.user.id}`, "read");
    if (!rl.success) return rateLimitResponse(rl);

    const { siteId } = await params;

    // Verify site ownership
    const site = await db.site.findFirst({
      where: { id: siteId, userId: session.user.id },
      select: { id: true },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
    const pageIdFilter = searchParams.get("pageId");
    const searchQuery = searchParams.get("q")?.trim() || "";
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    // Build where clause
    const where: Prisma.FormSubmissionWhereInput = {
      page: {
        siteId,
        ...(pageIdFilter ? { id: pageIdFilter } : {}),
      },
      ...(unreadOnly ? { readAt: null } : {}),
    };

    // If search query provided (min 2 chars), use raw SQL to search JSON data field
    if (searchQuery.length >= 2) {
      const searchPattern = `%${searchQuery}%`;

      // Use raw query for JSON data search + page title search
      const countResult = await db.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint as count
        FROM "FormSubmission" fs
        INNER JOIN "Page" p ON fs."pageId" = p.id
        WHERE p."siteId" = ${siteId}
        ${pageIdFilter ? Prisma.sql`AND p.id = ${pageIdFilter}` : Prisma.empty}
        ${unreadOnly ? Prisma.sql`AND fs."readAt" IS NULL` : Prisma.empty}
        AND (
          p.title ILIKE ${searchPattern}
          OR fs.data::text ILIKE ${searchPattern}
        )
      `;

      const total = Number(countResult[0].count);

      const submissions = await db.$queryRaw<Array<{
        id: string;
        blockId: string;
        data: Prisma.JsonValue;
        readAt: Date | null;
        createdAt: Date;
        pageId: string;
        pageTitle: string;
      }>>`
        SELECT fs.id, fs."blockId", fs.data, fs."readAt", fs."createdAt",
               p.id as "pageId", p.title as "pageTitle"
        FROM "FormSubmission" fs
        INNER JOIN "Page" p ON fs."pageId" = p.id
        WHERE p."siteId" = ${siteId}
        ${pageIdFilter ? Prisma.sql`AND p.id = ${pageIdFilter}` : Prisma.empty}
        ${unreadOnly ? Prisma.sql`AND fs."readAt" IS NULL` : Prisma.empty}
        AND (
          p.title ILIKE ${searchPattern}
          OR fs.data::text ILIKE ${searchPattern}
        )
        ORDER BY fs."createdAt" DESC
        OFFSET ${(page - 1) * pageSize}
        LIMIT ${pageSize}
      `;

      const formattedSubmissions = submissions.map((s) => ({
        id: s.id,
        blockId: s.blockId,
        data: s.data,
        readAt: s.readAt,
        createdAt: s.createdAt,
        page: { id: s.pageId, title: s.pageTitle },
      }));

      return NextResponse.json({
        submissions: formattedSubmissions,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      });
    }

    const [submissions, total] = await db.$transaction([
      db.formSubmission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          blockId: true,
          data: true,
          readAt: true,
          createdAt: true,
          page: { select: { id: true, title: true } },
        },
      }),
      db.formSubmission.count({ where }),
    ]);

    return NextResponse.json({
      submissions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return apiError("GET /api/sites/[siteId]/submissions", error);
  }
}

const bulkDeleteSubmissionsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(50),
});

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`submissions-mut:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { siteId } = await params;

    // Verify site ownership
    const site = await db.site.findFirst({
      where: { id: siteId, userId: session.user.id },
      select: { id: true },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseBody(bulkDeleteSubmissionsSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { ids } = parsed.data;

    // Verify submissions belong to this site
    const submissions = await db.formSubmission.findMany({
      where: { id: { in: ids }, page: { siteId } },
      select: { id: true },
    });

    const validIds = submissions.map((s) => s.id);
    if (validIds.length === 0) {
      return NextResponse.json({ error: "No matching submissions found" }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      await tx.formSubmission.deleteMany({
        where: { id: { in: validIds } },
      });
    });

    revalidateTag("dashboard", { expire: 0 });
    logActivity({
      userId: session.user.id,
      siteId,
      action: "submission.delete",
      details: { count: validIds.length },
    });

    return NextResponse.json({ deleted: validIds.length });
  } catch (error) {
    return apiError("DELETE /api/sites/[siteId]/submissions", error);
  }
}

const bulkReadStatusSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(50),
  action: z.enum(["read", "unread"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`submissions-mut:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { siteId } = await params;

    // Verify site ownership
    const site = await db.site.findFirst({
      where: { id: siteId, userId: session.user.id },
      select: { id: true },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseBody(bulkReadStatusSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { ids, action } = parsed.data;

    // Verify submissions belong to this site
    const submissions = await db.formSubmission.findMany({
      where: { id: { in: ids }, page: { siteId } },
      select: { id: true },
    });

    const validIds = submissions.map((s) => s.id);
    if (validIds.length === 0) {
      return NextResponse.json({ error: "No matching submissions found" }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      await tx.formSubmission.updateMany({
        where: { id: { in: validIds } },
        data: { readAt: action === "read" ? new Date() : null },
      });
    });

    revalidateTag("dashboard", { expire: 0 });

    return NextResponse.json({ updated: validIds.length });
  } catch (error) {
    return apiError("PATCH /api/sites/[siteId]/submissions", error);
  }
}
