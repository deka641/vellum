import sharp from "sharp";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function getImageDimensions(
  filename: string
): Promise<{ width: number; height: number } | null> {
  try {
    const filepath = path.join(UPLOAD_DIR, filename);
    const metadata = await sharp(filepath).metadata();
    if (metadata.width && metadata.height) {
      return { width: metadata.width, height: metadata.height };
    }
  } catch {
    // Not an image or processing failed
  }
  return null;
}

export async function optimizeImage(filename: string): Promise<void> {
  try {
    const filepath = path.join(UPLOAD_DIR, filename);
    const ext = path.extname(filename).toLowerCase();

    if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
      let pipeline = sharp(filepath)
        .rotate() // auto-orient from EXIF, then strip metadata
        .resize(1920, 1920, { fit: "inside", withoutEnlargement: true });

      if (ext === ".jpg" || ext === ".jpeg") {
        pipeline = pipeline.jpeg({ quality: 85, progressive: true });
      } else if (ext === ".webp") {
        pipeline = pipeline.webp({ quality: 82 });
      } else if (ext === ".png") {
        pipeline = pipeline.png({ compressionLevel: 9 });
      }

      const buffer = await pipeline.toBuffer();
      const fs = await import("fs/promises");
      await fs.writeFile(filepath, buffer);
    }
  } catch {
    // Optimization failed, keep original
  }
}
