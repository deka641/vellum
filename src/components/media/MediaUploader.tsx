"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast/Toast";
import styles from "./media.module.css";

interface MediaUploaderProps {
  onUpload: (media: { id: string; url: string; filename: string }) => void;
  folder?: string | null;
}

interface FileUploadState {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "done" | "error" | "aborted";
}

export function MediaUploader({ onUpload, folder }: MediaUploaderProps) {
  const [fileStates, setFileStates] = useState<FileUploadState[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();
  const xhrMapRef = useRef<Map<string, XMLHttpRequest>>(new Map());

  const isUploading = fileStates.some((f) => f.status === "uploading");

  const updateFileState = useCallback(
    (id: string, update: Partial<FileUploadState>) => {
      setFileStates((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...update } : f))
      );
    },
    []
  );

  const uploadFile = useCallback(
    (file: File, fileId: string): Promise<"done" | "error" | "aborted"> => {
      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhrMapRef.current.set(fileId, xhr);

        const formData = new FormData();
        formData.append("file", file);
        if (folder) formData.append("folder", folder);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            updateFileState(fileId, { progress });
          }
        };

        xhr.onload = () => {
          xhrMapRef.current.delete(fileId);
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const media = JSON.parse(xhr.responseText);
              onUpload(media);
              updateFileState(fileId, { status: "done", progress: 100 });
              resolve("done");
            } catch {
              updateFileState(fileId, { status: "error" });
              resolve("error");
            }
          } else {
            let errorMsg = `Failed to upload ${file.name}`;
            try {
              const data = JSON.parse(xhr.responseText);
              if (data.error) errorMsg = data.error;
            } catch {
              // use default message
            }
            toast(errorMsg, "error");
            updateFileState(fileId, { status: "error" });
            resolve("error");
          }
        };

        xhr.onerror = () => {
          xhrMapRef.current.delete(fileId);
          toast(`Failed to upload ${file.name}`, "error");
          updateFileState(fileId, { status: "error" });
          resolve("error");
        };

        xhr.onabort = () => {
          xhrMapRef.current.delete(fileId);
          updateFileState(fileId, { status: "aborted", progress: 0 });
          resolve("aborted");
        };

        xhr.open("POST", "/api/media");
        xhr.send(formData);
      });
    },
    [folder, onUpload, toast, updateFileState]
  );

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const newStates: FileUploadState[] = files.map((file, i) => ({
        id: `upload-${Date.now()}-${i}`,
        name: file.name,
        progress: 0,
        status: "uploading" as const,
      }));

      setFileStates((prev) => [...newStates, ...prev]);

      let succeeded = 0;
      let failed = 0;

      for (let i = 0; i < files.length; i++) {
        const result = await uploadFile(files[i], newStates[i].id);
        if (result === "done") succeeded++;
        else if (result === "error") failed++;
        // aborted files are not counted in the summary
      }

      const aborted = files.length - succeeded - failed;
      if (files.length > 1) {
        const parts: string[] = [];
        if (succeeded > 0) parts.push(`${succeeded} uploaded`);
        if (failed > 0) parts.push(`${failed} failed`);
        if (aborted > 0) parts.push(`${aborted} canceled`);
        if (parts.length > 0) {
          toast(parts.join(", "), failed > 0 ? "error" : undefined);
        }
      } else if (succeeded === 1) {
        toast("File uploaded");
      }
    },
    [uploadFile, toast]
  );

  const handleAbort = useCallback((fileId: string) => {
    const xhr = xhrMapRef.current.get(fileId);
    if (xhr) {
      xhr.abort();
    }
  }, []);

  const clearCompleted = useCallback(() => {
    setFileStates((prev) => prev.filter((f) => f.status === "uploading"));
  }, []);

  const hasCompleted = fileStates.some((f) => f.status !== "uploading");

  return (
    <div>
      <div
        className={`${styles.uploader} ${dragOver ? styles.dragOver : ""} ${isUploading ? styles.uploaderActive : ""}`}
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
        <Upload size={24} />
        <span>Drop files here or click to upload</span>
        {!isUploading && (
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
        )}
      </div>

      {fileStates.length > 0 && (
        <div className={styles.progressList}>
          <div className={styles.progressListHeader}>
            <span className={styles.progressListTitle}>
              {isUploading
                ? `Uploading ${fileStates.filter((f) => f.status === "uploading").length} file(s)...`
                : "Uploads"}
            </span>
            {hasCompleted && !isUploading && (
              <button
                className={styles.progressListClear}
                onClick={clearCompleted}
              >
                Clear
              </button>
            )}
          </div>
          {fileStates.map((file) => (
            <div key={file.id} className={styles.progressItem}>
              <div className={styles.progressItemHeader}>
                <span
                  className={styles.progressItemName}
                  title={file.name}
                >
                  {file.name}
                </span>
                <span className={styles.progressItemStatus}>
                  {file.status === "uploading" && (
                    <>
                      <span>{file.progress}%</span>
                      <button
                        className={styles.progressAbortBtn}
                        onClick={() => handleAbort(file.id)}
                        title="Cancel upload"
                      >
                        <X size={14} />
                      </button>
                    </>
                  )}
                  {file.status === "done" && (
                    <span className={styles.progressDone}>Done</span>
                  )}
                  {file.status === "error" && (
                    <span className={styles.progressError}>Failed</span>
                  )}
                  {file.status === "aborted" && (
                    <span className={styles.progressAborted}>Canceled</span>
                  )}
                </span>
              </div>
              {file.status === "uploading" && (
                <div className={styles.uploadProgressBar}>
                  <div
                    className={styles.uploadProgressFill}
                    style={{ width: `${file.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
