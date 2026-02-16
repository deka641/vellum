import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { generateId } from "./utils";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function saveUploadedFile(
  file: File
): Promise<{ filename: string; url: string; size: number; mimeType: string }> {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = path.extname(file.name) || ".bin";
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
