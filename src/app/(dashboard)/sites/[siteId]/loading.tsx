import { Skeleton } from "@/components/ui/Skeleton/Skeleton";

export default function SiteDetailLoading() {
  return (
    <div style={{ padding: "var(--space-6)" }}>
      {/* Page heading */}
      <Skeleton height={32} width={200} />

      {/* Action buttons row */}
      <div style={{ marginTop: "var(--space-4)", display: "flex", gap: "var(--space-3)" }}>
        <Skeleton height={36} width={100} />
        <Skeleton height={36} width={120} />
        <Skeleton height={36} width={100} />
      </div>

      {/* Page list items */}
      <div
        style={{
          marginTop: "var(--space-5)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={56} />
        ))}
      </div>
    </div>
  );
}
