import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseBody, updateNavigationSchema } from "@/lib/validations";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`nav-mut:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { siteId } = await params;

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = parseBody(updateNavigationSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const site = await db.site.findFirst({
      where: { id: siteId, userId: session.user.id },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.$transaction(
      parsed.data.pages.map((page) =>
        db.page.updateMany({
          where: { id: page.id, siteId },
          data: { sortOrder: page.sortOrder, showInNav: page.showInNav },
        })
      )
    );

    const updatedPages = await db.page.findMany({
      where: { siteId },
      orderBy: { sortOrder: "asc" },
    });

    try {
      revalidatePath(`/s/${site.slug}`, "layout");
    } catch { /* revalidation failure is non-fatal */ }

    return NextResponse.json({ pages: updatedPages });
  } catch (error) {
    console.error("PATCH /api/sites/[siteId]/navigation failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
