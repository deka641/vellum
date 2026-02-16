"use client";

import { useCallback, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast/Toast";
import styles from "./media.module.css";

interface MediaUploaderProps {
  onUpload: (media: { id: string; url: string; filename: string }) => void;
}

export function MediaUploader({ onUpload }: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/media", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const media = await res.json();
          onUpload(media);
          toast("File uploaded");
        } else {
          const data = await res.json();
          toast(data.error || "Upload failed", "error");
        }
      } catch {
        toast("Upload failed", "error");
      } finally {
        setUploading(false);
      }
    },
    [onUpload, toast]
  );

  return (
    <div
      className={`${styles.uploader} ${dragOver ? styles.dragOver : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      {uploading ? (
        <>
          <Loader2 size={24} className={styles.spinner} />
          <span>Uploading...</span>
        </>
      ) : (
        <>
          <Upload size={24} />
          <span>Drop files here or click to upload</span>
          <input
            type="file"
            className={styles.fileInput}
            accept="image/*,video/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </>
      )}
    </div>
  );
}
