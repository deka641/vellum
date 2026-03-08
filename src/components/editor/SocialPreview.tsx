"use client";

import { useEditorStore } from "@/stores/editor-store";
import styles from "./SocialPreview.module.css";

export function SocialPreview() {
  const pageTitle = useEditorStore((s) => s.pageTitle);
  const metaTitle = useEditorStore((s) => s.pageMetaTitle);
  const description = useEditorStore((s) => s.pageDescription);
  const ogImage = useEditorStore((s) => s.pageOgImage);
  const pageSlug = useEditorStore((s) => s.pageSlug);

  const displayTitle = metaTitle || pageTitle || "Untitled page";
  const displayDesc = description || "No description set";
  const displayUrl = pageSlug ? `example.com/.../\u200B${pageSlug}` : "example.com/...";

  return (
    <div className={styles.container}>
      <h4 className={styles.sectionTitle}>Social Preview</h4>

      <div className={styles.previewGroup}>
        <span className={styles.previewLabel}>Google Search</span>
        <div className={styles.googlePreview}>
          <span className={styles.googleUrl}>{displayUrl}</span>
          <span className={styles.googleTitle}>{displayTitle}</span>
          <span className={styles.googleDesc}>{displayDesc}</span>
        </div>
      </div>

      <div className={styles.previewGroup}>
        <span className={styles.previewLabel}>Social Card</span>
        <div className={styles.socialCard}>
          {ogImage ? (
            <div className={styles.socialImage}>
              <img src={ogImage} alt="OG preview" />
            </div>
          ) : (
            <div className={styles.socialImagePlaceholder}>
              No OG image set
            </div>
          )}
          <div className={styles.socialBody}>
            <span className={styles.socialDomain}>{displayUrl}</span>
            <span className={styles.socialTitle}>{displayTitle}</span>
            <span className={styles.socialDesc}>{displayDesc}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
