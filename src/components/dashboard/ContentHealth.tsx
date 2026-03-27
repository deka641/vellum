import Link from "next/link";
import { AlertTriangle, FileText, Image, FileEdit } from "lucide-react";
import styles from "./ContentHealth.module.css";

interface SiteMetric {
  siteId: string;
  siteName: string;
  count: number;
}

interface ContentHealthProps {
  stalePages: number;
  missingDescriptions: number;
  missingAltText: number;
  draftCount: number;
  stalePerSite: SiteMetric[];
  missingDescPerSite: SiteMetric[];
  draftPerSite: SiteMetric[];
  missingAltPerSite: SiteMetric[];
}

function getColorClass(count: number): string {
  if (count === 0) return styles.iconGreen;
  if (count <= 3) return styles.iconYellow;
  return styles.iconRed;
}

type FilterType = "stale" | "no-description" | "no-alt" | "draft";

function MetricValue({ count, perSite, filter }: { count: number; perSite: SiteMetric[]; filter: FilterType }) {
  if (count === 0 || perSite.length === 0) {
    return <span className={styles.metricCount}>{count}</span>;
  }

  // Single site: link directly
  if (perSite.length === 1) {
    return (
      <Link
        href={`/sites/${perSite[0].siteId}?filter=${filter}`}
        className={styles.metricLink}
      >
        {count}
      </Link>
    );
  }

  // Multiple sites: show each as a separate link
  return (
    <div className={styles.metricSites}>
      <span className={styles.metricCount}>{count}</span>
      <div className={styles.siteLinks}>
        {perSite.map((s) => (
          <Link
            key={s.siteId}
            href={`/sites/${s.siteId}?filter=${filter}`}
            className={styles.siteLink}
          >
            {s.siteName} ({s.count})
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ContentHealth({ stalePages, missingDescriptions, missingAltText, draftCount, stalePerSite, missingDescPerSite, draftPerSite, missingAltPerSite }: ContentHealthProps) {
  const metrics: Array<{
    icon: React.ReactNode;
    count: number;
    label: string;
    perSite: SiteMetric[];
    filter: FilterType;
  }> = [
    { icon: <AlertTriangle size={16} />, count: stalePages, label: "Stale pages (>90 days)", perSite: stalePerSite, filter: "stale" },
    { icon: <FileText size={16} />, count: missingDescriptions, label: "Missing descriptions", perSite: missingDescPerSite, filter: "no-description" },
    { icon: <Image size={16} />, count: missingAltText, label: "Images without alt text", perSite: missingAltPerSite, filter: "no-alt" },
    { icon: <FileEdit size={16} />, count: draftCount, label: "Unpublished drafts", perSite: draftPerSite, filter: "draft" },
  ];

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Content Health</h3>
      <div className={styles.metrics}>
        {metrics.map((m) => (
          <div key={m.label} className={styles.metric}>
            <div className={`${styles.metricIcon} ${getColorClass(m.count)}`}>
              {m.icon}
            </div>
            <div className={styles.metricInfo}>
              <MetricValue count={m.count} perSite={m.perSite} filter={m.filter} />
              <span className={styles.metricLabel}>{m.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
