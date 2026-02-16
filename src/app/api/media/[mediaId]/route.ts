import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { unlink } from "fs/promises";
import path from "path";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mediaId } = await params;
  const { alt } = await req.json();

  const media = await db.media.findFirst({
    where: { id: mediaId, userId: session.user.id },
  });

  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.media.update({
    where: { id: mediaId },
    data: { alt },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mediaId } = await params;

  const media = await db.media.findFirst({
    where: { id: mediaId, userId: session.user.id },
  });

  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete file from disk
  try {
    const filepath = path.join(process.cwd(), "public", media.url);
    await unlink(filepath);
  } catch {
    // File may already be deleted
  }

  await db.media.delete({ where: { id: mediaId } });

  return NextResponse.json({ success: true });
}
