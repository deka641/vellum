"use client";

import Link from "next/link";
import { MoreHorizontal, Trash2, FileText, Home, ExternalLink, Pencil, Globe, GlobeLock, Copy, Clock, GripVertical, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/Badge/Badge";
import { IconButton } from "@/components/ui/IconButton/IconButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/Dropdown/Dropdown";
import { formatRelativeDate } from "@/lib/utils";
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
import styles from "./PageList.module.css";

interface Page {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED";
  isHomepage: boolean;
  updatedAt: string;
  deletedAt?: string | null;
  scheduledPublishAt?: string | null;
  sortOrder?: number;
  showInNav?: boolean;
}

interface PageListProps {
  pages: Page[];
  siteSlug: string;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onDuplicate: (id: string) => void;
  onReorder?: (pages: Page[]) => void;
  onToggleNav?: (id: string) => void;
}

function SortablePageItem({
  page,
  siteSlug,
  onDelete,
  onPublish,
  onUnpublish,
  onDuplicate,
  onToggleNav,
}: {
  page: Page;
  siteSlug: string;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleNav?: (id: string) => void;
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
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={`${styles.item} ${isDragging ? styles.itemDragging : ""}`}>
      <div className={styles.dragHandle} {...attributes} {...listeners}>
        <GripVertical size={14} />
      </div>
      <Link href={`/editor/${page.id}`} className={styles.link}>
        <div className={styles.icon}>
          {page.isHomepage ? <Home size={16} /> : <FileText size={16} />}
        </div>
        <div className={styles.info}>
          <span className={styles.title}>{page.title}</span>
          <span className={styles.slug}>/{page.slug}</span>
        </div>
        <div className={styles.meta}>
          <Badge
            variant={page.status === "PUBLISHED" ? "success" : "default"}
            dot
          >
            {page.status === "PUBLISHED" ? "Published" : "Draft"}
          </Badge>
          {page.scheduledPublishAt && (
            <Badge variant="warning" dot>
              <Clock size={10} />
              Scheduled
            </Badge>
          )}
          <span className={styles.date}>
            {formatRelativeDate(page.updatedAt)}
          </span>
        </div>
      </Link>
      {onToggleNav && (
        <button
          className={`${styles.navToggle} ${page.showInNav ? styles.navVisible : styles.navHidden}`}
          onClick={() => onToggleNav(page.id)}
          title={page.showInNav ? "Visible in nav" : "Hidden from nav"}
          aria-label={page.showInNav ? "Hide from navigation" : "Show in navigation"}
        >
          {page.showInNav ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
      )}
      <div className={styles.actions}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton icon={<MoreHorizontal />} label="Page options" size="sm" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem asChild>
              <Link href={`/editor/${page.id}`}>
                <Pencil size={16} />
                Edit
              </Link>
            </DropdownMenuItem>
            {page.status === "PUBLISHED" && (
              <DropdownMenuItem asChild>
                <a
                  href={page.isHomepage ? `/s/${siteSlug}` : `/s/${siteSlug}/${page.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={16} />
                  View published
                </a>
              </DropdownMenuItem>
            )}
            {page.status === "DRAFT" ? (
              <DropdownMenuItem onClick={() => onPublish(page.id)}>
                <Globe size={16} />
                Publish
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onUnpublish(page.id)}>
                <GlobeLock size={16} />
                Unpublish
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onDuplicate(page.id)}>
              <Copy size={16} />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem danger onClick={() => onDelete(page.id)}>
              <Trash2 size={16} />
              Delete page
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function PageList({ pages, siteSlug, onDelete, onPublish, onUnpublish, onDuplicate, onReorder, onToggleNav }: PageListProps) {
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
    if (!over || active.id === over.id || !onReorder) return;

    const oldIndex = pages.findIndex((p) => p.id === active.id);
    const newIndex = pages.findIndex((p) => p.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(arrayMove(pages, oldIndex, newIndex));
    }
  }

  return (
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
            <SortablePageItem
              key={page.id}
              page={page}
              siteSlug={siteSlug}
              onDelete={onDelete}
              onPublish={onPublish}
              onUnpublish={onUnpublish}
              onDuplicate={onDuplicate}
              onToggleNav={onToggleNav}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
