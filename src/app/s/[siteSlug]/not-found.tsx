"use client";

import { usePathname } from "next/navigation";
import styles from "./not-found.module.css";

export default function SiteNotFound() {
  const pathname = usePathname();
  // Extract site slug from /s/{slug}/... path
  const segments = pathname.split("/");
  const siteSlug = segments[2] || "";
  const homepageHref = `/s/${siteSlug}`;

  return (
    <div className={styles.container}>
      <p className={styles.errorCode} aria-hidden="true">
        404
      </p>
      <h1 className={styles.title}>Page not found</h1>
      <p className={styles.description}>
        The page you&apos;re looking for doesn&apos;t exist or has been removed.
      </p>
      <p className={styles.suggestion}>
        Try checking the URL or browsing the navigation above.
      </p>
      <a href={homepageHref} className={styles.homeLink}>
        Back to Homepage
      </a>
    </div>
  );
}
