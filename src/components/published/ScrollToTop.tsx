"use client";

import { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";
import styles from "./scroll-to-top.module.css";

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > 400);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <button
      className={`${styles.scrollToTop} ${visible ? styles.visible : ""}`}
      onClick={scrollToTop}
      aria-label="Back to top"
      title="Back to top"
      type="button"
    >
      <ChevronUp size={20} />
    </button>
  );
}
