"use client";

import { useEffect, useState } from "react";
import styles from "./site-layout.module.css";

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    let ticking = false;

    function updateProgress() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        setProgress(Math.min((scrollTop / docHeight) * 100, 100));
      }
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(updateProgress);
        ticking = true;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    updateProgress();

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (progress <= 0) return null;

  return (
    <div
      className={styles.readingProgress}
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Reading progress"
      style={{ width: `${progress}%` }}
    />
  );
}
