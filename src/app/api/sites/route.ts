import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { parseBody, createSiteSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sites = await db.site.findMany({
      where: { userId: session.user.id },
      include: {
        _count: { select: { pages: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(sites);
  } catch (error) {
    console.error("GET /api/sites failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = parseBody(createSiteSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { name, description } = parsed.data;

    const userId = session.user.id;

    let slug = slugify(name);

    const existing = await db.site.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const site = await db.$transaction(async (tx) => {
      const s = await tx.site.create({
        data: {
          name,
          slug,
          description: description || null,
          userId,
        },
      });

      await tx.page.create({
        data: {
          title: "Home",
          slug: "home",
          isHomepage: true,
          siteId: s.id,
        },
      });

      return s;
    });

    return NextResponse.json(site, { status: 201 });
  } catch (error) {
    console.error("POST /api/sites failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
