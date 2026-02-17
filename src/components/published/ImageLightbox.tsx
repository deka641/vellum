"use client";

import { useState, useCallback, useEffect } from "react";
import { X } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import styles from "./ImageLightbox.module.css";

interface ImageLightboxProps {
  src: string;
  alt: string;
  children: React.ReactNode;
}

export function ImageLightbox({ src, alt, children }: ImageLightboxProps) {
  const [open, setOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div
        className={styles.trigger}
        onClick={handleOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOpen();
          }
        }}
        aria-label={`View ${alt || "image"} in fullscreen`}
      >
        {children}
      </div>
      {open && (
        <div
          className={`${styles.overlay} ${shouldReduceMotion ? styles.noAnimation : ""}`}
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
        >
          <button
            className={styles.closeBtn}
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            aria-label="Close lightbox"
          >
            <X size={24} />
          </button>
          <img
            src={src}
            alt={alt}
            className={styles.lightboxImage}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
