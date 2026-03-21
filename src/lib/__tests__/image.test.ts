import { vi, describe, it, expect, beforeEach } from "vitest";

const {
  mockMetadata,
  mockWebp,
  mockResize,
  mockToFile,
  mockToBuffer,
  mockRotate,
  mockJpeg,
  mockPng,
  mockSharp,
  mockWriteFile,
} = vi.hoisted(() => {
  const mockMetadata = vi.fn();
  const mockWebp = vi.fn();
  const mockResize = vi.fn();
  const mockToFile = vi.fn();
  const mockToBuffer = vi.fn();
  const mockRotate = vi.fn();
  const mockJpeg = vi.fn();
  const mockPng = vi.fn();
  const mockWriteFile = vi.fn().mockResolvedValue(undefined);

  function createChain() {
    const chain = {
      metadata: mockMetadata,
      webp: mockWebp,
      resize: mockResize,
      toFile: mockToFile,
      toBuffer: mockToBuffer,
      rotate: mockRotate,
      jpeg: mockJpeg,
      png: mockPng,
    };
    mockWebp.mockReturnValue(chain);
    mockResize.mockReturnValue(chain);
    mockRotate.mockReturnValue(chain);
    mockJpeg.mockReturnValue(chain);
    mockPng.mockReturnValue(chain);
    return chain;
  }

  const mockSharp = vi.fn(() => createChain());

  return {
    mockMetadata,
    mockWebp,
    mockResize,
    mockToFile,
    mockToBuffer,
    mockRotate,
    mockJpeg,
    mockPng,
    mockSharp,
    mockWriteFile,
    createChain,
  };
});

