import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { unlink } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveUploadedFile, UnsafeFileTypeError, safeMediaFilePath } from "@/lib/upload";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const AVATAR_MAX_DIMENSION = 256;
const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

async function optimizeAvatar(filename: string): Promise<void> {
  const filepath = path.join(UPLOAD_DIR, filename);
  const ext = path.extname(filename).toLowerCase();

  let pipeline = sharp(filepath)
    .rotate()
    .resize(AVATAR_MAX_DIMENSION, AVATAR_MAX_DIMENSION, {
      fit: "cover",
      position: "centre",
    });

  if (ext === ".jpg" || ext === ".jpeg") {
    pipeline = pipeline.jpeg({ quality: 85, progressive: true });
  } else if (ext === ".webp") {
    pipeline = pipeline.webp({ quality: 82 });
  } else if (ext === ".png") {
    pipeline = pipeline.png({ compressionLevel: 9 });
  } else if (ext === ".gif") {
    // For GIF, convert to static frame (first frame) as PNG for consistency
    pipeline = pipeline.png({ compressionLevel: 9 });
  }

  const buffer = await pipeline.toBuffer();
  const fs = await import("fs/promises");
  await fs.writeFile(filepath, buffer);
}

function deleteFileQuietly(url: string): void {
  const filepath = safeMediaFilePath(url);
  if (!filepath) return;
  unlink(filepath).catch((err: unknown) => {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      logger.warn("avatar", "Failed to delete old avatar file (orphaned)", err);
    }
  });
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const rl = rateLimit(`avatar-upload:${userId}`, "upload");
    if (!rl.success) return rateLimitResponse(rl);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_AVATAR_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 5MB)" },
        { status: 400 }
      );
    }

    if (!ALLOWED_IMAGE_MIMES.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, GIF, and WebP images are allowed" },
        { status: 400 }
      );
    }

    try {
      const { filename, url } = await saveUploadedFile(file);

      // Resize to 256x256 max (cover crop)
      await optimizeAvatar(filename);

      // Delete old avatar file if it exists
      const currentUser = await db.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true },
      });
      if (currentUser?.avatarUrl) {
        deleteFileQuietly(currentUser.avatarUrl);
      }

      const updated = await db.user.update({
        where: { id: userId },
        data: { avatarUrl: url },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      });

      revalidateTag("dashboard", { expire: 0 });

      return NextResponse.json(updated);
    } catch (error) {
      if (error instanceof UnsafeFileTypeError) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      logger.error("POST /api/user/avatar", "Avatar upload failed", error);
      return NextResponse.json(
        { error: "Upload failed" },
        { status: 500 }
      );
    }
  } catch (error) {
    return apiError("POST /api/user/avatar", error);
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const rl = rateLimit(`avatar-mut:${userId}`, "mutation");
    if (!rl.success) return rateLimitResponse(rl);

    const currentUser = await db.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (!currentUser?.avatarUrl) {
      return NextResponse.json({ error: "No avatar to remove" }, { status: 404 });
    }

    // Update DB first (safe ordering: orphaned files are harmless)
    const updated = await db.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    });

    // Then delete the file
    deleteFileQuietly(currentUser.avatarUrl);

    revalidateTag("dashboard", { expire: 0 });

    return NextResponse.json(updated);
  } catch (error) {
    return apiError("DELETE /api/user/avatar", error);
  }
}
