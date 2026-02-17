import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseBody, updatePageSchema } from "@/lib/validations";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";

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

    const page = await db.page.findFirst({
      where: {
        id: pageId,
        deletedAt: null,
        site: { userId: session.user.id },
      },
      include: {
        blocks: { orderBy: { sortOrder: "asc" } },
        site: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!page) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(page);
  } catch (error) {
    return apiError("GET /api/pages/[pageId]", error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`pages-mut:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { pageId } = await params;

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = parseBody(updatePageSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const page = await db.page.findFirst({
      where: {
        id: pageId,
        site: { userId: session.user.id },
      },
    });

    if (!page) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Handle slug changes
    const updateData: { title: string; description: string | null; slug?: string } = {
      title: parsed.data.title ?? page.title,
      description: parsed.data.description ?? page.description,
    };

    if (parsed.data.slug !== undefined) {
      if (page.isHomepage) {
        return NextResponse.json(
          { error: "Cannot change the slug of a homepage" },
          { status: 400 }
        );
      }

      if (parsed.data.slug !== page.slug) {
        const existing = await db.page.findFirst({
          where: {
            siteId: page.siteId,
            slug: parsed.data.slug,
            id: { not: pageId },
          },
        });
        if (existing) {
          return NextResponse.json(
            { error: "A page with this slug already exists in this site" },
            { status: 409 }
          );
        }
        updateData.slug = parsed.data.slug;
      }
    }

    const updated = await db.page.update({
      where: { id: pageId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return apiError("PATCH /api/pages/[pageId]", error);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`pages-mut:${session.user.id}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const { pageId } = await params;
    const { searchParams } = new URL(req.url);
    const permanent = searchParams.get("permanent") === "true";

    const page = await db.page.findFirst({
      where: {
        id: pageId,
        site: { userId: session.user.id },
      },
    });

    if (!page) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (page.isHomepage) {
      return NextResponse.json(
        { error: "Cannot delete the homepage. Set another page as the homepage first." },
        { status: 400 }
      );
    }

    if (permanent) {
      await db.page.delete({ where: { id: pageId } });
    } else {
      await db.page.update({
        where: { id: pageId },
        data: { deletedAt: new Date(), status: "DRAFT" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError("DELETE /api/pages/[pageId]", error);
  }
}
