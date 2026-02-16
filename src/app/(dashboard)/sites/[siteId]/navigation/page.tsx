"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff, ArrowLeft, Home, Navigation2 } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { Button } from "@/components/ui/Button/Button";
import { Badge } from "@/components/ui/Badge/Badge";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { useToast } from "@/components/ui/Toast/Toast";
import styles from "./navigation.module.css";

interface PageItem {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED";
  isHomepage: boolean;
  showInNav: boolean;
  sortOrder: number;
}

function SortablePageRow({
  page,
  onToggleVisibility,
}: {
  page: PageItem;
  onToggleVisibility: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.row} ${isDragging ? styles.rowDragging : ""}`}
    >
      <div className={styles.dragHandle} {...attributes} {...listeners}>
        <GripVertical size={16} />
      </div>
      <div className={styles.pageInfo}>
        <div className={styles.pageTitle}>
          {page.title}
          {page.isHomepage && <Home size={14} />}
          <Badge variant={page.status === "PUBLISHED" ? "success" : "default"} dot>
            {page.status === "PUBLISHED" ? "Published" : "Draft"}
          </Badge>
        </div>
        <div className={styles.pageSlug}>/{page.slug}</div>
      </div>
      <button
        className={`${styles.visibilityButton} ${page.showInNav ? styles.visibilityVisible : styles.visibilityHidden}`}
        onClick={() => onToggleVisibility(page.id)}
        title={page.showInNav ? "Visible in navigation" : "Hidden from navigation"}
        aria-label={page.showInNav ? "Hide from navigation" : "Show in navigation"}
      >
        {page.showInNav ? <Eye size={18} /> : <EyeOff size={18} />}
      </button>
    </div>
  );
}

export default function NavigationSettingsPage() {
  const params = useParams();
  const { toast } = useToast();
  const [pages, setPages] = useState<PageItem[]>([]);
  const [originalPages, setOriginalPages] = useState<PageItem[]>([]);
  const [siteName, setSiteName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const siteId = params.siteId as string;

  useEffect(() => {
    fetch(`/api/sites/${siteId}`)
      .then((res) => res.json())
      .then((site) => {
        setSiteName(site.name);
        const sorted = (site.pages || []).sort(
          (a: PageItem, b: PageItem) => a.sortOrder - b.sortOrder
        );
        setPages(sorted);
        setOriginalPages(sorted);
      })
      .finally(() => setLoading(false));
  }, [siteId]);

  const isDirty = useCallback(() => {
    if (pages.length !== originalPages.length) return true;
    return pages.some((p, i) => {
      const orig = originalPages[i];
      return p.id !== orig.id || p.showInNav !== orig.showInNav;
    });
  }, [pages, originalPages]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = pages.findIndex((p) => p.id === active.id);
    const newIndex = pages.findIndex((p) => p.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      setPages(arrayMove(pages, oldIndex, newIndex));
    }
  }

  function toggleVisibility(id: string) {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, showInNav: !p.showInNav } : p))
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        pages: pages.map((p, i) => ({
          id: p.id,
          sortOrder: i,
          showInNav: p.showInNav,
        })),
      };

      const res = await fetch(`/api/sites/${siteId}/navigation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const sorted = (data.pages || []).sort(
          (a: PageItem, b: PageItem) => a.sortOrder - b.sortOrder
        );
        setPages(sorted);
        setOriginalPages(sorted);
        toast("Navigation updated!");
      } else {
        toast("Failed to save navigation", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <Topbar title="Navigation" />
        <div className={styles.content}>
          <Skeleton height={20} width={200} />
          <Skeleton height={300} />
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar
        title="Navigation"
        description={siteName}
        actions={
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <Link href={`/sites/${siteId}`}>
              <Button variant="ghost" leftIcon={<ArrowLeft size={16} />} size="sm">
                Back
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isDirty() || saving}
            >
              {saving ? "Saving..." : "Save order"}
            </Button>
          </div>
        }
      />
      <div className={styles.content}>
        {isDirty() && (
          <div className={styles.unsavedBanner}>
            <span>You have unsaved changes to page order or visibility.</span>
          </div>
        )}

        {pages.length === 0 ? (
          <div className={styles.empty}>
            <Navigation2 size={48} strokeWidth={1} />
            <h3>No pages yet</h3>
            <p>Create pages for your site to configure navigation.</p>
            <Link href={`/sites/${siteId}`}>
              <Button variant="secondary">Go to site</Button>
            </Link>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={pages.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className={styles.list}>
                {pages.map((page) => (
                  <SortablePageRow
                    key={page.id}
                    page={page}
                    onToggleVisibility={toggleVisibility}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </>
  );
}
