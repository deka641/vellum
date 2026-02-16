import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";
import styles from "./Avatar.module.css";

type AvatarSize = "sm" | "md" | "lg";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback: string;
  size?: AvatarSize;
  className?: string;
}

export function Avatar({ src, alt, fallback, size = "md", className }: AvatarProps) {
  const initials = fallback
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <AvatarPrimitive.Root className={cn(styles.avatar, styles[size], className)}>
      {src && (
        <AvatarPrimitive.Image className={styles.image} src={src} alt={alt || fallback} />
      )}
      <AvatarPrimitive.Fallback className={styles.fallback} delayMs={src ? 600 : 0}>
        {initials}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
