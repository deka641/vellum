"use client";

import { useMemo } from "react";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { runSeoAudit, type SeoStatus } from "@/lib/seo-audit";
import styles from "./SeoAudit.module.css";

const statusIcon: Record<SeoStatus, React.ReactNode> = {
  good: <CheckCircle size={14} />,
  warning: <AlertTriangle size={14} />,
  error: <XCircle size={14} />,
};

export function SeoAudit() {
  const blocks = useEditorStore((s) => s.blocks);
  const pageTitle = useEditorStore((s) => s.pageTitle);
  const metaTitle = useEditorStore((s) => s.pageMetaTitle);
  const description = useEditorStore((s) => s.pageDescription);
  const ogImage = useEditorStore((s) => s.pageOgImage);

  const audit = useMemo(
    () => runSeoAudit(blocks, pageTitle, metaTitle, description, ogImage),
    [blocks, pageTitle, metaTitle, description, ogImage]
  );

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h4 className={styles.title}>SEO Audit</h4>
        <span
          className={`${styles.score} ${
            audit.score >= 80 ? styles.scoreGood : audit.score >= 50 ? styles.scoreWarning : styles.scoreError
          }`}
        >
          {audit.score}%
        </span>
      </div>
      <div className={styles.checks}>
        {audit.checks.map((check) => (
          <div key={check.id} className={`${styles.check} ${styles[check.status]}`}>
            <span className={styles.icon}>{statusIcon[check.status]}</span>
            <div className={styles.checkContent}>
              <span className={styles.checkLabel}>{check.label}</span>
              <span className={styles.checkMessage}>{check.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
