"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./published.module.css";

interface PublishedTableWrapperProps {
  children: React.ReactNode;
}

export function PublishedTableWrapper({ children }: PublishedTableWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  return (
    <div className={`${styles.tableScrollContainer} ${canScrollLeft ? styles.tableScrollLeft : ""} ${canScrollRight ? styles.tableScrollRight : ""}`}>
      <div ref={containerRef} className={styles.tableContainer} onScroll={checkScroll}>
        {children}
      </div>
    </div>
  );
}
