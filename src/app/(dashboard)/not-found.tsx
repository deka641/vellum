import Link from "next/link";
import { Button } from "@/components/ui/Button/Button";

export default function DashboardNotFound() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60vh",
      padding: "var(--space-6)",
    }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <h2 style={{
          fontSize: "var(--text-xl)",
          fontWeight: "var(--weight-semibold)",
          color: "var(--color-text-primary)",
          marginBottom: "var(--space-2)",
        }}>
          Page not found
        </h2>
        <p style={{
          fontSize: "var(--text-sm)",
          color: "var(--color-text-secondary)",
          marginBottom: "var(--space-5)",
          lineHeight: "var(--leading-relaxed)",
        }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/sites">
          <Button>Go to Sites</Button>
        </Link>
      </div>
    </div>
  );
}
