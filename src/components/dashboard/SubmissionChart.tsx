"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart3, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import styles from "./SubmissionChart.module.css";

interface DailyCount {
  date: string;
  count: number;
}

interface StatsResponse {
  daily: DailyCount[];
  total: number;
  unread: number;
}

interface SubmissionChartProps {
  siteId: string;
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function SubmissionChart({ siteId }: SubmissionChartProps) {
  const [days, setDays] = useState<7 | 30>(7);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await fetch(
        `/api/sites/${siteId}/submissions/stats?days=${days}`
      );
      if (res.ok) {
        const data: StatsResponse = await res.json();
        setStats(data);
      } else {
        setFetchError(true);
        console.error("Failed to fetch submission stats:", res.status);
      }
    } catch (error) {
      setFetchError(true);
      console.error("Failed to fetch submission stats:", error);
    } finally {
      setLoading(false);
    }
  }, [siteId, days]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const maxCount = stats
    ? Math.max(...stats.daily.map((d) => d.count), 1)
    : 1;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <BarChart3 size={16} className={styles.icon} />
          <h3 className={styles.title}>Submission Trends</h3>
        </div>
        <div className={styles.toggle}>
          <button
            className={`${styles.toggleBtn} ${days === 7 ? styles.toggleBtnActive : ""}`}
            onClick={() => setDays(7)}
            aria-pressed={days === 7}
          >
            7 days
          </button>
          <button
            className={`${styles.toggleBtn} ${days === 30 ? styles.toggleBtnActive : ""}`}
            onClick={() => setDays(30)}
            aria-pressed={days === 30}
          >
            30 days
          </button>
        </div>
      </div>

      {fetchError ? (
        <div className={styles.error}>
          <AlertCircle size={16} />
          <span>Failed to load stats.</span>
          <button onClick={fetchStats} className={styles.retryBtn}>
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className={styles.chart} aria-busy="true" aria-label="Loading chart">
          {Array.from({ length: days }).map((_, i) => (
            <div key={i} className={styles.barCol}>
              <Skeleton
                width="100%"
                height={`${20 + Math.random() * 60}%`}
              />
            </div>
          ))}
        </div>
      ) : stats && stats.total === 0 ? (
        <div className={styles.empty}>
          <p>No submissions in this period</p>
        </div>
      ) : stats ? (
        <>
          <div className={styles.summary}>
            <span className={styles.summaryItem}>
              <strong>{stats.total}</strong> total
            </span>
            {stats.unread > 0 && (
              <span className={styles.summaryItemUnread}>
                <strong>{stats.unread}</strong> unread
              </span>
            )}
          </div>
          <div
            className={styles.chart}
            role="img"
            aria-label={`Bar chart showing ${stats.total} submissions over the last ${days} days`}
          >
            {stats.daily.map((day) => {
              const heightPercent =
                maxCount > 0 ? (day.count / maxCount) * 100 : 0;
              return (
                <div key={day.date} className={styles.barCol}>
                  <div
                    className={styles.bar}
                    style={{ height: `${Math.max(heightPercent, day.count > 0 ? 4 : 0)}%` }}
                    aria-label={`${formatFullDate(day.date)}: ${day.count} submission${day.count !== 1 ? "s" : ""}`}
                  >
                    {day.count > 0 && (
                      <div className={styles.tooltip}>
                        <span className={styles.tooltipCount}>{day.count}</span>
                        <span className={styles.tooltipDate}>
                          {formatFullDate(day.date)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className={styles.xAxis}>
            {stats.daily.length <= 10 ? (
              stats.daily.map((day) => (
                <span key={day.date} className={styles.xLabel}>
                  {formatShortDate(day.date)}
                </span>
              ))
            ) : (
              <>
                <span className={styles.xLabel}>
                  {formatShortDate(stats.daily[0].date)}
                </span>
                <span className={styles.xLabelCenter}>
                  {formatShortDate(
                    stats.daily[Math.floor(stats.daily.length / 2)].date
                  )}
                </span>
                <span className={styles.xLabel}>
                  {formatShortDate(stats.daily[stats.daily.length - 1].date)}
                </span>
              </>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
