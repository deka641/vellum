"use client";

import styles from "./ContentScoreBadge.module.css";

interface ContentScoreBadgeProps {
  score: number;
  label: string;
}

export function ContentScoreBadge({ score, label }: ContentScoreBadgeProps) {
  return (
    <span
      className={`${styles.badge} ${styles[label]}`}
      title={`Content score: ${score}/100 (${label.replace("-", " ")})`}
    >
      {score}
    </span>
  );
}
