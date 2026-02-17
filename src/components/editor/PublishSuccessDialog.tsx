"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Check, ExternalLink, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/Dialog/Dialog";
import { Button } from "@/components/ui/Button/Button";
import styles from "./PublishSuccessDialog.module.css";

const CONFETTI_COLORS = [
  "var(--color-accent)",
  "var(--color-success)",
  "#F59E0B",
  "#EC4899",
  "var(--color-accent-muted)",
  "#34D399",
];

interface PublishSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageUrl: string;
}

function Confetti() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check reduced motion preference
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const pieces: HTMLSpanElement[] = [];
    for (let i = 0; i < 30; i++) {
      const piece = document.createElement("span");
      piece.className = styles.confetti;
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.top = `${-10 - Math.random() * 20}%`;
      piece.style.backgroundColor = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      piece.style.animationDelay = `${Math.random() * 0.6}s`;
      piece.style.animationDuration = `${2 + Math.random() * 1.5}s`;
      piece.style.width = `${6 + Math.random() * 6}px`;
      piece.style.height = `${6 + Math.random() * 6}px`;
      piece.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
      container.appendChild(piece);
      pieces.push(piece);
    }

    const timer = setTimeout(() => {
      pieces.forEach((p) => p.remove());
    }, 4000);

    return () => {
      clearTimeout(timer);
      pieces.forEach((p) => p.remove());
    };
  }, []);

  return <div ref={containerRef} className={styles.confettiContainer} />;
}

export function PublishSuccessDialog({ open, onOpenChange, pageUrl }: PublishSuccessDialogProps) {
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (open) {
      setShowConfetti(true);
      setCopied(false);
    } else {
      setShowConfetti(false);
    }
  }, [open]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = pageUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [pageUrl]);

  return (
    <>
      {showConfetti && <Confetti />}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your page is live!</DialogTitle>
            <DialogDescription>
              Your page has been published and is now visible to the world.
            </DialogDescription>
          </DialogHeader>
          <div className={styles.body}>
            <div className={styles.checkIcon}>
              <Check size={28} />
            </div>
            <div className={styles.urlBox}>
              <span className={styles.urlText}>{pageUrl}</span>
              <button className={styles.copyBtn} onClick={handleCopy}>
                <Copy size={12} />
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className={styles.actions}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.open(pageUrl, "_blank")}
                rightIcon={<ExternalLink size={14} />}
              >
                View page
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Continue editing
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
