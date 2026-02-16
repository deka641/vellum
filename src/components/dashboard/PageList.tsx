"use client";

import Link from "next/link";
import { MoreHorizontal, Trash2, FileText, Home } from "lucide-react";
import { Badge } from "@/components/ui/Badge/Badge";
import { IconButton } from "@/components/ui/IconButton/IconButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
}

interface PageListProps {
  pages: Page[];
  onDelete: (id: string) => void;
}

export function PageList({ pages, onDelete }: PageListProps) {
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
