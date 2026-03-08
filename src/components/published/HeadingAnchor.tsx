"use client";

import { useCallback, useState } from "react";
import styles from "./published.module.css";

interface HeadingAnchorProps {
  id: string;
}

export function HeadingAnchor({ id }: HeadingAnchorProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const url = `${window.location.origin}${window.location.pathname}#${id}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
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
      aria-label={copied ? "Link copied" : "Copy link to this section"}
    >
      {copied ? "\u2713" : "#"}
    </a>
  );
}
