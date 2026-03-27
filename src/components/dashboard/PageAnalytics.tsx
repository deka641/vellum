"use client";

import { useEffect, useState, useCallback } from "react";
import { BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { Button } from "@/components/ui/Button/Button";
import styles from "./PageAnalytics.module.css";

interface AnalyticsData {
  totalViews: number;
  topPages: Array<{ path: string; views: number }>;
  daily: Array<{ date: string; views: number }>;
}

interface PageAnalyticsProps {
  siteId: string;
}

export function PageAnalytics({ siteId }: PageAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [days, setDays] = useState<7 | 30>(7);

  const fetchAnalytics = useCallback(
    async (period: number) => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/analytics/${siteId}?days=${period}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [siteId]
  );

  useEffect(() => {
    fetchAnalytics(days);
  }, [days, fetchAnalytics]);

  function handlePeriodToggle(period: 7 | 30) {
    setDays(period);
  }

  function formatPath(path: string): string {
    if (path === "home" || path === "/") return "Homepage";
    return `/${path}`;
  }

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.title}>
            <BarChart3 size={16} />
            Page views
          </div>
        </div>
        <div className={styles.body}>
          <Skeleton height={24} width={80} />
          <Skeleton height={14} width={160} />
          <Skeleton height={14} width={140} />
          <Skeleton height={14} width={120} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.title}>
            <BarChart3 size={16} />
            Page views
          </div>
        </div>
        <div className={styles.body}>
          <p className={styles.errorText}>Failed to load analytics</p>
          <Button size="sm" variant="secondary" onClick={() => fetchAnalytics(days)}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const maxViews = data.topPages.length > 0
    ? Math.max(...data.topPages.map((p) => p.views))
    : 0;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.title}>
          <BarChart3 size={16} />
          Page views
        </div>
        <div className={styles.periodToggle}>
          <button
            className={`${styles.periodBtn} ${days === 7 ? styles.periodBtnActive : ""}`}
            onClick={() => handlePeriodToggle(7)}
          >
            7d
          </button>
          <button
            className={`${styles.periodBtn} ${days === 30 ? styles.periodBtnActive : ""}`}
            onClick={() => handlePeriodToggle(30)}
          >
            30d
          </button>
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.totalRow}>
          <span className={styles.totalValue}>{data.totalViews.toLocaleString()}</span>
          <span className={styles.totalLabel}>
            views in the last {days} days
          </span>
        </div>
        {data.topPages.length === 0 ? (
          <p className={styles.emptyText}>No page views recorded yet</p>
        ) : (
          <div className={styles.topPages}>
            <div className={styles.topPagesHeader}>Top pages</div>
            <ul className={styles.pageList}>
              {data.topPages.slice(0, 5).map((page) => (
                <li key={page.path} className={styles.pageItem}>
                  <span className={styles.pagePath}>{formatPath(page.path)}</span>
                  <div className={styles.pageBarWrap}>
                    <div
                      className={styles.pageBar}
                      style={{ width: `${maxViews > 0 ? (page.views / maxViews) * 100 : 0}%` }}
                    />
                  </div>
                  <span className={styles.pageCount}>{page.views.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
