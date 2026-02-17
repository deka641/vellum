import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

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

    const submissions = await db.formSubmission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        data: true,
        createdAt: true,
        page: { select: { title: true } },
      },
    });

    if (submissions.length === 0) {
      return new Response("No submissions found", { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    // Collect all field keys
    const allKeys = new Set<string>();
    for (const sub of submissions) {
      const data = sub.data as Record<string, string>;
      Object.keys(data).forEach((k) => allKeys.add(k));
    }

    const headers = ["Page", "Date", ...Array.from(allKeys)];

    function escapeCsv(value: string): string {
      const str = String(value);
      if (str.includes('"') || str.includes(",") || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }

    const rows = submissions.map((sub) => {
      const data = sub.data as Record<string, string>;
      const row = [
        sub.page.title,
        new Date(sub.createdAt).toISOString(),
        ...Array.from(allKeys).map((k) => data[k] || ""),
      ];
      return row.map(escapeCsv).join(",");
    });

    const csv = [headers.map(escapeCsv).join(","), ...rows].join("\n");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="submissions-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/sites/[siteId]/submissions/export failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
