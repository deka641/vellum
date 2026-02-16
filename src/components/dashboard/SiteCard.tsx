"use client";

import Link from "next/link";
import { MoreHorizontal, Trash2, Settings, Globe } from "lucide-react";
import { Card } from "@/components/ui/Card/Card";
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
import styles from "./SiteCard.module.css";

interface SiteCardProps {
  site: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    updatedAt: string;
    _count: { pages: number };
  };
  onDelete: (id: string) => void;
}

export function SiteCard({ site, onDelete }: SiteCardProps) {
  return (
    <Card hover className={styles.card}>
      <Link href={`/sites/${site.id}`} className={styles.link}>
        <div className={styles.preview}>
          <Globe size={24} />
        </div>
        <div className={styles.info}>
          <h3 className={styles.name}>{site.name}</h3>
          {site.description && (
            <p className={styles.description}>{site.description}</p>
          )}
          <div className={styles.meta}>
            <Badge>{site._count.pages} {site._count.pages === 1 ? "page" : "pages"}</Badge>
            <span className={styles.date}>
              {formatRelativeDate(site.updatedAt)}
            </span>
          </div>
        </div>
      </Link>
      <div className={styles.actions}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton icon={<MoreHorizontal />} label="Site options" size="sm" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem asChild>
              <Link href={`/sites/${site.id}/settings`}>
                <Settings size={16} />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem danger onClick={() => onDelete(site.id)}>
              <Trash2 size={16} />
              Delete site
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
