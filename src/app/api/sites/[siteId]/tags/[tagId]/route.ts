import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseBody, updateTagSchema } from "@/lib/validations";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";
import { slugify } from "@/lib/utils";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ siteId: string; tagId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const rl = rateLimit(`tags:${userId}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { siteId, tagId } = await params;

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseBody(updateTagSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const site = await db.site.findFirst({
      where: { id: siteId, userId },
      select: { id: true },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const tag = await db.tag.findFirst({
      where: { id: tagId, siteId },
    });

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    const newSlug = slugify(parsed.data.name);
    if (!newSlug) {
      return NextResponse.json({ error: "Tag name must contain at least one alphanumeric character" }, { status: 400 });
    }

    // Check slug uniqueness if changed
    if (newSlug !== tag.slug) {
      const existing = await db.tag.findUnique({
        where: { siteId_slug: { siteId, slug: newSlug } },
      });
      if (existing) {
        return NextResponse.json({ error: "A tag with this name already exists" }, { status: 409 });
      }
    }

    const updated = await db.tag.update({
      where: { id: tagId },
      data: {
        name: parsed.data.name.trim(),
        slug: newSlug,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return apiError("PATCH /api/sites/[siteId]/tags/[tagId]", error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ siteId: string; tagId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const rl = rateLimit(`tags:${userId}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { siteId, tagId } = await params;

    const site = await db.site.findFirst({
      where: { id: siteId, userId },
      select: { id: true },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.tag.deleteMany({
      where: { id: tagId, siteId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError("DELETE /api/sites/[siteId]/tags/[tagId]", error);
  }
}
