import Link from "next/link";
import { Button } from "@/components/ui/Button/Button";
import styles from "./not-found.module.css";

export default function DashboardNotFound() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.content}>
        <div className={styles.code}>404</div>
        <h2 className={styles.title}>Page not found</h2>
        <p className={styles.description}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/sites">
          <Button>Go to Sites</Button>
        </Link>
      </div>
    </div>
  );
}
