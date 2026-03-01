"use client";

import { useState, useEffect } from "react";
import { FileText, Globe, Image, Upload, Trash2, Send, Clock } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import styles from "./ActivityFeed.module.css";

interface Activity {
  id: string;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
}

const ACTION_CONFIG: Record<string, { icon: React.ElementType; getLabel: (d: Record<string, unknown>) => string }> = {
  "site.created": { icon: Globe, getLabel: (d) => `Created site "${d.name || "Untitled"}"` },
  "site.updated": { icon: Globe, getLabel: (d) => `Updated site "${d.name || "settings"}"` },
  "site.deleted": { icon: Trash2, getLabel: () => "Deleted a site" },
  "page.created": { icon: FileText, getLabel: (d) => `Created page "${d.title || "Untitled"}"` },
  "page.deleted": { icon: Trash2, getLabel: (d) => `Deleted page "${d.title || "Untitled"}"` },
  "page.published": { icon: Send, getLabel: (d) => `Published "${d.title || "a page"}"` },
  "page.unpublished": { icon: Clock, getLabel: (d) => `Unpublished "${d.title || "a page"}"` },
  "media.uploaded": { icon: Upload, getLabel: (d) => `Uploaded ${d.filename || "a file"}` },
  "media.deleted": { icon: Trash2, getLabel: (d) => `Deleted ${d.filename || "a file"}` },
};

export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/activity")
      .then((res) => res.json())
      .then((data) => setActivities(data.activities || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={styles.feed}>
        <h3 className={styles.title}>Recent Activity</h3>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={styles.feed}>
        <h3 className={styles.title}>Recent Activity</h3>
        <p className={styles.empty}>No activity yet. Start creating content!</p>
      </div>
    );
  }

  return (
    <div className={styles.feed}>
      <h3 className={styles.title}>Recent Activity</h3>
      <div className={styles.list}>
        {activities.map((activity) => {
          const config = ACTION_CONFIG[activity.action];
          const Icon = config?.icon || FileText;
          const label = config?.getLabel(activity.details as Record<string, unknown>) || activity.action;

          return (
            <div key={activity.id} className={styles.item}>
              <div className={styles.iconWrap}>
                <Icon size={14} />
              </div>
              <div className={styles.content}>
                <span className={styles.label}>{label}</span>
                <span className={styles.time}>{formatRelativeDate(activity.createdAt)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
