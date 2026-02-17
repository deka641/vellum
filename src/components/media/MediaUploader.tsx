"use client";

import { useCallback, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast/Toast";
import styles from "./media.module.css";

interface MediaUploaderProps {
  onUpload: (media: { id: string; url: string; filename: string }) => void;
}

export function MediaUploader({ onUpload }: MediaUploaderProps) {
  const [uploadState, setUploadState] = useState<{
    active: boolean;
    current: number;
    total: number;
  }>({ active: false, current: 0, total: 0 });
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setUploadState({ active: true, current: 0, total: files.length });

      let succeeded = 0;
      let failed = 0;

      for (let i = 0; i < files.length; i++) {
        setUploadState({ active: true, current: i + 1, total: files.length });
        const formData = new FormData();
        formData.append("file", files[i]);

        try {
          const res = await fetch("/api/media", {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            const media = await res.json();
            onUpload(media);
            succeeded++;
          } else {
            const data = await res.json();
            toast(data.error || `Failed to upload ${files[i].name}`, "error");
            failed++;
          }
        } catch {
          toast(`Failed to upload ${files[i].name}`, "error");
          failed++;
        }
      }

      setUploadState({ active: false, current: 0, total: 0 });
      if (succeeded > 0 && files.length > 1) {
        toast(`${succeeded} file(s) uploaded${failed > 0 ? `, ${failed} failed` : ""}`);
      } else if (succeeded === 1 && files.length === 1) {
        toast("File uploaded");
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
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) handleFiles(files);
      }}
    >
      {uploadState.active ? (
        <>
          <Loader2 size={24} className={styles.spinner} />
          <span>Uploading {uploadState.current}/{uploadState.total}...</span>
          <div className={styles.uploadProgress}>
            <div className={styles.uploadProgressBar}>
              <div
                className={styles.uploadProgressFill}
                style={{ width: `${(uploadState.current / uploadState.total) * 100}%` }}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <Upload size={24} />
          <span>Drop files here or click to upload</span>
          <input
            type="file"
            className={styles.fileInput}
            accept="image/*,video/*,.pdf"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length > 0) handleFiles(files);
              e.target.value = "";
            }}
          />
        </>
      )}
    </div>
  );
}
