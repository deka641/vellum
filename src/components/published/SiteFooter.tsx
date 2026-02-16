import styles from "./site-layout.module.css";

interface SiteFooterProps {
  siteName: string;
}

export function SiteFooter({ siteName }: SiteFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <span className={styles.footerText}>
          &copy; {year} {siteName}
        </span>
        <span className={styles.footerBrand}>Built with Vellum</span>
      </div>
    </footer>
  );
}
