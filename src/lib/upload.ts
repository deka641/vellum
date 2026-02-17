import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { generateId } from "./utils";

export function safeMediaFilePath(url: string): string | null {
  const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
  const resolved = path.resolve(process.cwd(), "public", url.startsWith("/") ? url.slice(1) : url);
  if (!resolved.startsWith(uploadsDir + path.sep)) return null;
  return resolved;
}

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif",
  ".mp4", ".webm",
  ".pdf",
]);

const ALLOWED_MIME_PREFIXES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/avif",
  "video/mp4", "video/webm",
  "application/pdf",
];

export class UnsafeFileTypeError extends Error {
  constructor(ext: string) {
    super(`File type "${ext}" is not allowed`);
    this.name = "UnsafeFileTypeError";
  }
}

export async function saveUploadedFile(
  file: File
): Promise<{ filename: string; url: string; size: number; mimeType: string }> {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = path.extname(file.name).toLowerCase() || ".bin";
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new UnsafeFileTypeError(ext);
  }
  if (!ALLOWED_MIME_PREFIXES.includes(file.type)) {
    throw new UnsafeFileTypeError(ext);
  }

  const filename = `${generateId()}-${Date.now()}${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filepath, buffer);

  return {
    filename,
    url: `/uploads/${filename}`,
    size: buffer.length,
    mimeType: file.type,
  };
}
