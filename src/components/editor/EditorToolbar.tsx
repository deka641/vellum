"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, ExternalLink, Save, Undo2, Redo2, Loader2, AlertCircle, AlertTriangle, Monitor, Tablet, Smartphone, Check, MoreHorizontal, Clock, CalendarClock, X, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { IconButton } from "@/components/ui/IconButton/IconButton";
import { Badge } from "@/components/ui/Badge/Badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/Dropdown/Dropdown";
import dynamic from "next/dynamic";
import { useEditorStore } from "@/stores/editor-store";
import { useAutosave } from "@/hooks/use-autosave";
import styles from "./EditorToolbar.module.css";

const KeyboardShortcutsDialog = dynamic(
  () => import("./KeyboardShortcutsDialog").then((m) => m.KeyboardShortcutsDialog),
  { ssr: false }
);
const SaveAsTemplateDialog = dynamic(
  () => import("./SaveAsTemplateDialog").then((m) => m.SaveAsTemplateDialog),
  { ssr: false }
);

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function useRelativeTime(dateStr: string | null): string {
  const [text, setText] = useState(() => dateStr ? getRelativeTime(dateStr) : "");
  const update = useCallback(() => {
    if (dateStr) setText(getRelativeTime(dateStr));
  }, [dateStr]);

  useEffect(() => {
    update();
    const id = setInterval(update, 10_000);
    return () => clearInterval(id);
  }, [update]);

  return text;
}

function formatScheduledDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  if (isToday) return `Today at ${timeStr}`;
  if (isTomorrow) return `Tomorrow at ${timeStr}`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + ` at ${timeStr}`;
}

