import styles from "./landing.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <span className={styles.footerLogo}>Vellum</span>
        <span className={styles.footerText}>
          Crafted with care. Built for creators.
        </span>
      </div>
    </footer>
  );
}
