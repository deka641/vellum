"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Globe, Image, LayoutTemplate, LogOut, Settings } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/Dropdown/Dropdown";
import { cn } from "@/lib/utils";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  user: {
    name: string | null;
    email: string;
    avatarUrl?: string | null;
  };
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const navItems = [
  { href: "/sites", label: "Sites", icon: Globe },
  { href: "/media", label: "Media", icon: Image },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ user, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={cn(styles.overlay, mobileOpen && styles.overlayVisible)}
        onClick={onMobileClose}
      />
      <aside className={cn(styles.sidebar, mobileOpen && styles.sidebarOpen)}>
        <div className={styles.logo}>
          <Link href="/sites" className={styles.logoLink}>
            <span className={styles.logoText}>Vellum</span>
          </Link>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                styles.navItem,
                pathname.startsWith(item.href) && styles.active
              )}
              onClick={onMobileClose}
            >
              <item.icon />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.footer}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={styles.userInfo}>
                <Avatar
                  fallback={user.name || user.email}
                  src={user.avatarUrl}
                  size="sm"
                />
                <div className={styles.userDetails}>
                  <div className={styles.userName}>{user.name || "User"}</div>
                  <div className={styles.userEmail}>{user.email}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start">
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                <LogOut size={16} />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
