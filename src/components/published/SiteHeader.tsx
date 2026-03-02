"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { Menu, X, Search } from "lucide-react";
import styles from "./site-layout.module.css";

const SearchOverlay = dynamic(
  () => import("./SearchOverlay").then((m) => m.SearchOverlay),
  { ssr: false }
);

interface NavItem {
  title: string;
  href: string;
}

interface SiteHeaderProps {
  siteName: string;
  siteLogo?: string | null;
  homeHref: string;
  navItems: NavItem[];
  siteSlug: string;
  hasPublishedPages?: boolean;
}

export function SiteHeader({ siteName, siteLogo, homeHref, navItems, siteSlug, hasPublishedPages = true }: SiteHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const mobileNavRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  function isActive(href: string) {
    if (href === homeHref) {
      return pathname === homeHref || pathname === homeHref + "/";
    }
    return pathname === href;
  }

  // Focus first nav link when mobile menu opens
  useEffect(() => {
    if (mobileOpen && mobileNavRef.current) {
      const firstLink = mobileNavRef.current.querySelector("a");
      if (firstLink) firstLink.focus();
    }
  }, [mobileOpen]);

  // Close mobile nav on Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && mobileOpen) {
      setMobileOpen(false);
      menuButtonRef.current?.focus();
    }
  }, [mobileOpen]);

  useEffect(() => {
    if (mobileOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [mobileOpen, handleKeyDown]);

  // Ctrl+K / Cmd+K to open search
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    // Swipe right to close: >80px horizontal, <40px vertical
    if (dx > 80 && Math.abs(dy) < 40) {
      setMobileOpen(false);
      menuButtonRef.current?.focus();
    }
    touchStartRef.current = null;
  }

  return (
    <>
      <header className={styles.header} role="banner">
        <div className={styles.headerInner}>
          <Link href={homeHref} className={styles.siteName}>
            {siteLogo ? (
              <img src={siteLogo} alt={siteName} className={styles.siteLogo} />
            ) : (
              siteName
            )}
          </Link>

          <div className={styles.headerActions}>
            {navItems.length > 0 && (
              <nav className={styles.desktopNav} aria-label="Site navigation">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navLink} ${isActive(item.href) ? styles.navLinkActive : ""}`}
                    aria-current={isActive(item.href) ? "page" : undefined}
                  >
                    {item.title}
                  </Link>
                ))}
              </nav>
            )}

            {hasPublishedPages && (
              <button
                className={styles.searchButton}
                onClick={() => setSearchOpen(true)}
                aria-label="Search site"
                title="Search (Ctrl+K)"
              >
                <Search size={18} />
              </button>
            )}

            {navItems.length > 0 && (
              <button
                ref={menuButtonRef}
                className={styles.menuButton}
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav"
              >
                {mobileOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            )}
          </div>
        </div>

        {navItems.length > 0 && (
          <nav
            ref={mobileNavRef}
            id="mobile-nav"
            className={`${styles.mobileNav} ${mobileOpen ? styles.mobileNavOpen : ""}`}
            aria-label="Site navigation"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${isActive(item.href) ? styles.navLinkActive : ""}`}
                aria-current={isActive(item.href) ? "page" : undefined}
                onClick={() => setMobileOpen(false)}
              >
                {item.title}
              </Link>
            ))}
          </nav>
        )}

        {mobileOpen && (
          <div
            className={styles.mobileBackdrop}
            onClick={() => {
              setMobileOpen(false);
              menuButtonRef.current?.focus();
            }}
            aria-hidden="true"
          />
        )}
      </header>

      <SearchOverlay siteSlug={siteSlug} isOpen={searchOpen} onClose={handleCloseSearch} />
    </>
  );
}
