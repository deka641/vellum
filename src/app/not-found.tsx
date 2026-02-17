import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import styles from "./not-found.module.css";

export default function RootNotFound() {
  return (
    <html lang="en">
      <body className={styles.page}>
        <div className={styles.container}>
          <Link href="/" className={styles.brand}>Vellum</Link>
          <div className={styles.errorCode}>404</div>
          <h1 className={styles.title}>Page not found</h1>
          <p className={styles.description}>
            This page seems to have wandered off.
            The link may be broken, or the page may have been moved.
          </p>
          <div className={styles.actions}>
            <Link href="/sites" className={styles.primaryLink}>
              <ArrowLeft size={16} />
              Go to Dashboard
            </Link>
            <Link href="/" className={styles.secondaryLink}>
              <Home size={16} />
              Homepage
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
