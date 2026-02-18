import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api-helpers";
import { parseBody, updateSiteSchema } from "@/lib/validations";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { sanitizeUrl } from "@/lib/sanitize";
import { logger } from "@/lib/logger";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { siteId } = await params;

    const site = await db.site.findFirst({
      where: { id: siteId, userId: session.user.id },
      include: {
        pages: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(site);
  } catch (error) {
    return apiError("GET /api/sites/[siteId]", error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`sites-mut:${session.user.id}`, "mutation");
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

    const parsed = parseBody(updateSiteSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const site = await db.site.findFirst({
      where: { id: siteId, userId: session.user.id },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await db.site.update({
      where: { id: siteId },
      data: {
        name: parsed.data.name ?? site.name,
        description: parsed.data.description ?? site.description,
        ...(parsed.data.theme !== undefined && { theme: parsed.data.theme }),
        ...(parsed.data.favicon !== undefined && { favicon: parsed.data.favicon ? sanitizeUrl(parsed.data.favicon) : parsed.data.favicon }),
        ...(parsed.data.footer !== undefined && { footer: parsed.data.footer }),
      },
    });

    try {
      revalidatePath(`/s/${site.slug}`, "layout");
    } catch (err) { logger.warn("revalidation", "Site update revalidation failed:", err); }

    return NextResponse.json(updated);
  } catch (error) {
    return apiError("PATCH /api/sites/[siteId]", error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`sites-mut:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { siteId } = await params;

    const site = await db.site.findFirst({
      where: { id: siteId, userId: session.user.id },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.site.delete({ where: { id: siteId } });

    revalidateTag("dashboard", { expire: 0 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError("DELETE /api/sites/[siteId]", error);
  }
}
