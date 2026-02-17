import { NextResponse } from "next/server";
import sanitize from "sanitize-html";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId: blockId } = await params;

    const ip = getClientIp(req);
    const rl = rateLimit(`form-submit:${ip}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { data, pageId, _hp } = body as { data: Record<string, unknown>; pageId: string; _hp?: string };

    if (!data || typeof data !== "object" || !pageId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Honeypot spam check — silently succeed without storing
    if (_hp) {
      return NextResponse.json({ id: "ok" }, { status: 201 });
    }

    // Verify the page exists and is published
    const page = await db.page.findFirst({
      where: { id: pageId, status: "PUBLISHED" },
    });

    if (!page) {
      return NextResponse.json(
        { error: "Page not found" },
        { status: 404 }
      );
    }

    // Sanitize all values
    const sanitizedData: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === "string") {
        sanitizedData[key] = sanitize(value, {
          allowedTags: [],
          allowedAttributes: {},
        });
      }
    }

    const submission = await db.formSubmission.create({
      data: {
        pageId,
        blockId,
        data: sanitizedData,
      },
    });

    return NextResponse.json({ id: submission.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/forms/[formId] failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { formId: blockId } = await params;

    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get("pageId");

    if (!pageId) {
      return NextResponse.json({ error: "Missing pageId" }, { status: 400 });
    }

    // Verify page belongs to the authenticated user
    const page = await db.page.findFirst({
      where: { id: pageId, site: { userId: session.user.id } },
    });

    if (!page) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const submissions = await db.formSubmission.findMany({
      where: { blockId, pageId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error("GET /api/forms/[formId] failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
