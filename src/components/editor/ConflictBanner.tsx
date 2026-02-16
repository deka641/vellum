"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { useEditorStore } from "@/stores/editor-store";
import styles from "./ConflictBanner.module.css";

interface ConflictBannerProps {
  onForceSave: () => void;
}

export function ConflictBanner({ onForceSave }: ConflictBannerProps) {
  const conflict = useEditorStore((s) => s.conflict);
  const resolveConflictLoadServer = useEditorStore((s) => s.resolveConflictLoadServer);
  const resolveConflictKeepLocal = useEditorStore((s) => s.resolveConflictKeepLocal);

  if (!conflict) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <AlertTriangle size={18} className={styles.icon} />
        <span className={styles.message}>
          This page was modified in another session. Choose how to resolve the conflict:
        </span>
      </div>
      <div className={styles.actions}>
        <Button
          variant="secondary"
          size="sm"
          onClick={resolveConflictLoadServer}
        >
          Load latest version
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            resolveConflictKeepLocal();
            onForceSave();
          }}
        >
          Keep my changes
        </Button>
      </div>
    </div>
  );
}
