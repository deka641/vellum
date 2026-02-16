import styles from "./auth.module.css";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <h1 className={styles.logoText}>Vellum</h1>
          <p className={styles.logoSubtext}>Craft beautiful websites</p>
        </div>
        {children}
      </div>
    </div>
  );
}
