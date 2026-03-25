import { AlertTriangle, FileText, Image, FileEdit } from "lucide-react";
import styles from "./ContentHealth.module.css";

interface ContentHealthProps {
  stalePages: number;
  missingDescriptions: number;
  missingAltText: number;
  draftCount: number;
}

function getColorClass(count: number): string {
  if (count === 0) return styles.iconGreen;
  if (count <= 3) return styles.iconYellow;
  return styles.iconRed;
}

export function ContentHealth({ stalePages, missingDescriptions, missingAltText, draftCount }: ContentHealthProps) {
  const metrics = [
    { icon: <AlertTriangle size={16} />, count: stalePages, label: "Stale pages (>90 days)" },
    { icon: <FileText size={16} />, count: missingDescriptions, label: "Missing descriptions" },
    { icon: <Image size={16} />, count: missingAltText, label: "Images without alt text" },
    { icon: <FileEdit size={16} />, count: draftCount, label: "Unpublished drafts" },
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
              <span className={styles.metricCount}>{m.count}</span>
              <span className={styles.metricLabel}>{m.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
