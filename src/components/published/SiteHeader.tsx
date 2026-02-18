"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import styles from "./site-layout.module.css";

interface NavItem {
  title: string;
  href: string;
}

interface SiteHeaderProps {
  siteName: string;
  homeHref: string;
  navItems: NavItem[];
}

export function SiteHeader({ siteName, homeHref, navItems }: SiteHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const mobileNavRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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

  return (
    <header className={styles.header} role="banner">
      <div className={styles.headerInner}>
        <Link href={homeHref} className={styles.siteName}>
          {siteName}
        </Link>

        {navItems.length > 0 && (
          <>
            <nav className={styles.desktopNav} aria-label="Site navigation">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navLink} ${isActive(item.href) ? styles.navLinkActive : ""}`}
                >
                  {item.title}
                </Link>
              ))}
            </nav>

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
          </>
        )}
      </div>

      {navItems.length > 0 && (
        <nav ref={mobileNavRef} id="mobile-nav" className={`${styles.mobileNav} ${mobileOpen ? styles.mobileNavOpen : ""}`} aria-label="Site navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${isActive(item.href) ? styles.navLinkActive : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              {item.title}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
