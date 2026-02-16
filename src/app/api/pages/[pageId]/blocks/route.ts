import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pageId } = await params;

  const page = await db.page.findFirst({
    where: { id: pageId, site: { userId: session.user.id } },
    include: { blocks: { orderBy: { sortOrder: "asc" } } },
  });

  if (!page) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(page.blocks);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pageId } = await params;
  const { blocks, title } = await req.json();

  const page = await db.page.findFirst({
    where: { id: pageId, site: { userId: session.user.id } },
  });

  if (!page) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Update title if provided
  if (title !== undefined) {
    await db.page.update({
      where: { id: pageId },
      data: { title },
    });
  }

  // Delete all existing blocks and recreate
  await db.block.deleteMany({ where: { pageId } });

  if (blocks && Array.isArray(blocks)) {
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      await db.block.create({
        data: {
          id: block.id,
          type: block.type,
          content: block.content,
          settings: block.settings || {},
          sortOrder: i,
          pageId,
          parentId: block.parentId || null,
        },
      });
    }
  }

  return NextResponse.json({ success: true });
}
