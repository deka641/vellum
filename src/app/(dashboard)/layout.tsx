import { requireAuth } from "@/lib/auth-helpers";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { ToastProvider } from "@/components/ui/Toast/Toast";
import styles from "./dashboard.module.css";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <ToastProvider>
      <div className={styles.layout}>
        <Sidebar user={user} />
        <main className={styles.main}>{children}</main>
      </div>
    </ToastProvider>
  );
}