function toLocalDatetimeValue(dateStr: string): string {
  const date = new Date(dateStr);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function getMinDatetimeLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

interface EditorToolbarProps {
  siteId: string;
  siteSlug: string;
  isHomepage: boolean;
  pageStatus: "DRAFT" | "PUBLISHED";
  scheduledPublishAt: string | null;
  onPublish: () => void;
  onSchedule: (scheduledAt: string) => void;
  onCancelSchedule: () => void;
  sidebarOpen?: boolean;
  onSidebarToggle?: () => void;
}

export function EditorToolbar({ siteId, siteSlug, isHomepage, pageStatus, scheduledPublishAt, onPublish, onSchedule, onCancelSchedule, sidebarOpen, onSidebarToggle }: EditorToolbarProps) {
  const router = useRouter();
  const { pageTitle, pageSlug, setPageTitle, isDirty, isSaving, saveError, conflict, undo, redo, previewMode, setPreviewMode, lastSavedAt } =
    useEditorStore();
  const { save } = useAutosave();
  const hasConflict = conflict !== null;
  const relativeTime = useRelativeTime(lastSavedAt);

  const [showAutoSaving, setShowAutoSaving] = useState(false);

  useEffect(() => {
    if (isDirty && !isSaving && !saveError && conflict === null) {
      const timer = setTimeout(() => setShowAutoSaving(true), 800);
      return () => { clearTimeout(timer); setShowAutoSaving(false); };
    }
    setShowAutoSaving(false);
  }, [isDirty, isSaving, saveError, conflict]);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const scheduleRef = useRef<HTMLDivElement>(null);

  // Close schedule dropdown on outside click
  useEffect(() => {
    if (!scheduleOpen) return;
    function handleClick(e: MouseEvent) {
      if (scheduleRef.current && !scheduleRef.current.contains(e.target as Node)) {
        setScheduleOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [scheduleOpen]);

  const handleScheduleSubmit = useCallback(async () => {
    if (!scheduleDate) return;
    setScheduleLoading(true);
    try {
      const isoDate = new Date(scheduleDate).toISOString();
      onSchedule(isoDate);
      setScheduleOpen(false);
      setScheduleDate("");
    } finally {
      setScheduleLoading(false);
    }
  }, [scheduleDate, onSchedule]);

  return (
    <div className={styles.toolbar}>
      <div className={styles.left}>
        <IconButton
          icon={<ArrowLeft />}
          label="Back to site"
          onClick={() => router.push(`/sites/${siteId}`)}
        />
        <div className={styles.divider} />
        <input
          className={styles.titleInput}
          value={pageTitle}
          onChange={(e) => setPageTitle(e.target.value)}
          placeholder="Page title"
          aria-label="Page title"
        />
        <Badge
          variant={pageStatus === "PUBLISHED" ? "success" : "default"}
          dot
        >
          {pageStatus === "PUBLISHED" ? "Published" : "Draft"}
        </Badge>
        {scheduledPublishAt && (
          <Badge variant="warning" dot>
            <Clock size={10} />
            Scheduled {formatScheduledDate(scheduledPublishAt)}
          </Badge>
        )}
      </div>
      <div className={styles.right}>
        {hasConflict && (
          <span className={`${styles.saveStatus} ${styles.saveConflict}`}>
            <AlertTriangle size={14} />
            Conflict
          </span>
        )}
        {!hasConflict && isSaving && (
          <span className={styles.saveStatus}>
            <Loader2 size={14} className={styles.spinner} />
            Saving...
          </span>
        )}
        {!hasConflict && !isSaving && saveError && (
          <button
            className={`${styles.saveStatus} ${styles.saveError} ${styles.saveErrorBtn}`}
            onClick={() => save()}
            title="Click to retry saving"
            aria-label="Save failed, click to retry"
          >
            <AlertCircle size={14} />
            Save failed — click to retry
          </button>
        )}
        {!hasConflict && !isSaving && !saveError && isDirty && (
          <span className={styles.saveStatus}>
            {showAutoSaving ? (
              <>
                <Loader2 size={14} className={styles.spinner} />
                Auto-saving...
              </>
            ) : (
              "Unsaved changes"
            )}
          </span>
        )}
        {!hasConflict && !isSaving && !saveError && !isDirty && (
          <span
            className={`${styles.saveStatus} ${styles.saveDone}`}
            title={lastSavedAt ? new Date(lastSavedAt).toLocaleString() : undefined}
          >
            <Check size={14} />
            Saved{relativeTime ? ` ${relativeTime}` : ""}
          </span>
        )}

        {/* Desktop-only secondary actions */}
        <div className={styles.desktopOnly}>
          <IconButton icon={<Undo2 />} label="Undo (Ctrl+Z)" onClick={undo} />
          <IconButton icon={<Redo2 />} label="Redo (Ctrl+Shift+Z)" onClick={redo} />
          <KeyboardShortcutsDialog />
          <div className={styles.divider} />
          <div className={styles.previewToggle}>
            <button
              className={`${styles.previewBtn} ${previewMode === "desktop" ? styles.previewBtnActive : ""}`}
              onClick={() => setPreviewMode("desktop")}
              title="Desktop view"
              aria-label="Desktop view"
              aria-pressed={previewMode === "desktop"}
            >
              <Monitor size={16} />
            </button>
            <button
              className={`${styles.previewBtn} ${previewMode === "tablet" ? styles.previewBtnActive : ""}`}
              onClick={() => setPreviewMode("tablet")}
              title="Tablet view"
              aria-label="Tablet view"
              aria-pressed={previewMode === "tablet"}
            >
              <Tablet size={16} />
            </button>
            <button
              className={`${styles.previewBtn} ${previewMode === "mobile" ? styles.previewBtnActive : ""}`}
              onClick={() => setPreviewMode("mobile")}
              title="Mobile view"
              aria-label="Mobile view"
              aria-pressed={previewMode === "mobile"}
            >
              <Smartphone size={16} />
            </button>
          </div>
          <div className={styles.divider} />
          <IconButton
            icon={<Eye />}
            label="Preview"
            onClick={() => {
              const { pageId } = useEditorStore.getState();
              window.open(`/preview/${pageId}`, "_blank");
            }}
          />
          {pageStatus === "PUBLISHED" && (
            <IconButton
              icon={<ExternalLink />}
              label="View published page"
              onClick={() => {
                const url = isHomepage ? `/s/${siteSlug}` : `/s/${siteSlug}/${pageSlug}`;
                window.open(url, "_blank");
              }}
            />
          )}
          <SaveAsTemplateDialog />
        </div>

        {/* Mobile overflow menu */}
        <div className={styles.mobileOnly}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton icon={<MoreHorizontal />} label="More actions" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={undo}>
                <Undo2 size={16} />
                Undo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={redo}>
                <Redo2 size={16} />
                Redo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                const { pageId } = useEditorStore.getState();
                window.open(`/preview/${pageId}`, "_blank");
              }}>
                <Eye size={16} />
                Preview
              </DropdownMenuItem>
              {pageStatus === "PUBLISHED" && (
                <DropdownMenuItem onClick={() => {
                  const url = isHomepage ? `/s/${siteSlug}` : `/s/${siteSlug}/${pageSlug}`;
                  window.open(url, "_blank");
                }}>
                  <ExternalLink size={16} />
                  View published
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setPreviewMode("desktop")}>
                <Monitor size={16} />
                Desktop view
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPreviewMode("tablet")}>
                <Tablet size={16} />
                Tablet view
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPreviewMode("mobile")}>
                <Smartphone size={16} />
                Mobile view
              </DropdownMenuItem>
              {scheduledPublishAt && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onCancelSchedule}>
                    <X size={16} />
                    Cancel schedule
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button size="sm" onClick={() => { save(); }} disabled={hasConflict}>
          <Save size={14} />
          Save
        </Button>
        <Button size="sm" onClick={onPublish} disabled={hasConflict}>
          {pageStatus === "PUBLISHED" ? "Update" : "Publish"}
        </Button>

        {/* Sidebar toggle — tablet only */}
        {onSidebarToggle && (
          <button
            className={`${styles.sidebarToggle} ${sidebarOpen ? styles.sidebarToggleActive : ""}`}
            onClick={onSidebarToggle}
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            <PanelRight size={18} />
          </button>
        )}

        {/* Schedule dropdown */}
        <div className={styles.scheduleWrap} ref={scheduleRef}>
          <Button
            size="sm"
            variant={scheduledPublishAt ? "primary" : "secondary"}
            onClick={() => setScheduleOpen((o) => !o)}
            disabled={hasConflict}
          >
            <CalendarClock size={14} />
            {scheduledPublishAt ? "Scheduled" : "Schedule"}
          </Button>
          {scheduleOpen && (
            <div className={styles.scheduleDropdown}>
              {scheduledPublishAt ? (
                <div className={styles.scheduleContent}>
                  <div className={styles.scheduleInfo}>
                    <Clock size={14} />
                    <span>Scheduled for {formatScheduledDate(scheduledPublishAt)}</span>
                  </div>
                  <div className={styles.scheduleActions}>
                    <Button size="sm" variant="secondary" onClick={() => {
                      setScheduleDate(toLocalDatetimeValue(scheduledPublishAt));
                    }}>
                      Change
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      onCancelSchedule();
                      setScheduleOpen(false);
                    }}>
                      <X size={14} />
                      Cancel schedule
                    </Button>
                  </div>
                  {scheduleDate && (
                    <div className={styles.scheduleForm}>
                      <input
                        type="datetime-local"
                        className={styles.scheduleDateInput}
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        min={getMinDatetimeLocal()}
                      />
                      <Button size="sm" onClick={handleScheduleSubmit} disabled={scheduleLoading || !scheduleDate}>
                        {scheduleLoading ? "Updating..." : "Update schedule"}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.scheduleContent}>
                  <div className={styles.scheduleLabel}>Schedule publish</div>
                  <input
                    type="datetime-local"
                    className={styles.scheduleDateInput}
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={getMinDatetimeLocal()}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleScheduleSubmit} disabled={scheduleLoading || !scheduleDate}>
                    {scheduleLoading ? "Scheduling..." : "Schedule publish"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
