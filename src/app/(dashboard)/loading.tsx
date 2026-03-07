import { Skeleton } from "@/components/ui/Skeleton/Skeleton";

export default function DashboardLoading() {
  return (
    <div style={{ padding: "var(--space-6)" }}>
      {/* Topbar skeleton */}
      <Skeleton height={32} width={280} />

      {/* Stats row */}
      <div style={{ marginTop: "var(--space-6)", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "var(--space-4)" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={100} />
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ marginTop: "var(--space-6)", display: "flex", gap: "var(--space-3)" }}>
        <Skeleton height={40} width={120} />
        <Skeleton height={40} width={140} />
        <Skeleton height={40} width={160} />
      </div>

      {/* Two-column grid: Recent Pages + Recent Submissions */}
      <div style={{ marginTop: "var(--space-6)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-6)" }}>
        {/* Recent Pages */}
        <div>
          <Skeleton height={24} width={120} />
          <div style={{ marginTop: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={48} />
            ))}
          </div>
        </div>

        {/* Recent Submissions */}
        <div>
          <Skeleton height={24} width={160} />
          <div style={{ marginTop: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={48} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
