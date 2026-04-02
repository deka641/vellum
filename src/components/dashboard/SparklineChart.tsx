"use client";

import { useId, useMemo } from "react";
import styles from "./SparklineChart.module.css";

interface SparklineChartProps {
  data: Array<{ date: string; views: number }>;
  width?: number;
  height?: number;
}

export function SparklineChart({
  data,
  width = 300,
  height = 80,
}: SparklineChartProps) {
  const gradientId = useId();

  const { polylinePoints, areaPoints, maxViews } = useMemo(() => {
    if (data.length === 0) {
      return { polylinePoints: "", areaPoints: "", maxViews: 0 };
    }

    const max = Math.max(...data.map((d) => d.views), 1);
    const paddingX = 0;
    const paddingY = 4;
    const chartWidth = width - paddingX * 2;
    const chartHeight = height - paddingY * 2;

    const points = data.map((d, i) => {
      const x =
        data.length === 1
          ? chartWidth / 2 + paddingX
          : paddingX + (i / (data.length - 1)) * chartWidth;
      const y = paddingY + chartHeight - (d.views / max) * chartHeight;
      return { x, y };
    });

    const lineStr = points.map((p) => `${p.x},${p.y}`).join(" ");
    const areaStr = [
      `${points[0].x},${height}`,
      ...points.map((p) => `${p.x},${p.y}`),
      `${points[points.length - 1].x},${height}`,
    ].join(" ");

    return {
      polylinePoints: lineStr,
      areaPoints: areaStr,
      maxViews: max,
    };
  }, [data, width, height]);

  if (data.length === 0 || maxViews === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyText}>No data available</span>
      </div>
    );
  }

  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Sparkline chart showing ${data.length} data points`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#${gradientId})`}
      />
      <polyline
        points={polylinePoints}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
