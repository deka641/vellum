"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Download, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { formatDate } from "@/lib/utils";
import styles from "./submissions.module.css";

interface Submission {
  id: string;
  blockId: string;
  data: Record<string, string>;
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageFilter, setPageFilter] = useState("");
  const [search, setSearch] = useState("");

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
      });
      if (pageFilter) params.set("pageId", pageFilter);

      const res = await fetch(`/api/sites/${siteId}/submissions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [siteId, page, pageFilter]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  useEffect(() => {
    setPage(1);
  }, [pageFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return submissions;
    const q = search.toLowerCase();
    return submissions.filter((sub) => {
      const data = sub.data;
      return (
        sub.page.title.toLowerCase().includes(q) ||
        Object.values(data).some((v) => String(v).toLowerCase().includes(q))
      );
    });
  }, [submissions, search]);

  function exportCsv() {
    const params = new URLSearchParams();
    if (pageFilter) params.set("pageId", pageFilter);
    window.open(`/api/sites/${siteId}/submissions/export?${params}`, "_blank");
  }

  return (
    <div className={styles.content}>
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search submissions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Download size={14} />}
          onClick={exportCsv}
        >
          Export CSV
        </Button>
      </div>

      {loading ? (
        <div className={styles.empty}>
          <p>Loading...</p>
        </div>
      ) : filtered.length === 0 ? (
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
                  <th className={styles.th}>Page</th>
                  <th className={styles.th}>Data</th>
                  <th className={styles.th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sub) => (
                  <tr key={sub.id} className={styles.tr}>
                    <td className={styles.td}>
                      <span className={styles.pageName}>{sub.page.title}</span>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.dataFields}>
                        {Object.entries(sub.data).map(([key, value]) => (
                          <div key={key} className={styles.dataField}>
                            <span className={styles.dataKey}>{key}:</span>
                            <span className={styles.dataValue}>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.date}>{formatDate(new Date(sub.createdAt))}</span>
                    </td>
                  </tr>
                ))}
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
    </div>
  );
}
