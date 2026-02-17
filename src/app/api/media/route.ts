import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveUploadedFile, UnsafeFileTypeError } from "@/lib/upload";
import { getImageDimensions, optimizeImage } from "@/lib/image";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 24;
    const search = searchParams.get("search")?.trim() || "";
    const type = searchParams.get("type") || "";

    const where: Prisma.MediaWhereInput = { userId: session.user.id };

    if (search) {
      where.OR = [
        { filename: { contains: search, mode: "insensitive" } },
        { alt: { contains: search, mode: "insensitive" } },
      ];
    }

    if (type === "images") {
      where.mimeType = { startsWith: "image/" };
    } else if (type === "videos") {
      where.mimeType = { startsWith: "video/" };
    } else if (type === "documents") {
      where.NOT = [
        { mimeType: { startsWith: "image/" } },
        { mimeType: { startsWith: "video/" } },
      ];
    }

    const [media, total] = await Promise.all([
      db.media.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.media.count({ where }),
    ]);

    return NextResponse.json({
      media,
      total,
      pages: Math.ceil(total / limit),
      page,
    });
  } catch (error) {
    console.error("GET /api/media failed:", error);
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

    const rl = rateLimit(`media-upload:${session.user.id}`, "upload");
    if (!rl.success) return rateLimitResponse(rl);

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
    } catch (error) {
      if (error instanceof UnsafeFileTypeError) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      console.error("POST /api/media upload failed:", error);
      return NextResponse.json(
        { error: "Upload failed" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("POST /api/media failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
