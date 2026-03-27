"use client";

import { useState, useCallback, useRef } from "react";
import { Upload } from "lucide-react";
import { useToast } from "@/components/ui/Toast/Toast";
import styles from "./MediaDropZone.module.css";

const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif",
  ".mp4", ".webm",
  ".pdf",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function getFileExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) return "";
  return filename.slice(dotIndex).toLowerCase();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface MediaDropZoneProps {
  children: React.ReactNode;
  currentFolder?: string;
  onUploadComplete: () => void;
}

export function MediaDropZone({ children, currentFolder, onUploadComplete }: MediaDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);
  const { toast } = useToast();

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.dataTransfer.types.includes("Files")) return;
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Validate files before uploading
    const validFiles: File[] = [];
    for (const file of files) {
      const ext = getFileExtension(file.name);
      if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
        toast(`"${file.name}" is not a supported file type`, "error");
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast(`"${file.name}" exceeds 10 MB limit (${formatFileSize(file.size)})`, "error");
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const totalCount = validFiles.length;
    toast(`Uploading ${totalCount} file${totalCount > 1 ? "s" : ""}...`, "info");

    let successCount = 0;
    let failCount = 0;

    for (const file of validFiles) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        if (currentFolder) {
          formData.append("folder", currentFolder);
        }

        const res = await fetch("/api/media", { method: "POST", body: formData });

        if (!res.ok) {
          failCount += 1;
          toast(`Failed to upload "${file.name}"`, "error");
        } else {
          successCount += 1;
        }
      } catch {
        failCount += 1;
        toast(`Failed to upload "${file.name}"`, "error");
      }
    }

    if (successCount > 0) {
      toast(
        `${successCount} file${successCount > 1 ? "s" : ""} uploaded${failCount > 0 ? ` (${failCount} failed)` : ""}`,
      );
      onUploadComplete();
    }
  }, [currentFolder, onUploadComplete, toast]);

  return (
    <div
      className={styles.dropZone}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {isDragOver && (
        <div className={styles.overlay}>
          <div className={styles.overlayContent}>
            <div className={styles.overlayIcon}>
              <Upload size={28} />
            </div>
            Drop files to upload
            <span className={styles.overlayHint}>
              Images, videos, and PDFs up to 10 MB
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
