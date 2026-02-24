"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Search, X, FileText } from "lucide-react";
import styles from "./search-overlay.module.css";

interface SearchResult {
  pageTitle: string;
  pageSlug: string;
  description: string | null;
  matchType: "title" | "description" | "content";
  snippet: string;
  isHomepage: boolean;
}

interface SearchOverlayProps {
  siteSlug: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SearchOverlay({ siteSlug, isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Focus input when overlay opens
  useEffect(() => {
    if (isOpen) {
      // Small delay for animation to start
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      // Reset state when closing
      setQuery("");
      setResults([]);
      setSearched(false);
      setLoading(false);
    }
  }, [isOpen]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const doSearch = useCallback(
    async (searchQuery: string) => {
      // Cancel any in-flight request
      if (abortRef.current) {
        abortRef.current.abort();
      }

      if (searchQuery.length < 2) {
        setResults([]);
        setSearched(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `/api/sites/${encodeURIComponent(siteSlug)}/public-search?q=${encodeURIComponent(searchQuery)}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          setResults([]);
          setSearched(true);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setResults(data.results || []);
        setSearched(true);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // Aborted — ignore
          return;
        }
        setResults([]);
        setSearched(true);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [siteSlug]
  );

  // Debounced search
  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        doSearch(value.trim());
      }, 300);
    },
    [doSearch]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  if (!isOpen) return null;

  function getPageHref(result: SearchResult): string {
    if (result.isHomepage) {
      return `/s/${siteSlug}`;
    }
    return `/s/${siteSlug}/${result.pageSlug}`;
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <div className={styles.overlay} onClick={handleBackdropClick} role="dialog" aria-modal="true" aria-label="Search site">
      <div className={styles.card}>
        <div className={styles.inputWrapper}>
          <Search size={20} className={styles.searchIcon} />
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder="Search pages..."
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            aria-label="Search"
            autoComplete="off"
            spellCheck={false}
          />
          <button className={styles.closeButton} onClick={onClose} aria-label="Close search">
            <span>Esc</span>
          </button>
        </div>

        <div className={styles.results}>
          {loading && (
            <div className={styles.loading}>
              <div className={styles.spinner} />
            </div>
          )}

          {!loading && !searched && query.length < 2 && (
            <div className={styles.hint}>
              <p className={styles.hintText}>Type at least 2 characters to search</p>
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div className={styles.emptyState}>
              <FileText size={32} className={styles.emptyIcon} />
              <p className={styles.emptyText}>No results found for &quot;{query}&quot;</p>
            </div>
          )}

          {!loading &&
            results.map((result, i) => (
              <Link
                key={`${result.pageSlug}-${i}`}
                href={getPageHref(result)}
                className={styles.resultLink}
                onClick={onClose}
              >
                <p className={styles.resultTitle}>{result.pageTitle}</p>
                <p className={styles.resultSnippet}>{result.snippet}</p>
                {result.matchType !== "title" && (
                  <span className={styles.resultBadge}>
                    Match in {result.matchType}
                  </span>
                )}
              </Link>
            ))}
        </div>

        <div className={styles.footer}>
          <p className={styles.footerHint}>
            <kbd className={styles.footerKbd}>Esc</kbd> to close
          </p>
          <p className={styles.footerHint}>
            <kbd className={styles.footerKbd}>Enter</kbd> to select
          </p>
        </div>
      </div>
    </div>
  );
}
