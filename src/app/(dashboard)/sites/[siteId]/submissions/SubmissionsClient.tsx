"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Download, ChevronLeft, ChevronRight, Search, AlertCircle, Trash2, Mail, MailOpen, Eye, EyeOff, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { useToast } from "@/components/ui/Toast/Toast";
import { formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { SubmissionChart } from "@/components/dashboard/SubmissionChart";
import styles from "./submissions.module.css";

interface Submission {
  id: string;
  blockId: string;
  data: Record<string, string>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  page: { id: string; title: string };
}

interface PageOption {
  id: string;
  title: string;
}

interface SubmissionsClientProps {
  siteId: string;
  pages: PageOption[];
}

export function SubmissionsClient({ siteId, pages }: SubmissionsClientProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageFilter, setPageFilter] = useState("");
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingReadStatus, setUpdatingReadStatus] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const { toast } = useToast();
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSubmissions = useCallback(async (searchQuery?: string) => {
    setLoading(true);
    setFetchError(false);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
      });
      if (pageFilter) params.set("pageId", pageFilter);
      if (unreadOnly) params.set("unreadOnly", "true");

      const q = searchQuery !== undefined ? searchQuery : search;
      if (q.trim().length >= 2) params.set("q", q.trim());

      const res = await fetch(`/api/sites/${siteId}/submissions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      } else {
        setFetchError(true);
        console.error("Failed to fetch submissions:", res.status);
      }
    } catch (error) {
      setFetchError(true);
      console.error("Failed to fetch submissions:", error);
    } finally {
      setLoading(false);
    }
  }, [siteId, page, pageFilter, search, unreadOnly]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  useEffect(() => {
    setPage(1);
  }, [pageFilter, unreadOnly]);

  // Clear selection when submissions change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [submissions]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setPage(1);
      fetchSubmissions(value);
    }, 400);
  }

  function exportCsv() {
    const params = new URLSearchParams();
    if (pageFilter) params.set("pageId", pageFilter);
    window.open(`/api/sites/${siteId}/submissions/export?${params}`, "_blank");
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === submissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(submissions.map((s) => s.id)));
    }
  }

  async function handleDelete(ids: string[]) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/submissions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        const data = await res.json();
        toast(`Deleted ${data.deleted} submission${data.deleted !== 1 ? "s" : ""}`);
        setSelectedIds(new Set());
        fetchSubmissions();
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to delete submissions", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setDeleting(false);
      setDeleteId(null);
      setShowBulkDelete(false);
    }
  }

  async function handleSingleDelete(submissionId: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/submissions/${submissionId}`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 204) {
        toast("Deleted submission");
        fetchSubmissions();
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to delete submission", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  async function handleSingleReadStatus(submissionId: string, isRead: boolean) {
    setUpdatingReadStatus(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead }),
      });
      if (res.ok) {
        const label = isRead ? "read" : "unread";
        toast(`Marked submission as ${label}`);
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === submissionId
              ? { ...s, isRead, readAt: isRead ? new Date().toISOString() : null }
              : s
          )
        );
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to update read status", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setUpdatingReadStatus(false);
    }
  }

  async function handleMarkAllRead() {
    setMarkingAllRead(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/submissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllRead" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.updated > 0) {
          toast(`Marked ${data.updated} submission${data.updated !== 1 ? "s" : ""} as read`);
          setSubmissions((prev) =>
            prev.map((s) => ({ ...s, isRead: true, readAt: s.readAt || new Date().toISOString() }))
          );
        } else {
          toast("All submissions are already read");
        }
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to mark all as read", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setMarkingAllRead(false);
    }
  }

  async function handleReadStatus(ids: string[], action: "read" | "unread") {
    setUpdatingReadStatus(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/submissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action }),
      });
      if (res.ok) {
        const data = await res.json();
        const label = action === "read" ? "read" : "unread";
        toast(`Marked ${data.updated} submission${data.updated !== 1 ? "s" : ""} as ${label}`);
        // Update local state
        const isRead = action === "read";
        setSubmissions((prev) =>
          prev.map((s) =>
            ids.includes(s.id)
              ? { ...s, isRead, readAt: isRead ? new Date().toISOString() : null }
              : s
          )
        );
        setSelectedIds(new Set());
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to update read status", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setUpdatingReadStatus(false);
    }
  }

  const selectedSubmissions = submissions.filter((s) => selectedIds.has(s.id));
  const hasUnreadSelected = selectedSubmissions.some((s) => !s.isRead);
  const hasReadSelected = selectedSubmissions.some((s) => s.isRead);
  const hasAnyUnread = submissions.some((s) => !s.isRead);

  return (
    <div className={styles.content}>
      <SubmissionChart siteId={siteId} />
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search submissions..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={pageFilter}
          onChange={(e) => setPageFilter(e.target.value)}
        >
          <option value="">All pages</option>
          {pages.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        <button
          className={`${styles.unreadToggle} ${unreadOnly ? styles.unreadToggleActive : ""}`}
          onClick={() => setUnreadOnly(!unreadOnly)}
          title={unreadOnly ? "Show all submissions" : "Show unread only"}
          aria-pressed={unreadOnly}
        >
          {unreadOnly ? <EyeOff size={14} /> : <Eye size={14} />}
          {unreadOnly ? "Unread only" : "All"}
        </button>
        {selectedIds.size > 0 && (
          <>
            {hasUnreadSelected && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<MailOpen size={14} />}
                onClick={() => handleReadStatus(Array.from(selectedIds), "read")}
                disabled={updatingReadStatus}
              >
                Mark read
              </Button>
            )}
            {hasReadSelected && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Mail size={14} />}
                onClick={() => handleReadStatus(Array.from(selectedIds), "unread")}
                disabled={updatingReadStatus}
              >
                Mark unread
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 size={14} />}
              onClick={() => setShowBulkDelete(true)}
              disabled={deleting}
            >
              Delete {selectedIds.size}
            </Button>
          </>
        )}
        {hasAnyUnread && selectedIds.size === 0 && (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<CheckCheck size={14} />}
            onClick={handleMarkAllRead}
            disabled={markingAllRead}
          >
            {markingAllRead ? "Marking..." : "Mark all read"}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Download size={14} />}
          onClick={exportCsv}
        >
          Export CSV
        </Button>
      </div>

      {fetchError && (
        <div className={styles.errorBanner}>
          <AlertCircle size={18} />
          <span>Failed to load submissions. Please try again.</span>
          <button onClick={() => fetchSubmissions()} className={styles.retryBtn}>Retry</button>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px 0" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={48} />
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <div className={styles.empty}>
          <p>No form submissions found</p>
          <span>Form submissions from your published pages will appear here.</span>
        </div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === submissions.length && submissions.length > 0}
                      onChange={toggleSelectAll}
                      aria-label="Select all submissions"
                    />
                  </th>
                  <th className={styles.th}></th>
                  <th className={styles.th}>Page</th>
                  <th className={styles.th}>Data</th>
                  <th className={styles.th}>Date</th>
                  <th className={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => {
                  const isUnread = !sub.isRead;
                  return (
                    <tr key={sub.id} className={`${styles.tr} ${isUnread ? styles.trUnread : ""}`}>
                      <td className={styles.td}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(sub.id)}
                          onChange={() => toggleSelect(sub.id)}
                          aria-label={`Select submission from ${sub.page.title}`}
                        />
                      </td>
                      <td className={styles.td}>
                        {isUnread && (
                          <span className={styles.unreadDot} title="Unread" />
                        )}
                      </td>
                      <td className={styles.td}>
                        <span className={`${styles.pageName} ${isUnread ? styles.pageNameUnread : ""}`}>
                          {sub.page.title}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <div className={styles.dataFields}>
                          {Object.entries(sub.data).map(([key, value]) => (
                            <div key={key} className={styles.dataField}>
                              <span className={styles.dataKey}>{key}:</span>
                              <span className={`${styles.dataValue} ${isUnread ? styles.dataValueUnread : ""}`}>
                                {String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className={styles.td}>
                        <span className={styles.date}>{formatDate(new Date(sub.createdAt))}</span>
                      </td>
                      <td className={styles.td}>
                        <div className={styles.rowActions}>
                          <button
                            className={styles.actionBtn}
                            onClick={() =>
                              handleSingleReadStatus(sub.id, isUnread)
                            }
                            title={isUnread ? "Mark as read" : "Mark as unread"}
                            aria-label={isUnread ? "Mark as read" : "Mark as unread"}
                          >
                            {isUnread ? <MailOpen size={14} /> : <Mail size={14} />}
                          </button>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => setDeleteId(sub.id)}
                            title="Delete submission"
                            aria-label="Delete submission"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <span className={styles.paginationInfo}>
              {total} submission{total !== 1 ? "s" : ""}
            </span>
            <div className={styles.paginationControls}>
              <button
                className={styles.paginationBtn}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft size={16} />
              </button>
              <span className={styles.paginationPage}>
                {page} / {totalPages}
              </span>
              <button
                className={styles.paginationBtn}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete submission"
        description="Are you sure you want to delete this submission? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => { if (deleteId) handleSingleDelete(deleteId); }}
      />
      <ConfirmDialog
        open={showBulkDelete}
        onOpenChange={(open) => { if (!open) setShowBulkDelete(false); }}
        title="Delete submissions"
        description={`Are you sure you want to delete ${selectedIds.size} submission${selectedIds.size !== 1 ? "s" : ""}? This cannot be undone.`}
        confirmLabel="Delete all"
        variant="danger"
        onConfirm={() => handleDelete(Array.from(selectedIds))}
      />
    </div>
  );
}
