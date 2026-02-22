import { requireAuth } from "@/lib/auth-helpers";
import { ToastProvider } from "@/components/ui/Toast/Toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DashboardShell } from "./DashboardShell";
import { PageTransition } from "@/components/dashboard/PageTransition";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <ToastProvider>
      <DashboardShell user={user}>
        <ErrorBoundary>
          <PageTransition>{children}</PageTransition>
        </ErrorBoundary>
      </DashboardShell>
    </ToastProvider>
  );
}
