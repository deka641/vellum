"use client";

import Link from "next/link";
import { MoreHorizontal, Trash2, FileText, Home, ExternalLink, Pencil, Globe, GlobeLock, Copy, Clock } from "lucide-react";
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
import styles from "./PageList.module.css";

interface Page {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED";
  isHomepage: boolean;
  updatedAt: string;
  scheduledPublishAt?: string | null;
}

interface PageListProps {
  pages: Page[];
  siteSlug: string;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export function PageList({ pages, siteSlug, onDelete, onPublish, onUnpublish, onDuplicate }: PageListProps) {
  return (
    <div className={styles.list}>
      {pages.map((page) => (
        <div key={page.id} className={styles.item}>
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
      ))}
    </div>
  );
}
