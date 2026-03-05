import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

import { saveUploadedFile, UnsafeFileTypeError } from "@/lib/upload";

// Helper to create a File-like object with specific bytes
function createTestFile(
  name: string,
  mimeType: string,
  bytes: number[]
): File {
  const buffer = new Uint8Array(bytes);
  return new File([buffer], name, { type: mimeType });
}

// Magic byte sequences for valid files
const JPEG_BYTES = [0xFF, 0xD8, 0xFF, 0xE0, ...Array(100).fill(0)];
const PNG_BYTES = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, ...Array(100).fill(0)];
const GIF_BYTES = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, ...Array(100).fill(0)];
// RIFF....WEBP
const WEBP_BYTES = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, ...Array(100).fill(0)];
// %PDF-
const PDF_BYTES = [0x25, 0x50, 0x44, 0x46, 0x2D, ...Array(100).fill(0)];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("saveUploadedFile", () => {
  describe("valid magic bytes accepted", () => {
    it("accepts JPEG with correct magic bytes (FF D8 FF)", async () => {
      const file = createTestFile("photo.jpg", "image/jpeg", JPEG_BYTES);
      const result = await saveUploadedFile(file);
      expect(result.url).toMatch(/^\/uploads\/.+\.jpg$/);
      expect(result.mimeType).toBe("image/jpeg");
      expect(result.size).toBe(file.size);
    });

    it("accepts JPEG with .jpeg extension", async () => {
      const file = createTestFile("photo.jpeg", "image/jpeg", JPEG_BYTES);
      const result = await saveUploadedFile(file);
      expect(result.url).toMatch(/\.jpeg$/);
    });

    it("accepts PNG with correct magic bytes (89 50 4E 47...)", async () => {
      const file = createTestFile("image.png", "image/png", PNG_BYTES);
      const result = await saveUploadedFile(file);
      expect(result.url).toMatch(/\.png$/);
      expect(result.mimeType).toBe("image/png");
    });

    it("accepts GIF with correct magic bytes (47 49 46 38)", async () => {
      const file = createTestFile("anim.gif", "image/gif", GIF_BYTES);
      const result = await saveUploadedFile(file);
      expect(result.url).toMatch(/\.gif$/);
    });

    it("accepts WebP with correct magic bytes (RIFF...WEBP)", async () => {
      const file = createTestFile("photo.webp", "image/webp", WEBP_BYTES);
      const result = await saveUploadedFile(file);
      expect(result.url).toMatch(/\.webp$/);
    });

    it("accepts PDF with correct magic bytes (%PDF-)", async () => {
      const file = createTestFile("doc.pdf", "application/pdf", PDF_BYTES);
      const result = await saveUploadedFile(file);
      expect(result.url).toMatch(/\.pdf$/);
    });
  });

  describe("mismatched magic bytes rejected", () => {
    it("rejects PNG bytes with .jpg extension", async () => {
      const file = createTestFile("fake.jpg", "image/jpeg", PNG_BYTES);
      await expect(saveUploadedFile(file)).rejects.toThrow(UnsafeFileTypeError);
    });

    it("rejects JPEG bytes with .png extension", async () => {
      const file = createTestFile("fake.png", "image/png", JPEG_BYTES);
      await expect(saveUploadedFile(file)).rejects.toThrow(UnsafeFileTypeError);
    });

    it("rejects GIF bytes with .jpg extension", async () => {
      const file = createTestFile("fake.jpg", "image/jpeg", GIF_BYTES);
      await expect(saveUploadedFile(file)).rejects.toThrow(UnsafeFileTypeError);
    });

    it("rejects PDF bytes with .png extension", async () => {
      const file = createTestFile("fake.png", "image/png", PDF_BYTES);
      await expect(saveUploadedFile(file)).rejects.toThrow(UnsafeFileTypeError);
    });
  });

  describe("garbage and empty data rejected", () => {
    it("rejects file with valid extension but garbage bytes", async () => {
      const garbage = Array(100).fill(0x42); // all 'B'
      const file = createTestFile("bad.jpg", "image/jpeg", garbage);
      await expect(saveUploadedFile(file)).rejects.toThrow(UnsafeFileTypeError);
    });

    it("rejects empty file", async () => {
      const file = createTestFile("empty.jpg", "image/jpeg", []);
      await expect(saveUploadedFile(file)).rejects.toThrow(UnsafeFileTypeError);
    });

    it("rejects file with only 1 byte", async () => {
      const file = createTestFile("tiny.png", "image/png", [0x89]);
      await expect(saveUploadedFile(file)).rejects.toThrow(UnsafeFileTypeError);
    });
  });

  describe("disallowed extensions and MIME types", () => {
    it("rejects .svg extension", async () => {
      const svgBytes = Array.from(Buffer.from("<svg></svg>"));
      const file = createTestFile("icon.svg", "image/svg+xml", svgBytes);
      await expect(saveUploadedFile(file)).rejects.toThrow(UnsafeFileTypeError);
    });

    it("rejects .html extension", async () => {
      const htmlBytes = Array.from(Buffer.from("<html></html>"));
      const file = createTestFile("page.html", "text/html", htmlBytes);
      await expect(saveUploadedFile(file)).rejects.toThrow(UnsafeFileTypeError);
    });

    it("rejects .exe extension", async () => {
      const file = createTestFile("virus.exe", "application/octet-stream", [0x4D, 0x5A]);
      await expect(saveUploadedFile(file)).rejects.toThrow(UnsafeFileTypeError);
    });

    it("rejects valid bytes but wrong MIME type", async () => {
      const file = createTestFile("photo.jpg", "text/plain", JPEG_BYTES);
      await expect(saveUploadedFile(file)).rejects.toThrow(UnsafeFileTypeError);
    });
  });

  describe("return value structure", () => {
    it("returns filename, url, size, and mimeType", async () => {
      const file = createTestFile("test.png", "image/png", PNG_BYTES);
      const result = await saveUploadedFile(file);
      expect(result).toHaveProperty("filename");
      expect(result).toHaveProperty("url");
      expect(result).toHaveProperty("size");
      expect(result).toHaveProperty("mimeType");
      expect(typeof result.filename).toBe("string");
      expect(result.filename.length).toBeGreaterThan(0);
    });

    it("generates unique filenames", async () => {
      const file1 = createTestFile("a.jpg", "image/jpeg", JPEG_BYTES);
      const file2 = createTestFile("a.jpg", "image/jpeg", JPEG_BYTES);
      const r1 = await saveUploadedFile(file1);
      const r2 = await saveUploadedFile(file2);
      expect(r1.filename).not.toBe(r2.filename);
    });
  });
});
