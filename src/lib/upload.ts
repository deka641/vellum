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

// Magic byte signatures for validating actual file content
const MAGIC_BYTES: Array<{ extensions: Set<string>; check: (buf: Buffer) => boolean }> = [
  {
    extensions: new Set([".jpg", ".jpeg"]),
    check: (buf) => buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF,
  },
  {
    extensions: new Set([".png"]),
    check: (buf) => buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47
      && buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A,
  },
  {
    extensions: new Set([".gif"]),
    check: (buf) => buf.length >= 6 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46
      && buf[3] === 0x38 && (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61,
  },
  {
    extensions: new Set([".webp"]),
    check: (buf) => buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
      && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50,
  },
  {
    extensions: new Set([".avif"]),
    check: (buf) => {
      if (buf.length < 12) return false;
      // AVIF is an ISOBMFF container: bytes 4-7 = "ftyp", then brand contains "avif" or "avis"
      const ftyp = buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70;
      if (!ftyp) return false;
      const brand = buf.toString("ascii", 8, 12);
      return brand === "avif" || brand === "avis" || brand === "mif1";
    },
  },
  {
    extensions: new Set([".pdf"]),
    check: (buf) => buf.length >= 5 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46 && buf[4] === 0x2D,
  },
  {
    extensions: new Set([".mp4"]),
    check: (buf) => {
      if (buf.length < 8) return false;
      // MP4 is ISOBMFF: bytes 4-7 = "ftyp"
      return buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70;
    },
  },
  {
    extensions: new Set([".webm"]),
    check: (buf) => buf.length >= 4 && buf[0] === 0x1A && buf[1] === 0x45 && buf[2] === 0xDF && buf[3] === 0xA3,
  },
];

function validateMagicBytes(buffer: Buffer, ext: string): boolean {
  const rule = MAGIC_BYTES.find((r) => r.extensions.has(ext));
  if (!rule) return false;
  return rule.check(buffer);
}

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

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (!validateMagicBytes(buffer, ext)) {
    throw new UnsafeFileTypeError(ext);
  }

  const filename = `${generateId()}-${Date.now()}${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);
  await writeFile(filepath, buffer);

  return {
    filename,
    url: `/uploads/${filename}`,
    size: buffer.length,
    mimeType: file.type,
  };
}
