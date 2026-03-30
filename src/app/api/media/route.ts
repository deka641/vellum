import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveUploadedFile, UnsafeFileTypeError } from "@/lib/upload";
import { getImageDimensions, optimizeImage, generateWebpVariant, generateMediumVariant } from "@/lib/image";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";
import { logActivity } from "@/lib/activity";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rawPage = parseInt(searchParams.get("page") || "1", 10);
    const page = isNaN(rawPage) ? 1 : Math.max(1, Math.min(rawPage, 10000));
    const limit = 24;
    const search = (searchParams.get("search")?.trim() || "").slice(0, 200);
    const type = searchParams.get("type") || "";
    const sort = searchParams.get("sort") || "date";
    const order = searchParams.get("order") === "asc" ? "asc" as const : "desc" as const;

    const folder = searchParams.get("folder");

    const where: Prisma.MediaWhereInput = { userId: session.user.id };

    if (folder === "__unfiled__") {
      where.folder = null;
    } else if (folder) {
      where.folder = folder;
    }

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

    const orderByMap: Record<string, Prisma.MediaOrderByWithRelationInput> = {
      date: { createdAt: order },
      name: { filename: order },
      size: { size: order },
    };
    const orderBy = orderByMap[sort] || { createdAt: order };

    const [media, total, folderRecords] = await Promise.all([
      db.media.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.media.count({ where }),
      db.media.findMany({
        where: { userId: session.user.id, folder: { not: null } },
        select: { folder: true },
        distinct: ["folder"],
        orderBy: { folder: "asc" },
      }),
    ]);

    const folders = folderRecords
      .map((r) => r.folder)
      .filter((f): f is string => f !== null);

    return NextResponse.json({
      media,
      total,
      pages: Math.ceil(total / limit),
      page,
      folders,
    });
  } catch (error) {
    return apiError("GET /api/media", error);
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
    const folderRaw = formData.get("folder") as string | null;
    const folder = folderRaw && folderRaw.trim().length > 0 && folderRaw.trim().length <= 100
      ? folderRaw.trim()
      : null;

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
      let webpUrl: string | null = null;
      let mediumUrl: string | null = null;
      if (mimeType.startsWith("image/")) {
        await optimizeImage(filename);
        const [dims, webpFilename, mediumFilename] = await Promise.all([
          getImageDimensions(filename),
          generateWebpVariant(filename),
          generateMediumVariant(filename),
        ]);
        if (dims) {
          width = dims.width;
          height = dims.height;
        }
        if (webpFilename) {
          webpUrl = `/uploads/${webpFilename}`;
        }
        if (mediumFilename) {
          mediumUrl = `/uploads/${mediumFilename}`;
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
          webpUrl,
          mediumUrl,
          folder,
          userId: session.user.id,
        },
      });

      revalidateTag("dashboard", { expire: 0 });
      const userId = session.user.id;
      logActivity({ userId, action: "media.uploaded", details: { filename: media.filename } });
      return NextResponse.json(media, { status: 201 });
    } catch (error) {
      if (error instanceof UnsafeFileTypeError) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      logger.error("POST /api/media", "Upload failed", error);
      return NextResponse.json(
        { error: "Upload failed" },
        { status: 500 }
      );
    }
  } catch (error) {
    return apiError("POST /api/media", error);
  }
}
