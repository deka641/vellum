import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseBody, createTagSchema } from "@/lib/validations";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";
import { slugify } from "@/lib/utils";

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

    const rl = rateLimit(`tags-read:${session.user.id}`, "read");
    if (!rl.success) return rateLimitResponse(rl);

    const site = await db.site.findFirst({
      where: { id: siteId, userId: session.user.id },
      select: { id: true },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const tags = await db.tag.findMany({
      where: { siteId },
      include: { _count: { select: { pageTags: true } } },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(tags);
  } catch (error) {
    return apiError("GET /api/sites/[siteId]/tags", error);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const rl = rateLimit(`tags:${userId}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { siteId } = await params;

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseBody(createTagSchema, body);
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

    // Check tag count limit (max 50 per site)
    const tagCount = await db.tag.count({ where: { siteId } });
    if (tagCount >= 50) {
      return NextResponse.json({ error: "Maximum 50 tags per site" }, { status: 400 });
    }

    const slug = slugify(parsed.data.name);
    if (!slug) {
      return NextResponse.json({ error: "Tag name must contain at least one alphanumeric character" }, { status: 400 });
    }

    // Check uniqueness
    const existing = await db.tag.findUnique({
      where: { siteId_slug: { siteId, slug } },
    });
    if (existing) {
      return NextResponse.json({ error: "A tag with this name already exists" }, { status: 409 });
    }

    const tag = await db.tag.create({
      data: {
        name: parsed.data.name.trim(),
        slug,
        siteId,
      },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    return apiError("POST /api/sites/[siteId]/tags", error);
  }
}
