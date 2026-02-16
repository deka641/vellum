import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function GET(req: Request) {
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
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, siteId, templateBlocks } = await req.json();

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

  const pageCount = await db.page.count({ where: { siteId } });

  const page = await db.page.create({
    data: {
      title,
      slug,
      siteId,
      sortOrder: pageCount,
    },
  });

  // If template blocks provided, create them
  if (templateBlocks && Array.isArray(templateBlocks)) {
    for (let i = 0; i < templateBlocks.length; i++) {
      const block = templateBlocks[i];
      await db.block.create({
        data: {
          type: block.type,
          content: block.content || {},
          settings: block.settings || {},
          sortOrder: i,
          pageId: page.id,
          parentId: block.parentId || null,
        },
      });
    }
  }

  return NextResponse.json(page, { status: 201 });
}
