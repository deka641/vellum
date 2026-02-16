import { requireAuth } from "@/lib/auth-helpers";
import { ToastProvider } from "@/components/ui/Toast/Toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DashboardShell } from "./DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <ToastProvider>
      <DashboardShell user={user}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </DashboardShell>
    </ToastProvider>
  );
}
