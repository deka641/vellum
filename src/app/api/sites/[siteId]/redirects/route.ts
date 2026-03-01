import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseBody, createRedirectSchema } from "@/lib/validations";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";

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
      select: { id: true },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const redirects = await db.redirect.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(redirects);
  } catch (error) {
    return apiError("GET /api/sites/[siteId]/redirects", error);
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
    const rl = rateLimit(`redirects:${userId}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { siteId } = await params;

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseBody(createRedirectSchema, body);
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

    // Check if fromPath matches an existing page slug (warn but don't block)
    const redirect = await db.redirect.upsert({
      where: {
        siteId_fromPath: {
          siteId,
          fromPath: parsed.data.fromPath,
        },
      },
      update: {
        toPath: parsed.data.toPath,
        permanent: parsed.data.permanent,
      },
      create: {
        siteId,
        fromPath: parsed.data.fromPath,
        toPath: parsed.data.toPath,
        permanent: parsed.data.permanent,
      },
    });

    return NextResponse.json(redirect, { status: 201 });
  } catch (error) {
    return apiError("POST /api/sites/[siteId]/redirects", error);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const rl = rateLimit(`redirects:${userId}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { siteId } = await params;
    const { searchParams } = new URL(req.url);
    const redirectId = searchParams.get("id");

    if (!redirectId) {
      return NextResponse.json({ error: "Redirect ID required" }, { status: 400 });
    }

    const site = await db.site.findFirst({
      where: { id: siteId, userId },
      select: { id: true },
    });

    if (!site) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.redirect.deleteMany({
      where: { id: redirectId, siteId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError("DELETE /api/sites/[siteId]/redirects", error);
  }
}
