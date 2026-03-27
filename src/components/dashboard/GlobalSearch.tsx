"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, FileText, Loader2 } from "lucide-react";
import styles from "./GlobalSearch.module.css";

interface SearchResult {
  pageId: string;
  pageTitle: string;
  pageSlug: string;
  status: string;
  matchType: string;
  snippet: string;
  siteId: string;
  siteName: string;
  siteSlug: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Ctrl/Cmd+K to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch {
      // Ignore search errors
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  }, [search]);

  const handleSelect = useCallback((result: SearchResult) => {
    setOpen(false);
    router.push(`/editor/${result.pageId}`);
  }, [router]);

  if (!open) {
    return (
      <button
        className={styles.trigger}
        onClick={() => setOpen(true)}
        aria-label="Search all pages (Ctrl+K)"
        title="Search all pages (Ctrl+K)"
      >
        <Search size={16} />
        <span className={styles.triggerText}>Search...</span>
        <kbd className={styles.triggerKbd}>
          {typeof navigator !== "undefined" && /Mac/.test(navigator.platform) ? "⌘" : "Ctrl"}+K
        </kbd>
      </button>
    );
  }

  // Group results by site
  const grouped = new Map<string, { siteName: string; results: SearchResult[] }>();
  for (const r of results) {
    const existing = grouped.get(r.siteId);
    if (existing) {
      existing.results.push(r);
    } else {
      grouped.set(r.siteId, { siteName: r.siteName, results: [r] });
    }
  }

  return (
    <>
      <div className={styles.backdrop} onClick={() => setOpen(false)} />
      <div className={styles.overlay}>
        <div className={styles.searchHeader}>
          <Search size={18} className={styles.searchIcon} />
          <input
            ref={inputRef}
            className={styles.searchInput}
            type="text"
            placeholder="Search across all sites..."
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            aria-label="Search pages"
          />
          {loading && <Loader2 size={18} className={styles.spinner} />}
          <button className={styles.closeBtn} onClick={() => setOpen(false)} aria-label="Close search">
            <X size={18} />
          </button>
        </div>
        {results.length > 0 && (
          <div className={styles.results}>
            {Array.from(grouped.entries()).map(([siteId, group]) => (
              <div key={siteId} className={styles.resultGroup}>
                <div className={styles.groupLabel}>{group.siteName}</div>
                {group.results.map((r) => (
                  <button
                    key={r.pageId}
                    className={styles.resultItem}
                    onClick={() => handleSelect(r)}
                  >
                    <FileText size={16} className={styles.resultIcon} />
                    <div className={styles.resultContent}>
                      <span className={styles.resultTitle}>{r.pageTitle}</span>
                      <span
                        className={styles.resultSnippet}
                        dangerouslySetInnerHTML={{ __html: r.snippet }}
                      />
                    </div>
                    <span className={styles.resultBadge}>{r.status === "PUBLISHED" ? "Published" : "Draft"}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
        {query.length >= 2 && !loading && results.length === 0 && (
          <div className={styles.empty}>No results found for &quot;{query}&quot;</div>
        )}
      </div>
    </>
  );
}
