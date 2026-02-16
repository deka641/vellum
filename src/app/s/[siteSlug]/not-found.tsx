"use client";

import { usePathname } from "next/navigation";
import styles from "@/components/published/site-layout.module.css";

export default function SiteNotFound() {
  const pathname = usePathname();
  // Extract site slug from /s/{slug}/... path
  const segments = pathname.split("/");
  const siteSlug = segments[2] || "";
  const homepageHref = `/s/${siteSlug}`;

  return (
    <div className={styles.notFound}>
      <h1 className={styles.notFoundTitle}>Page not found</h1>
      <p className={styles.notFoundText}>
        The page you&apos;re looking for doesn&apos;t exist or has been removed.
      </p>
      <a href={homepageHref} className={styles.notFoundLink}>
        Go to homepage
      </a>
    </div>
  );
}
