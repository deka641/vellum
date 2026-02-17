import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import { apiError } from "@/lib/api-helpers";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const EXTENSION_TO_CONTENT_TYPE: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Reject path traversal attempts
  if (
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\") ||
    filename.includes("\0")
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check extension allowlist
  const ext = path.extname(filename).toLowerCase();
  const contentType = EXTENSION_TO_CONTENT_TYPE[ext];
  if (!contentType) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Resolve and verify path stays within UPLOAD_DIR
  const filePath = path.resolve(UPLOAD_DIR, filename);
  if (!filePath.startsWith(UPLOAD_DIR + path.sep)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const [fileBuffer, fileStat] = await Promise.all([
      readFile(filePath),
      stat(filePath),
    ]);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileStat.size.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return apiError("GET /api/uploads/[filename]", error);
  }
}
