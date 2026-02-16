"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { MediaGrid } from "@/components/media/MediaGrid";
import { MediaUploader } from "@/components/media/MediaUploader";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { useToast } from "@/components/ui/Toast/Toast";
import styles from "./media-page.module.css";

interface MediaItem {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
}

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/media")
      .then((res) => res.json())
      .then((data) => setItems(data.media || []))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this file?")) return;
    const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((m) => m.id !== id));
      toast("File deleted");
    } else {
      toast("Failed to delete file", "error");
    }
  }

  return (
    <>
      <Topbar title="Media Library" description="Upload and manage your files" />
      <div className={styles.content}>
        <MediaUploader
          onUpload={(media) =>
            setItems((prev) => [media as unknown as MediaItem, ...prev])
          }
        />

        {loading ? (
          <div className={styles.loading}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} height={160} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            <ImageIcon size={48} strokeWidth={1} />
            <h3>No media yet</h3>
            <p>Upload your first file to get started</p>
          </div>
        ) : (
          <MediaGrid items={items} onDelete={handleDelete} />
        )}
      </div>
    </>
  );
}