vi.mock("sharp", () => ({ default: mockSharp }));
vi.mock("fs/promises", () => ({ writeFile: mockWriteFile }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  getImageDimensions,
  generateWebpVariant,
  generateMediumVariant,
  optimizeImage,
} from "@/lib/image";

beforeEach(() => {
  vi.clearAllMocks();
  // Re-setup chain with defaults after clearAllMocks
  const chain = {
    metadata: mockMetadata,
    webp: mockWebp,
    resize: mockResize,
    toFile: mockToFile,
    toBuffer: mockToBuffer,
    rotate: mockRotate,
    jpeg: mockJpeg,
    png: mockPng,
  };
  mockWebp.mockReturnValue(chain);
  mockResize.mockReturnValue(chain);
  mockRotate.mockReturnValue(chain);
  mockJpeg.mockReturnValue(chain);
  mockPng.mockReturnValue(chain);
  mockMetadata.mockResolvedValue({ width: 800, height: 600 });
  mockToFile.mockResolvedValue(undefined);
  mockToBuffer.mockResolvedValue(Buffer.from("test"));
  mockWriteFile.mockResolvedValue(undefined);
  mockSharp.mockReturnValue(chain);
});

// ── getImageDimensions ──────────────────────────────────────────────

describe("getImageDimensions", () => {
  it("returns width and height for a valid image", async () => {
    mockMetadata.mockResolvedValue({ width: 1024, height: 768 });
    const result = await getImageDimensions("photo.jpg");
    expect(result).toEqual({ width: 1024, height: 768 });
  });

  it("returns null when metadata lacks width", async () => {
    mockMetadata.mockResolvedValue({ height: 768 });
    const result = await getImageDimensions("broken.jpg");
    expect(result).toBeNull();
  });

  it("returns null when metadata lacks height", async () => {
    mockMetadata.mockResolvedValue({ width: 1024 });
    const result = await getImageDimensions("broken.jpg");
    expect(result).toBeNull();
  });

  it("returns null when sharp throws (corrupted file)", async () => {
    mockMetadata.mockRejectedValue(new Error("Invalid image"));
    const result = await getImageDimensions("corrupt.jpg");
    expect(result).toBeNull();
  });
});

// ── generateWebpVariant ─────────────────────────────────────────────

describe("generateWebpVariant", () => {
  it("converts .jpg to .webp", async () => {
    const result = await generateWebpVariant("photo.jpg");
    expect(result).toBe("photo.jpg.webp");
    expect(mockWebp).toHaveBeenCalledWith({ quality: 82 });
    expect(mockToFile).toHaveBeenCalled();
  });

  it("converts .jpeg to .webp", async () => {
    const result = await generateWebpVariant("photo.jpeg");
    expect(result).toBe("photo.jpeg.webp");
  });

  it("converts .png to .webp", async () => {
    const result = await generateWebpVariant("image.png");
    expect(result).toBe("image.png.webp");
  });

  it("returns null for .gif (not convertible)", async () => {
    const result = await generateWebpVariant("anim.gif");
    expect(result).toBeNull();
    expect(mockWebp).not.toHaveBeenCalled();
  });

  it("returns null for .webp (already WebP)", async () => {
    const result = await generateWebpVariant("image.webp");
    expect(result).toBeNull();
  });

  it("returns null for .avif", async () => {
    const result = await generateWebpVariant("image.avif");
    expect(result).toBeNull();
  });

  it("returns null for .mp4 (video)", async () => {
    const result = await generateWebpVariant("clip.mp4");
    expect(result).toBeNull();
  });

  it("returns null when sharp throws", async () => {
    mockToFile.mockRejectedValue(new Error("Sharp error"));
    const result = await generateWebpVariant("photo.jpg");
    expect(result).toBeNull();
  });
});

// ── generateMediumVariant ───────────────────────────────────────────

describe("generateMediumVariant", () => {
  it("creates medium variant for .jpg", async () => {
    const result = await generateMediumVariant("photo.jpg");
    expect(result).toBe("med-photo.jpg");
    expect(mockResize).toHaveBeenCalledWith(768, undefined, {
      fit: "inside",
      withoutEnlargement: true,
    });
    expect(mockToFile).toHaveBeenCalled();
  });

  it("creates medium variant for .png", async () => {
    const result = await generateMediumVariant("image.png");
    expect(result).toBe("med-image.png");
  });

  it("creates medium variant for .webp", async () => {
    const result = await generateMediumVariant("image.webp");
    expect(result).toBe("med-image.webp");
  });

  it("creates medium variant for .jpeg", async () => {
    const result = await generateMediumVariant("photo.jpeg");
    expect(result).toBe("med-photo.jpeg");
  });

  it("returns null for .gif (not eligible)", async () => {
    const result = await generateMediumVariant("anim.gif");
    expect(result).toBeNull();
    expect(mockResize).not.toHaveBeenCalled();
  });

  it("returns null for .pdf", async () => {
    const result = await generateMediumVariant("doc.pdf");
    expect(result).toBeNull();
  });

  it("returns null for .mp4", async () => {
    const result = await generateMediumVariant("clip.mp4");
    expect(result).toBeNull();
  });

  it("returns null when sharp throws", async () => {
    mockToFile.mockRejectedValue(new Error("Sharp error"));
    const result = await generateMediumVariant("photo.jpg");
    expect(result).toBeNull();
  });
});

// ── optimizeImage ───────────────────────────────────────────────────

describe("optimizeImage", () => {
  it("optimizes JPEG with quality 85 and progressive", async () => {
    await optimizeImage("photo.jpg");
    expect(mockRotate).toHaveBeenCalled();
    expect(mockResize).toHaveBeenCalledWith(1920, 1920, {
      fit: "inside",
      withoutEnlargement: true,
    });
    expect(mockJpeg).toHaveBeenCalledWith({ quality: 85, progressive: true });
    expect(mockToBuffer).toHaveBeenCalled();
  });

  it("optimizes .jpeg extension same as .jpg", async () => {
    await optimizeImage("photo.jpeg");
    expect(mockJpeg).toHaveBeenCalledWith({ quality: 85, progressive: true });
  });

  it("optimizes PNG with compressionLevel 9", async () => {
    await optimizeImage("image.png");
    expect(mockPng).toHaveBeenCalledWith({ compressionLevel: 9 });
    expect(mockToBuffer).toHaveBeenCalled();
  });

  it("optimizes WebP with quality 82", async () => {
    await optimizeImage("image.webp");
    expect(mockWebp).toHaveBeenCalledWith({ quality: 82 });
    expect(mockToBuffer).toHaveBeenCalled();
  });

  it("writes optimized buffer back to file", async () => {
    const testBuffer = Buffer.from("optimized");
    mockToBuffer.mockResolvedValue(testBuffer);
    await optimizeImage("photo.jpg");
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining("photo.jpg"),
      testBuffer
    );
  });

  it("skips non-image formats (.pdf)", async () => {
    await optimizeImage("doc.pdf");
    expect(mockRotate).not.toHaveBeenCalled();
    expect(mockToBuffer).not.toHaveBeenCalled();
  });

  it("skips non-image formats (.mp4)", async () => {
    await optimizeImage("clip.mp4");
    expect(mockRotate).not.toHaveBeenCalled();
  });

  it("skips non-image formats (.gif)", async () => {
    await optimizeImage("anim.gif");
    expect(mockRotate).not.toHaveBeenCalled();
  });

  it("does not throw when sharp fails", async () => {
    mockToBuffer.mockRejectedValue(new Error("Sharp crash"));
    await expect(optimizeImage("photo.jpg")).resolves.toBeUndefined();
  });
});
