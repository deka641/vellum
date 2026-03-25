import { Skeleton } from "@/components/ui/Skeleton/Skeleton";

export default function TemplatesLoading() {
  return (
    <div style={{ padding: "var(--space-6)" }}>
      {/* Page heading */}
      <Skeleton height={32} width={140} />

      {/* Template cards grid */}
      <div
        style={{
          marginTop: "var(--space-6)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={240} />
        ))}
      </div>
    </div>
  );
}
