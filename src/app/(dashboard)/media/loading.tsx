import { Skeleton } from "@/components/ui/Skeleton/Skeleton";

export default function MediaLoading() {
  return (
    <div style={{ padding: "var(--space-6)" }}>
      {/* Page heading */}
      <Skeleton height={32} width={100} />

      {/* Filter bar */}
      <div style={{ marginTop: "var(--space-4)", display: "flex", gap: "var(--space-3)" }}>
        <Skeleton height={36} width={200} />
        <Skeleton height={36} width={120} />
        <Skeleton height={36} width={120} />
      </div>

      {/* Media grid */}
      <div
        style={{
          marginTop: "var(--space-5)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} height={180} />
        ))}
      </div>
    </div>
  );
}
