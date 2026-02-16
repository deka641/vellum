import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");

    if (!siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 });
    }

    const site = await db.site.findFirst({
      where: { id: siteId, userId: session.user.id },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const pages = await db.page.findMany({
      where: { siteId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(pages);
  } catch (error) {
    console.error("GET /api/pages failed:", error);
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

    const { title, siteId, templateBlocks } = body;

    if (!title || !siteId) {
      return NextResponse.json(
        { error: "Title and siteId are required" },
        { status: 400 }
      );
    }

    const site = await db.site.findFirst({
      where: { id: siteId, userId: session.user.id },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    let slug = slugify(title);
    const existingPage = await db.page.findFirst({
      where: { siteId, slug },
    });
    if (existingPage) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const page = await db.$transaction(async (tx) => {
      const count = await tx.page.count({ where: { siteId } });

      const p = await tx.page.create({
        data: {
          title,
          slug,
          siteId,
          sortOrder: count,
        },
      });

      if (templateBlocks && Array.isArray(templateBlocks)) {
        await tx.block.createMany({
          data: templateBlocks.map((block: { type: string; content?: object; settings?: object; parentId?: string | null }, i: number) => ({
            type: block.type,
            content: (block.content || {}) as Prisma.InputJsonValue,
            settings: (block.settings || {}) as Prisma.InputJsonValue,
            sortOrder: i,
            pageId: p.id,
            parentId: block.parentId || null,
          })),
        });
      }

      return p;
    });

    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    console.error("POST /api/pages failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
