"use client";

import { useMemo } from "react";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog/Dialog";
import { Button } from "@/components/ui/Button/Button";
import { useEditorStore } from "@/stores/editor-store";
import { runSeoAudit, type SeoCheck } from "@/lib/seo-audit";
import type { ImageContent } from "@/types/blocks";
import styles from "./PrePublishDialog.module.css";

interface PrePublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmPublish: () => void;
}

export function PrePublishDialog({
  open,
  onOpenChange,
  onConfirmPublish,
}: PrePublishDialogProps) {
  const blocks = useEditorStore((s) => s.blocks);
  const pageTitle = useEditorStore((s) => s.pageTitle);
  const metaTitle = useEditorStore((s) => s.pageMetaTitle);
  const description = useEditorStore((s) => s.pageDescription);
  const ogImage = useEditorStore((s) => s.pageOgImage);

  const audit = useMemo(
    () => runSeoAudit(blocks, pageTitle, metaTitle, description, ogImage),
    [blocks, pageTitle, metaTitle, description, ogImage]
  );

  const blockWarnings = useMemo(() => {
    const warnings: string[] = [];
    const seen = new Set<string>();

    for (const block of blocks) {
      if (block.type === "image" && !(block.content as ImageContent).src && !seen.has("image-src")) {
        warnings.push("Image block without source found");
        seen.add("image-src");
      }
    }

    return warnings;
  }, [blocks]);

  const issues = audit.checks.filter((c) => c.status !== "good");
  const hasIssues = issues.length > 0 || blockWarnings.length > 0;
  const hasErrors = audit.checks.some((c) => c.status === "error");

  function handlePublish() {
    onConfirmPublish();
    onOpenChange(false);
  }

  function statusIcon(check: SeoCheck) {
    if (check.status === "error") return <XCircle size={14} />;
    return <AlertTriangle size={14} />;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ready to publish?</DialogTitle>
          <DialogDescription>
            Review these checks before publishing your page.
          </DialogDescription>
        </DialogHeader>

        <div className={styles.body}>
          <div
            className={`${styles.score} ${
              audit.score >= 80
                ? styles.scoreGood
                : audit.score >= 50
                  ? styles.scoreWarn
                  : styles.scoreError
            }`}
          >
            SEO Score: {audit.score}%
          </div>

          <div className={styles.checks}>
            {!hasIssues && (
              <div className={`${styles.check} ${styles.checkGood}`}>
                <CheckCircle size={14} />
                <span>All checks passed!</span>
              </div>
            )}

            {issues.map((check) => (
              <div
                key={check.id}
                className={`${styles.check} ${
                  check.status === "error" ? styles.checkError : styles.checkWarn
                }`}
              >
                {statusIcon(check)}
                <span>
                  <strong>{check.label}:</strong> {check.message}
                </span>
              </div>
            ))}

            {blockWarnings.map((w, i) => (
              <div
                key={`bw-${i}`}
                className={`${styles.check} ${styles.checkWarn}`}
              >
                <AlertTriangle size={14} />
                <span>{w}</span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Go back
          </Button>
          <Button variant="primary" size="sm" onClick={handlePublish}>
            {hasErrors ? "Publish anyway" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
