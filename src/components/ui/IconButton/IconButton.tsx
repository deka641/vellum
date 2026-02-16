import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./IconButton.module.css";

type IconButtonSize = "sm" | "md" | "lg";
type IconButtonVariant = "default" | "ghost" | "danger";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  label: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, icon, size = "md", variant = "default", label, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(styles.iconButton, styles[size], styles[variant], className)}
        aria-label={label}
        title={label}
        {...props}
      >
        {icon}
      </button>
    );
  }
);
IconButton.displayName = "IconButton";
