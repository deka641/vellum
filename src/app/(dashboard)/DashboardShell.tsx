"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import styles from "./dashboard.module.css";

interface DashboardShellProps {
  user: {
    name: string | null;
    email: string;
    avatarUrl?: string | null;
  };
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={styles.layout}>
      <Sidebar
        user={user}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <main className={styles.main}>
        <div className={styles.mobileHeader}>
          <button
            className={styles.hamburger}
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            <Menu size={24} />
          </button>
          <span className={styles.mobileTitle}>Vellum</span>
        </div>
        {children}
      </main>
    </div>
  );
}
