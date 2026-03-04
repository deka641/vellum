"use client";

import { useCallback } from "react";
import styles from "./published.module.css";

interface HeadingAnchorProps {
  id: string;
}

export function HeadingAnchor({ id }: HeadingAnchorProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const url = `${window.location.origin}${window.location.pathname}#${id}`;
      navigator.clipboard.writeText(url).catch(() => {
        // Fallback: just navigate to the anchor
      });
      window.history.replaceState(null, "", `#${id}`);
    },
    [id]
  );

  return (
    <a
      href={`#${id}`}
      className={styles.headingAnchor}
      onClick={handleClick}
      aria-label="Copy link to this section"
    >
      #
    </a>
  );
}
