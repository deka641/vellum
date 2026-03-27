"use client";

import { useMemo, useCallback } from "react";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { runSeoAudit, type SeoStatus, type SeoCheck } from "@/lib/seo-audit";
import { SocialPreview } from "./SocialPreview";
import styles from "./SeoAudit.module.css";

const statusIcon: Record<SeoStatus, React.ReactNode> = {
  good: <CheckCircle size={14} />,
  warning: <AlertTriangle size={14} />,
  error: <XCircle size={14} />,
};

/** Check IDs where the suggestion can be auto-applied to the editor store. */
const APPLIABLE_CHECKS = new Set(["title", "description", "og"]);

export function SeoAudit() {
  const blocks = useEditorStore((s) => s.blocks);
  const pageTitle = useEditorStore((s) => s.pageTitle);
  const metaTitle = useEditorStore((s) => s.pageMetaTitle);
  const description = useEditorStore((s) => s.pageDescription);
  const ogImage = useEditorStore((s) => s.pageOgImage);
  const setPageMetaTitle = useEditorStore((s) => s.setPageMetaTitle);
  const setPageDescription = useEditorStore((s) => s.setPageDescription);
  const setPageOgImage = useEditorStore((s) => s.setPageOgImage);

  const audit = useMemo(
    () => runSeoAudit(blocks, pageTitle, metaTitle, description, ogImage),
    [blocks, pageTitle, metaTitle, description, ogImage]
  );

  const handleApply = useCallback((check: SeoCheck) => {
    if (!check.suggestion) return;
    switch (check.id) {
      case "title":
        setPageMetaTitle(check.suggestion);
        break;
      case "description":
        setPageDescription(check.suggestion);
        break;
      case "og":
        setPageOgImage(check.suggestion);
        break;
    }
  }, [setPageMetaTitle, setPageDescription, setPageOgImage]);

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
              {check.suggestion && (
                <div className={styles.suggestion}>
                  <span className={styles.suggestionText} title={check.suggestion}>
                    {check.suggestion}
                  </span>
                  {APPLIABLE_CHECKS.has(check.id) && (
                    <button
                      className={styles.applyButton}
                      onClick={() => handleApply(check)}
                      type="button"
                    >
                      Apply
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <SocialPreview />
    </div>
  );
}
