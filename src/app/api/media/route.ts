import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveUploadedFile } from "@/lib/upload";
import { getImageDimensions, optimizeImage } from "@/lib/image";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 24;

  const [media, total] = await Promise.all([
    db.media.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.media.count({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({
    media,
    total,
    pages: Math.ceil(total / limit),
    page,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: "File too large (max 10MB)" },
      { status: 400 }
    );
  }

  try {
    const { filename, url, size, mimeType } = await saveUploadedFile(file);

    // Get image dimensions if applicable
    let width: number | null = null;
    let height: number | null = null;
    if (mimeType.startsWith("image/")) {
      await optimizeImage(filename);
      const dims = await getImageDimensions(filename);
      if (dims) {
        width = dims.width;
        height = dims.height;
      }
    }

    const media = await db.media.create({
      data: {
        filename,
        mimeType,
        size,
        width,
        height,
        url,
        userId: session.user.id,
      },
    });

    return NextResponse.json(media, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
