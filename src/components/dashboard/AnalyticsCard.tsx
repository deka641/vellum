"use client";

import { useEffect, useState, useCallback } from "react";
import { BarChart3, TrendingUp, TrendingDown, Minus, Globe, FileText, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { Button } from "@/components/ui/Button/Button";
import { SparklineChart } from "./SparklineChart";
import styles from "./AnalyticsCard.module.css";

interface AnalyticsData {
  totalViews: number;
  previousViews: number;
  trend: number;
  topPages: Array<{ path: string; views: number }>;
  daily: Array<{ date: string; views: number }>;
  referrers: Array<{ referrer: string; views: number }>;
}

interface AnalyticsCardProps {
  siteId: string;
}

function formatPath(path: string): string {
  if (path === "home" || path === "/") return "Homepage";
  return `/${path}`;
}

function TrendIndicator({ trend }: { trend: number }) {
  if (trend > 0) {
    return (
      <span className={styles.trendUp}>
        <TrendingUp size={14} />
        +{trend}%
      </span>
    );
  }
  if (trend < 0) {
    return (
      <span className={styles.trendDown}>
        <TrendingDown size={14} />
        {trend}%
      </span>
    );
  }
  return (
    <span className={styles.trendNeutral}>
      <Minus size={14} />
      0%
    </span>
  );
}

export function AnalyticsCard({ siteId }: AnalyticsCardProps) {
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
        const json: AnalyticsData = await res.json();
        setData(json);
      } catch (err) {
        console.error("Failed to load analytics:", err);
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

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <BarChart3 size={16} />
            <span>Analytics</span>
          </div>
        </div>
        <div className={styles.body}>
          <div className={styles.statsRow}>
            <div className={styles.statBlock}>
              <Skeleton height={32} width={80} />
              <Skeleton height={14} width={100} />
            </div>
          </div>
          <Skeleton height={80} width="100%" />
          <div className={styles.listsGrid}>
            <div className={styles.listSection}>
              <Skeleton height={12} width={80} />
              <Skeleton height={14} width="100%" />
              <Skeleton height={14} width="90%" />
              <Skeleton height={14} width="70%" />
            </div>
            <div className={styles.listSection}>
              <Skeleton height={12} width={80} />
              <Skeleton height={14} width="100%" />
              <Skeleton height={14} width="85%" />
              <Skeleton height={14} width="65%" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <BarChart3 size={16} />
            <span>Analytics</span>
          </div>
        </div>
        <div className={styles.errorBody}>
          <p className={styles.errorText}>Failed to load analytics data</p>
          <Button size="sm" variant="secondary" leftIcon={<RefreshCw size={14} />} onClick={() => fetchAnalytics(days)}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const topPages = data.topPages.slice(0, 5);
  const topReferrers = data.referrers.slice(0, 5);
  const maxPageViews = topPages.length > 0 ? Math.max(...topPages.map((p) => p.views)) : 0;
  const maxReferrerViews = topReferrers.length > 0 ? Math.max(...topReferrers.map((r) => r.views)) : 0;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <BarChart3 size={16} />
          <span>Analytics</span>
        </div>
        <div className={styles.periodToggle}>
          <button
            className={`${styles.periodBtn} ${days === 7 ? styles.periodBtnActive : ""}`}
            onClick={() => setDays(7)}
            aria-pressed={days === 7}
          >
            7d
          </button>
          <button
            className={`${styles.periodBtn} ${days === 30 ? styles.periodBtnActive : ""}`}
            onClick={() => setDays(30)}
            aria-pressed={days === 30}
          >
            30d
          </button>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.statsRow}>
          <div className={styles.statBlock}>
            <div className={styles.statValueRow}>
              <span className={styles.statValue}>
                {data.totalViews.toLocaleString()}
              </span>
              <TrendIndicator trend={data.trend} />
            </div>
            <span className={styles.statLabel}>
              views in the last {days} days
            </span>
          </div>
        </div>

        <div className={styles.chartWrap}>
          <SparklineChart data={data.daily} />
        </div>

        <div className={styles.listsGrid}>
          <div className={styles.listSection}>
            <div className={styles.listHeader}>
              <FileText size={12} />
              Top pages
            </div>
            {topPages.length === 0 ? (
              <p className={styles.emptyText}>No page views yet</p>
            ) : (
              <ul className={styles.list}>
                {topPages.map((page) => (
                  <li key={page.path} className={styles.listItem}>
                    <span className={styles.listLabel}>{formatPath(page.path)}</span>
                    <div className={styles.barWrap}>
                      <div
                        className={styles.bar}
                        style={{
                          width: `${maxPageViews > 0 ? (page.views / maxPageViews) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className={styles.listCount}>{page.views.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.listSection}>
            <div className={styles.listHeader}>
              <Globe size={12} />
              Top referrers
            </div>
            {topReferrers.length === 0 ? (
              <p className={styles.emptyText}>No referrer data yet</p>
            ) : (
              <ul className={styles.list}>
                {topReferrers.map((ref) => (
                  <li key={ref.referrer} className={styles.listItem}>
                    <span className={styles.listLabel}>{ref.referrer}</span>
                    <div className={styles.barWrap}>
                      <div
                        className={styles.bar}
                        style={{
                          width: `${maxReferrerViews > 0 ? (ref.views / maxReferrerViews) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className={styles.listCount}>{ref.views.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
