import { type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button/Button";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
}

export function EmptyState({ icon, title, description, actionLabel, onAction, actionHref }: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <div className={styles.iconCircle}>{icon}</div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className={styles.actionLink}>
          {actionLabel}
        </Link>
      ) : actionLabel ? (
        <Button onClick={onAction}>{actionLabel}</Button>
      ) : null}
    </div>
  );
}
