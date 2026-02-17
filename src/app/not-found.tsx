import Link from "next/link";

export default function RootNotFound() {
  return (
    <html lang="en">
      <body style={{
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        margin: 0,
        background: "#faf8f5",
        color: "#2d2926",
      }}>
        <div style={{ textAlign: "center", maxWidth: 400, padding: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
            404 - Page not found
          </h1>
          <p style={{ fontSize: 14, color: "#6b6560", marginBottom: 24, lineHeight: 1.6 }}>
            The page you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link href="/login" style={{
            display: "inline-block",
            padding: "8px 20px",
            background: "#c5a572",
            color: "#fff",
            borderRadius: 8,
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 500,
          }}>
            Go to login
          </Link>
        </div>
      </body>
    </html>
  );
}
