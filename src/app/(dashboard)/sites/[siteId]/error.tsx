"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button/Button";
import styles from "./error.module.css";

export default function SiteDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Something went wrong</h2>
        <p className={styles.description}>
          An unexpected error occurred while loading this site. Please try again.
        </p>
        {error.digest && (
          <p className={styles.digest}>Error ID: {error.digest}</p>
        )}
        <div className={styles.actions}>
          <Link href="/sites" className={styles.link}>
            Back to sites
          </Link>
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </div>
  );
}
