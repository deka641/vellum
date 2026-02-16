import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import styles from "./Badge.module.css";

type BadgeVariant = "default" | "success" | "warning" | "error" | "accent";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export function Badge({ className, variant = "default", dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(styles.badge, styles[variant], className)} {...props}>
      {dot && <span className={styles.dot} />}
      {children}
    </span>
  );
}
