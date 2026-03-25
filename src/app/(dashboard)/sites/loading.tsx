import { Skeleton } from "@/components/ui/Skeleton/Skeleton";

export default function SitesLoading() {
  return (
    <div style={{ padding: "var(--space-6)" }}>
      {/* Page heading */}
      <Skeleton height={32} width={120} />

      {/* Site cards grid */}
      <div
        style={{
          marginTop: "var(--space-6)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <Skeleton height={200} />
          </div>
        ))}
      </div>
    </div>
  );
}
