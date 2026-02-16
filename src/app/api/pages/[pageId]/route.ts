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
    where: {
      id: pageId,
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
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pageId } = await params;
  const data = await req.json();

  const page = await db.page.findFirst({
    where: {
      id: pageId,
      site: { userId: session.user.id },
    },
  });

  if (!page) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.page.update({
    where: { id: pageId },
    data: {
      title: data.title ?? page.title,
      description: data.description ?? page.description,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pageId } = await params;

  const page = await db.page.findFirst({
    where: {
      id: pageId,
      site: { userId: session.user.id },
    },
  });

  if (!page) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.page.delete({ where: { id: pageId } });

  return NextResponse.json({ success: true });
}
