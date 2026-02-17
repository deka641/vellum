import { Skeleton } from "@/components/ui/Skeleton/Skeleton";

export default function DashboardLoading() {
  return (
    <div style={{ padding: "var(--space-6)" }}>
      <Skeleton height={32} width={200} />
      <div style={{ marginTop: "var(--space-4)" }}>
        <Skeleton height={16} width={300} />
      </div>
      <div style={{ marginTop: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <Skeleton height={120} />
        <Skeleton height={120} />
        <Skeleton height={120} />
      </div>
    </div>
  );
}
