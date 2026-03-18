import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateId } from "@/lib/utils";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pageId } = await params;

    const rl = rateLimit(`preview-token:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const page = await db.page.findFirst({
      where: { id: pageId, site: { userId: session.user.id } },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const token = generateId();
    await db.page.update({
      where: { id: pageId },
      data: { previewToken: token },
    });

    return NextResponse.json({ token });
  } catch (error) {
    return apiError("POST /api/pages/[pageId]/preview-token", error);
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pageId } = await params;

    const rl = rateLimit(`preview-token-get:${session.user.id}`, "read");
    if (!rl.success) return rateLimitResponse(rl);

    const page = await db.page.findFirst({
      where: { id: pageId, site: { userId: session.user.id } },
      select: { previewToken: true },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({ token: page.previewToken });
  } catch (error) {
    return apiError("GET /api/pages/[pageId]/preview-token", error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pageId } = await params;

    const rl = rateLimit(`preview-token:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const page = await db.page.findFirst({
      where: { id: pageId, site: { userId: session.user.id } },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    await db.page.update({
      where: { id: pageId },
      data: { previewToken: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError("DELETE /api/pages/[pageId]/preview-token", error);
  }
}
